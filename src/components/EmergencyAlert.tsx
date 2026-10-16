import React from 'react';
import { TruckPlanResult } from '../types/truck';
import { AlertOctagon, CheckCircle2, RotateCcw, ShieldAlert, Sparkles, ShieldCheck } from 'lucide-react';

interface EmergencyAlertProps {
  plan: TruckPlanResult;
  onToggleEmergency: () => void;
}

export const EmergencyAlert: React.FC<EmergencyAlertProps> = ({
  plan,
  onToggleEmergency,
}) => {
  const {
    remainingRearSpaceCm,
    withinTolerance,
    isOverloadedLength,
    emergencyActive,
    emergencyAdjustmentNotes,
    truckType,
  } = plan;

  return (
    <div className="space-y-3 no-print">
      {/* แถบหัวข้อยืนยันเกณฑ์บังคับเด็ดขาด (Strict Rule Header) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3.5 py-2.5 rounded-lg bg-slate-900 text-white text-xs gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold">
            เกณฑ์บังคับความปลอดภัย: สินค้าจะต้องวางเต็มพื้นที่รถ ห้ามเหลือพื้นที่ท้ายรถเกิน 15 ซม.เด็ดขาด
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">
            {truckType === 'พื้นเรียบ' ? 'รถพื้นเรียบ (ปรับแนวยาวท้ายได้ไม่เกิน 2 แถว + แถวปิดท้าย)' : 'รถคอก'}
          </span>
          <span className="font-mono font-bold text-amber-400 bg-slate-800 px-2 py-0.5 rounded">
            เกณฑ์: 0 – 15 ซม.
          </span>
        </div>
      </div>

      {/* 1. กรณีผ่านเกณฑ์เด็ดขาด (เหลือ 0 - 15 ซม.) */}
      {withinTolerance && (
        <div className="p-4 sm:p-5 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-950 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-emerald-950">
                    ✅ ผ่านเกณฑ์เด็ดขาด: สินค้าวางเต็มพื้นที่กระบะอย่างปลอดภัย
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    เหลือช่องว่าง {remainingRearSpaceCm} ซม.
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-800 mt-1 leading-relaxed">
                  ระยะว่างตั้งแต่แถวสุดท้ายถึงฝาท้ายกระบะอยู่ที่ <strong>{remainingRearSpaceCm} ซม.</strong> (ไม่เกิน 15 ซม. ตามข้อกำหนด) สินค้าถูกล็อกแน่นหนา ไม่เคลื่อนตัวหรือไถลกระแทกเวลาเบรก
                </p>
                {emergencyAdjustmentNotes && emergencyAdjustmentNotes.length > 0 && (
                  <p className="text-xs text-emerald-700 mt-1 font-medium">
                    ⚡ {emergencyAdjustmentNotes.join(' • ')}
                  </p>
                )}
              </div>
            </div>

            {/* แสดงปุ่มสลับสถานะโหมดฉุกเฉิน */}
            <div className="shrink-0 flex items-center gap-2">
              {emergencyActive ? (
                <button
                  type="button"
                  onClick={onToggleEmergency}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm border border-amber-500/30 cursor-pointer"
                  title="สลับกลับไปดูรูปแบบเริ่มต้นก่อนปรับแต่ง"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>สลับดูผังเดิม (ปิดโหมดฉุกเฉิน)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onToggleEmergency}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-900 text-xs font-semibold flex items-center gap-1.5 transition border border-emerald-500/30 cursor-pointer"
                  title="ทดลองเปิดโหมดฉุกเฉินเพื่อเปรียบเทียบการกระจายสินค้า"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>ทดลองโหมดฉุกเฉิน</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. กรณีผิดเกณฑ์เด็ดขาด: เหลือพื้นที่ท้ายรถเกิน 15 ซม. */}
      {!withinTolerance && !isOverloadedLength && (
        <div className="p-4 sm:p-5 rounded-xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-950 shadow-sm animate-fadeIn">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 shadow-sm animate-pulse">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-rose-950">
                    ❌ ผิดเกณฑ์ความปลอดภัยเด็ดขาด! ห้ามเหลือพื้นที่ท้ายรถเกิน 15 ซม.
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white shadow-2xs">
                    ปัจจุบันเหลือ {remainingRearSpaceCm} ซม.
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-rose-800 mt-1 leading-relaxed max-w-2xl">
                  สินค้ายังวางไม่เต็มพื้นที่กระบะรถบรรทุก (ขาดอีก {remainingRearSpaceCm - 15} ซม. ถึงจะเข้าเกณฑ์ปลอดภัย 0–15 ซม.) หากปล่อยรถออกไป สินค้าจะลื่นไถลและกระแทกเสียหายเวลารถเบรก
                  <span className="block text-slate-600 font-normal mt-0.5">
                    *หมายเหตุความปลอดภัย: {truckType === 'คอก' ? 'รถคอกเน้นแนวยาวเป็นหลัก อนุโลมแนวขวางท้ายรถไม่เกิน 2 แถว' : 'รถพื้นเรียบจำกัดการวางแนวยาวไม่เกิน 2 แถว (ไม่นับแถวปิดท้าย)'}
                  </span>
                </p>
              </div>
            </div>

            {/* ปุ่มปรับแนวแถวท้ายรถดันชิดท้าย */}
            <div className="shrink-0 flex items-center">
              <button
                type="button"
                onClick={onToggleEmergency}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                title="กดเพื่อเปิดโหมดฉุกเฉิน: ปรับกระจายสินค้าเต็มความยาวกระบะให้เหลือท้าย 0-15 ซม. ทันที"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>กดปุ่มฉุกเฉิน: ปรับดันชิดท้าย (0–15 ซม.)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. กรณีความยาวเกินกระบะ (Overflow) */}
      {isOverloadedLength && (
        <div className="p-4 rounded-xl bg-rose-100 border-2 border-rose-400 text-rose-950 flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
          <div>
            <span className="text-sm font-bold text-rose-950">
              ความยาวสินค้ารวมเกินกระบะรถ {Math.abs(remainingRearSpaceCm)} ซม.!
            </span>
            <p className="text-xs text-rose-800 mt-0.5">
              สินค้าล้นเกินความยาวของตัวรถ ไม่สามารถปิดฝาท้ายได้ กรุณาปรับเพิ่มความสูงของแถวหรือเปลี่ยนขนาดรถ
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
