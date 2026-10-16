export type TruckType = 'พื้นเรียบ' | 'คอก';

export type ProductSku = '1kg' | '5kg' | '14kg' | '15kg' | '40kg';

export interface ProductSpec {
  sku: ProductSku;
  name: string;
  weightKg: number;
  unitsPerPack: number; // 10 for 1kg, 6 for 5kg, 1 for others
  packUnitName: string; // 'มัด' หรือ 'กระสอบ'
  unitName: string; // 'ถุง' หรือ 'กระสอบ'
  crossLen: number; // ความยาวแนวกระบะเมื่อวางแนวขวาง (ซม.)
  crossPerLayer: number; // จำนวนบรรจุต่อชั้นแนวขวาง
  longLen: number; // ความยาวแนวกระบะเมื่อวางแนวยาว (ซม.)
  longPerLayer: number; // จำนวนบรรจุต่อชั้นแนวยาว
  thicknessFactor: number; // ตัวคูณความหนาจริงเทียบเท่าข้าว 5 กก.
  minLayers: number;
  maxLayers: number;
  standardTargetLayers: number;
  color: string;
  badgeColor: string;
  description: string;
}

export interface OrderItemInput {
  id: string;
  sku: ProductSku;
  bags: number; // จำนวนถุง/กระสอบตามใบ DO
}

export interface RowItemDetail {
  sku: ProductSku;
  name: string;
  packQty: number; // จำนวนมัดหรือกระสอบ
  bagsQty: number; // จำนวนถุงจริง
  layers: number; // จำนวนชั้นรวม (ปัดขึ้น)
  perLayer: number; // จำนวนบรรจุต่อชั้น (เช่น 4, 5, 6, 7, 10)
  fullLayers: number; // จำนวนชั้นเต็ม
  remainderPacks: number; // เศษที่วางเพิ่มด้านบน (ถ้ามี เช่น 2, 3)
  stackingPattern: string; // สูตรการวาง เช่น "4×8", "4×8 (เศษ 2)"
  thicknessFactor: number;
  heightFactor: number; // layers * thicknessFactor
  positionLabel?: string; // 'ฐานล่าง' | 'ชั้นกลาง' | 'ซ้อนบน'
  color: string;
}

export type ZoneBadgeType = 'โซนหน้า' | 'กลางคัน' | 'แถวเชื่อมต่อ' | 'ปิดท้าย';

export interface CalculatedRow {
  rowIndex: number;
  orientation: 'ขวาง' | 'ยาว';
  lengthCm: number;
  accumulatedLengthCm: number;
  isTransition: boolean;
  zoneBadge: ZoneBadgeType;
  zoneBadgeText: string;
  stackingPatternSummary: string; // สรุปสูตรการวาง เช่น "4×10", "4×8 (เศษ 2)"
  items: RowItemDetail[];
  totalPacks: number;
  totalBags: number;
  totalLayers: number;
  totalHeightFactor: number; // ความสูงจริงเทียบเท่า
  displayHeightPx: number; // สำหรับ Side-View visualizer (จำกัดสูงสุด ~160px)
}

export interface TruckPlanResult {
  truckType: TruckType;
  bedLengthCm: number;
  usedLengthCm: number;
  remainingRearSpaceCm: number;
  withinTolerance: boolean; // 0 <= remainingRearSpaceCm <= 15
  strictCompliance: boolean; // ตรงตามกฎ ห้ามเหลือพื้นที่ท้ายรถเกิน 15 ซม.เด็ดขาด
  isOverloadedLength: boolean; // remainingRearSpaceCm < 0
  emergencyAvailable: boolean; // remaining > 15
  emergencyActive: boolean;
  emergencyAdjustmentNotes?: string[];
  totalRows: number;
  totalBags: number;
  totalWeightKg: number;
  rows: CalculatedRow[];
  activeSkus: ProductSku[];
}
