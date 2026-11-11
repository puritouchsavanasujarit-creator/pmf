import React, { useState } from 'react';
import { 
  PlayCircle, 
  Send, 
  Tag as TagIcon, 
  User, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileSpreadsheet, 
  Code 
} from 'lucide-react';
import { CustomerDeal, DealStatus, TagRule } from '../types';

interface LineSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  deals: CustomerDeal[];
  tagRules: TagRule[];
  onSimulateEvent: (eventData: {
    customerId: string;
    customerName?: string;
    message: string;
    tags: string[];
    amount: number;
    adminName: string;
    product: string;
    notes?: string;
  }) => Promise<void>;
  isAutoSyncEnabled: boolean;
  admins?: import('../types').AdminUser[];
}

export const LineSimulatorModal: React.FC<LineSimulatorModalProps> = ({
  isOpen,
  onClose,
  deals,
  tagRules,
  onSimulateEvent,
  isAutoSyncEnabled,
  admins = [],
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(deals[0]?.id || 'new');
  const [customName, setCustomName] = useState('คุณธนภัทร สุขใจ');
  const [message, setMessage] = useState('โอนเงินเรียบร้อยแล้วครับ 2,500 บาท รบกวนตรวจสอบสลิปด้วยครับ');
  const [selectedTags, setSelectedTags] = useState<string[]>(['#ปิดการขาย', '#โอนแล้ว']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [amount, setAmount] = useState<number>(2500);
  const [product, setProduct] = useState('แพ็กเกจคอร์สออนไลน์ Pro');
  const [adminName, setAdminName] = useState('แอดมินแนน');
  const [notes, setNotes] = useState('ส่งสลิปผ่านทาง LINE Chat');
  const [isSimulating, setIsSimulating] = useState(false);
  const [showPayload, setShowPayload] = useState(false);

  if (!isOpen) return null;

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    if (!customTagInput.trim()) return;
    const cleanTag = customTagInput.startsWith('#') ? customTagInput.trim() : `#${customTagInput.trim()}`;
    if (!selectedTags.includes(cleanTag)) {
      setSelectedTags([...selectedTags, cleanTag]);
    }
    setCustomTagInput('');
  };

  const handlePresetSelect = (preset: 'WON' | 'LOST' | 'IN_PROGRESS') => {
    if (preset === 'WON') {
      setMessage('ส่งสลิปโอนเงิน 3,500 บาท เรียบร้อยแล้วค่ะ ขอบคุณมากนะคะ');
      setSelectedTags(['#ปิดการขาย', '#โอนแล้ว', '#VIP']);
      setAmount(3500);
      setNotes('ลูกค้าชำระเงินเต็มจำนวน จัดส่งรอบบ่าย');
    } else if (preset === 'LOST') {
      setMessage('ขอคิดดูก่อนนะคะ พอดีช่วงนี้งบประมาณยังไม่พร้อมค่ะ ขอบคุณค่ะ');
      setSelectedTags(['#ขายไม่เสร็จ', '#ราคาแพง', '#ชะลอการสั่งซื้อ']);
      setAmount(4900);
      setNotes('ลูกค้าแจ้งว่างบไม่พอ เสนอส่วนลดแล้วยังไม่พร้อม');
    } else {
      setMessage('สนใจสินค้าชุดนี้ครับ รบกวนขอเลขที่บัญชีเพื่อโอนเงินด้วยครับ');
      setSelectedTags(['#สนใจ', '#รอโอน']);
      setAmount(1890);
      setNotes('ส่งเลขที่บัญชีธนาคารให้แล้ว รอชำระเงิน');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    try {
      await onSimulateEvent({
        customerId: selectedCustomerId,
        customerName: selectedCustomerId === 'new' ? customName : undefined,
        message,
        tags: selectedTags,
        amount,
        adminName,
        product,
        notes,
      });
      onClose();
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                LINE OA Tag Event Simulator
                <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ทดสอบระบบ
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                จำลองการส่งข้อความและการติดแท็กจาก LINE Official Account ไปยังชีททันที
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

        {/* Preset Scenarios Buttons */}
        <div className="mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 block mb-2">
            ⚡ เลือกสถานการณ์จำลองด่วน (Quick Presets):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handlePresetSelect('WON')}
              className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40 text-left transition-colors"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>ปิดการขาย (Won)</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">ลูกค้าโอนเงิน + #ปิดการขาย</p>
            </button>

            <button
              type="button"
              onClick={() => handlePresetSelect('LOST')}
              className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-900/40 text-left transition-colors"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>ขายไม่เสร็จ (Lost)</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">งบไม่พอ/ปฏิเสธ + #ขายไม่เสร็จ</p>
            </button>

            <button
              type="button"
              onClick={() => handlePresetSelect('IN_PROGRESS')}
              className="p-2 rounded-lg bg-sky-950/40 border border-sky-500/30 text-sky-300 hover:bg-sky-900/40 text-left transition-colors"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>กำลังติดตาม (In Progress)</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">ทักถามราคา + #รอโอน</p>
            </button>
          </div>
        </div>

        {/* Simulation Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          
          {/* Customer Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">เลือกลูกค้าในระบบ</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="new">+ เพิ่มลูกค้าใหม่ (New Customer)</option>
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.displayName} ({deal.status})
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomerId === 'new' && (
              <div>
                <label className="block text-slate-400 font-medium mb-1">ชื่อลูกค้า LINE</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="เช่น คุณสมชาย ค้าเจริญ"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            )}
          </div>

          {/* Chat Message */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">ข้อความล่าสุดจากลูกค้า (LINE Chat Message)</label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Tag Selector */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5 flex items-center justify-between">
              <span>เลือกแท็กที่ติดให้ลูกค้า (LINE OA Tags)</span>
              <span className="text-[11px] text-emerald-400">เลือกแล้ว: {selectedTags.length} แท็ก</span>
            </label>
            
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {tagRules.map((rule) => {
                const isSelected = selectedTags.includes(rule.tag);
                const isWon = rule.mapsToStatus === 'WON';
                const isLost = rule.mapsToStatus === 'LOST';

                let activeClass = 'bg-slate-800 text-slate-300 border-slate-700';
                if (isSelected) {
                  activeClass = isWon 
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500 font-bold'
                    : isLost
                    ? 'bg-rose-500/25 text-rose-300 border-rose-500 font-bold'
                    : 'bg-sky-500/25 text-sky-300 border-sky-500 font-bold';
                }

                return (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => handleToggleTag(rule.tag)}
                    className={`px-2.5 py-1 rounded-md text-[11px] border transition-all ${activeClass}`}
                  >
                    {rule.tag}
                  </button>
                );
              })}
            </div>

            {/* Custom tag add input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="#พิมพ์แท็กเพิ่มเติม..."
                className="w-48 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-[11px] focus:outline-none focus:border-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium"
              >
                + เพิ่ม
              </button>
            </div>
          </div>

          {/* Amount & Product */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">ยอดเงิน (฿)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-semibold text-emerald-300"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">สินค้า / บริการ</label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">แอดมินผู้รับผิดชอบ</label>
              {admins.length > 0 ? (
                <select
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  {admins.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name} ({a.role})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">โน้ต / บันทึกการสนทนา</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Real-time sync badge info */}
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>
                {isAutoSyncEnabled
                  ? 'ระบบ Auto-Sync เปิดอยู่: ข้อมูลจะถูกเขียนลง Google Sheets ทันทีที่กดจำลอง'
                  : 'ระบบ Auto-Sync ปิดอยู่: บันทึกในแอป คุณสามารถกดซิงค์ลง Google Sheet ได้ภายหลัง'}
              </span>
            </span>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowPayload(!showPayload)}
              className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1"
            >
              <Code className="w-3.5 h-3.5" />
              <span>{showPayload ? 'ซ่อน' : 'ดู'} Raw Webhook JSON</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSimulating}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSimulating ? 'กำลังจำลอง...' : 'ส่งอีเวนต์จำลอง (Simulate Event)'}</span>
              </button>
            </div>
          </div>

          {showPayload && (
            <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-400 overflow-x-auto">
              <pre>
                {JSON.stringify(
                  {
                    destination: 'U91a82f71829471abef9182371928371',
                    events: [
                      {
                        type: 'message',
                        message: {
                          type: 'text',
                          id: 'msg-' + Date.now(),
                          text: message,
                        },
                        timestamp: Date.now(),
                        source: {
                          type: 'user',
                          userId: selectedCustomerId === 'new' ? 'U' + Math.random().toString(36).substring(2, 15) : selectedCustomerId,
                        },
                        tagEvents: {
                          assignedTags: selectedTags,
                          admin: adminName,
                          detectedStatus: selectedTags.some((t) => t.includes('ปิดการขาย'))
                            ? 'WON'
                            : selectedTags.some((t) => t.includes('ขายไม่เสร็จ'))
                            ? 'LOST'
                            : 'IN_PROGRESS',
                        },
                      },
                    ],
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}

        </form>
      </div>
    </div>
  );
};
