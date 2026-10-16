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

/**
 * คำนวณความจุต่อชั้นและมิติความยาวตามแนวการวาง
 */
export function getOrientationDetails(spec: ProductSpec, orientation: 'ขวาง' | 'ยาว') {
  if (orientation === 'ยาว') {
    return {
      lengthCm: spec.longLen,
      perLayer: spec.longPerLayer,
    };
  }
  return {
    lengthCm: spec.crossLen,
    perLayer: spec.crossPerLayer,
  };
}

/**
 * คำนวณสูตรการจัดวาง เช่น "5×8", "6×7 (เศษ 2)"
 */
export function formatStackingPattern(
  packQty: number,
  perLayer: number
): {
  fullLayers: number;
  remainderPacks: number;
  pattern: string;
} {
  if (perLayer <= 0 || packQty <= 0) {
    return { fullLayers: 0, remainderPacks: 0, pattern: '0' };
  }
  const fullLayers = Math.floor(packQty / perLayer);
  const remainderPacks = packQty % perLayer;

  let pattern = '';
  if (remainderPacks === 0) {
    pattern = `${perLayer}×${fullLayers}`;
  } else if (fullLayers === 0) {
    pattern = `(เศษ ${remainderPacks})`;
  } else {
    pattern = `${perLayer}×${fullLayers} (เศษ ${remainderPacks})`;
  }

  return {
    fullLayers,
    remainderPacks,
    pattern,
  };
}

/**
 * คำนวณความสูงแสดงผลบนหน้าจอ (Side-View Visualizer) สูงสุดประมาณ 160px
 * สอดคล้องกับพิกัดความสูง 10-11 เท่า โดยแสดงผลไต่ระดับเป็นขั้นบันไดจากหน้ารถไปท้ายรถ
 */
export function calculateDisplayHeightPx(heightFactor: number): number {
  const maxFactor = 11.0; // ความสูงเต็มพิกัดของ 40kg ที่ท้ายรถ (~10-11 เท่า)
  const maxHeightPx = 160;
  const minHeightPx = 36;
  const ratio = Math.min(Math.max(heightFactor / maxFactor, 0.22), 1.05);
  return Math.round(Math.max(ratio * maxHeightPx, minHeightPx));
}

/**
 * ปรับปรุงป้ายชื่อโซน (Badge Tag):
 * - แถวที่ 1 ถึง 4 ของหน้ารถ: โซนหน้า
 * - แถวช่วงกลางคัน: แถวที่ N
 * - แถวที่มีการวางซ้อนผสมกัน: แถวเชื่อมต่อ
 * - แถวสุดท้ายของรถ: ปิดท้าย
 */
export function applyZoneBadges(rows: CalculatedRow[]) {
  const total = rows.length;
  rows.forEach((row, idx) => {
    if (idx === total - 1) {
      row.zoneBadge = 'ปิดท้าย';
      row.zoneBadgeText = 'ปิดท้าย';
    } else if (row.isTransition) {
      row.zoneBadge = 'แถวเชื่อมต่อ';
      row.zoneBadgeText = 'แถวเชื่อมต่อ';
    } else if (row.rowIndex <= 4 && total >= 5) {
      row.zoneBadge = 'โซนหน้า';
      row.zoneBadgeText = 'โซนหน้า';
    } else {
      row.zoneBadge = 'กลางคัน';
      row.zoneBadgeText = `แถวที่ ${row.rowIndex}`;
    }
  });
}

/**
 * คำนวณความยาวสะสมทีละแถว
 */
export function recalculateAccumulated(rows: CalculatedRow[]) {
  let accum = 0;
  for (const row of rows) {
    accum += row.lengthCm;
    row.accumulatedLengthCm = accum;
  }
}

/**
 * เกลี่ยจำนวนมัด/กระสอบลงในแต่ละแถวแบบขั้นบันไดเรียบเนียน (Monotonic Ladder Ramp)
 * 1. รับประกันว่ายอดรวมเท่ากับ totalPacks พอดีเป๊ะ 100% ไม่มีขาดหรือเกิน
 * 2. รับประกันว่าทุกแถวต้องมีสินค้าอย่างน้อย 1 มัด/กระสอบ (ห้ามมีแถวเป็น 0 เด็ดขาด)
 * 3. หากยอดสินค้าเพียงพอ จะเกลี่ยให้แต่ละแถวมีอย่างน้อย 2 ชั้นขึ้นไป (ไม่วางแค่ 1 ชั้นแล้วขึ้นแถวใหม่)
 * 4. รับประกันความสูงเรียงลำดับแบบไม่ลดลง (Monotonic Non-Decreasing): แถวหน้าเตี้ย -> แถวหลังสูง
 */
