import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Tag as TagIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileSpreadsheet, 
  ExternalLink, 
  Edit3, 
  Plus, 
  Trash2, 
  MessageSquare, 
  User as UserIcon, 
  Check, 
  RefreshCw,
  Send,
  AlertCircle,
  HeartHandshake,
  Download,
  RotateCcw
} from 'lucide-react';
import { CustomerDeal, DealStatus, TagRule } from '../types';

interface CustomerTableProps {
  deals: CustomerDeal[];
  tagRules: TagRule[];
  activeFilter: DealStatus | 'ALL';
  onFilterChange: (status: DealStatus | 'ALL') => void;
  onUpdateDeal: (updatedDeal: CustomerDeal) => void;
  onSyncSingleDeal: (deal: CustomerDeal) => Promise<void>;
  isSheetConnected: boolean;
  onOpenLostRecoveryWithDeal?: (dealId: string) => void;
  onExportCsv?: () => void;
  admins?: import('../types').AdminUser[];
  onOpenAdminManagement?: () => void;
  onResetDeal?: (deal: CustomerDeal) => void;
  onResetAllDeals?: () => void;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  deals,
  tagRules,
  activeFilter,
  onFilterChange,
  onUpdateDeal,
  onSyncSingleDeal,
  isSheetConnected,
  onOpenLostRecoveryWithDeal,
  onExportCsv,
  admins = [],
  onOpenAdminManagement,
  onResetDeal,
  onResetAllDeals,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDeal, setEditingDeal] = useState<CustomerDeal | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [syncingDealId, setSyncingDealId] = useState<string | null>(null);
  const [showStalledOnly, setShowStalledOnly] = useState(false);

  // Quick tag editor popover state
  const [activeTagEditDealId, setActiveTagEditDealId] = useState<string | null>(null);
  const [newTagText, setNewTagText] = useState('');

  const filteredDeals = deals.filter((deal) => {
    // Stalled > 24h filter
    if (showStalledOnly) {
      const isStalled = Date.now() - new Date(deal.updatedAt).getTime() > 24 * 60 * 60 * 1000;
      if (!isStalled || deal.status === 'WON') return false;
    }
    // Status filter
    if (activeFilter !== 'ALL' && deal.status !== activeFilter) {
      return false;
    }
    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = deal.displayName.toLowerCase().includes(q);
      const matchId = deal.lineUserId.toLowerCase().includes(q);
      const matchProduct = deal.product.toLowerCase().includes(q);
      const matchAdmin = deal.adminName.toLowerCase().includes(q);
      const matchTags = deal.tags.some((t) => t.toLowerCase().includes(q));
      return matchName || matchId || matchProduct || matchAdmin || matchTags;
    }
    return true;
  });

  const handleSyncRow = async (deal: CustomerDeal) => {
    setSyncingDealId(deal.id);
    try {
      await onSyncSingleDeal(deal);
    } finally {
      setSyncingDealId(null);
    }
  };

  const handleQuickAddTag = (deal: CustomerDeal, tagToAdd: string) => {
    if (!tagToAdd.trim()) return;
    const cleanTag = tagToAdd.startsWith('#') ? tagToAdd.trim() : `#${tagToAdd.trim()}`;
    if (!deal.tags.includes(cleanTag)) {
      const updatedTags = [...deal.tags, cleanTag];
      // Re-evaluate status
      let newStatus = deal.status;
      const wonTags = tagRules.filter((r) => r.mapsToStatus === 'WON').map((r) => r.tag);
      const lostTags = tagRules.filter((r) => r.mapsToStatus === 'LOST').map((r) => r.tag);
      
      if (wonTags.includes(cleanTag)) {
        newStatus = 'WON';
      } else if (lostTags.includes(cleanTag)) {
        newStatus = 'LOST';
      } else if (newStatus === 'UNTAGGED') {
        newStatus = 'IN_PROGRESS';
      }

      onUpdateDeal({
        ...deal,
        tags: updatedTags,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        syncedToSheet: false, // mark as changed
      });
    }
    setNewTagText('');
    setActiveTagEditDealId(null);
  };

  const handleRemoveTag = (deal: CustomerDeal, tagToRemove: string) => {
    const updatedTags = deal.tags.filter((t) => t !== tagToRemove);
    const newStatus = updatedTags.length === 0 ? 'UNTAGGED' : deal.status;
    onUpdateDeal({
      ...deal,
      tags: updatedTags,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      syncedToSheet: false,
    });
  };

  const handleQuickChangeStatus = (deal: CustomerDeal, nextStatus: DealStatus) => {
    // If changing to WON, ensure a #ปิดการขาย tag exists
    let updatedTags = [...deal.tags];
    if (nextStatus === 'WON' && !updatedTags.some((t) => t.includes('ปิดการขาย'))) {
      updatedTags.push('#ปิดการขาย');
    } else if (nextStatus === 'LOST' && !updatedTags.some((t) => t.includes('ขายไม่เสร็จ'))) {
      updatedTags.push('#ขายไม่เสร็จ');
    }

    onUpdateDeal({
      ...deal,
      status: nextStatus,
      tags: updatedTags,
      updatedAt: new Date().toISOString(),
      syncedToSheet: false,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => onFilterChange('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === 'ALL'
                ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            ทั้งหมด ({deals.length})
          </button>
          <button
            onClick={() => onFilterChange('WON')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === 'WON'
                ? 'bg-emerald-950/70 text-emerald-300 font-semibold border border-emerald-500/50'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>ปิดการขาย ({deals.filter((d) => d.status === 'WON').length})</span>
          </button>
          <button
            onClick={() => onFilterChange('LOST')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === 'LOST'
                ? 'bg-rose-950/70 text-rose-300 font-semibold border border-rose-500/50'
                : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800/60'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>ขายไม่เสร็จ ({deals.filter((d) => d.status === 'LOST').length})</span>
          </button>
          <button
            onClick={() => onFilterChange('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === 'IN_PROGRESS'
                ? 'bg-sky-950/70 text-sky-300 font-semibold border border-sky-500/50'
                : 'text-slate-400 hover:text-sky-300 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>กำลังติดตาม ({deals.filter((d) => d.status === 'IN_PROGRESS').length})</span>
          </button>
          <button
            onClick={() => onFilterChange('UNTAGGED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === 'UNTAGGED'
                ? 'bg-amber-950/70 text-amber-300 font-semibold border border-amber-500/50'
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/60'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>ยังไม่ติดแท็ก ({deals.filter((d) => d.status === 'UNTAGGED').length})</span>
          </button>

          {/* Stalled >24h Filter Toggle */}
          <button
            onClick={() => setShowStalledOnly(!showStalledOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              showStalledOnly
                ? 'bg-orange-950/70 text-orange-300 font-semibold border border-orange-500/50'
                : 'text-slate-400 hover:text-orange-300 hover:bg-slate-800/60'
            }`}
            title="กรองเฉพาะเคสที่ยังไม่ปิดการขายและไม่มีความคืบหน้าเกิน 24 ชั่วโมง"
          >
            <span>⚡ ค้างเกิน 24 ชม.</span>
          </button>
        </div>

        {/* Search Box & CSV Export */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ, แท็ก (#ปิดการขาย), สินค้า..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {onExportCsv && (
            <button
              onClick={onExportCsv}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700/80 flex items-center gap-1 transition-colors shrink-0"
              title="ดาวน์โหลดไฟล์ CSV สำหรับ Excel"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">ส่งออก CSV</span>
            </button>
          )}

          {onResetAllDeals && (
            <button
              onClick={onResetAllDeals}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700/80 flex items-center gap-1 transition-colors shrink-0"
              title="ลบการแก้ไขที่บันทึกไว้ทั้งหมด และคืนค่าเป็นข้อมูลล่าสุดจาก LINE"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">รีเซ็ตจาก LINE</span>
            </button>
          )}
        </div>

      </div>

      {/* Customer Deals Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-medium">
            <tr>
              <th className="py-3 px-4">ลูกค้า LINE OA</th>
              <th className="py-3 px-4">สถานะการขาย</th>
              <th className="py-3 px-4">แท็ก LINE OA (Tags)</th>
              <th className="py-3 px-4 text-right">ยอดเงิน</th>
              <th className="py-3 px-4">สินค้า / แอดมิน</th>
              <th className="py-3 px-4">แชทล่าสุด</th>
              <th className="py-3 px-4 text-center">Google Sheet</th>
              <th className="py-3 px-4 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredDeals.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <MessageSquare className="w-8 h-8 text-slate-600" />
                    <p className="text-sm font-medium">ไม่พบข้อมูลลูกค้าตามเงื่อนไขที่เลือก</p>
                    <p className="text-xs text-slate-500">
                      คุณสามารถใช้ปุ่ม "จำลองแท็ก (Simulator)" ด้านบนเพื่อทดสอบการรับแท็กใหม่ได้ทันที
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredDeals.map((deal) => {
                const isWON = deal.status === 'WON';
                const isLOST = deal.status === 'LOST';
                const isPROG = deal.status === 'IN_PROGRESS';
                const isUNTAGGED = deal.status === 'UNTAGGED';

                return (
                  <tr
                    key={deal.id}
                    className="hover:bg-slate-850/50 transition-colors group"
                  >
                    
                    {/* Customer Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={deal.pictureUrl}
                          alt={deal.displayName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-700 bg-slate-800 shrink-0"
                          onError={(e) => {
                            // Fallback if avatar fails
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate max-w-[170px]" title={deal.displayName}>
                            {deal.displayName}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[150px]" title={deal.lineUserId}>
                            {deal.lineUserId.substring(0, 14)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Sales Status Pill & Selector */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {isWON && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ปิดการขาย
                          </span>
                        )}
                        {isLOST && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3.5 h-3.5" /> ขายไม่เสร็จ
                          </span>
                        )}
                        {isPROG && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                            <Clock className="w-3.5 h-3.5" /> กำลังติดตาม
                          </span>
                        )}
                        {isUNTAGGED && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5" /> ยังไม่ติดแท็ก
                          </span>
                        )}

                        {/* Quick switch status mini buttons */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-1">
                          {!isWON && (
                            <button
                              onClick={() => handleQuickChangeStatus(deal, 'WON')}
                              title="เปลี่ยนเป็น: ปิดการขาย"
                              className="p-1 rounded hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                            </button>
                          )}
                          {!isLOST && (
                            <button
                              onClick={() => handleQuickChangeStatus(deal, 'LOST')}
                              title="เปลี่ยนเป็น: ขายไม่เสร็จ"
                              className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          )}
                          {!isPROG && (
                            <button
                              onClick={() => handleQuickChangeStatus(deal, 'IN_PROGRESS')}
                              title="เปลี่ยนเป็น: กำลังติดตาม"
                              className="p-1 rounded hover:bg-sky-500/20 text-slate-400 hover:text-sky-400 transition-colors"
                            >
                              <Clock className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Tags List with Interactive Add/Remove */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                        {deal.tags.length === 0 ? (
                          <span className="text-slate-500 italic text-[11px]">ไม่มีแท็ก</span>
                        ) : (
                          deal.tags.map((tag) => {
                            const isWonTag = tag.includes('ปิดการขาย') || tag.includes('โอนแล้ว') || tag.includes('มัดจำ');
                            const isLostTag = tag.includes('ขายไม่เสร็จ') || tag.includes('ยกเลิก') || tag.includes('เงียบ') || tag.includes('แพง');
                            
                            const tagStyle = isWonTag
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : isLostTag
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700';

                            return (
                              <span
                                key={tag}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${tagStyle}`}
                              >
                                {tag}
                                <button
                                  onClick={() => handleRemoveTag(deal, tag)}
                                  className="text-slate-400 hover:text-rose-400 ml-0.5"
                                  title="ลบแท็กนี้"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })
                        )}

                        {/* Add tag quick button */}
                        <div className="relative inline-block">
                          {activeTagEditDealId === deal.id ? (
                            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-700 shadow-lg">
                              <input
                                type="text"
                                value={newTagText}
                                onChange={(e) => setNewTagText(e.target.value)}
                                placeholder="#แท็กใหม่"
                                className="w-20 px-1.5 py-0.5 text-[11px] bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-500"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleQuickAddTag(deal, newTagText);
                                  } else if (e.key === 'Escape') {
                                    setActiveTagEditDealId(null);
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleQuickAddTag(deal, newTagText)}
                                className="p-0.5 text-emerald-400 hover:text-emerald-300"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setActiveTagEditDealId(null)}
                                className="p-0.5 text-slate-400 hover:text-slate-300"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveTagEditDealId(deal.id);
                                setNewTagText('');
                              }}
                              className="px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-400 hover:text-emerald-400 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 inline-flex items-center gap-0.5"
                              title="เพิ่มแท็กให้ลูกค้ารายนี้"
                            >
                              <Plus className="w-3 h-3" /> เพิ่มแท็ก
                            </button>
                          )}
                        </div>

                      </div>
                    </td>

                    {/* Deal Amount */}
                    <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                      {deal.amount > 0 ? (
                        <span className={isWON ? 'text-emerald-400' : isLOST ? 'text-rose-400 line-through' : 'text-slate-200'}>
                          ฿{deal.amount.toLocaleString('th-TH')}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* Product & Sales Rep */}
                    <td className="py-3 px-4">
                      <div className="max-w-[150px]">
                        <p className="font-medium text-slate-200 truncate" title={deal.product}>
                          {deal.product || '-'}
                        </p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <UserIcon className="w-2.5 h-2.5 text-slate-500" />
                          <span>{deal.adminName || 'Admin'}</span>
                        </p>
                      </div>
                    </td>

                    {/* Latest Chat Message */}
                    <td className="py-3 px-4">
                      <div className="max-w-[200px]">
                        <p className="text-slate-300 truncate text-[11px]" title={deal.lastMessage}>
                          {deal.lastMessage || '-'}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {deal.lastMessageTime}
                        </span>
                      </div>
                    </td>

                    {/* Google Sheet Sync Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {deal.syncedToSheet ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20" title={deal.syncedAt ? `ซิงค์เมื่อ ${new Date(deal.syncedAt).toLocaleTimeString('th-TH')}` : 'ซิงค์แล้ว'}>
                          <Check className="w-3 h-3" /> ซิงค์แล้ว
                          {deal.sheetRow && (
                            <span className="text-[10px] opacity-75">#{deal.sheetRow}</span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          ยังไม่ซิงค์
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* Direct Sync button for this row */}
                        <button
                          onClick={() => handleSyncRow(deal)}
                          disabled={syncingDealId === deal.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-slate-700/80 hover:border-emerald-500/30 transition-all disabled:opacity-50"
                          title="ส่งรายการนี้เข้า Google Sheet ทันที"
                        >
                          <Send className={`w-3.5 h-3.5 ${syncingDealId === deal.id ? 'animate-spin' : ''}`} />
                        </button>

                        {/* Follow-up / Recovery button for LOST or IN_PROGRESS deals */}
                        {(deal.status === 'LOST' || deal.status === 'IN_PROGRESS') && onOpenLostRecoveryWithDeal && (
                          <button
                            onClick={() => onOpenLostRecoveryWithDeal(deal.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 border border-slate-700/80 hover:border-rose-500/40 transition-all"
                            title="ผู้ช่วยกู้คืน / ส่งข้อความทักตามลูกค้า"
                          >
                            <HeartHandshake className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Reset this deal to the latest LINE data */}
                        {onResetDeal && (
                          <button
                            onClick={() => onResetDeal(deal)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 border border-slate-700/80 hover:border-amber-500/30 transition-all"
                            title="รีเซ็ตค่านี้กลับเป็นข้อมูลล่าสุดจาก LINE"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit Deal Modal trigger */}
                        <button
                          onClick={() => setEditingDeal(deal)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 border border-slate-700/80 hover:border-sky-500/30 transition-all"
                          title="แก้ไขรายละเอียดและโน้ต"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Deal Details Modal */}
      {editingDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={editingDeal.pictureUrl}
                  alt={editingDeal.displayName}
                  className="w-10 h-10 rounded-full border border-slate-700 object-cover"
                />
                <div>
                  <h3 className="text-base font-bold text-white">{editingDeal.displayName}</h3>
                  <p className="text-xs text-slate-400">{editingDeal.lineUserId}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingDeal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateDeal({
                  ...editingDeal,
                  updatedAt: new Date().toISOString(),
                  syncedToSheet: false,
                });
                setEditingDeal(null);
              }}
              className="mt-4 space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">สถานะการขาย</label>
                  <select
                    value={editingDeal.status}
                    onChange={(e) => setEditingDeal({ ...editingDeal, status: e.target.value as DealStatus })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="WON">🟢 ปิดการขายสำเร็จ (Closed Won)</option>
                    <option value="LOST">🔴 ขายไม่เสร็จ / หลุด (Closed Lost)</option>
                    <option value="IN_PROGRESS">🟡 กำลังติดตาม (In Progress)</option>
                    <option value="UNTAGGED">⚪ ยังไม่ติดแท็ก (Untagged)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">ยอดเงิน (฿)</label>
                  <input
                    type="number"
                    value={editingDeal.amount || 0}
                    onChange={(e) => setEditingDeal({ ...editingDeal, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">สินค้า / บริการ</label>
                  <input
                    type="text"
                    value={editingDeal.product}
                    onChange={(e) => setEditingDeal({ ...editingDeal, product: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-medium">แอดมินผู้รับผิดชอบ</label>
                    {onOpenAdminManagement && (
                      <button
                        type="button"
                        onClick={onOpenAdminManagement}
                        className="text-[10px] text-purple-400 hover:text-purple-300 underline"
                      >
                        + เพิ่ม/จัดการแอดมิน
                      </button>
                    )}
                  </div>
                  {admins.length > 0 ? (
                    <select
                      value={editingDeal.adminName}
                      onChange={(e) => setEditingDeal({ ...editingDeal, adminName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ยังไม่มีแอดมินรับเรื่อง">-- ยังไม่มีแอดมินรับเรื่อง --</option>
                      {admins.map((a) => (
                        <option key={a.id} value={a.name}>
                          {a.name} ({a.role})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editingDeal.adminName}
                      onChange={(e) => setEditingDeal({ ...editingDeal, adminName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  แท็ก LINE OA (คั่นด้วยเครื่องหมายจุลภาคหรือเว้นวรรค)
                </label>
                <input
                  type="text"
                  value={editingDeal.tags.join(', ')}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = raw
                      .split(/[\s,]+/)
                      .filter((t) => t.trim().length > 0)
                      .map((t) => (t.startsWith('#') ? t : `#${t}`));
                    setEditingDeal({ ...editingDeal, tags: parsed });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">บันทึกเพิ่มเติม / เหตุผล (Notes)</label>
                <textarea
                  rows={3}
                  value={editingDeal.notes}
                  onChange={(e) => setEditingDeal({ ...editingDeal, notes: e.target.value })}
                  placeholder="เช่น สาเหตุที่ขายไม่เสร็จ, ลูกค้าต่อรองราคา, นัดชำระเงินงวดสอง..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDeal(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
