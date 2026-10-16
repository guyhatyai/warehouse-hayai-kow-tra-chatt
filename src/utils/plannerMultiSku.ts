import {
  CalculatedRow,
  OrderItemInput,
  ProductSku,
  ProductSpec,
  RowItemDetail,
  TruckPlanResult,
  TruckType,
} from '../types/truck';
import { PIPELINE_ORDER, PRODUCT_SPECS } from './productConstants';
import {
  applyZoneBadges,
  calculateDisplayHeightPx,
  distributePacksSmoothLadder,
  formatStackingPattern,
  getOrientationDetails,
  recalculateAccumulated,
} from './plannerShared';

/**
 * คำนวณแผนการจัดเรียงสำหรับ โหมด 3–5 รายการ (Multi-SKU Advanced Mode)
 * - แยกโซนตามขนาดสินค้า: โซน 1 (1kg) -> โซน 2 (5kg, 14kg, 15kg) -> โซน 3 (40kg)
 * - กฎการเรียงซ้อนแนวตั้ง (Cascade Stacking):
 *   1. วางสินค้าขนาด 5 กิโลให้ครบตามจำนวนก่อน ถึงจะขึ้นขนาดถัดไป ห้ามสลับไปสลับมา
 *   2. ลำดับการวางเรียงตาม 5kg (ฐานล่าง) -> 14kg (ชั้นกลาง) -> 15kg (ชั้นบนสุด)
 *   3. คำนวณเกลี่ยความสูงตามความหนาจริง (Physical Height-Proportional Stacking):
 *      - 5kg (หนา 1.0) วาง ~5.5–6.5 ชั้น (ความสูงจริง 5.5–6.5 เท่า)
 *      - 14kg (หนา 0.67) วาง ~10–12 ชั้น (ความสูงจริง 6.7–8.0 เท่า)
 *      - 15kg (หนา 0.67) วาง ~12–13 ชั้น (ความสูงจริง 8.0–8.7 เท่า)
 *      - 40kg (หนา 1.0) วาง ~9–11 ชั้น (ความสูงจริง 9.0–11.0 เท่า)
 *      ทำให้ความสูงรวมทุกแถวไต่ระดับจากเตี้ยไปสูงเสมอ (Monotonic Ladder) ไม่ฮวบลงมา
 * - บังคับระยะเหลือท้ายกระบะ 0–15 ซม. เสมอ
 */
