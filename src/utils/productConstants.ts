import { ProductSku, ProductSpec } from '../types/truck';

export const PRODUCT_SPECS: Record<ProductSku, ProductSpec> = {
  '1kg': {
    sku: '1kg',
    name: 'ข้าว 1 กก.',
    weightKg: 1.0,
    unitsPerPack: 10,
    packUnitName: 'มัด',
    unitName: 'ถุง',
    crossLen: 20,
    crossPerLayer: 5,
    longLen: 45,
    longPerLayer: 10,
    thicknessFactor: 0.5,
    minLayers: 10,
    maxLayers: 12,
    standardTargetLayers: 10,
    color: '#ea580c', // ส้ม
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'มัดละ 10 ถุง หนา 0.5 เท่า วางหน้าสุดเสมอ 10-12 ชั้น',
  },
  '5kg': {
    sku: '5kg',
    name: 'ข้าว 5 กก.',
    weightKg: 5.0,
    unitsPerPack: 6,
    packUnitName: 'มัด',
    unitName: 'ถุง',
    crossLen: 40,
    crossPerLayer: 4,
    longLen: 60,
    longPerLayer: 6,
    thicknessFactor: 1.0,
    minLayers: 6,
    maxLayers: 10,
    standardTargetLayers: 8,
    color: '#2563eb', // น้ำเงิน
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'มัดละ 6 ถุง หนามาตรฐาน 1.0 เท่า ซ้อน 6-10 ชั้น (ปกติ 8 ชั้น)',
  },
  '14kg': {
    sku: '14kg',
    name: 'ข้าว 14 กก.',
    weightKg: 14.0,
    unitsPerPack: 1,
    packUnitName: 'กระสอบ',
    unitName: 'กระสอบ',
    crossLen: 40,
    crossPerLayer: 6,
    longLen: 60,
    longPerLayer: 7,
    thicknessFactor: 2.0 / 3.0,
    minLayers: 11,
    maxLayers: 13,
    standardTargetLayers: 12,
    color: '#16a34a', // เขียว
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'กระสอบเดี่ยว หนา 0.67 เท่า ฐาน 40x60 ซม. ซ้อน 11-13 ชั้น',
  },
  '15kg': {
    sku: '15kg',
    name: 'ข้าว 15 กก.',
    weightKg: 15.0,
    unitsPerPack: 1,
    packUnitName: 'กระสอบ',
    unitName: 'กระสอบ',
    crossLen: 40,
    crossPerLayer: 6,
    longLen: 60,
    longPerLayer: 7,
    thicknessFactor: 2.0 / 3.0,
    minLayers: 11,
    maxLayers: 14,
    standardTargetLayers: 13,
    color: '#9333ea', // ม่วง
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'กระสอบเดี่ยว หนา 0.67 เท่า ฐาน 40x60 ซม. ซ้อน 11-14 ชั้น ไต่ระดับต่อเนื่อง',
  },
  '40kg': {
    sku: '40kg',
    name: 'ข้าว 40 กก.',
    weightKg: 40.0,
    unitsPerPack: 1,
    packUnitName: 'กระสอบ',
    unitName: 'กระสอบ',
    crossLen: 50,
    crossPerLayer: 4,
    longLen: 65,
    longPerLayer: 5,
    thicknessFactor: 1.0,
    minLayers: 6,
    maxLayers: 10,
    standardTargetLayers: 9,
    color: '#dc2626', // แดง
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'กระสอบเดี่ยว หนา 1.0 เท่า วางแน่นทึบเต็มพิกัด 6-10 ชั้น ปิดท้ายแนวยาว',
  },
};

export const PIPELINE_ORDER: ProductSku[] = ['1kg', '5kg', '14kg', '15kg', '40kg'];

export const TRUCK_PRESET_LENGTHS = [570, 610, 620, 625, 640, 700] as const;

export const DEFAULT_TRUCK_LENGTHS = {
  'คอก': 570,
  'พื้นเรียบ': 620,
};

