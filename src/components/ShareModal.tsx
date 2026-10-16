import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  QrCode, 
  ExternalLink, 
  Sparkles, 
  Users, 
  Smartphone, 
  Download,
  Truck,
  Layers
} from 'lucide-react';
import QRCode from 'qrcode';
import { TruckType, OrderItemInput } from '../types/truck';

// Public Shared URL provisioned for this application in AI Studio
export const DEFAULT_SHARED_URL = 'https://ais-pre-56epdjierhtpdnlkjesrxz-979844398341.asia-southeast1.run.app';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  truckType: TruckType;
  bedLengthCm: number;
  orderItems: OrderItemInput[];
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  truckType,
  bedLengthCm,
  orderItems,
}) => {
  const [shareMode, setShareMode] = useState<'default' | 'withData'>('default');
  const [copied, setCopied] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [canNativeShare, setCanNativeShare] = useState<boolean>(false);

  // ตรวจสอบ Origin ปัจจุบัน หรือใช้ DEFAULT_SHARED_URL
  const baseUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      // ถ้าเปิดจากโหมด dev หรือ iframe ให้แนะนำ DEFAULT_SHARED_URL เพื่อให้ทุกคนเข้าถึงได้แบบสาธารณะ
      if (origin.includes('ais-pre-')) {
        return origin;
      }
    }
    return DEFAULT_SHARED_URL;
  }, []);

  // สร้าง URL สำหรับแชร์
  const shareUrl = useMemo(() => {
    if (shareMode === 'default') {
      return baseUrl;
    }

    // สร้าง Query Parameter เพื่อส่งการตั้งค่ารถและจำนวนสินค้าปัจจุบันไปด้วย
    try {
      const params = new URLSearchParams();
      params.set('truck', truckType);
      params.set('length', bedLengthCm.toString());
      
      // บันทึกรายการสินค้าอย่างกระชับ
      const compactItems = orderItems
        .filter((item) => item.bags > 0)
        .map((item) => `${item.sku}:${item.bags}`)
        .join(',');
      
      if (compactItems) {
        params.set('items', compactItems);
      }

      return `${baseUrl}?${params.toString()}`;
    } catch {
      return baseUrl;
    }
  }, [baseUrl, shareMode, truckType, bedLengthCm, orderItems]);

  // สร้าง QR Code เมื่อ shareUrl เปลี่ยน
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(shareUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR Code', err);
      });

    return () => {
      isMounted = false;
    };
  }, [shareUrl]);

  // ตรวจสอบการรองรับ Web Share API
  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanNativeShare(true);
    }
  }, []);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Truck Loading Planner - ระบบวางแผนจัดเรียงสินค้าขึ้นรถบรรทุก',
          text: `แผนจัดเรียงสินค้าสำหรับรถสิบล้อ${truckType} (${bedLengthCm} ซม.)`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    }
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const link = document.createElement('a');
    link.download = `truck-planner-qr-${truckType}-${bedLengthCm}cm.png`;
    link.href = qrCodeDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                แชร์ลิงก์ให้ผู้อื่นใช้งาน
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-medium">
                  ทุกคนเปิดได้ทันที
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                ผู้รับสามารถเปิดบนมือถือ แท็บเล็ต หรือคอมพิวเตอร์ได้เลยโดยไม่ต้องล็อกอิน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* แถบเลือกโหมดการแชร์ */}
          <div className="bg-slate-100 p-1.5 rounded-xl grid grid-cols-2 gap-1.5 text-xs font-medium">
            <button
              onClick={() => setShareMode('default')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition cursor-pointer ${
                shareMode === 'default'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-amber-600" />
              <span>ลิงก์ระบบเปล่า (ค่าเริ่มต้น)</span>
            </button>
            <button
              onClick={() => setShareMode('withData')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition cursor-pointer ${
                shareMode === 'withData'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-600" />
              <span>ลิงก์พร้อมแผนจัดเรียงปัจจุบัน</span>
            </button>
          </div>

          {/* คำอธิบายโหมดปัจจุบัน */}
          {shareMode === 'withData' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
              <Truck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-950">
                  ส่งพร้อมข้อมูลรถสิบล้อ{truckType} ({bedLengthCm} ซม.) และสินค้าปัจจุบัน
                </p>
                <p className="text-amber-800 mt-0.5">
                  เมื่อคนอื่นเปิดลิงก์นี้ ระบบจะกรอกข้อมูลและคำนวณแผนจัดเรียงให้ตรงกับที่คุณกำลังดูอยู่ทันที
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800">
                  ลิงก์เข้าใช้งานระบบทั่วไป
                </p>
                <p className="text-slate-500 mt-0.5">
                  ผู้รับจะเปิดหน้าระบบขึ้นมา และสามารถเลือกประเภทรถและกรอกยอดสินค้าตามที่ต้องการได้เอง
                </p>
              </div>
            </div>
          )}

          {/* ช่องแสดง URL และปุ่ม Copy */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              ลิงก์สาธารณะ (Public URL สำหรับทุกคน)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-xs transition cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>คัดลอกแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>คัดลอกลิงก์</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ปุ่ม Share เพิ่มเติม / Web Share API */}
          <div className="flex flex-wrap gap-2 pt-1">
            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition cursor-pointer shadow-sm"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>แชร์ไปยัง LINE / อุปกรณ์</span>
              </button>
            )}
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>เปิดทดสอบในแท็บใหม่</span>
            </a>
          </div>

          {/* ส่วน QR Code สแกนผ่านมือถือหน้างาน */}
          <div className="border-t border-slate-100 pt-5">
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 shrink-0">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code สำหรับเปิดระบบ"
                    className="w-28 h-28 object-contain"
                  />
                ) : (
                  <div className="w-28 h-28 flex items-center justify-center text-slate-400">
                    <QrCode className="w-8 h-8 animate-pulse" />
                  </div>
                )}
              </div>
              <div className="space-y-2 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-slate-800">
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  <span>สแกน QR Code เปิดบนมือถือหน้างาน</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  คนขับรถหรือพนักงานคลังสามารถใช้กล้องมือถือสแกน เพื่อเปิดดูแผนจัดเรียงและรูปภาพตัวอย่างได้ทันทีโดยไม่ต้องพิมพ์ URL
                </p>
                <button
                  onClick={handleDownloadQr}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-medium transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>ดาวน์โหลดรูปภาพ QR Code</span>
                </button>
              </div>
            </div>
          </div>

          {/* สรุปจุดเด่นสำหรับแชร์ */}
          <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-xs space-y-1.5">
            <p className="font-semibold text-amber-400 flex items-center gap-1.5">
              💡 ข้อมูลสำคัญในการแชร์:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
              <li><strong className="text-white">ไม่ต้องใช้รหัสผ่าน:</strong> ทุกคนที่กดลิงก์สามารถเข้าใช้งานได้ทันที</li>
              <li><strong className="text-white">ใช้งานได้ทุกเบราว์เซอร์:</strong> Chrome, Safari, LINE Browser, Edge ทั้งบนมือถือและคอมพิวเตอร์</li>
              <li><strong className="text-white">พิมพ์ได้ทุกเครื่อง:</strong> กดปุ่ม &quot;พิมพ์ใบจัดเรียง A4&quot; จากอุปกรณ์ใดก็ได้</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium transition cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
