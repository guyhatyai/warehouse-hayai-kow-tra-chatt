import React from 'react';
import { TruckType } from '../types/truck';
import { TRUCK_PRESET_LENGTHS, DEFAULT_TRUCK_LENGTHS } from '../utils/productConstants';
import { Settings, Info } from 'lucide-react';

interface TruckConfigProps {
  truckType: TruckType;
  bedLengthCm: number;
  onTruckTypeChange: (type: TruckType) => void;
  onBedLengthChange: (lengthCm: number) => void;
}

export const TruckConfig: React.FC<TruckConfigProps> = ({
  truckType,
  bedLengthCm,
  onTruckTypeChange,
  onBedLengthChange,
}) => {
  const handleTypeSelect = (type: TruckType) => {
    onTruckTypeChange(type);
    // เปลี่ยนความยาวกระบะอัตโนมัติตามข้อ 5.2
    onBedLengthChange(DEFAULT_TRUCK_LENGTHS[type]);
  };

  const handlePresetSelect = (preset: number) => {
    onBedLengthChange(preset);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 no-print">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-600" />
          <h2 className="font-semibold text-slate-800 text-base sm:text-lg">
            ข้อมูลตัวรถและขนาดกระบะบรรทุก
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          ระบบคำนวณแบบยืดหยุ่น (Dynamic Dimension)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* เลือกรถสิบล้อ พื้นเรียบ / คอก */}
        <div className="md:col-span-5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            ประเภทรถบรรทุก
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleTypeSelect('พื้นเรียบ')}
              className={`p-3 rounded-lg border text-left transition flex flex-col cursor-pointer ${
                truckType === 'พื้นเรียบ'
                  ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 font-medium'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="text-sm font-semibold flex items-center justify-between">
                สิบล้อ พื้นเรียบ
                {truckType === 'พื้นเรียบ' && (
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                )}
              </span>
              <span className="text-xs text-slate-500 mt-1">
                มาตรฐาน 620 ซม. (ขวาง + ท้ายยาว)
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeSelect('คอก')}
              className={`p-3 rounded-lg border text-left transition flex flex-col cursor-pointer ${
                truckType === 'คอก'
                  ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 font-medium'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="text-sm font-semibold flex items-center justify-between">
                สิบล้อ คอก
                {truckType === 'คอก' && (
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                )}
              </span>
              <span className="text-xs text-slate-500 mt-1">
                มาตรฐาน 570 ซม. (แนวยาวตลอดคัน)
              </span>
            </button>
          </div>
        </div>

        {/* ขนาดความยาวกระบะ */}
        <div className="md:col-span-4">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            ความยาวกระบะจริง (ซม.)
          </label>
          <div className="relative">
            <input
              type="number"
              min={300}
              max={1200}
              step={1}
              value={bedLengthCm}
              onChange={(e) => onBedLengthChange(Math.max(100, Number(e.target.value) || 0))}
              className="w-full pl-3 pr-14 py-2.5 text-base font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:bg-white outline-none transition"
            />
            <span className="absolute right-3 top-2.5 text-sm font-medium text-slate-400">
              ซม.
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            สามารถพิมพ์ความยาวที่วัดจริงได้ เช่น 580, 620, 630 ซม.
          </p>
        </div>

        {/* ปุ่มลัด Preset สำเร็จรูป */}
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            ปุ่มลัด Preset ความยาว
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TRUCK_PRESET_LENGTHS.map((len) => (
              <button
                key={len}
                type="button"
                onClick={() => handlePresetSelect(len)}
                className={`px-2.5 py-1.5 rounded text-xs font-medium border transition cursor-pointer ${
                  bedLengthCm === len
                    ? 'bg-amber-500 border-amber-600 text-slate-950 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                {len} ซม.
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