// Preset demo scenarios for easy testing by users
export interface DemoScenario {
  id: string;
  name: string;
  truckType: 'พื้นเรียบ' | 'คอก';
  bedLengthCm: number;
  description: string;
  mode?: 'simple' | 'multi';
  items: { sku: ProductSku; bags: number }[];
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  // โหมด 3–5 รายการ (Multi-SKU)
  {
    id: 'scenario-user-do-620',
    name: 'ตัวอย่าง 1: เอกสาร DO ประจำวัน (รถพื้นเรียบ 620 ซม. ยอด 15 ตัน)',
    truckType: 'พื้นเรียบ',
    bedLengthCm: 620,
    mode: 'multi',
    description: '1kg: 2,000, 5kg: 600, 14kg: 100, 15kg: 200, 40kg: 140 จัดเต็มคันชิดท้าย 0–15 ซม.',
    items: [
      { sku: '1kg', bags: 2000 },
      { sku: '5kg', bags: 600 },
      { sku: '14kg', bags: 100 },
      { sku: '15kg', bags: 200 },
      { sku: '40kg', bags: 140 },
    ],
  },
  {
    id: 'scenario-user-do-625',
    name: 'ตัวอย่าง 2: รถพื้นเรียบ 625 ซม. (ยอด DO 15 ตัน วางเต็มกระบะพอดีเป๊ะ 0 ซม.)',
    truckType: 'พื้นเรียบ',
    bedLengthCm: 625,
    mode: 'multi',
    description: '1kg: 2,000, 5kg: 600, 14kg: 100, 15kg: 200, 40kg: 140 คำนวณเต็มคัน 625 ซม. เหลือท้าย 0 ซม.',
    items: [
      { sku: '1kg', bags: 2000 },
      { sku: '5kg', bags: 600 },
      { sku: '14kg', bags: 100 },
      { sku: '15kg', bags: 200 },
      { sku: '40kg', bags: 140 },
    ],
  },
  {
    id: 'scenario-mixed-flatbed-610',
    name: 'ตัวอย่าง 3: รถพื้นเรียบ 610 ซม. (คละขนาดกลาง 5kg + 14kg + 15kg)',
    truckType: 'พื้นเรียบ',
    bedLengthCm: 610,
    mode: 'multi',
    description: '1kg: 1,500, 5kg: 480, 14kg: 90, 15kg: 150, 40kg: 120 ซ้อนต่อเนื่อง 5k->14k->15k',
    items: [
      { sku: '1kg', bags: 1500 },
      { sku: '5kg', bags: 480 },
      { sku: '14kg', bags: 90 },
      { sku: '15kg', bags: 150 },
      { sku: '40kg', bags: 120 },
    ],
  },
  {
    id: 'scenario-fenced-truck',
    name: 'ตัวอย่าง 4: รถสิบล้อคอก (570 ซม.) ข้าว 5kg + 14kg + 40kg',
    truckType: 'คอก',
    bedLengthCm: 570,
    mode: 'multi',
    description: 'จัดแนวยาวตามแนวคอกกั้น พร้อมตรวจสอบพื้นที่ท้ายรถไม่เกิน 15 ซม.',
    items: [
      { sku: '5kg', bags: 360 },
      { sku: '14kg', bags: 180 },
      { sku: '40kg', bags: 180 },
    ],
  },

  // โหมด 1–2 รายการ (Simple Mode)
  {
    id: 'scenario-single-40kg',
    name: 'ตัวอย่าง A (1 ชนิด): ข้าว 40 กก. ล้วนเต็มคัน',
    truckType: 'พื้นเรียบ',
    bedLengthCm: 610,
    mode: 'simple',
    description: 'ข้าว 40 กก. 380 กระสอบ กระจายยอดแบบขั้นบันไดไต่ระดับจนถึง 10 ชั้นเต็มพิกัด',
    items: [
      { sku: '40kg', bags: 380 },
    ],
  },
  {
    id: 'scenario-simple-5k-40k',
    name: 'ตัวอย่าง B (2 ชนิด): ข้าว 5 กก. + 40 กก. รถคอก',
    truckType: 'คอก',
    bedLengthCm: 570,
    mode: 'simple',
    description: 'ข้าว 5kg (300 ถุง) + ข้าว 40kg (120 กระสอบ) วางโซนหน้าและท้ายรถ',
    items: [
      { sku: '5kg', bags: 300 },
      { sku: '40kg', bags: 120 },
    ],
  },
  {
    id: 'scenario-simple-1k-5k',
    name: 'ตัวอย่าง C (2 ชนิด): ข้าว 1 กก. + 5 กก. รถพื้นเรียบ',
    truckType: 'พื้นเรียบ',
    bedLengthCm: 620,
    mode: 'simple',
    description: 'ข้าว 1kg (1,200 ถุง) + ข้าว 5kg (720 ถุง) กระจายสมดุลเต็มกระบะ',
    items: [
      { sku: '1kg', bags: 1200 },
      { sku: '5kg', bags: 720 },
    ],
  },
];