export function calculateMultiSkuLoadingPlan(
  orderItems: OrderItemInput[],
  truckType: TruckType,
  bedLengthCm: number,
  emergencyMode: boolean = false
): TruckPlanResult {
  const isFenced = truckType === 'คอก';

  // รวบรวมยอดสินค้าตาม SKU
  const itemMap = new Map<ProductSku, number>();
  orderItems.forEach((item) => {
    if (item.bags > 0) {
      itemMap.set(item.sku, (itemMap.get(item.sku) || 0) + item.bags);
    }
  });

  const activeSkus: ProductSku[] = PIPELINE_ORDER.filter(
    (sku) => (itemMap.get(sku) || 0) > 0
  );

  let totalBags = 0;
  let totalWeightKg = 0;
  activeSkus.forEach((sku) => {
    const bags = itemMap.get(sku) || 0;
    const spec = PRODUCT_SPECS[sku];
    totalBags += bags;
    totalWeightKg += bags * spec.weightKg;
  });

  if (activeSkus.length === 0) {
    return {
      truckType,
      bedLengthCm,
      usedLengthCm: 0,
      remainingRearSpaceCm: bedLengthCm,
      withinTolerance: false,
      strictCompliance: false,
      isOverloadedLength: false,
      emergencyAvailable: false,
      emergencyActive: emergencyMode,
      emergencyAdjustmentNotes: ['กรุณาระบุจำนวนสินค้าอย่างน้อย 1 รายการเพื่อคำนวณ'],
      totalRows: 0,
      totalBags: 0,
      totalWeightKg: 0,
      rows: [],
      activeSkus: [],
    };
  }

  // แปลงจำนวนถุงเป็นมัด/กระสอบ
  const packs1k = Math.ceil((itemMap.get('1kg') || 0) / PRODUCT_SPECS['1kg'].unitsPerPack);
  const packs5k = Math.ceil((itemMap.get('5kg') || 0) / PRODUCT_SPECS['5kg'].unitsPerPack);
  const sacks14k = itemMap.get('14kg') || 0;
  const sacks15k = itemMap.get('15kg') || 0;
  const sacks40k = itemMap.get('40kg') || 0;

  // มิติและความจุของแต่ละโซน
  const len1 = isFenced ? 45 : 20;
  const per1 = isFenced ? 10 : 5;

  const len2 = isFenced ? 60 : 40;
  const per2 = 4; // 4 มัด/กระสอบต่อชั้น

  const len3Cross = 50;
  const per3Cross = 4;
  const len3Long = 65;
  const per3Long = 5;

  const totalG2Packs = packs5k + sacks14k + sacks15k;
  const hasG2 = totalG2Packs > 0;
  const hasG3 = sacks40k > 0;

  // คำนวณความสูงรวมเทียบเท่า (Total Height Units) ของกลุ่ม 2
  const totalHUnitsG2 =
    (packs5k / per2) * 1.0 +
    (sacks14k / per2) * (2.0 / 3.0) +
    (sacks15k / per2) * (2.0 / 3.0);

  // ค้นหาการจัดสรรแถวที่ทำให้เหลือท้าย 0–15 ซม. และความสูงลาดเอียงแบบขั้นบันได
  let bestCandidate: {
    r1: number;
    r2: number;
    r3: number;
    cross3: number;
    long3: number;
    used: number;
    rem: number;
    score: number;
  } | null = null;

  const minR1 = packs1k > 0 ? Math.max(1, Math.ceil(packs1k / (per1 * 14))) : 0;
  const maxR1 = packs1k > 0 ? Math.min(packs1k, Math.floor(bedLengthCm / len1)) : 0;
  const r1Limit = packs1k > 0 ? Math.min(maxR1, minR1 + (emergencyMode ? 10 : 8)) : 0;

  for (let r1 = minR1; r1 <= r1Limit; r1++) {
    const used1 = r1 * len1;
    const remAfter1 = bedLengthCm - used1;
    if (remAfter1 < 0) continue;

    const minR2 = hasG2 ? Math.max(1, Math.ceil(totalHUnitsG2 / 9.5)) : 0;
    const maxR2 = hasG2 ? Math.min(totalG2Packs, Math.floor(remAfter1 / len2)) : 0;
    const r2Limit = hasG2 ? Math.min(maxR2, minR2 + (emergencyMode ? 14 : 12)) : 0;

    for (let r2 = minR2; r2 <= r2Limit; r2++) {
      const used2 = r2 * len2;
      const remAfter2 = remAfter1 - used2;
      if (remAfter2 < 0) continue;

      if (!hasG3) {
        const rem = remAfter2;
        if (rem < 0) continue;
        const inTol = rem <= 15;
        let score = rem;
        if (inTol) {
          score -= 30000;
          if (emergencyMode) score -= 40000;
        } else if (emergencyMode) {
          score += 20000;
        }

        const avgH1 = packs1k > 0 ? (packs1k / (r1 * per1)) * 0.5 : 0;
        const avgH2 = hasG2 ? totalHUnitsG2 / r2 : 0;
        const layers1k = packs1k > 0 ? packs1k / (r1 * per1) : 0;

        if (avgH1 > avgH2) score += (avgH1 - avgH2) * 50000;
        if (layers1k > 10) score += (layers1k - 10) * 15000;
        if (avgH2 > 9.5) score += (avgH2 - 9.5) * 500;
        if (avgH2 < 5.0) score += (5.0 - avgH2) * 500;

        if (!bestCandidate || score < bestCandidate.score) {
          bestCandidate = {
            r1,
            r2,
            r3: 0,
            cross3: 0,
            long3: 0,
            used: used1 + used2,
            rem,
            score,
          };
        }
        continue;
      }

      // มี 40kg (Group 3)
      const minR3 = Math.max(1, Math.ceil(sacks40k / (per3Long * 12)));
      const maxR3 = Math.floor(remAfter2 / Math.min(len3Cross, len3Long));

      for (let r3 = minR3; r3 <= maxR3; r3++) {
        for (let long3 = 0; long3 <= r3; long3++) {
          const cross3 = r3 - long3;
          if (!isFenced && long3 < 1) continue; // รถพื้นเรียบต้องมีปิดท้ายแนวยาว
          if (!isFenced && long3 > 2) continue; // แนวยาวไม่เกิน 2 แถว
          if (isFenced && cross3 > 2) continue; // รถคอกแนวยาวเป็นหลัก แนวขวางไม่เกิน 2

          const used3 = cross3 * len3Cross + long3 * len3Long;
          const totalUsed = used1 + used2 + used3;
          const rem = bedLengthCm - totalUsed;
          if (rem < 0) continue;

          const inTol = rem <= 15;
          let score = rem;
          if (inTol) {
            score -= 30000;
            if (emergencyMode) score -= 45000;
          } else if (emergencyMode) {
            score += 25000;
          }

          if (isFenced) score += cross3 * 20;
          if (!isFenced) score += Math.abs(long3 - 1) * 15;

          const avgH1 = packs1k > 0 ? (packs1k / (r1 * per1)) * 0.5 : 0;
          const avgH2 = hasG2 ? totalHUnitsG2 / r2 : 0;
          const cap3 = cross3 * per3Cross + long3 * per3Long;
          const avgH3 = sacks40k / cap3;
          const layers1k = packs1k > 0 ? packs1k / (r1 * per1) : 0;

          // บังคับความสูงไต่ระดับขั้นบันไดเข้มงวด (หน้า <= กลาง <= ท้าย)
          if (avgH1 > avgH2) score += (avgH1 - avgH2) * 50000;
          if (hasG2 && avgH2 > avgH3) score += (avgH2 - avgH3) * 50000;
          if (!hasG2 && avgH1 > avgH3) score += (avgH1 - avgH3) * 50000;

          if (layers1k > 10) score += (layers1k - 10) * 15000;
          if (avgH2 > 9.5) score += (avgH2 - 9.5) * 500;
          if (avgH2 < 5.5) score += (5.5 - avgH2) * 500;
          if (avgH3 > 12.0) score += (avgH3 - 12.0) * 1000;
          if (avgH3 < 6.5) score += (6.5 - avgH3) * 1000;

          if (!bestCandidate || score < bestCandidate.score) {
            bestCandidate = {
              r1,
              r2,
              r3,
              cross3,
              long3,
              used: totalUsed,
              rem,
              score,
            };
          }
        }
      }
    }
  }

  // Fallback กรณีหาไม่พบ
  const sol = bestCandidate || {
    r1: packs1k > 0 ? Math.max(1, Math.round(packs1k / (per1 * 8))) : 0,
    r2: hasG2 ? Math.max(1, Math.round(totalHUnitsG2 / 7.5)) : 0,
    r3: hasG3 ? Math.max(1, Math.round(sacks40k / (per3Long * 8))) : 0,
    cross3: hasG3 && !isFenced ? Math.max(0, Math.round(sacks40k / (per3Long * 8)) - 1) : 0,
    long3: hasG3 ? (isFenced ? Math.max(1, Math.round(sacks40k / (per3Long * 8))) : 1) : 0,
    used: 0,
    rem: bedLengthCm,
    score: 99999,
  };

  const rows: CalculatedRow[] = [];
  let rowIndex = 1;

  // =========================================================================
  // โซน 1: ข้าว 1 กก. (หน้ารถสุด)
  // =========================================================================
  if (packs1k > 0 && sol.r1 > 0) {
    const spec1 = PRODUCT_SPECS['1kg'];
    const ori1: 'ขวาง' | 'ยาว' = isFenced ? 'ยาว' : 'ขวาง';
    const avgH2 = hasG2 && sol.r2 > 0 ? totalHUnitsG2 / sol.r2 : 0;
    const maxSafeLayers1 = hasG2 && avgH2 > 0
      ? Math.min(spec1.maxLayers, Math.floor(avgH2 / spec1.thicknessFactor))
      : spec1.maxLayers;
    const packsPerR1 = distributePacksSmoothLadder(
      packs1k,
      sol.r1,
      new Array(sol.r1).fill(per1),
      spec1.minLayers,
      maxSafeLayers1
    );

    for (let i = 0; i < sol.r1; i++) {
      const pQty = packsPerR1[i];
      const layers = Math.ceil(pQty / per1);
      const hFactor = (pQty / per1) * spec1.thicknessFactor;
      const pat = formatStackingPattern(pQty, per1);

      rows.push({
        rowIndex: rowIndex++,
        orientation: ori1,
        lengthCm: len1,
        accumulatedLengthCm: 0,
        isTransition: false,
        zoneBadge: 'โซนหน้า',
        zoneBadgeText: 'โซนหน้า',
        stackingPatternSummary: pat.pattern,
        items: [
          {
            sku: '1kg',
            name: spec1.name,
            packQty: pQty,
            bagsQty: pQty * spec1.unitsPerPack,
            layers,
            perLayer: per1,
            fullLayers: pat.fullLayers,
            remainderPacks: pat.remainderPacks,
            stackingPattern: pat.pattern,
            thicknessFactor: spec1.thicknessFactor,
            heightFactor: hFactor,
            color: spec1.color,
          },
        ],
        totalPacks: pQty,
        totalBags: pQty * spec1.unitsPerPack,
        totalLayers: layers,
        totalHeightFactor: hFactor,
        displayHeightPx: calculateDisplayHeightPx(hFactor),
      });
    }
  }

  // =========================================================================
  // โซน 2: ข้าวขนาดกลาง (5kg, 14kg, 15kg) - กลางคัน
  // กฎเคร่งครัดตามข้อกำหนดผู้ใช้:
  // "จะต้องวางสินค้าขนาด 5 กิโลให้ครบตามจำนวนก่อน ถึงจะขึ้นขนาดถัดไป ห้ามวาง สลับไปสลับมา"
  // "เรียงตาม 5 > 14 > 15"
  // "ลดชั้นข้าว 5 กก. ลงและเพิ่มชั้น 14-15 กก. ให้ความสูงไต่ขึ้นตามสัดส่วนจริง"
  // =========================================================================
  if (hasG2 && sol.r2 > 0) {
    // คิวสินค้าตามลำดับเคร่งครัด: 5kg -> 14kg -> 15kg
    interface ProductQueueItem {
      sku: ProductSku;
      name: string;
      qty: number; // packs or sacks
      color: string;
      thicknessFactor: number;
    }

    const queue: ProductQueueItem[] = [];
    if (packs5k > 0) {
      queue.push({
        sku: '5kg',
        name: PRODUCT_SPECS['5kg'].name,
        qty: packs5k,
        color: PRODUCT_SPECS['5kg'].color,
        thicknessFactor: PRODUCT_SPECS['5kg'].thicknessFactor,
      });
    }
    if (sacks14k > 0) {
      queue.push({
        sku: '14kg',
        name: PRODUCT_SPECS['14kg'].name,
        qty: sacks14k,
        color: PRODUCT_SPECS['14kg'].color,
        thicknessFactor: PRODUCT_SPECS['14kg'].thicknessFactor,
      });
    }
    if (sacks15k > 0) {
      queue.push({
        sku: '15kg',
        name: PRODUCT_SPECS['15kg'].name,
        qty: sacks15k,
        color: PRODUCT_SPECS['15kg'].color,
        thicknessFactor: PRODUCT_SPECS['15kg'].thicknessFactor,
      });
    }

    // คำนวณความสูงรวมเทียบเท่า (Total Height Units)
    const totalHUnits = queue.reduce(
      (sum, it) => sum + (it.qty / per2) * it.thicknessFactor,
      0
    );
    const avgH = totalHUnits / sol.r2;

    // ตรวจสอบความสูงแถวสุดท้ายของโซน 1 (ถ้ามี) เพื่อให้รอยต่อเชื่อมโยงกันอย่างไร้รอยต่อ
    const lastH1 = rows.length > 0 ? rows[rows.length - 1].totalHeightFactor : 0;
    const cap3Total = sol.cross3 * per3Cross + sol.long3 * per3Long;
    const avgH3 = hasG3 && cap3Total > 0 ? (sacks40k / cap3Total) * 1.0 : 0;

    // สร้าง Monotonic Target Ramp ที่มีผลรวมตรงกับ totalHUnits พอดีเป๊ะ 100%
    const halfSpan = (sol.r2 - 1) / 2;
    let maxSlope = 0.22;
    if (sol.r2 > 1 && halfSpan > 0) {
      if (lastH1 > 0 && avgH >= lastH1) {
        maxSlope = Math.min(maxSlope, (avgH - lastH1) / halfSpan);
      } else if (lastH1 > avgH) {
        maxSlope = 0;
      }
      if (hasG3 && avgH3 > 0) {
        maxSlope = Math.min(maxSlope, (avgH3 - avgH) / halfSpan);
      }
    }
    const slope = Math.max(0, maxSlope);
    const targetH = Array.from({ length: sol.r2 }, (_, i) => {
      return avgH + slope * (i - halfSpan);
    });

    let qIdx = 0;
    let prevRowH = lastH1;

    for (let r = 0; r < sol.r2; r++) {
      const isLast = (r === sol.r2 - 1);
      const remTargetH = targetH.slice(r + 1).reduce((sum, h) => sum + h, 0);
      const remQueueH = queue.slice(qIdx).reduce(
        (sum, it) => sum + (it.qty / per2) * it.thicknessFactor,
        0
      );
      // คำนวณงบประมาณความสูงของแถวนี้ โดยปรับตามยอดคงเหลือจริงแบบ Adaptive
      const budgetH = isLast ? remQueueH : Math.max(0.5, remQueueH - remTargetH);
      const desiredH = Math.max(budgetH, prevRowH);
      const itemsInRow: RowItemDetail[] = [];
      let currentH = 0;

      while (qIdx < queue.length) {
        const cur = queue[qIdx];
        if (cur.qty <= 0) {
          qIdx++;
          continue;
        }

        const neededH = desiredH - currentH;
        if (neededH <= 0.05 && !isLast) break;

        let takePacks = isLast
          ? cur.qty
          : Math.round((neededH / cur.thicknessFactor) * per2);
        // ต้องหยิบอย่างน้อย 1 มัด/กระสอบถ้าแถวยังว่างอยู่ และต้องไม่เกินยอดคงเหลือของ SKU นี้
        if (itemsInRow.length === 0) {
          takePacks = Math.max(1, takePacks);
        }
        takePacks = Math.min(takePacks, cur.qty);

        if (takePacks > 0) {
          const itemLayers = Math.ceil(takePacks / per2);
          const pat = formatStackingPattern(takePacks, per2);
          const hFactor = (takePacks / per2) * cur.thicknessFactor;

          itemsInRow.push({
            sku: cur.sku,
            name: cur.name,
            packQty: takePacks,
            bagsQty: takePacks * PRODUCT_SPECS[cur.sku].unitsPerPack,
            layers: itemLayers,
            perLayer: per2,
            fullLayers: pat.fullLayers,
            remainderPacks: pat.remainderPacks,
            stackingPattern: pat.pattern,
            thicknessFactor: cur.thicknessFactor,
            heightFactor: hFactor,
            color: cur.color,
          });

          currentH += hFactor;
          cur.qty -= takePacks;
        }

        if (cur.qty === 0) {
          qIdx++;
        } else {
          break;
        }
      }

      // กำหนด positionLabel ให้ชัดเจน (ฐานล่าง -> ชั้นกลาง -> ซ้อนบน)
      if (itemsInRow.length > 1) {
        itemsInRow.forEach((it, idx) => {
          if (idx === 0) {
            it.positionLabel = 'ฐานล่าง';
          } else if (idx === itemsInRow.length - 1) {
            it.positionLabel = 'ซ้อนบน';
          } else {
            it.positionLabel = 'ชั้นกลาง';
          }
        });
      }

      const totalRowPacks = itemsInRow.reduce((s, it) => s + it.packQty, 0);
      const totalRowBags = itemsInRow.reduce((s, it) => s + it.bagsQty, 0);
      const totalRowLayers = itemsInRow.reduce((s, it) => s + it.layers, 0);
      const totalRowHeightFactor = itemsInRow.reduce((s, it) => s + it.heightFactor, 0);

      const patternSummary =
        itemsInRow.length > 1
          ? itemsInRow.map((it) => `${it.sku.replace('kg', 'k')}[${it.stackingPattern}]`).join(' + ')
          : itemsInRow[0]?.stackingPattern || '';

      rows.push({
        rowIndex: rowIndex++,
        orientation: isFenced ? 'ยาว' : 'ขวาง',
        lengthCm: len2,
        accumulatedLengthCm: 0,
        isTransition: itemsInRow.length > 1,
        zoneBadge: itemsInRow.length > 1 ? 'แถวเชื่อมต่อ' : 'กลางคัน',
        zoneBadgeText: itemsInRow.length > 1 ? 'แถวเชื่อมต่อ' : `แถวที่ ${rowIndex - 1}`,
        stackingPatternSummary: patternSummary,
        items: itemsInRow,
        totalPacks: totalRowPacks,
        totalBags: totalRowBags,
        totalLayers: totalRowLayers,
        totalHeightFactor: totalRowHeightFactor,
        displayHeightPx: calculateDisplayHeightPx(totalRowHeightFactor),
      });
      prevRowH = totalRowHeightFactor;
    }
  }

  // =========================================================================
  // โซน 3: ข้าว 40 กก. (แดง) - โซนท้ายรถ (สูงเต็มพิกัด 8-11 ชั้น)
  // =========================================================================
  if (hasG3 && sol.r3 > 0) {
    const spec40 = PRODUCT_SPECS['40kg'];
    const orientationsG3: ('ขวาง' | 'ยาว')[] = [];

    if (isFenced) {
      for (let i = 0; i < sol.long3; i++) orientationsG3.push('ยาว');
      for (let i = 0; i < sol.cross3; i++) orientationsG3.push('ขวาง');
    } else {
      for (let i = 0; i < sol.cross3; i++) orientationsG3.push('ขวาง');
      for (let i = 0; i < sol.long3; i++) orientationsG3.push('ยาว');
    }

    const perLayerList = orientationsG3.map((o) => (o === 'ยาว' ? per3Long : per3Cross));
    const lastH2 = rows.length > 0 ? rows[rows.length - 1].totalHeightFactor : 0;
    const minSafeLayers40 = Math.max(spec40.minLayers, Math.ceil(lastH2 / spec40.thicknessFactor));
    const allocated40 = distributePacksSmoothLadder(
      sacks40k,
      sol.r3,
      perLayerList,
      minSafeLayers40,
      spec40.maxLayers
    );

    for (let i = 0; i < sol.r3; i++) {
      const orientation = orientationsG3[i];
      const per = perLayerList[i];
      const pQty = allocated40[i];
      if (pQty <= 0) continue;
      const layers = Math.ceil(pQty / per);
      const hFactor = (pQty / per) * spec40.thicknessFactor;
      const pat = formatStackingPattern(pQty, per);
      const rowLen = orientation === 'ยาว' ? len3Long : len3Cross;

      rows.push({
        rowIndex: rowIndex++,
        orientation,
        lengthCm: rowLen,
        accumulatedLengthCm: 0,
        isTransition: false,
        zoneBadge: i === sol.r3 - 1 ? 'ปิดท้าย' : 'กลางคัน',
        zoneBadgeText: i === sol.r3 - 1 ? 'ปิดท้าย' : '',
        stackingPatternSummary: pat.pattern,
        items: [
          {
            sku: '40kg',
            name: spec40.name,
            packQty: pQty,
            bagsQty: pQty,
            layers,
            perLayer: per,
            fullLayers: pat.fullLayers,
            remainderPacks: pat.remainderPacks,
            stackingPattern: pat.pattern,
            thicknessFactor: spec40.thicknessFactor,
            heightFactor: hFactor,
            color: spec40.color,
          },
        ],
        totalPacks: pQty,
        totalBags: pQty,
        totalLayers: layers,
        totalHeightFactor: hFactor,
        displayHeightPx: calculateDisplayHeightPx(hFactor),
      });
    }
  }

  // =========================================================================
  // ตรวจสอบและเกลี่ยความสูงให้เรียงจากเตี้ยไปสูงเสมอ (Monotonic Smoothing Pass)
  // ป้องกันความสูงฮวบลงมา 100%
  // =========================================================================
  for (let iter = 0; iter < rows.length * 4; iter++) {
    let adjusted = false;
    for (let i = 0; i < rows.length - 1; i++) {
      const rA = rows[i];
      const rB = rows[i + 1];
      if (rA.totalHeightFactor > rB.totalHeightFactor + 1e-4) {
        // หากแถว A มีสินค้าบนสุดตรงกับสินค้าล่างสุดของแถว B สามารถเกลี่ยข้ามแถวได้
        const lastItemA = rA.items[rA.items.length - 1];
        const firstItemB = rB.items[0];
        if (
          lastItemA &&
          firstItemB &&
          lastItemA.sku === firstItemB.sku &&
          lastItemA.packQty > 1
        ) {
          lastItemA.packQty--;
          lastItemA.bagsQty = lastItemA.packQty * PRODUCT_SPECS[lastItemA.sku].unitsPerPack;
          lastItemA.layers = Math.ceil(lastItemA.packQty / lastItemA.perLayer);
          lastItemA.heightFactor =
            (lastItemA.packQty / lastItemA.perLayer) * lastItemA.thicknessFactor;
          const patA = formatStackingPattern(lastItemA.packQty, lastItemA.perLayer);
          lastItemA.stackingPattern = patA.pattern;
          lastItemA.fullLayers = patA.fullLayers;
          lastItemA.remainderPacks = patA.remainderPacks;

          firstItemB.packQty++;
          firstItemB.bagsQty = firstItemB.packQty * PRODUCT_SPECS[firstItemB.sku].unitsPerPack;
          firstItemB.layers = Math.ceil(firstItemB.packQty / firstItemB.perLayer);
          firstItemB.heightFactor =
            (firstItemB.packQty / firstItemB.perLayer) * firstItemB.thicknessFactor;
          const patB = formatStackingPattern(firstItemB.packQty, firstItemB.perLayer);
          firstItemB.stackingPattern = patB.pattern;
          firstItemB.fullLayers = patB.fullLayers;
          firstItemB.remainderPacks = patB.remainderPacks;

          rA.totalPacks--;
          rA.totalBags -= PRODUCT_SPECS[lastItemA.sku].unitsPerPack;
          rA.totalLayers = rA.items.reduce((s, it) => s + it.layers, 0);
          rA.totalHeightFactor = rA.items.reduce((s, it) => s + it.heightFactor, 0);
          rA.displayHeightPx = calculateDisplayHeightPx(rA.totalHeightFactor);

          rB.totalPacks++;
          rB.totalBags += PRODUCT_SPECS[firstItemB.sku].unitsPerPack;
          rB.totalLayers = rB.items.reduce((s, it) => s + it.layers, 0);
          rB.totalHeightFactor = rB.items.reduce((s, it) => s + it.heightFactor, 0);
          rB.displayHeightPx = calculateDisplayHeightPx(rB.totalHeightFactor);

          adjusted = true;
        } else if (lastItemA && firstItemB && lastItemA.sku !== firstItemB.sku) {
          // กรณีรอยต่อระหว่างกลุ่มสินค้าต่างชนิดกัน:
          // 1) หากสินค้ากลุ่ม B ในแถวหลังๆ สูงมาก ให้ย้าย 1 ชิ้นจากแถวหลังสุดของ SKU เดียวกันมาหนุน rB
          let donorFound = false;
          for (let k = rows.length - 1; k > i + 1; k--) {
            const donorItem = rows[k].items.find((it) => it.sku === firstItemB.sku);
            if (donorItem && donorItem.packQty > firstItemB.perLayer) {
              donorItem.packQty--;
              donorItem.bagsQty = donorItem.packQty * PRODUCT_SPECS[donorItem.sku].unitsPerPack;
              donorItem.layers = Math.ceil(donorItem.packQty / donorItem.perLayer);
              donorItem.heightFactor =
                (donorItem.packQty / donorItem.perLayer) * donorItem.thicknessFactor;
              const patD = formatStackingPattern(donorItem.packQty, donorItem.perLayer);
              donorItem.stackingPattern = patD.pattern;
              donorItem.fullLayers = patD.fullLayers;
              donorItem.remainderPacks = patD.remainderPacks;

              rows[k].totalPacks--;
              rows[k].totalBags -= PRODUCT_SPECS[donorItem.sku].unitsPerPack;
              rows[k].totalLayers = rows[k].items.reduce((s, it) => s + it.layers, 0);
              rows[k].totalHeightFactor = rows[k].items.reduce((s, it) => s + it.heightFactor, 0);
              rows[k].displayHeightPx = calculateDisplayHeightPx(rows[k].totalHeightFactor);

              firstItemB.packQty++;
              firstItemB.bagsQty = firstItemB.packQty * PRODUCT_SPECS[firstItemB.sku].unitsPerPack;
              firstItemB.layers = Math.ceil(firstItemB.packQty / firstItemB.perLayer);
              firstItemB.heightFactor =
                (firstItemB.packQty / firstItemB.perLayer) * firstItemB.thicknessFactor;
              const patB = formatStackingPattern(firstItemB.packQty, firstItemB.perLayer);
              firstItemB.stackingPattern = patB.pattern;
              firstItemB.fullLayers = patB.fullLayers;
              firstItemB.remainderPacks = patB.remainderPacks;

              rB.totalPacks++;
              rB.totalBags += PRODUCT_SPECS[firstItemB.sku].unitsPerPack;
              rB.totalLayers = rB.items.reduce((s, it) => s + it.layers, 0);
              rB.totalHeightFactor = rB.items.reduce((s, it) => s + it.heightFactor, 0);
              rB.displayHeightPx = calculateDisplayHeightPx(rB.totalHeightFactor);

              adjusted = true;
              donorFound = true;
              break;
            }
          }

          // 2) หากไม่สามารถดึงจาก B ได้ ให้ย้าย 1 ชิ้นจาก rA ถอยกลับไปยังแถวก่อนหน้าของ SKU เดียวกัน
          if (!donorFound && i > 0) {
            for (let j = i - 1; j >= 0; j--) {
              const prevItem = rows[j].items.find((it) => it.sku === lastItemA.sku);
              if (prevItem && lastItemA.packQty > lastItemA.perLayer) {
                lastItemA.packQty--;
                lastItemA.bagsQty = lastItemA.packQty * PRODUCT_SPECS[lastItemA.sku].unitsPerPack;
                lastItemA.layers = Math.ceil(lastItemA.packQty / lastItemA.perLayer);
                lastItemA.heightFactor =
                  (lastItemA.packQty / lastItemA.perLayer) * lastItemA.thicknessFactor;
                const patA = formatStackingPattern(lastItemA.packQty, lastItemA.perLayer);
                lastItemA.stackingPattern = patA.pattern;
                lastItemA.fullLayers = patA.fullLayers;
                lastItemA.remainderPacks = patA.remainderPacks;

                rA.totalPacks--;
                rA.totalBags -= PRODUCT_SPECS[lastItemA.sku].unitsPerPack;
                rA.totalLayers = rA.items.reduce((s, it) => s + it.layers, 0);
                rA.totalHeightFactor = rA.items.reduce((s, it) => s + it.heightFactor, 0);
                rA.displayHeightPx = calculateDisplayHeightPx(rA.totalHeightFactor);

                prevItem.packQty++;
                prevItem.bagsQty = prevItem.packQty * PRODUCT_SPECS[prevItem.sku].unitsPerPack;
                prevItem.layers = Math.ceil(prevItem.packQty / prevItem.perLayer);
                prevItem.heightFactor =
                  (prevItem.packQty / prevItem.perLayer) * prevItem.thicknessFactor;
                const patP = formatStackingPattern(prevItem.packQty, prevItem.perLayer);
                prevItem.stackingPattern = patP.pattern;
                prevItem.fullLayers = patP.fullLayers;
                prevItem.remainderPacks = patP.remainderPacks;

                rows[j].totalPacks++;
                rows[j].totalBags += PRODUCT_SPECS[prevItem.sku].unitsPerPack;
                rows[j].totalLayers = rows[j].items.reduce((s, it) => s + it.layers, 0);
                rows[j].totalHeightFactor = rows[j].items.reduce((s, it) => s + it.heightFactor, 0);
                rows[j].displayHeightPx = calculateDisplayHeightPx(rows[j].totalHeightFactor);

                adjusted = true;
                break;
              }
            }
          }
        }
      }
    }
    if (!adjusted) break;
  }

  // คำนวณความยาวสะสมให้สมบูรณ์
  recalculateAccumulated(rows);
  applyZoneBadges(rows);

  const usedLengthCm = rows.reduce((sum, r) => sum + r.lengthCm, 0);
  const remainingRearSpaceCm = bedLengthCm - usedLengthCm;
  const withinTolerance = remainingRearSpaceCm >= 0 && remainingRearSpaceCm <= 15;

  const notes: string[] = [];
  if (withinTolerance) {
    notes.push(
      `ความยาวสะสม ${usedLengthCm} ซม. ดันสินค้าชิดท้ายกระบะพอดี (เหลือช่องว่าง ${remainingRearSpaceCm} ซม. ตามเกณฑ์ 0–15 ซม.)`
    );
    notes.push(
      'ความสูงจัดเรียงไต่ระดับขั้นบันไดจากเตี้ยไปสูงอย่างต่อเนื่อง (Monotonic Ladder) ไม่มีฮวบลงมา'
    );
    notes.push(
      'จัดเรียงสินค้ากลุ่มกลาง (5kg -> 14kg -> 15kg) แบบต่อเนื่องแนวตั้ง วาง 5 กก. ครบก่อนขึ้น 14 กก. และ 15 กก.'
    );
    if (emergencyMode) {
      notes.push('⚡ โหมดฉุกเฉิน: ปรับกระจายสินค้าเต็มความยาวกระบะ เหลือท้าย 0–15 ซม. เรียบร้อยแล้ว');
    }
  } else {
    notes.push(
      `เหลือช่องว่างท้ายรถ ${remainingRearSpaceCm} ซม. (เกินเกณฑ์ปลอดภัย 15 ซม.) กรุณากดปุ่มปรับแนวแถวท้ายรถดันชิดท้าย`
    );
  }

  return {
    truckType,
    bedLengthCm,
    usedLengthCm,
    remainingRearSpaceCm,
    withinTolerance,
    strictCompliance: withinTolerance,
    isOverloadedLength: remainingRearSpaceCm < 0,
    emergencyAvailable: remainingRearSpaceCm > 15 || !withinTolerance,
    emergencyActive: emergencyMode,
    emergencyAdjustmentNotes: notes,
    totalRows: rows.length,
    totalBags,
    totalWeightKg,
    rows,
    activeSkus,
  };
}