export function distributePacksSmoothLadder(
  totalPacks: number,
  numRows: number,
  perLayerList: number[],
  minLayersHint?: number,
  maxLayersHint?: number
): number[] {
  if (numRows <= 0) return [];
  if (numRows === 1) return [totalPacks];

  // ถ้าสินค้ามีน้อยกว่าจำนวนแถว กระจายให้แถวละ 1 เท่าที่ทำได้
  if (totalPacks < numRows) {
    const res = new Array(numRows).fill(0);
    for (let i = 0; i < totalPacks; i++) res[i] = 1;
    return res;
  }

  const totalCap = perLayerList.reduce((a, b) => a + b, 0);
  const avgLayers = totalPacks / totalCap;

  // คำนวณ weighted progress สำหรับระนาบลาดเอียง (linear ramp: l_i = a + b * (i / (N-1)))
  const weightedProgressSum = perLayerList.reduce(
    (sum, cap, i) => sum + cap * (i / (numRows - 1)),
    0
  );

  // กำหนดความชัน b ตามความสูงเฉลี่ย
  let b = 0;
  if (avgLayers >= 5.0) {
    b = Math.min(3.0, Math.max(1.0, avgLayers * 0.25));
  } else if (avgLayers >= 2.0) {
    b = Math.min(1.5, Math.max(0.4, avgLayers * 0.2));
  } else {
    b = Math.max(0.1, avgLayers * 0.15);
  }

  // กำหนดระดับความสูงขั้นต่ำปลอดภัย (minSafeLayers)
  const minSafeLayers = avgLayers >= 2.6 ? 2.0 : (avgLayers >= 1.4 ? 1.0 : 0.2);

  // คำนวณจุดตัดฐาน a
  let a = (totalPacks - b * weightedProgressSum) / totalCap;
  if (a < minSafeLayers) {
    if (weightedProgressSum > 0) {
      b = Math.max(0, (totalPacks - minSafeLayers * totalCap) / weightedProgressSum);
      a = (totalPacks - b * weightedProgressSum) / totalCap;
    } else {
      a = avgLayers;
      b = 0;
    }
  }

  const rowPacks = new Array(numRows).fill(0);
  let allocatedSum = 0;

  for (let i = 0; i < numRows; i++) {
    const progress = i / (numRows - 1);
    const targetL = a + b * progress;
    const minPacks = Math.max(1, Math.floor(minSafeLayers * perLayerList[i]));
    const p = Math.max(minPacks, Math.floor(targetL * perLayerList[i]));
    rowPacks[i] = p;
    allocatedSum += p;
  }

  // ปรับเกลี่ยส่วนต่างคงเหลือให้ยอดรวมครบ totalPacks พอดีเป๊ะ
  let remaining = totalPacks - allocatedSum;

  if (remaining > 0) {
    // เกลี่ยจากแถวหลังสุดย้อนมาหน้ารถ เพื่อให้แถวท้ายรถสูงกว่า
    while (remaining > 0) {
      for (let i = numRows - 1; i >= 0 && remaining > 0; i--) {
        rowPacks[i]++;
        remaining--;
      }
    }
  } else if (remaining < 0) {
    // หากยอดเกิน ให้ทยอยลดจากแถวหน้า แต่ห้ามลดจนน้อยกว่า 1
    while (remaining < 0) {
      let reduced = false;
      for (let i = 0; i < numRows && remaining < 0; i++) {
        if (rowPacks[i] > 1) {
          rowPacks[i]--;
          remaining++;
          reduced = true;
        }
      }
      if (!reduced) break;
    }
  }

  // ตรวจสอบและปรับปรุงให้ความสูง (ชั้น) ไม่ลดลงจากหน้าไปหลัง (Monotonic Non-Decreasing Ramp)
  for (let iter = 0; iter < numRows * 4; iter++) {
    let adjusted = false;
    for (let i = 0; i < numRows - 1; i++) {
      const hCurr = rowPacks[i] / perLayerList[i];
      const hNext = rowPacks[i + 1] / perLayerList[i + 1];
      if (hCurr > hNext + 1e-4 && rowPacks[i] > 1) {
        rowPacks[i]--;
        rowPacks[i + 1]++;
        adjusted = true;
      }
    }
    if (!adjusted) break;
  }

  return rowPacks;
}

/**
 * จัดเรียงกรณี Single SKU (มีสินค้าเพียงชนิดเดียว)
 */
