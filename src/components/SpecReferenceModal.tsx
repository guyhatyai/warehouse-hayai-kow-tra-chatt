import React from 'react';
import { X, BookOpen, AlertCircle, CheckCircle, Shield, Truck } from 'lucide-react';
import { PRODUCT_SPECS, PIPELINE_ORDER } from '../utils/productConstants';

interface SpecReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpecReferenceModal: React.FC<SpecReferenceModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto no-print">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-lg">
                คู่มือสเปกมาตรฐานและกฎการจัดเรียงสินค้า (Truck Loading Planner)
              </h3>
              <p className="text-xs text-slate-300">
                ข้อมูลจำเพาะทางกายภาพ กฎลำดับ Pipeline และเกณฑ์ความปลอดภัยท้ายกระบะ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Section 1: สเปกมาตรฐานสินค้า */}
          <div>
            <h4 className="font-bold text-slate-900 text-base mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center">
                1
              </span>
              ข้อมูลจำเพาะทางกายภาพของสินค้าแต่ละขนาด (สเปกมาตรฐาน)
            </h4>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <th className="p-2.5">สินค้า</th>
                    <th className="p-2.5">หน่วยขาย</th>
                    <th className="p-2.5">วางแนวขวาง</th>
                    <th className="p-2.5">วางแนวยาว</th>
                    <th className="p-2.5 text-center">ตัวคูณความหนาจริง</th>
                    <th className="p-2.5">เกณฑ์ความสูงหน้างาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PIPELINE_ORDER.map((sku) => {
                    const s = PRODUCT_SPECS[sku];
                    return (
                      <tr key={sku} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                        </td>
                        <td className="p-2.5">
                          {s.unitsPerPack > 1
                            ? `มัดละ ${s.unitsPerPack} ถุง`
                            : 'กระสอบเดี่ยว (1:1)'}
                        </td>
                        <td className="p-2.5">
                          ยาว {s.crossLen} ซม. ({s.crossPerLayer} {s.packUnitName}/ชั้น)
                        </td>
                        <td className="p-2.5">
                          ยาว {s.longLen} ซม. ({s.longPerLayer} {s.packUnitName}/ชั้น)
                        </td>
                        <td className="p-2.5 text-center font-mono font-semibold">
                          {s.thicknessFactor.toFixed(2)}x
                        </td>
                        <td className="p-2.5 font-medium text-slate-800">
                          {sku === '1kg' && '10–12 ชั้น (5.0–6.0 เท่า) อยู่หน้าสุดเสมอ'}
                          {sku === '5kg' && '6–10 ชั้น ยืนพื้นปกติที่ 8 ชั้น (8.0 เท่า)'}
                          {sku === '14kg' && '11–13 ชั้น (7.3–8.7 เท่า) ชดเชยความบาง'}
                          {sku === '15kg' && '11–14 ชั้น (7.3–9.3 เท่า) ไต่ระดับต่อเนื่อง'}
                          {sku === '40kg' && 'จัดวางแน่นทึบเต็มพิกัด 10 ชั้น (ห้ามเกิน)'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: กฎสำคัญ 4 ข้อ */}
          <div>
            <h4 className="font-bold text-slate-900 text-base mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center">
                2
              </span>
              กฎการจัดเรียงจากหน้ารถไปท้ายรถ (Loading Pipeline Rules)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ลำดับหน้าไปท้าย (Loading Pipeline)
                </div>
                <p className="text-slate-600">
                  ต้องจัดเรียงลำดับอย่างเด็ดขาด: หน้ารถ (เตี้ยสุด) ➔ ข้าว 1 กก. ➔ ข้าว 5 กก. ➔ ข้าว 14 กก. ➔ ข้าว 15 กก. ➔ ข้าว 40 กก. (ท้ายรถ สูงและแน่นสุด)
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  กฎแถวเดี่ยวล้วน (Pure Rows)
                </div>
                <p className="text-slate-600">
                  ต้องจัดเรียงให้เต็มแถวเดี่ยวของตัวเองก่อนเสมอ เพื่อให้ฝ่ายตรวจสอบนับสต็อกและถ่ายรูปเช็กยอดทีละแถวได้ ป้องกันขึ้นของเกินหรือขาด
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  แถวเชื่อมต่อ (Transition / Top-off)
                </div>
                <p className="text-slate-600">
                  เกิดขึ้นเฉพาะแถวสุดท้ายของ 5, 14, 15 กก. เท่านั้น ลำดับซ้อนจากล่างขึ้นบน: ข้าว 5 กก. (ฐานล่าง) ➔ ข้าว 14 กก. (ชั้นกลาง) ➔ ข้าว 15 กก. (ซ้อนบน) *ห้ามนำ 1 กก. หรือ 40 กก. มาปนเด็ดขาด
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  กฎห้ามยุบเป็นหลุม (Monotonic Ladder)
                </div>
                <p className="text-slate-600">
                  ความสูงจริงของแถวถัดไปต้องเท่ากับหรือมากกว่าแถวก่อนหน้าเสมอ ห้ามมีแถวไหนเตี้ยลงมา เพื่อป้องกันสินค้าโค่นล้มและไม่ให้หลังแอ่นกลางคันรถ
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: เกณฑ์ความปลอดภัยท้ายรถ */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <h4 className="font-bold text-amber-950 text-sm mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600" />
              เกณฑ์พื้นที่ว่างท้ายรถ 0 ถึง 15 ซม. (Tail Safety Criteria)
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700">
              <li>
                ต้องเหลือพื้นที่ว่างตั้งแต่แถวสุดท้ายถึงฝาท้ายกระบะอยู่ระหว่าง <strong>0 ถึง 15 ซม.</strong> เท่านั้น
              </li>
              <li>
                ห้ามเหลือช่องว่างเกิน 15 ซม. เพราะสินค้าจะเคลื่อนตัวกระแทกอย่างรุนแรงเวลาเบรก
              </li>
              <li>
                <strong>รถสิบล้อ พื้นเรียบ:</strong> แถวทั่วไปต้องวางแนวขวาง แถวปิดท้ายสุดต้องวางแนวยาวเสมอ (ยาว 65 ซม. สำหรับ 40 กก. เพื่อทำหน้าที่เป็นกำแพงบล็อกล็อกสินค้า) และในการปรับแต่งแถวให้พอดีกับพื้นที่รถ <strong>ถ้าไม่นับแถวสุดท้าย ห้ามวางผิดแนว (แนวยาว) เกินกว่า 2 แถวเด็ดขาด</strong> เพื่อป้องกันสินค้าโค่นล้มหรือหล่นขณะเบรกรถ
              </li>
              <li>
                <strong>รูปแบบสูตรการจัดวาง (เช่น 5×8, 4×10 (เศษ 2)):</strong> ตัวเลขหน้าคือจำนวนบรรจุต่อชั้นเต็ม (เช่น วางขวาง 4 หรือวางยาว 5) คูณด้วยจำนวนชั้นเต็มที่เรียงซ้อน หากมีเศษที่ไม่เต็มชั้น จะระบุในวงเล็บ เช่น <code>4×8 (เศษ 2)</code> หมายถึง ชั้นละ 4 กระสอบ เรียงเต็ม 8 ชั้น และมีเศษวางเสริมด้านบนสุดอีก 2 กระสอบ
              </li>
            </ul>
          </div>

          {/* Section 4: ตารางอ้างอิงความจุมาตรฐาน (Dynamic Dimensions) */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">
              ตารางอ้างอิงความจุมาตรฐานกรณีบรรทุกสินค้าขนาดเดียวเต็มคัน (หน้า 4):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800">รถยาว 570 ซม. (คอก)</div>
                <div className="text-slate-600 mt-1">1กก.: 12 แถว | 5/14/15กก.: 9 แถว | 40กก.: 8 แถว</div>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800">รถยาว 610 ซม. (พื้นเรียบ)</div>
                <div className="text-slate-600 mt-1">1กก.: 30 แถว | 5/14/15กก.: 15 แถว | 40กก.: 11 แถว</div>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800">รถยาว 625 ซม. (พื้นเรียบ)</div>
                <div className="text-slate-600 mt-1">1กก.: 31 แถว | 5/14/15กก.: 15 แถว | 40กก.: 12 แถว</div>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800">รถยาว 640 ซม. (พื้นเรียบ)</div>
                <div className="text-slate-600 mt-1">1กก.: 32 แถว | 5/14/15กก.: 16 แถว | 40กก.: 12 แถว</div>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800">รถยาว 700 ซม. (พื้นเรียบ)</div>
                <div className="text-slate-600 mt-1">1กก.: 35 แถว | 5/14/15กก.: 17 แถว | 40กก.: 14 แถว</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
          >
            ปิดหน้าต่างคู่มือ
          </button>
        </div>
      </div>
    </div>
  );
};
