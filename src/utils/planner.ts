import {
  OrderItemInput,
  TruckPlanResult,
  TruckType,
} from '../types/truck';
import { calculateSimpleLoadingPlan } from './plannerSimple';
import { calculateMultiSkuLoadingPlan } from './plannerMultiSku';

export {
  applyZoneBadges,
  calculateDisplayHeightPx,
  distributePacksSmoothLadder,
  formatStackingPattern,
  getOrientationDetails,
  planSingleSkuLadder,
  recalculateAccumulated,
} from './plannerShared';

export { calculateSimpleLoadingPlan } from './plannerSimple';
export { calculateMultiSkuLoadingPlan } from './plannerMultiSku';

/**
 * Unified Dispatcher: เลือกระหว่าง Simple Planner และ Multi-SKU Planner
 * - หากระบุ forcedMode จะใช้โหมดนั้นทันที
 * - หากไม่ระบุ จะพิจารณาจากจำนวน SKU ที่มีสินค้า:
 *   - 1 ถึง 2 SKU => Simple Planner (เสถียร แม่นยำสูง)
 *   - 3 ถึง 5 SKU => Multi-SKU Planner (Cascade Stacking 5kg -> 14kg -> 15kg)
 */
export function calculateTruckLoadingPlan(
  orderItems: OrderItemInput[],
  truckType: TruckType,
  bedLengthCm: number,
  emergencyMode: boolean = false,
  forcedMode?: 'simple' | 'multi'
): TruckPlanResult {
  const activeCount = orderItems.filter((i) => i.bags > 0).length;

  if (forcedMode === 'simple') {
    return calculateSimpleLoadingPlan(orderItems, truckType, bedLengthCm, emergencyMode);
  }

  if (forcedMode === 'multi') {
    return calculateMultiSkuLoadingPlan(orderItems, truckType, bedLengthCm, emergencyMode);
  }

  // อัตโนมัติตามจำนวนสินค้า
  if (activeCount <= 2) {
    return calculateSimpleLoadingPlan(orderItems, truckType, bedLengthCm, emergencyMode);
  } else {
    return calculateMultiSkuLoadingPlan(orderItems, truckType, bedLengthCm, emergencyMode);
  }
}