export function planSingleSkuLadder(
  sku: ProductSku,
  totalPacks: number,
  truckType: TruckType,
  bedLengthCm: number,
  emergencyMode: boolean
): CalculatedRow[] {
  const spec = PRODUCT_SPECS[sku];
  const isFenced = truckType === 'คอก';
  const crossDim = getOrientationDetails(spec, 'ขวาง');
  const longDim = getOrientationDetails(spec, 'ยาว');

  const primaryDim = isFenced ? longDim : crossDim;
  const minRows = Math.max(1, Math.ceil(totalPacks / (primaryDim.perLayer * (spec.maxLayers + 1))));
  const maxRowsByBed = Math.floor(bedLengthCm / Math.min(longDim.lengthCm, crossDim.lengthCm));
  const maxRows = Math.max(minRows, Math.min(totalPacks, maxRowsByBed));

  interface SingleCandidate {
    r: number;
    crossCount: number;
    longCount: number;
    orientations: ('ขวาง' | 'ยาว')[];
    gap: number;
    score: number;
  }

  let bestSol: SingleCandidate | null = null;

  for (let r = minRows; r <= maxRows; r++) {
    for (let longCount = 0; longCount <= r; longCount++) {
      const crossCount = r - longCount;

      const maxLongForFlat = emergencyMode ? 4 : 3;
      if (!isFenced && longCount < 1) continue; // รถพื้นเรียบต้องมีปิดท้ายแนวยาวอย่างน้อย 1 แถว
      if (!isFenced && longCount > maxLongForFlat) continue;
      const maxCrossForFenced = emergencyMode ? 3 : 2;
      if (isFenced && crossCount > maxCrossForFenced) continue;

      const totalLen = crossCount * crossDim.lengthCm + longCount * longDim.lengthCm;
      const gap = bedLengthCm - totalLen;
      if (gap < 0) continue;

      let orientations: ('ขวาง' | 'ยาว')[] = [];
      if (isFenced) {
        // รถคอก: แนวยาวเป็นหลัก แนวขวางท้ายรถ
        for (let i = 0; i < longCount; i++) orientations.push('ยาว');
        for (let i = 0; i < crossCount; i++) orientations.push('ขวาง');
      } else {
        // รถพื้นเรียบ: แนวขวางเป็นหลัก แนวยาวท้ายรถ
        for (let i = 0; i < crossCount; i++) orientations.push('ขวาง');
        for (let i = 0; i < longCount; i++) orientations.push('ยาว');
      }

      const inTolerance = gap <= 15;
      let score = gap;
      if (inTolerance) {
        score -= 2000;
        if (emergencyMode) score -= 20000;
      } else if (emergencyMode) {
        score += 5000;
      }

      // รถคอกชอบแนวยาวล้วน
      if (isFenced) score += crossCount * 30;
      // รถพื้นเรียบชอบแนวยาว 1 แถว
      if (!isFenced) score += Math.abs(longCount - 1) * 20;

      // ชอบความสูงเฉลี่ยไม่เกินพิกัด
      const totalCap =
        crossCount * crossDim.perLayer + longCount * longDim.perLayer;
      const avgL = totalPacks / totalCap;
      if (avgL > spec.maxLayers) score += (avgL - spec.maxLayers) * 100;

      if (!bestSol || score < bestSol.score) {
        bestSol = {
          r,
          crossCount,
          longCount,
          orientations,
          gap,
          score,
        };
      }
    }
  }

  if (!bestSol) {
    const defaultR = Math.min(maxRows, Math.max(1, Math.floor(bedLengthCm / primaryDim.lengthCm)));
    bestSol = {
      r: defaultR,
      crossCount: isFenced ? 0 : Math.max(0, defaultR - 1),
      longCount: isFenced ? defaultR : 1,
      orientations: new Array(defaultR).fill(isFenced ? 'ยาว' : 'ขวาง'),
      gap: bedLengthCm - defaultR * primaryDim.lengthCm,
      score: 99999,
    };
  }

  const perLayerList = bestSol.orientations.map((ori) =>
    ori === 'ยาว' ? longDim.perLayer : crossDim.perLayer
  );

  const packsDistribution = distributePacksSmoothLadder(
    totalPacks,
    bestSol.r,
    perLayerList,
    spec.minLayers,
    spec.maxLayers
  );

  const rows: CalculatedRow[] = [];
  let accum = 0;

  for (let i = 0; i < bestSol.r; i++) {
    const ori = bestSol.orientations[i];
    const len = ori === 'ยาว' ? longDim.lengthCm : crossDim.lengthCm;
    const per = perLayerList[i];
    const packs = packsDistribution[i];
    accum += len;

    const pat = formatStackingPattern(packs, per);
    const layers = Math.ceil(packs / per);
    const heightFactor = layers * spec.thicknessFactor;

    const rowDetail: RowItemDetail = {
      sku,
      name: spec.name,
      packQty: packs,
      bagsQty: packs * spec.unitsPerPack,
      layers,
      perLayer: per,
      fullLayers: pat.fullLayers,
      remainderPacks: pat.remainderPacks,
      stackingPattern: pat.pattern,
      thicknessFactor: spec.thicknessFactor,
      heightFactor,
      color: spec.color,
    };

    rows.push({
      rowIndex: i + 1,
      orientation: ori,
      lengthCm: len,
      accumulatedLengthCm: accum,
      isTransition: false,
      zoneBadge: 'กลางคัน',
      zoneBadgeText: `แถวที่ ${i + 1}`,
      stackingPatternSummary: pat.pattern,
      items: [rowDetail],
      totalPacks: packs,
      totalBags: rowDetail.bagsQty,
      totalLayers: layers,
      totalHeightFactor: heightFactor,
      displayHeightPx: calculateDisplayHeightPx(heightFactor),
    });
  }

  applyZoneBadges(rows);
  return rows;
}
