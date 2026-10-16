import React, { useState } from 'react';
import { OrderItemInput, ProductSku } from '../types/truck';
import { PIPELINE_ORDER, PRODUCT_SPECS, DEMO_SCENARIOS, DemoScenario } from '../utils/productConstants';
import { Plus, Trash2, ShoppingBag, Sparkles, AlertCircle, ArrowRightLeft, Layers, Truck } from 'lucide-react';

interface OrderInputProps {
  orderItems: OrderItemInput[];
  plannerMode: 'simple' | 'multi';
  onOrderItemsChange: (items: OrderItemInput[]) => void;
  onApplyScenario: (scenario: DemoScenario) => void;
  onPlannerModeChange: (mode: 'simple' | 'multi') => void;
}

export const OrderInput: React.FC<OrderInputProps> = ({
  orderItems,
  plannerMode,
  onOrderItemsChange,
  onApplyScenario,
  onPlannerModeChange,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleItemChange = (id: string, field: 'sku' | 'bags', value: any) => {
    setErrorMessage(null);
    const updated = orderItems.map((item) => {
      if (item.id === id) {
        if (field === 'bags') {
          return { ...item, bags: Math.max(0, parseInt(value, 10) || 0) };
        }
        return { ...item, [field]: value };
      }
      return item;
    });
    onOrderItemsChange(updated);
  };

  const handleAddItem = () => {
    setErrorMessage(null);
    if (plannerMode === 'simple' && orderItems.length >= 2) {
      setErrorMessage(
        '⚠️ โหมด 1–2 รายการ (Simple Mode) รองรับสินค้าไม่เกิน 2 ชนิด หากต้องการจัด 3–5 ชนิด กรุณาสลับไปที่ "โหมด 3–5 รายการ (Multi-SKU)"'
      );
      return;
    }
    if (plannerMode === 'multi' && orderItems.length >= 5) {
      setErrorMessage('⚠️ สามารถเพิ่มสินค้าได้สูงสุด 5 ชนิดตามสเปกมาตรฐาน');
      return;
    }

    const existingSkus = new Set(orderItems.map((i) => i.sku));
    const nextSku = PIPELINE_ORDER.find((s) => !existingSkus.has(s)) || '40kg';
    const newItem: OrderItemInput = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sku: nextSku,
      bags: nextSku === '1kg' ? 1000 : nextSku === '5kg' ? 300 : 50,
    };
    onOrderItemsChange([...orderItems, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    if (orderItems.length <= 1) {
      setErrorMessage('⚠️ ต้องมีอย่างน้อย 1 รายการ ไม่อนุญาตให้ลบแถวสุดท้ายทิ้ง');
      return;
    }
    setErrorMessage(null);
    onOrderItemsChange(orderItems.filter((item) => item.id !== id));
  };

  const filteredScenarios = DEMO_SCENARIOS.filter(
    (sc) => !sc.mode || sc.mode === plannerMode
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 no-print">
      {/* Header และแท็บเลือกโหมดหลัก */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pb-4 mb-4 border-b border-slate-200 gap-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-amber-600" />
          <div>
            <h2 className="font-semibold text-slate-800 text-base sm:text-lg">
              รายการสินค้าสั่งซื้อตามใบ DO (Delivery Order)
            </h2>
            <p className="text-xs text-slate-500">
              {plannerMode === 'simple'
                ? 'โหมด 1–2 รายการ (Simple Mode): คำนวณแบบกระจายขั้นบันไดมาตรฐาน เสถียร แม่นยำสูง'
                : 'โหมด 3–5 รายการ (Multi-SKU Mode): กฎเรียงซ้อนแนวตั้ง 5kg → 14kg → 15kg ชิดท้าย 0–15 ซม.'}
            </p>
          </div>
        </div>

        {/* แท็บสลับโหมด 1-2 vs 3-5 */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              onPlannerModeChange('simple');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
              plannerMode === 'simple'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>โหมด 1–2 รายการ (Simple)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              onPlannerModeChange('multi');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
              plannerMode === 'multi'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>โหมด 3–5 รายการ (Multi-SKU)</span>
          </button>
        </div>
      </div>

      {/* แถบชุดตัวอย่างแบบเร่งด่วนตามโหมดที่เลือก (Quick Demos) */}
      <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>ตัวอย่างออเดอร์สำหรับ {plannerMode === 'simple' ? 'โหมด 1–2 รายการ' : 'โหมด 3–5 รายการ'}:</span>
          </div>
          <span className="text-[11px] text-slate-400 font-normal">
            คลิกเพื่อโหลดการตั้งค่าอัตโนมัติ
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {filteredScenarios.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => {
                setErrorMessage(null);
                onApplyScenario(sc);
              }}
              className="text-left p-2 rounded bg-white hover:bg-amber-50/80 border border-slate-200 hover:border-amber-300 transition text-xs cursor-pointer shadow-2xs group"
            >
              <div className="font-medium text-slate-800 group-hover:text-amber-800 line-clamp-1">
                {sc.name}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                {sc.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* แจ้งเตือนข้อผิดพลาดถ้ามี */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between gap-2 text-rose-700 text-xs sm:text-sm font-medium animate-shake">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {plannerMode === 'simple' && orderItems.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                onPlannerModeChange('multi');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer shrink-0"
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>สลับไปโหมด 3–5 รายการ</span>
            </button>
          )}
        </div>
      )}

      {/* ตารางกรอกรายการสินค้า */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <th className="py-2.5 px-3">ลำดับ</th>
              <th className="py-2.5 px-3 min-w-[200px]">ประเภทสินค้า</th>
              <th className="py-2.5 px-3 min-w-[140px]">จำนวนสั่งซื้อ (ถุง/กระสอบ)</th>
              <th className="py-2.5 px-3 min-w-[130px]">แปลงเป็นหน่วยขึ้นรถ</th>
              <th className="py-2.5 px-3 min-w-[150px]">เกณฑ์ความสูงหน้างาน</th>
              <th className="py-2.5 px-3 text-center w-16">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orderItems.map((item, index) => {
              const spec = PRODUCT_SPECS[item.sku];
              const packs = Math.ceil(item.bags / spec.unitsPerPack);

              return (
                <tr key={item.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-2.5 px-3 text-xs font-mono text-slate-400">
                    #{index + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: spec.color }}
                      />
                      <select
                        value={item.sku}
                        onChange={(e) => handleItemChange(item.id, 'sku', e.target.value as ProductSku)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-md py-1.5 px-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                      >
                        {PIPELINE_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {PRODUCT_SPECS[s].name} ({PRODUCT_SPECS[s].weightKg} กก./ถุง)
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step={spec.unitsPerPack}
                        value={item.bags}
                        onChange={(e) => handleItemChange(item.id, 'bags', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-md py-1.5 pl-2.5 pr-10 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                      />
                      <span className="absolute right-2 top-2 text-xs text-slate-400 font-medium">
                        ถุง
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="text-xs sm:text-sm font-semibold text-slate-800">
                      {packs.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        {spec.packUnitName}
                      </span>
                    </div>
                    {spec.unitsPerPack > 1 && (
                      <div className="text-[11px] text-slate-400">
                        ({spec.unitsPerPack} ถุง/{spec.packUnitName})
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${spec.badgeColor}`}>
                      {spec.sku === '1kg' && '10–12 ชั้น (หน้าสุด)'}
                      {spec.sku === '5kg' && '6–10 ชั้น (ปกติ 8 ชั้น)'}
                      {spec.sku === '14kg' && '11–13 ชั้น (ชดเชยบาง)'}
                      {spec.sku === '15kg' && '11–14 ชั้น (ไต่ระดับ)'}
                      {spec.sku === '40kg' && 'เต็มพิกัด 6–10 ชั้น'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                      title="ลบแถวสินค้า"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs sm:text-sm font-medium transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มแถวสินค้า {plannerMode === 'simple' ? '(สูงสุด 2 ชนิด)' : '(สูงสุด 5 ชนิด)'}</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {plannerMode === 'simple'
            ? '* โหมด 1–2 รายการ: ประมวลผลรวดเร็ว กระจายขั้นบันไดมาตรฐาน'
            : '* โหมด 3–5 รายการ: วาง 5 กก. ให้หมดก่อนขึ้นขนาดถัดไป (5kg -> 14kg -> 15kg) ชิดท้าย 0–15 ซม.'}
        </span>
      </div>
    </div>
  );
};
