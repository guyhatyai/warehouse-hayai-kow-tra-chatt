import React from 'react';
import { CalculatedRow, TruckPlanResult } from '../types/truck';
import { Table, CheckCircle2, AlertTriangle, Layers, Ruler, Weight } from 'lucide-react';
import { PRODUCT_SPECS } from '../utils/productConstants';

interface RowDetailTableProps {
  plan: TruckPlanResult;
}

export const RowDetailTable: React.FC<RowDetailTableProps> = ({ plan }) => {
  if (plan.rows.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
        กรุณาระบุจำนวนสินค้าสั่งซื้อเพื่อคำนวณตารางจัดเรียงรายแถว
      </div>
    );
  }

  // Helper สำหรับจัดสไตล์ Badge ตามข้อ 5.4
  const renderBadge = (row: CalculatedRow) => {
    switch (row.zoneBadge) {
      case 'โซนหน้า':
        // ป้ายสีเหลืองทองระบุว่าเป็นโซนหน้า
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
            โซนหน้า
          </span>
        );
      case 'แถวเชื่อมต่อ':
        // ป้ายขอบเส้นประสีฟ้า เขียนว่า แถวเชื่อมต่อ
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-sky-50 text-sky-800 border-2 border-dashed border-sky-400">
            แถวเชื่อมต่อ
          </span>
        );
      case 'ปิดท้าย':
        // ป้ายสีส้มอิฐ เขียนว่า ปิดท้าย เสมอ
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-[#ea580c] text-white shadow-xs">
            ปิดท้าย
          </span>
        );
      case 'กลางคัน':
      default:
        // ป้ายสีน้ำเงินระบุเลขแถว
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            แถวที่ {row.rowIndex}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header ของตารางและสรุปสถิติสำคัญ */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                ตารางแจกแจงการจัดเรียงรายแถว (Row by Row Table)
              </h2>
              <p className="text-xs text-slate-500">
                รายละเอียดสินค้า ทิศทางการวาง ความสูงจริง และความยาวสะสมทีละแถว
              </p>
            </div>
          </div>

          {/* สรุปสถิติสำคัญ 4 ตัวชี้วัด */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[11px]">จำนวนแถวทั้งหมด</span>
              <span className="text-base font-bold text-slate-900">
                {plan.totalRows} แถว
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[11px]">ความยาวใช้จริง</span>
              <span className="text-base font-bold text-amber-600">
                {plan.usedLengthCm} / {plan.bedLengthCm} ซม.
              </span>
            </div>

            <div className={`p-2.5 rounded-lg border shadow-2xs ${
              plan.withinTolerance
                ? 'bg-emerald-50/80 border-emerald-200'
                : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 block text-[11px] font-medium">พื้นที่ว่างท้ายรถ</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  plan.withinTolerance ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}>
                  {plan.withinTolerance ? 'ผ่าน (≤15 ซม.)' : 'ผิดเกณฑ์!'}
                </span>
              </div>
              <span
                className={`text-base font-bold ${
                  plan.withinTolerance
                    ? 'text-emerald-700'
                    : 'text-rose-700'
                }`}
              >
                {plan.remainingRearSpaceCm} ซม.
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[11px]">น้ำหนักบรรทุกรวม</span>
              <span className="text-base font-bold text-slate-900">
                {(plan.totalWeightKg / 1000).toFixed(2)} ตัน
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ตารางแสดงผลรายแถว */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-3.5 text-center w-14">แถว</th>
              <th className="py-3 px-3 w-28 text-center">ป้ายโซน</th>
              <th className="py-3 px-3 w-24 text-center">แนวการวาง</th>
              <th className="py-3 px-3 w-24 text-right">ความยาวแถว</th>
              <th className="py-3 px-4 min-w-[240px]">รายละเอียดสินค้าในแถว</th>
              <th className="py-3 px-3 text-center min-w-[150px]">สูตรการวาง (ผังเรียงของ)</th>
              <th className="py-3 px-3 text-right w-28">ยอดรวมขึ้นรถ</th>
              <th className="py-3 px-3 text-center w-24">ความสูง (ชั้น)</th>
              <th className="py-3 px-3 text-right w-24">ความสูงจริง</th>
              <th className="py-3 px-3.5 text-right w-28 font-mono">ความยาวสะสม</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plan.rows.map((row) => (
              <tr
                key={row.rowIndex}
                className={`transition ${
                  row.zoneBadge === 'ปิดท้าย'
                    ? 'bg-amber-50/40 hover:bg-amber-50/70 font-medium'
                    : row.isTransition
                    ? 'bg-sky-50/30 hover:bg-sky-50/60'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                {/* ลำดับแถว */}
                <td className="py-3 px-3.5 text-center font-bold font-mono text-slate-700">
                  R{row.rowIndex}
                </td>

                {/* ป้ายชื่อโซน (Badge Tag) ตามข้อ 5.4 */}
                <td className="py-3 px-3 text-center whitespace-nowrap">
                  {renderBadge(row)}
                </td>

                {/* แนวการวาง */}
                <td className="py-3 px-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      row.orientation === 'ยาว'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    วาง{row.orientation}
                  </span>
                </td>

                {/* ความยาวแถว */}
                <td className="py-3 px-3 text-right font-medium text-slate-700">
                  {row.lengthCm} ซม.
                </td>

                {/* รายละเอียดสินค้า: ตามข้อ 5.5 หากเป็นแถวเชื่อมต่อต้องแตกหัวข้อย่อยแจกแจงชัดเจน */}
                <td className="py-3 px-4">
                  {row.isTransition ? (
                    <div className="space-y-1 py-0.5">
                      {row.items.map((item, itIdx) => (
                        <div
                          key={itIdx}
                          className="flex items-center justify-between text-xs bg-white/90 p-1.5 rounded border border-sky-200/80 shadow-2xs"
                        >
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span>
                              {item.name} {item.positionLabel && `(${item.positionLabel})`}
                            </span>
                          </div>
                          <div className="text-slate-600 font-mono text-[11px]">
                            <span className="font-semibold text-slate-900">
                              {item.packQty}
                            </span>{' '}
                            {PRODUCT_SPECS[item.sku].packUnitName} •{' '}
                            <span className="font-semibold text-sky-800">
                              {item.layers} ชั้น
                            </span>{' '}
                            (หนา {item.heightFactor.toFixed(2)}x)
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // แถวเดี่ยวล้วน (Pure Row)
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: row.items[0]?.color }}
                      />
                      <span className="font-semibold text-slate-800">
                        {row.items[0]?.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({row.items[0]?.bagsQty.toLocaleString()} ถุง)
                      </span>
                    </div>
                  )}
                </td>

                {/* สูตรการวาง (เช่น 5×8, 4×10 หรือ 4×8 (เศษ 2)) */}
                <td className="py-3 px-3 text-center">
                  {row.isTransition ? (
                    <div className="space-y-1">
                      {row.items.map((item, itIdx) => (
                        <div
                          key={itIdx}
                          className="flex flex-col items-center justify-center px-2 py-1 rounded bg-sky-50 border border-sky-300 text-sky-950 font-mono text-xs shadow-2xs"
                        >
                          <span className="font-bold text-xs">{item.stackingPattern}</span>
                          <span className="text-[10px] text-sky-700">
                            ({item.positionLabel}: ชั้นละ {item.perLayer})
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                        {row.items[0]?.stackingPattern}
                      </span>
                      {row.items[0]?.remainderPacks > 0 && (
                        <span className="text-[10px] text-amber-800 font-medium mt-0.5">
                          (ชั้นบนสุดวางเศษ {row.items[0]?.remainderPacks} {PRODUCT_SPECS[row.items[0]?.sku].packUnitName})
                        </span>
                      )}
                      {row.items[0]?.remainderPacks === 0 && (
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          (ชั้นละ {row.items[0]?.perLayer} เต็มทุกชั้น)
                        </span>
                      )}
                    </div>
                  )}
                </td>

                {/* ยอดรวมขึ้นรถ (มัด/กระสอบ) */}
                <td className="py-3 px-3 text-right font-semibold text-slate-800 font-mono">
                  {row.totalPacks.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    {row.items.length === 1
                      ? PRODUCT_SPECS[row.items[0].sku].packUnitName
                      : 'ชิ้น'}
                  </span>
                </td>

                {/* จำนวนชั้น */}
                <td className="py-3 px-3 text-center font-bold text-slate-800 font-mono">
                  {row.totalLayers} ชั้น
                </td>

                {/* ความสูงจริงเทียบเท่าข้าว 5 กก. */}
                <td className="py-3 px-3 text-right font-mono">
                  <span className="font-semibold text-slate-900">
                    {row.totalHeightFactor.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">เท่า</span>
                </td>

                {/* คอลัมน์ความยาวสะสม: บวกไปเรื่อยๆ จนถึงแถวสุดท้ายเท่ากับความยาวที่ใช้จริง ตามข้อ 5.5 */}
                <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                  {row.accumulatedLengthCm} ซม.
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
              <td colSpan={3} className="py-3 px-3.5 text-left text-xs uppercase tracking-wider">
                รวมสุทธิทั้งคันรถ
              </td>
              <td className="py-3 px-3 text-right font-mono">
                {plan.usedLengthCm} ซม.
              </td>
              <td className="py-3 px-4 text-xs font-normal text-slate-600">
                บรรทุกทั้งหมด {plan.totalBags.toLocaleString()} ถุง ({plan.totalRows} แถว)
              </td>
              <td className="py-3 px-3 text-center font-mono text-xs text-slate-500">
                -
              </td>
              <td className="py-3 px-3 text-right font-mono">
                {plan.rows.reduce((sum, r) => sum + r.totalPacks, 0).toLocaleString()}
              </td>
              <td className="py-3 px-3 text-center font-mono text-xs text-slate-500">
                -
              </td>
              <td className="py-3 px-3 text-right font-mono text-xs text-slate-500">
                -
              </td>
              <td className="py-3 px-3.5 text-right font-mono text-amber-700 bg-amber-50/80">
                {plan.usedLengthCm} ซม.
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* หมายเหตุท้ายตาราง */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-700">เกณฑ์ความสูงหน้างาน:</span>
          <span>1กก. (10-12 ชั้น), 5กก. (6-10 ชั้น ยืนพื้น 8 ชั้น), 14กก. (11-13 ชั้น), 15กก. (11-14 ชั้น), 40กก. (แน่นทึบ 10 ชั้น)</span>
        </div>
        <div className="font-semibold text-slate-700">
          * ความยาวสะสมแถวสุดท้าย ({plan.usedLengthCm} ซม.) เท่ากับความยาวที่ใช้จริงของตัวรถพอดี
        </div>
      </div>
    </div>
  );
};
