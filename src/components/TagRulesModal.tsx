import React, { useState } from 'react';
import { 
  Tag as TagIcon, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { DealStatus, TagRule } from '../types';
import { DEFAULT_TAG_RULES } from '../services/lineService';

interface TagRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tagRules: TagRule[];
  onUpdateRules: (newRules: TagRule[]) => void;
}

export const TagRulesModal: React.FC<TagRulesModalProps> = ({
  isOpen,
  onClose,
  tagRules,
  onUpdateRules,
}) => {
  const [newTag, setNewTag] = useState('');
  const [newStatus, setNewStatus] = useState<DealStatus>('WON');
  const [newDesc, setNewDesc] = useState('');

  if (!isOpen) return null;

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;

    const formattedTag = newTag.startsWith('#') ? newTag.trim() : `#${newTag.trim()}`;
    
    // Check if tag already exists
    if (tagRules.some((r) => r.tag.toLowerCase() === formattedTag.toLowerCase())) {
      alert(`แท็ก ${formattedTag} มีอยู่ในระบบแล้ว`);
      return;
    }

    const createdRule: TagRule = {
      id: 'rule-custom-' + Date.now(),
      tag: formattedTag,
      mapsToStatus: newStatus,
      color: newStatus === 'WON' ? 'emerald' : newStatus === 'LOST' ? 'rose' : 'sky',
      description: newDesc.trim() || `แท็กตรวจจับสถานะ ${newStatus}`,
      isSystem: false,
    };

    onUpdateRules([...tagRules, createdRule]);
    setNewTag('');
    setNewDesc('');
  };

  const handleDeleteRule = (ruleId: string) => {
    onUpdateRules(tagRules.filter((r) => r.id !== ruleId));
  };

  const handleResetDefaults = () => {
    if (confirm('คุณต้องการรีเซ็ตกฎการตรวจจับแท็กกลับเป็นค่าเริ่มต้นหรือไม่?')) {
      onUpdateRules(DEFAULT_TAG_RULES);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <TagIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                ตั้งค่ากฎการตรวจจับแท็ก (LINE OA Tag Rules)
              </h3>
              <p className="text-xs text-slate-400">
                กำหนดว่าเมื่อแอดมินหรือระบบติดแท็กใด จะแปลงเป็น "ปิดการขาย", "ขายไม่เสร็จ" หรือ "กำลังติดตาม"
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

        {/* Add New Rule Form */}
        <form onSubmit={handleAddRule} className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 text-xs">
          <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>เพิ่มกฎการตรวจจับแท็กใหม่</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">ชื่อแท็ก (รวมเครื่องหมาย #)</label>
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="เช่น #โอนเต็มจำนวน"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">แมปเข้าสถานะการขาย</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as DealStatus)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="WON">🟢 ปิดการขาย (WON)</option>
                <option value="LOST">🔴 ขายไม่เสร็จ / หลุด (LOST)</option>
                <option value="IN_PROGRESS">🟡 กำลังติดตาม (IN_PROGRESS)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">คำอธิบาย</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="เช่น ลูกค้าชำระเงินเรียบร้อย"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มกฎแท็ก</span>
            </button>
          </div>
        </form>

        {/* Existing Rules List */}
        <div className="mt-5 space-y-4">
          
          {/* WON Group */}
          <div>
            <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>แท็กที่จัดเป็น "ปิดการขายสำเร็จ" (Won)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tagRules
                .filter((r) => r.mapsToStatus === 'WON')
                .map((rule) => (
                  <div
                    key={rule.id}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-emerald-500/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-emerald-300 font-mono">{rule.tag}</span>
                      <p className="text-[11px] text-slate-400">{rule.description}</p>
                    </div>
                    {!rule.isSystem && (
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="ลบกฎนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* LOST Group */}
          <div>
            <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 mb-2">
              <XCircle className="w-4 h-4" />
              <span>แท็กที่จัดเป็น "ขายไม่เสร็จ / หลุด" (Lost)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tagRules
                .filter((r) => r.mapsToStatus === 'LOST')
                .map((rule) => (
                  <div
                    key={rule.id}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-rose-500/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-rose-300 font-mono">{rule.tag}</span>
                      <p className="text-[11px] text-slate-400">{rule.description}</p>
                    </div>
                    {!rule.isSystem && (
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="ลบกฎนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* IN_PROGRESS Group */}
          <div>
            <h4 className="text-xs font-bold text-sky-400 flex items-center gap-1.5 mb-2">
              <Clock className="w-4 h-4" />
              <span>แท็กที่จัดเป็น "กำลังติดตาม" (In Progress)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tagRules
                .filter((r) => r.mapsToStatus === 'IN_PROGRESS')
                .map((rule) => (
                  <div
                    key={rule.id}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-sky-500/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-sky-300 font-mono">{rule.tag}</span>
                      <p className="text-[11px] text-slate-400">{rule.description}</p>
                    </div>
                    {!rule.isSystem && (
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="ลบกฎนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่ากฎเริ่มต้น (Reset)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
          >
            เรียบร้อย
          </button>
        </div>

      </div>
    </div>
  );
};
