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
  planSingleSkuLadder,
  recalculateAccumulated,
} from './plannerShared';

/**
 * คำนวณแผนการจัดเรียงสำหรับ โหมด 1–2 รายการ (Simple Mode)
 * เน้นความเรียบง่าย แม่นยำ ทรงพลัง และรับประกันระยะท้าย 0–15 ซม.
 */
export function calculateSimpleLoadingPlan(
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

  // ถ้าไม่มีสินค้า
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

  // แปลงถุงเป็นมัด/กระสอบ
  const packs1k = Math.ceil((itemMap.get('1kg') || 0) / PRODUCT_SPECS['1kg'].unitsPerPack);
  const packs5k = Math.ceil((itemMap.get('5kg') || 0) / PRODUCT_SPECS['5kg'].unitsPerPack);
  const sacks14k = itemMap.get('14kg') || 0;
  const sacks15k = itemMap.get('15kg') || 0;
  const sacks40k = itemMap.get('40kg') || 0;

  // 1. กรณีสินค้าชนิดเดียว (Single SKU)
  if (activeSkus.length === 1) {
    const singleSku = activeSkus[0];
    const spec = PRODUCT_SPECS[singleSku];
    const totalPacks = Math.ceil((itemMap.get(singleSku) || 0) / spec.unitsPerPack);
    const rows = planSingleSkuLadder(singleSku, totalPacks, truckType, bedLengthCm, emergencyMode);

    const usedLengthCm = rows.reduce((sum, r) => sum + r.lengthCm, 0);
    const remainingRearSpaceCm = bedLengthCm - usedLengthCm;
    const withinTolerance = remainingRearSpaceCm >= 0 && remainingRearSpaceCm <= 15;

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
      emergencyAdjustmentNotes: [
        withinTolerance
          ? `จัดสินค้า ${spec.name} ไต่ระดับขั้นบันไดเต็มกระบะ เหลือท้าย ${remainingRearSpaceCm} ซม.`
          : `เหลือพื้นที่ท้ายกระบะ ${remainingRearSpaceCm} ซม.`,
      ],
      totalRows: rows.length,
      totalBags,
      totalWeightKg,
      rows,
      activeSkus,
    };
  }

  // 2. กรณีสินค้า 2 ชนิด: กำหนดโซนหน้าและท้าย
  // คำนวณจำนวนแถวที่เหมาะสมที่สุดเพื่อให้ความยาวเต็มกระบะและเหลือท้าย 0–15 ซม.
  const skuA = activeSkus[0];
  const skuB = activeSkus[1];
  const specA = PRODUCT_SPECS[skuA];
  const specB = PRODUCT_SPECS[skuB];

  const packsA = Math.ceil((itemMap.get(skuA) || 0) / specA.unitsPerPack);
  const packsB = Math.ceil((itemMap.get(skuB) || 0) / specB.unitsPerPack);

  const dimACross = getOrientationDetails(specA, 'ขวาง');
  const dimALong = getOrientationDetails(specA, 'ยาว');
  const dimBCross = getOrientationDetails(specB, 'ขวาง');
  const dimBLong = getOrientationDetails(specB, 'ยาว');

  // สำหรับรถคอก: เน้นแนวยาว, สำหรับรถพื้นเรียบ: แนวขวางเป็นหลัก ปิดท้ายแนวยาว
  const oriA: 'ขวาง' | 'ยาว' = isFenced ? 'ยาว' : (skuA === '1kg' ? 'ขวาง' : 'ขวาง');
  const lenA = oriA === 'ยาว' ? dimALong.lengthCm : dimACross.lengthCm;
  const perA = oriA === 'ยาว' ? dimALong.perLayer : dimACross.perLayer;

  let bestPlan: {
    rA: number;
    rB: number;
    crossB: number;
    longB: number;
    rem: number;
    score: number;
  } | null = null;

  // ค้นหาจำนวนแถวที่ดีที่สุด
  const maxRA = Math.min(packsA, Math.floor(bedLengthCm / lenA));
  for (let rA = 1; rA <= maxRA; rA++) {
    const usedA = rA * lenA;
    const remForB = bedLengthCm - usedA;
    if (remForB < 0) continue;

    const maxRB = Math.floor(remForB / Math.min(dimBCross.lengthCm, dimBLong.lengthCm));
    for (let rB = 1; rB <= maxRB; rB++) {
      for (let longB = 0; longB <= rB; longB++) {
        const crossB = rB - longB;
        if (!isFenced && longB < 1) continue; // รถพื้นเรียบต้องมีปิดท้ายแนวยาว
        if (!isFenced && longB > 2) continue;
        if (isFenced && crossB > 2) continue; // รถคอกแนวยาวเป็นหลัก

        const usedB = crossB * dimBCross.lengthCm + longB * dimBLong.lengthCm;
        const totalUsed = usedA + usedB;
        const rem = bedLengthCm - totalUsed;
        if (rem < 0) continue;

        const inTolerance = rem <= 15;
        let score = rem;
        if (inTolerance) {
          score -= 2000;
          if (emergencyMode) score -= 30000;
        } else if (emergencyMode) {
          score += 10000;
        }

        // ความสูงเฉลี่ยต้องไม่กระโดดเกินพิกัด
        const avgLA = packsA / (rA * perA);
        const capB = crossB * dimBCross.perLayer + longB * dimBLong.perLayer;
        const avgLB = packsB / capB;

        if (avgLA > specA.maxLayers) score += (avgLA - specA.maxLayers) * 50;
        if (avgLB > specB.maxLayers) score += (avgLB - specB.maxLayers) * 50;

        // ขั้นบันได A <= B
        const heightA = avgLA * specA.thicknessFactor;
        const heightB = avgLB * specB.thicknessFactor;
        if (heightA > heightB) {
          score += (heightA - heightB) * 3000;
        }
        if (avgLB < 4.0) score += (4.0 - avgLB) * 600;

        if (!bestPlan || score < bestPlan.score) {
          bestPlan = {
            rA,
            rB,
            crossB,
            longB,
            rem,
            score,
          };
        }
      }
    }
  }

  const sol = bestPlan || {
    rA: Math.max(1, Math.round(packsA / (perA * 7))),
    rB: Math.max(1, Math.round(packsB / (dimBCross.perLayer * 8))),
    crossB: isFenced ? 0 : Math.max(0, Math.round(packsB / (dimBCross.perLayer * 8)) - 1),
    longB: isFenced ? Math.max(1, Math.round(packsB / (dimBCross.perLayer * 8))) : 1,
    rem: 0,
    score: 99999,
  };

  const rows: CalculatedRow[] = [];
  let rowIndex = 1;

  // แถวของสินค้าแรก (หน้ารถ)
  const packsPerA = distributePacksSmoothLadder(
    packsA,
    sol.rA,
    new Array(sol.rA).fill(perA),
    specA.minLayers,
    specA.maxLayers
  );

  for (let i = 0; i < sol.rA; i++) {
    const pQty = packsPerA[i];
    const layers = Math.ceil(pQty / perA);
    const hFactor = layers * specA.thicknessFactor;
    const pat = formatStackingPattern(pQty, perA);

    rows.push({
      rowIndex: rowIndex++,
      orientation: oriA,
      lengthCm: lenA,
      accumulatedLengthCm: 0,
      isTransition: false,
      zoneBadge: 'โซนหน้า',
      zoneBadgeText: 'โซนหน้า',
      stackingPatternSummary: pat.pattern,
      items: [
        {
          sku: skuA,
          name: specA.name,
          packQty: pQty,
          bagsQty: pQty * specA.unitsPerPack,
          layers,
          perLayer: perA,
          fullLayers: pat.fullLayers,
          remainderPacks: pat.remainderPacks,
          stackingPattern: pat.pattern,
          thicknessFactor: specA.thicknessFactor,
          heightFactor: hFactor,
          color: specA.color,
        },
      ],
      totalPacks: pQty,
      totalBags: pQty * specA.unitsPerPack,
      totalLayers: layers,
      totalHeightFactor: hFactor,
      displayHeightPx: calculateDisplayHeightPx(hFactor),
    });
  }

  // แถวของสินค้าที่สอง (ท้ายรถ)
  const orientationsB: ('ขวาง' | 'ยาว')[] = [];
  if (isFenced) {
    for (let i = 0; i < sol.longB; i++) orientationsB.push('ยาว');
    for (let i = 0; i < sol.crossB; i++) orientationsB.push('ขวาง');
  } else {
    for (let i = 0; i < sol.crossB; i++) orientationsB.push('ขวาง');
    for (let i = 0; i < sol.longB; i++) orientationsB.push('ยาว');
  }

  const perListB = orientationsB.map((ori) =>
    ori === 'ยาว' ? dimBLong.perLayer : dimBCross.perLayer
  );
  const packsPerB = distributePacksSmoothLadder(
    packsB,
    sol.rB,
    perListB,
    specB.minLayers,
    specB.maxLayers
  );

  for (let i = 0; i < sol.rB; i++) {
    const ori = orientationsB[i];
    const len = ori === 'ยาว' ? dimBLong.lengthCm : dimBCross.lengthCm;
    const per = perListB[i];
    const pQty = packsPerB[i];
    const layers = Math.ceil(pQty / per);
    const hFactor = layers * specB.thicknessFactor;
    const pat = formatStackingPattern(pQty, per);

    rows.push({
      rowIndex: rowIndex++,
      orientation: ori,
      lengthCm: len,
      accumulatedLengthCm: 0,
      isTransition: false,
      zoneBadge: i === sol.rB - 1 ? 'ปิดท้าย' : 'กลางคัน',
      zoneBadgeText: i === sol.rB - 1 ? 'ปิดท้าย' : `แถวที่ ${rowIndex - 1}`,
      stackingPatternSummary: pat.pattern,
      items: [
        {
          sku: skuB,
          name: specB.name,
          packQty: pQty,
          bagsQty: pQty * specB.unitsPerPack,
          layers,
          perLayer: per,
          fullLayers: pat.fullLayers,
          remainderPacks: pat.remainderPacks,
          stackingPattern: pat.pattern,
          thicknessFactor: specB.thicknessFactor,
          heightFactor: hFactor,
          color: specB.color,
        },
      ],
      totalPacks: pQty,
      totalBags: pQty * specB.unitsPerPack,
      totalLayers: layers,
      totalHeightFactor: hFactor,
      displayHeightPx: calculateDisplayHeightPx(hFactor),
    });
  }

  recalculateAccumulated(rows);
  applyZoneBadges(rows);

  const usedLengthCm = rows.reduce((sum, r) => sum + r.lengthCm, 0);
  const remainingRearSpaceCm = bedLengthCm - usedLengthCm;
  const withinTolerance = remainingRearSpaceCm >= 0 && remainingRearSpaceCm <= 15;

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
    emergencyAdjustmentNotes: [
      withinTolerance
        ? `ความยาวใช้จริง ${usedLengthCm} ซม. เหลือท้ายกระบะ ${remainingRearSpaceCm} ซม. (ผ่านเกณฑ์ 0–15 ซม.)`
        : `เหลือพื้นที่ท้ายกระบะ ${remainingRearSpaceCm} ซม.`,
    ],
    totalRows: rows.length,
    totalBags,
    totalWeightKg,
    rows,
    activeSkus,
  };
}
