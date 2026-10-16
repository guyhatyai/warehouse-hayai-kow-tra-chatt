import React, { useState, useMemo, useEffect } from 'react';
import { TruckType, OrderItemInput, ProductSku } from './types/truck';
import { calculateTruckLoadingPlan } from './utils/planner';
import { Header } from './components/Header';
import { TruckConfig } from './components/TruckConfig';
import { OrderInput } from './components/OrderInput';
import { EmergencyAlert } from './components/EmergencyAlert';
import { SideViewVisualizer } from './components/SideViewVisualizer';
import { RowDetailTable } from './components/RowDetailTable';
import { SpecReferenceModal } from './components/SpecReferenceModal';
import { ShareModal } from './components/ShareModal';
import { PrintLayout } from './components/PrintLayout';
import { DEMO_SCENARIOS, DemoScenario, DEFAULT_TRUCK_LENGTHS } from './utils/productConstants';
import { Layers, Truck, ShieldCheck, Sparkles } from 'lucide-react';

export default function App() {
  // สลับโหมดการคำนวณแยกฟังก์ชัน: 'simple' (1–2 รายการ) vs 'multi' (3–5 รายการ)
  const [plannerMode, setPlannerMode] = useState<'simple' | 'multi'>('multi');

  // ค่าเริ่มต้น: รถสิบล้อ พื้นเรียบ 620 ซม. พร้อมชุดสั่งซื้อตามใบ DO จริง (15 ตัน)
  const [truckType, setTruckType] = useState<TruckType>('พื้นเรียบ');
  const [bedLengthCm, setBedLengthCm] = useState<number>(620);
  const [emergencyMode, setEmergencyMode] = useState<boolean>(false);
  const [isSpecsOpen, setIsSpecsOpen] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);

  const [orderItems, setOrderItems] = useState<OrderItemInput[]>([
    { id: 'item-1', sku: '1kg', bags: 2000 }, // 200 มัด
    { id: 'item-2', sku: '5kg', bags: 600 },  // 100 มัด
    { id: 'item-3', sku: '14kg', bags: 100 }, // 100 กระสอบ
    { id: 'item-4', sku: '15kg', bags: 200 }, // 200 กระสอบ
    { id: 'item-5', sku: '40kg', bags: 140 }, // 140 กระสอบ
  ]);

  // ตรวจสอบและดึงค่าจาก URL หากมีคนแชร์ลิงก์พร้อมการตั้งค่ามา
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const truckParam = params.get('truck');
      const lengthParam = params.get('length');
      const itemsParam = params.get('items');
      const modeParam = params.get('mode');

      if (modeParam === 'simple' || modeParam === 'multi') {
        setPlannerMode(modeParam);
      }
      if (truckParam === 'พื้นเรียบ' || truckParam === 'คอก') {
        setTruckType(truckParam as TruckType);
      }
      if (lengthParam) {
        const parsedLen = parseInt(lengthParam, 10);
        if (!isNaN(parsedLen) && parsedLen >= 500 && parsedLen <= 800) {
          setBedLengthCm(parsedLen);
        }
      }
      if (itemsParam) {
        const pairs = itemsParam.split(',');
        const newItems: OrderItemInput[] = [];
        const validSkus: ProductSku[] = ['1kg', '5kg', '14kg', '15kg', '40kg'];

        pairs.forEach((pair, idx) => {
          const [sku, bagsStr] = pair.split(':');
          const bags = parseInt(bagsStr, 10);
          if (validSkus.includes(sku as ProductSku) && !isNaN(bags)) {
            newItems.push({
              id: `shared-item-${idx}-${Date.now()}`,
              sku: sku as ProductSku,
              bags: Math.max(0, bags),
            });
          }
        });

        if (newItems.length > 0) {
          setOrderItems(newItems);
          if (newItems.filter((i) => i.bags > 0).length <= 2) {
            setPlannerMode('simple');
          } else {
            setPlannerMode('multi');
          }
        }
      }
    } catch (e) {
      console.error('Error parsing shared URL params', e);
    }
  }, []);

  // คำนวณแผนการจัดเรียงสินค้าแบบเรียลไทม์โดยส่งโหมดบังคับ (forcedMode)
  const plan = useMemo(() => {
    return calculateTruckLoadingPlan(
      orderItems,
      truckType,
      bedLengthCm,
      emergencyMode,
      plannerMode
    );
  }, [orderItems, truckType, bedLengthCm, emergencyMode, plannerMode]);

  // สลับโหมดการทำงาน
  const handleModeChange = (mode: 'simple' | 'multi') => {
    setPlannerMode(mode);
    setEmergencyMode(false);

    if (mode === 'simple') {
      // หากอยู่ในโหมด Simple และมีสินค้าเกิน 2 ชนิด ให้ลดเหลือ 2 ชนิดแรกที่มีจำนวน
      const activeItems = orderItems.filter((it) => it.bags > 0);
      if (activeItems.length > 2) {
        setOrderItems(activeItems.slice(0, 2));
      } else if (orderItems.length > 2) {
        setOrderItems(orderItems.slice(0, 2));
      }
    } else if (mode === 'multi') {
      // หากอยู่ในโหมด Multi แต่มีสินค้าน้อยกว่า 3 ชนิด แนะนำให้โหลดกรณีศึกษาออเดอร์ผสม
      const activeCount = orderItems.filter((it) => it.bags > 0).length;
      if (activeCount < 3) {
        handleApplyScenario(DEMO_SCENARIOS[0]);
      }
    }
  };

  // จัดการการเปลี่ยนประเภทรถ
  const handleTruckTypeChange = (type: TruckType) => {
    setTruckType(type);
    setBedLengthCm(DEFAULT_TRUCK_LENGTHS[type]);
    setEmergencyMode(false);
  };

  // จัดการการเปลี่ยนขนาดความยาวกระบะ
  const handleBedLengthChange = (lengthCm: number) => {
    setBedLengthCm(lengthCm);
    setEmergencyMode(false);
  };

  // โหลดกรณีศึกษาตัวอย่าง
  const handleApplyScenario = (scenario: DemoScenario) => {
    setTruckType(scenario.truckType);
    setBedLengthCm(scenario.bedLengthCm);
    setEmergencyMode(false);
    if (scenario.mode) {
      setPlannerMode(scenario.mode);
    } else {
      setPlannerMode(scenario.items.length <= 2 ? 'simple' : 'multi');
    }
    setOrderItems(
      scenario.items.map((item, idx) => ({
        id: `sc-item-${idx}-${Date.now()}`,
        sku: item.sku,
        bags: item.bags,
      }))
    );
  };

  // รีเซ็ตสู่ค่าเริ่มต้น (DO หลัก 620 ซม.)
  const handleReset = () => {
    const defaultScenario = plannerMode === 'simple' ? DEMO_SCENARIOS[4] : DEMO_SCENARIOS[0];
    handleApplyScenario(defaultScenario);
  };

  // สลับโหมดปรับแถวฉุกเฉิน
  const handleToggleEmergency = () => {
    setEmergencyMode((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-['Prompt',sans-serif]">
      {/* Header สำหรับหน้าจอ (ซ่อนในโหมดพิมพ์) */}
      <Header
        truckType={truckType}
        bedLengthCm={bedLengthCm}
        emergencyMode={emergencyMode}
        onToggleEmergency={handleToggleEmergency}
        onOpenSpecs={() => setIsSpecsOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onReset={handleReset}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 no-print">
        {/* แถบเลือกโหมดหลักแบบแท็บ (Mode Selection Banner) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-800 whitespace-nowrap">
                เลือกโหมดการจัดเรียง:
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 flex-1 max-w-lg">
              <button
                type="button"
                onClick={() => handleModeChange('simple')}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                  plannerMode === 'simple'
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/50'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>โหมด 1–2 รายการ (Simple)</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('multi')}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                  plannerMode === 'multi'
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/50'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>โหมด 3–5 รายการ (Multi-SKU)</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 hidden md:flex items-center gap-1.5 shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {plannerMode === 'simple'
                  ? 'กระจายขั้นบันไดมาตรฐาน (1–2 ชนิด)'
                  : 'จัดเรียงซ้อน 5kg → 14kg → 15kg ชิดท้าย 0–15 ซม.'}
              </span>
            </div>
          </div>
        </div>

        {/* 1. ข้อมูลรถและมิติกระบะ */}
        <TruckConfig
          truckType={truckType}
          bedLengthCm={bedLengthCm}
          onTruckTypeChange={handleTruckTypeChange}
          onBedLengthChange={handleBedLengthChange}
        />

        {/* 2. รายการสินค้าสั่งซื้อตามใบ DO */}
        <OrderInput
          orderItems={orderItems}
          plannerMode={plannerMode}
          onOrderItemsChange={(items) => {
            setOrderItems(items);
            setEmergencyMode(false);
          }}
          onApplyScenario={handleApplyScenario}
          onPlannerModeChange={handleModeChange}
        />

        {/* 3. กล่องแจ้งเตือนเกณฑ์บังคับพื้นที่ท้ายรถ (0-15 ซม.) */}
        <EmergencyAlert
          plan={plan}
          onToggleEmergency={handleToggleEmergency}
        />

        {/* 4. ภาพจำลองตัวรถด้านข้าง (Side-View Visualizer) */}
        <SideViewVisualizer plan={plan} />

        {/* 5. ตารางแจกแจงรายแถว (Row by Row Table) */}
        <RowDetailTable plan={plan} />
      </main>

      {/* Footer หน้าจอ */}
      <footer className="bg-slate-900 text-slate-400 py-6 text-center text-xs border-t border-slate-800 no-print mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© ระบบวางแผนจัดเรียงสินค้าขึ้นรถบรรทุก (Truck Loading Planner) — Logistics Engineering System</p>
          <div className="flex items-center gap-4 text-slate-300">
            <span>เกณฑ์พื้นที่ท้ายรถปลอดภัย 0–15 ซม.</span>
            <span>•</span>
            <button
              onClick={() => setIsShareOpen(true)}
              className="text-emerald-400 hover:underline cursor-pointer"
            >
              แชร์ให้ผู้อื่นใช้งาน
            </button>
            <span>•</span>
            <button
              onClick={() => setIsSpecsOpen(true)}
              className="text-amber-400 hover:underline cursor-pointer"
            >
              คู่มือสเปกมาตรฐาน
            </button>
          </div>
        </div>
      </footer>

      {/* หน้าพิมพ์ A4 (แสดงผลเฉพาะเมื่อสั่งพิมพ์ window.print()) */}
      <PrintLayout plan={plan} />

      {/* Modal คู่มือสเปกและรูปภาพอ้างอิง */}
      <SpecReferenceModal
        isOpen={isSpecsOpen}
        onClose={() => setIsSpecsOpen(false)}
      />

      {/* Modal แชร์ลิงก์ให้ผู้อื่นใช้งาน */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        truckType={truckType}
        bedLengthCm={bedLengthCm}
        orderItems={orderItems}
      />
    </div>
  );
}
