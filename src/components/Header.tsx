import React from 'react';
import { Truck, Printer, BookOpen, RotateCcw, ShieldCheck, Share2 } from 'lucide-react';
import { TruckType } from '../types/truck';

interface HeaderProps {
  truckType: TruckType;
  bedLengthCm: number;
  emergencyMode?: boolean;
  onToggleEmergency?: () => void;
  onOpenSpecs: () => void;
  onOpenShare: () => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  truckType,
  bedLengthCm,
  emergencyMode,
  onToggleEmergency,
  onOpenSpecs,
  onOpenShare,
  onReset,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="bg-slate-900 text-white shadow-lg border-b border-slate-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950 font-bold">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Truck Loading Planner
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ระบบวางแผนจัดเรียงสินค้า
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                คำนวณตามหลักสรีรศาสตร์ กฎความสูงขั้นบันได และควบคุมระยะปลอดภัยท้ายกระบะ 0–15 ซม.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>เกณฑ์ควบคุม: รถสิบล้อ{truckType} ({bedLengthCm} ซม.)</span>
            </div>

            {emergencyMode && onToggleEmergency && (
              <button
                type="button"
                onClick={onToggleEmergency}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/40 hover:bg-amber-500/30 transition shadow-xs cursor-pointer animate-pulse"
                title="โหมดฉุกเฉินเปิดใช้งานอยู่ คลิกเพื่อปิดและกลับสู่ผังเดิม"
              >
                <span>⚡ โหมดฉุกเฉิน (เปิดอยู่)</span>
              </button>
            )}

            <button
              onClick={onOpenSpecs}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium border border-slate-700 transition shadow-sm cursor-pointer"
              title="ดูคู่มือสเปกมาตรฐานและรูปภาพอ้างอิง"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>คู่มือสเปก & รูปจริง</span>
            </button>

            <button
              onClick={onOpenShare}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs sm:text-sm font-medium border border-emerald-500/40 transition shadow-sm cursor-pointer"
              title="แชร์ลิงก์ให้ผู้อื่นใช้งาน / คัดลอกลิงก์"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>แชร์ให้คนอื่นใช้งาน</span>
            </button>

            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium border border-slate-700 transition shadow-sm cursor-pointer"
              title="รีเซ็ตข้อมูลเริ่มต้น"
            >
              <RotateCcw className="w-4 h-4" />
              <span>รีเซ็ต</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-xs sm:text-sm shadow-md shadow-amber-500/25 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบจัดเรียง A4</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
