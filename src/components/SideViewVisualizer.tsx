import React, { useState } from 'react';
import { CalculatedRow, TruckPlanResult } from '../types/truck';
import { ArrowLeft, ArrowRight, Layers, Maximize2 } from 'lucide-react';
import { PRODUCT_SPECS } from '../utils/productConstants';

interface SideViewVisualizerProps {
  plan: TruckPlanResult;
}

export const SideViewVisualizer: React.FC<SideViewVisualizerProps> = ({ plan }) => {
  const [hoveredRow, setHoveredRow] = useState<CalculatedRow | null>(null);

  if (plan.rows.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">
        ไม่มีข้อมูลแถวสินค้าสำหรับแสดงภาพจำลองตัวรถ
      </div>
    );
  }

  // คำนวณความกว้างสัดส่วนของแต่ละแถวตามความยาว (ซม.)
  const totalBedCm = plan.bedLengthCm;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 print:shadow-none print:border-slate-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-600" />
          <h2 className="font-semibold text-slate-800 text-base sm:text-lg">
            ภาพจำลองตัวรถด้านข้าง (Side-View Visualizer)
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <span>ความสูงกราฟิกคำนวณตามสัดส่วนจริง (สูงสุด 160px)</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">จัดเรียงลาดเอียงแบบขั้นบันได</span>
        </div>
      </div>

      {/* แถบระบุทิศทางหัวรถและท้ายรถ ตามข้อกำหนด 5.6 */}
      <div className="flex items-center justify-between text-xs font-bold mb-3 px-2 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
        <div className="flex items-center gap-1.5 text-amber-800">
          <ArrowLeft className="w-4 h-4 text-amber-600 animate-pulse" />
          <span>ด้านหน้ากระบะ (เตี้ยสุด)</span>
        </div>
        <div className="text-slate-500 font-medium text-[11px] hidden md:block">
          ◄ ลำดับการเรียงสินค้าไต่ระดับความสูงจากหน้ารถไปท้ายรถ (Monotonic Ladder) ►
        </div>
        <div className="flex items-center gap-1.5 text-rose-800">
          <span>ด้านท้ายรถ (สูงเต็มพิกัด)</span>
          <ArrowRight className="w-4 h-4 text-rose-600 animate-pulse" />
        </div>
      </div>

      {/* กรอบตัวรถและกระบะบรรทุก */}
      <div className="relative bg-gradient-to-b from-slate-50 to-slate-100/90 rounded-xl p-3 sm:p-4 border border-slate-200 overflow-x-auto">
        <div className="min-w-[680px]">
          {/* ขอบเขตกระบะด้านบน */}
          <div className="flex items-end justify-between gap-1 h-[210px] pb-6 relative border-b-4 border-slate-800">
            {/* เส้นบอกระดับความสูงสูงสุด (160px) */}
            <div className="absolute left-0 right-0 bottom-[166px] border-b border-dashed border-slate-300 pointer-events-none flex items-center justify-end pr-2">
              <span className="text-[10px] font-mono text-slate-400 bg-white/80 px-1 rounded">
                พิกัดสูงสุด 10-11 เท่า (~160px)
              </span>
            </div>

            {/* ส่วนหัวเก๋งรถบรรทุก (Truck Cab Visual on Left) */}
            <div className="w-14 h-36 bg-gradient-to-r from-slate-700 to-slate-800 rounded-t-xl rounded-bl-sm relative shrink-0 flex flex-col justify-between p-1.5 shadow-sm">
              <div className="w-8 h-8 bg-sky-200/90 rounded-md border border-slate-400 mx-auto mt-1 flex items-center justify-center">
                <span className="text-[9px] font-bold text-sky-900">CAB</span>
              </div>
              <div className="text-[10px] text-center font-bold text-amber-400 tracking-tighter">
                หัวรถ
              </div>
            </div>

            {/* พื้นที่กระบะบรรทุก (Truck Cargo Bed) */}
            <div className="flex-1 flex items-end justify-start gap-1 h-full relative pl-2 pr-2">
              {plan.rows.map((row) => {
                // คำนวณความสูงแสดงผลตาม displayHeightPx (จำกัดสูงสุด 160px ตามข้อ 5.6)
                const heightPx = row.displayHeightPx;

                return (
                  <div
                    key={row.rowIndex}
                    onMouseEnter={() => setHoveredRow(row)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className="flex-1 min-w-[34px] flex flex-col items-center justify-end group relative cursor-pointer"
                    style={{ height: '100%' }}
                  >
                    {/* แท่งสินค้า (Stacked Bar) */}
                    <div
                      className={`w-full rounded-t-sm flex flex-col-reverse justify-start overflow-hidden border border-slate-900/30 transition-all duration-150 ${
                        hoveredRow?.rowIndex === row.rowIndex
                          ? 'ring-2 ring-amber-500 scale-y-[1.02] shadow-md z-10'
                          : 'shadow-xs hover:brightness-105'
                      }`}
                      style={{ height: `${heightPx}px` }}
                    >
                      {/* หากเป็นแถวเชื่อมต่อ แสดงแท่งสีซ้อนกัน 2-3 ชั้น ตามข้อ 5.7 */}
                      {row.items.map((item, itIdx) => {
                        const itemHeightRatio = item.heightFactor / row.totalHeightFactor;
                        const skuShort = item.sku.replace('kg', 'k');

                        return (
                          <div
                            key={itIdx}
                            className="w-full flex items-center justify-center text-white font-bold text-[10px] tracking-tight relative border-t border-white/20 first:border-t-0"
                            style={{
                              backgroundColor: item.color,
                              flex: Math.max(item.heightFactor, 0.3),
                              height: `${Math.round(itemHeightRatio * 100)}%`,
                              minHeight: row.items.length > 1 ? '16px' : undefined,
                            }}
                            title={`${item.name} (${item.layers} ชั้น) - ${item.positionLabel || ''}`}
                          >
                            <span className="drop-shadow-sm select-none truncate px-0.5 text-center leading-none">
                              {skuShort} [{item.stackingPattern}]
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* ป้ายกำกับหมายเลขแถวใต้ฐานแท่ง เช่น R1, R2, R3... ตามข้อ 5.7 */}
                    <div className="mt-1 flex flex-col items-center">
                      <span className="text-[10px] font-mono font-bold text-slate-700 bg-white px-1 py-0.5 rounded shadow-2xs border border-slate-200">
                        R{row.rowIndex}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                        {row.lengthCm}ซม.
                      </span>
                    </div>

                    {/* Tooltip เมื่อชี้เมาส์ */}
                    {hoveredRow?.rowIndex === row.rowIndex && (
                      <div className="absolute bottom-[170px] left-1/2 -translate-x-1/2 z-30 w-56 bg-slate-900 text-white rounded-lg p-2.5 shadow-xl text-xs pointer-events-none border border-slate-700 animate-fadeIn">
                        <div className="font-bold flex items-center justify-between border-b border-slate-700 pb-1 mb-1 text-amber-400">
                          <span>แถวที่ {row.rowIndex} ({row.zoneBadgeText})</span>
                          <span>วาง{row.orientation}</span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          {row.items.map((it, idx) => (
                            <div key={idx} className="bg-slate-800/80 p-1.5 rounded border border-slate-700/60">
                              <div className="flex justify-between text-slate-200">
                                <span>
                                  {it.name} {it.positionLabel ? `(${it.positionLabel})` : ''}
                                </span>
                                <span className="font-semibold text-amber-300">
                                  {it.packQty} {PRODUCT_SPECS[it.sku].packUnitName} ({it.layers} ชั้น)
                                </span>
                              </div>
                              <div className="text-[10px] text-emerald-400 font-mono mt-0.5 font-bold">
                                📐 สูตรการวาง: {it.stackingPattern}
                              </div>
                            </div>
                          ))}
                          <div className="border-t border-slate-700 pt-1 flex justify-between text-slate-300">
                            <span>ความสูงจริงเทียบเท่า:</span>
                            <span className="font-bold text-white">
                              {row.totalHeightFactor.toFixed(2)} เท่า
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>ความยาวแถว:</span>
                            <span>{row.lengthCm} ซม. (สะสม {row.accumulatedLengthCm} ซม.)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ช่องว่างท้ายรถที่เหลือจริง (Remaining Rear Space Gap) */}
              {plan.remainingRearSpaceCm > 0 && (
                <div
                  className={`flex flex-col items-center justify-end pb-1 border-l-2 border-dashed pl-2 pr-1 ${
                    plan.withinTolerance ? 'border-emerald-500/60' : 'border-rose-500'
                  }`}
                  style={{
                    flex: Math.max(plan.remainingRearSpaceCm / totalBedCm, 0.09),
                    height: '100%',
                  }}
                >
                  <div
                    className={`w-full h-14 rounded flex flex-col items-center justify-center p-1 text-center border-2 border-dashed shadow-xs ${
                      plan.withinTolerance
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-950'
                        : 'bg-rose-500/20 border-rose-500 text-rose-950 animate-shake'
                    }`}
                  >
                    <span className="text-[10px] font-bold leading-tight">
                      {plan.withinTolerance ? '✓' : '❌'} ว่าง {plan.remainingRearSpaceCm} ซม.
                    </span>
                    <span
                      className={`text-[9px] font-semibold mt-0.5 px-1 py-0.2 rounded leading-none ${
                        plan.withinTolerance
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {plan.withinTolerance ? 'ปลอดภัย (≤15 ซม.)' : 'เกิน 15 ซม. (ห้ามปล่อยรถ)'}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 mt-1">ฝาท้ายกระบะ</span>
                </div>
              )}
            </div>

            {/* ฝาท้ายรถกระบะ (Tailgate on Right) */}
            <div className="w-3.5 h-32 bg-slate-800 rounded-t-sm relative shrink-0 border-l border-slate-600 shadow-sm flex items-center justify-center">
              <span className="text-[8px] font-bold text-slate-400 rotate-90 whitespace-nowrap">
                ฝาท้าย
              </span>
            </div>
          </div>

          {/* ล้อรถและคัสซี (Chassis Wheels & Underbody) */}
          <div className="flex items-center justify-between pt-1 px-8 text-slate-600">
            <div className="flex items-center gap-6">
              <div className="w-8 h-8 rounded-full bg-slate-800 border-4 border-slate-600 shadow-inner flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
              </div>
            </div>
            <div className="text-[11px] font-semibold text-slate-500">
              ความยาวกระบะรวม {plan.bedLengthCm} ซม. | ใช้จริง {plan.usedLengthCm} ซม.
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 border-4 border-slate-600 shadow-inner flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-800 border-4 border-slate-600 shadow-inner flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* คำอธิบายสัญลักษณ์สีประจำสินค้า */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-700">สัญลักษณ์สีสินค้า:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#ea580c]" />
            <span className="text-slate-600">ข้าว 1 กก. (ส้ม)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#2563eb]" />
            <span className="text-slate-600">ข้าว 5 กก. (น้ำเงิน)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#16a34a]" />
            <span className="text-slate-600">ข้าว 14 กก. (เขียว)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#9333ea]" />
            <span className="text-slate-600">ข้าว 15 กก. (ม่วง)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#dc2626]" />
            <span className="text-slate-600">ข้าว 40 กก. (แดง)</span>
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          * ตัวเลขในแท่งเช่น 5k (8ช) = ข้าว 5 กก. เรียงซ้อน 8 ชั้น
        </div>
      </div>
    </div>
  );
};
