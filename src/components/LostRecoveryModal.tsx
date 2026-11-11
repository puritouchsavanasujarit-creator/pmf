import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  Send, 
  Zap, 
  HeartHandshake 
} from 'lucide-react';
import { CustomerDeal } from '../types';

interface LostRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  deals: CustomerDeal[];
  selectedDealId?: string | null;
  onReopenDeal: (deal: CustomerDeal, newStatus: 'WON' | 'IN_PROGRESS', addedTag: string) => Promise<void>;
}

export const LostRecoveryModal: React.FC<LostRecoveryModalProps> = ({
  isOpen,
  onClose,
  deals,
  selectedDealId,
  onReopenDeal,
}) => {
  const lostOrProgDeals = deals.filter((d) => d.status === 'LOST' || d.status === 'IN_PROGRESS');
  const [activeDealId, setActiveDealId] = useState<string>(
    selectedDealId || (lostOrProgDeals[0]?.id ?? '')
  );
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync state if selectedDealId changes
  React.useEffect(() => {
    if (selectedDealId) {
      setActiveDealId(selectedDealId);
    }
  }, [selectedDealId]);

  if (!isOpen) return null;

  const currentDeal = deals.find((d) => d.id === activeDealId) || lostOrProgDeals[0];

  const handleCopy = (text: string, templateKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(templateKey);
    setTimeout(() => setCopiedTemplate(null), 2500);
  };

  const handleReopenAsWon = async () => {
    if (!currentDeal) return;
    setIsUpdating(true);
    try {
      await onReopenDeal(currentDeal, 'WON', '#กู้คืนสำเร็จ');
      onClose();
    } finally {
      setIsUpdating(false);
    }
  };

  const templates = currentDeal ? [
    {
      id: 'discount',
      title: '🎯 โปรโมชันส่วนลดพิเศษ (Special Discount Offer)',
      desc: 'เหมาะสำหรับเคสที่ติดแท็ก #ราคาแพง หรือลูกค้าลังเลเรื่องงบ',
      text: `สวัสดีค่ะคุณ${currentDeal.displayName} 🙏 แอดมินขออนุญาตติดต่อเพื่อแจ้งสิทธิพิเศษสำหรับคุณลูกค้าโดยเฉพาะค่ะ มอบส่วนลดพิเศษ 10% สำหรับการสั่งซื้อ ${currentDeal.product || 'สินค้ารายการนี้'} ภายในวันนี้นะคะ คุณลูกค้าสะดวกรับข้อเสนอพิเศษนี้ไว้เลยไหมคะ? 😊`,
    },
    {
      id: 'consult',
      title: '💬 สอบถามข้อสงสัย & ให้คำปรึกษา (Gentle Check-in)',
      desc: 'เหมาะสำหรับเคส #เงียบหาย หรือ #ขอคิดดูก่อน',
      text: `สวัสดีค่ะคุณ${currentDeal.displayName} ขออนุญาตสอบถามเพิ่มเติมนะคะ พอดีแอดมินเห็นว่าคุณลูกค้าสนใจ ${currentDeal.product || 'สินค้าของเรา'} หากมีข้อมูลตรงไหนต้องการให้แอดมินอธิบายเพิ่มเติม หรือต้องการปรับงบประมาณให้เหมาะสม สามารถแจ้งแอดมินได้เลยนะคะ ยินดีดูแลเต็มที่ค่ะ ✨`,
    },
    {
      id: 'urgency',
      title: '⚡ สต็อกพร้อมส่ง & ของแถมพิเศษ (Stock & Free Gift)',
      desc: 'เหมาะสำหรับเคสที่รอตัดสินใจหรือใกล้ปิดการขาย',
      text: `เรียนคุณ${currentDeal.displayName} ค่ะ ตอนนี้สินค้า ${currentDeal.product || 'ที่คุณลูกค้าสนใจ'} มีรอบจัดส่งด่วนวันนี้พอดี พร้อมแถมของขวัญพรีเมียมพิเศษเฉพาะรอบนี้ หากคอนเฟิร์มรับ แอดมินล็อกสิทธิ์และส่งให้ทันทีเลยค่ะ สนใจรับสิทธิ์ไหมคะ? 📦🎁`,
    },
  ] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                ผู้ช่วยกู้คืนลูกค้าที่ "ขายไม่เสร็จ" (Lost Deal Recovery Assistant)
              </h3>
              <p className="text-xs text-slate-400">
                เลือกข้อความทักตามลูกค้า และกู้คืนออเดอร์กลับมาปิดการขายสำเร็จ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {lostOrProgDeals.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            ไม่พบลูกค้าที่อยู่ในสถานะ "ขายไม่เสร็จ" หรือ "กำลังติดตาม"
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            
            {/* Customer Picker */}
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">
                เลือกลูกค้าที่ต้องการติดตามผล (Follow-up Customer)
              </label>
              <select
                value={activeDealId}
                onChange={(e) => setActiveDealId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                {lostOrProgDeals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.status === 'LOST' ? '🔴 ขายไม่เสร็จ' : '🟡 กำลังตาม'}: {d.displayName} ({d.tags.join(', ') || 'ไม่มีแท็ก'}) - {d.product || 'ไม่ระบุสินค้า'}
                  </option>
                ))}
              </select>
            </div>

            {currentDeal && (
              <>
                {/* Customer Snapshot */}
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={currentDeal.pictureUrl}
                      alt={currentDeal.displayName}
                      className="w-10 h-10 rounded-full border border-slate-700 object-cover"
                    />
                    <div>
                      <h4 className="font-bold text-white">{currentDeal.displayName}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        แชทล่าสุด: <span className="text-slate-300 italic">"{currentDeal.lastMessage}"</span>
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {currentDeal.tags.map((t) => (
                          <span key={t} className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-rose-300 font-mono">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-emerald-400 text-sm">
                      ฿{currentDeal.amount > 0 ? currentDeal.amount.toLocaleString('th-TH') : '-'}
                    </p>
                    <span className="text-[10px] text-slate-500">{currentDeal.adminName}</span>
                  </div>
                </div>

                {/* Follow-up Templates */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>เทมเพลตข้อความทักตามลูกค้าเพื่อปิดการขาย (Ready-to-use Follow-up):</span>
                  </span>

                  {templates.map((tpl) => {
                    const isCopied = copiedTemplate === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white">{tpl.title}</span>
                          <button
                            onClick={() => handleCopy(tpl.text, tpl.id)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? 'คัดลอกข้อความแล้ว!' : 'คัดลอกข้อความ'}</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-2">{tpl.desc}</p>
                        <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans select-all">
                          {tpl.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Re-open as WON button */}
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-emerald-300">ลูกค้าตอบตกลงซื้อสินค้าแล้ว?</h5>
                    <p className="text-[11px] text-slate-400">
                      กู้คืนเคสนี้และเปลี่ยนสถานะเป็น "ปิดการขายสำเร็จ" พร้อมส่งข้อมูลออกชีททันที
                    </p>
                  </div>
                  <button
                    onClick={handleReopenAsWon}
                    disabled={isUpdating}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 transition-all disabled:opacity-50 shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isUpdating ? 'กำลังอัปเดต...' : 'ปิดการขายสำเร็จทันที (Won)'}</span>
                  </button>
                </div>
              </>
            )}

          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 mt-5 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
};
