import React from 'react';
import { TruckPlanResult } from '../types/truck';
import { PRODUCT_SPECS } from '../utils/productConstants';

interface PrintLayoutProps {
  plan: TruckPlanResult;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ plan }) => {
  const currentDate = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="hidden print:block bg-white text-black p-4 max-w-full font-['Prompt',sans-serif]">
      {/* ส่วนหัวเอกสาร A4 */}
      <div className="border-b-2 border-black pb-3 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              ใบกำกับและผังการจัดเรียงสินค้าขึ้นรถบรรทุก
            </h1>
            <p className="text-xs text-gray-700">
              TRUCK LOADING PLANNER • มาตรฐานความปลอดภัยหน้างาน
            </p>
          </div>
          <div className="text-right text-xs">
            <div>
              <strong>วันที่พิมพ์:</strong> {currentDate}
            </div>
            <div>
              <strong>ประเภทรถ:</strong> รถสิบล้อ{plan.truckType}
            </div>
          </div>
        </div>
      </div>

      {/* สรุปข้อมูลรถและสินค้า */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-xs border border-black p-2.5 rounded">
        <div>
          <span className="text-gray-600 block">ความยาวกระบะ:</span>
          <strong className="text-sm">{plan.bedLengthCm} ซม.</strong>
        </div>
        <div>
          <span className="text-gray-600 block">ความยาวที่ใช้จริง:</span>
          <strong className="text-sm">{plan.usedLengthCm} ซม.</strong>
        </div>
        <div>
          <span className="text-gray-600 block">พื้นที่ว่างท้ายรถ:</span>
          <strong className="text-sm">
            {plan.remainingRearSpaceCm} ซม.{' '}
            {plan.withinTolerance ? '(ผ่านเกณฑ์เด็ดขาด ≤15 ซม.)' : '(❌ ผิดเกณฑ์ ห้ามเกิน 15 ซม.)'}
          </strong>
        </div>
        <div>
          <span className="text-gray-600 block">น้ำหนักรวม:</span>
          <strong className="text-sm">
            {(plan.totalWeightKg / 1000).toFixed(2)} ตัน ({plan.totalBags.toLocaleString()} ถุง)
          </strong>
        </div>
      </div>

      {/* ตารางจัดเรียงรายแถวสำหรับหน้างาน (Print Friendly) */}
      <table className="w-full text-left text-xs border border-black border-collapse mb-6">
        <thead>
          <tr className="bg-gray-100 border-b border-black text-black font-bold">
            <th className="p-1.5 border-r border-black text-center w-10">แถว</th>
            <th className="p-1.5 border-r border-black text-center w-20">โซน</th>
            <th className="p-1.5 border-r border-black text-center w-16">แนววาง</th>
            <th className="p-1.5 border-r border-black text-right w-16">ความยาว</th>
            <th className="p-1.5 border-r border-black">รายการสินค้า (รายละเอียด)</th>
            <th className="p-1.5 border-r border-black text-center w-28">สูตรการวาง (ผังเรียง)</th>
            <th className="p-1.5 border-r border-black text-right w-20">จำนวน</th>
            <th className="p-1.5 border-r border-black text-center w-14">ชั้น</th>
            <th className="p-1.5 border-r border-black text-right w-16">ความสูงจริง</th>
            <th className="p-1.5 text-right w-20">ความยาวสะสม</th>
          </tr>
        </thead>
        <tbody>
          {plan.rows.map((row) => (
            <tr key={row.rowIndex} className="border-b border-gray-400">
              <td className="p-1.5 border-r border-black text-center font-bold">
                R{row.rowIndex}
              </td>
              <td className="p-1.5 border-r border-black text-center font-medium">
                {row.zoneBadgeText}
              </td>
              <td className="p-1.5 border-r border-black text-center">
                {row.orientation}
              </td>
              <td className="p-1.5 border-r border-black text-right font-mono">
                {row.lengthCm} ซม.
              </td>
              <td className="p-1.5 border-r border-black">
                {row.isTransition ? (
                  <div className="space-y-0.5">
                    {row.items.map((it, idx) => (
                      <div key={idx}>
                        • {it.name} {it.positionLabel ? `(${it.positionLabel})` : ''}: {it.packQty} {PRODUCT_SPECS[it.sku].packUnitName} [{it.stackingPattern}]
                      </div>
                    ))}
                  </div>
                ) : (
                  <span>
                    {row.items[0]?.name} ({row.items[0]?.bagsQty.toLocaleString()} ถุง)
                  </span>
                )}
              </td>
              <td className="p-1.5 border-r border-black text-center font-mono font-bold">
                {row.stackingPatternSummary}
              </td>
              <td className="p-1.5 border-r border-black text-right font-mono font-bold">
                {row.totalPacks.toLocaleString()}{' '}
                {row.items.length === 1 ? PRODUCT_SPECS[row.items[0].sku].packUnitName : 'ชิ้น'}
              </td>
              <td className="p-1.5 border-r border-black text-center font-bold">
                {row.totalLayers}
              </td>
              <td className="p-1.5 border-r border-black text-right font-mono">
                {row.totalHeightFactor.toFixed(2)}x
              </td>
              <td className="p-1.5 text-right font-mono font-bold">
                {row.accumulatedLengthCm} ซม.
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-bold border-t-2 border-black">
            <td colSpan={3} className="p-1.5 border-r border-black">
              รวมทั้งสิ้น {plan.totalRows} แถว
            </td>
            <td className="p-1.5 border-r border-black text-right font-mono">
              {plan.usedLengthCm} ซม.
            </td>
            <td className="p-1.5 border-r border-black">
              ยอดบรรทุกรวม {plan.totalBags.toLocaleString()} ถุง
            </td>
            <td className="p-1.5 border-r border-black text-center font-mono text-xs">-</td>
            <td className="p-1.5 border-r border-black text-right font-mono">
              {plan.rows.reduce((sum, r) => sum + r.totalPacks, 0).toLocaleString()}
            </td>
            <td className="p-1.5 border-r border-black text-center">-</td>
            <td className="p-1.5 border-r border-black text-right">-</td>
            <td className="p-1.5 text-right font-mono">
              {plan.usedLengthCm} ซม.
            </td>
          </tr>
        </tfoot>
      </table>

      {/* พื้นที่ลงชื่อพยานและตรวจสอบ 3 ฝ่าย */}
      <div className="grid grid-cols-3 gap-6 pt-6 border-t border-black text-xs text-center">
        <div>
          <div className="h-12 border-b border-dashed border-black mb-1"></div>
          <div className="font-bold">ผู้จัดสินค้าขึ้นรถ (Warehouse Stacker)</div>
          <div className="text-gray-600 text-[10px]">วันที่ ...../...../..........</div>
        </div>
        <div>
          <div className="h-12 border-b border-dashed border-black mb-1"></div>
          <div className="font-bold">ผู้ตรวจสอบความปลอดภัย (QC / Safety Inspector)</div>
          <div className="text-gray-600 text-[10px]">วันที่ ...../...../..........</div>
        </div>
        <div>
          <div className="h-12 border-b border-dashed border-black mb-1"></div>
          <div className="font-bold">พนักงานขับรถรับสินค้า (Truck Driver)</div>
          <div className="text-gray-600 text-[10px]">วันที่ ...../...../..........</div>
        </div>
      </div>
    </div>
  );
};
