import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  FileSpreadsheet, 
  TrendingUp, 
  ArrowUpRight 
} from 'lucide-react';
import { CustomerDeal, DealStatus } from '../types';

interface StatsCardsProps {
  deals: CustomerDeal[];
  onFilterStatus: (status: DealStatus | 'ALL') => void;
  activeFilter: DealStatus | 'ALL';
  syncedRowsCount: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  deals,
  onFilterStatus,
  activeFilter,
  syncedRowsCount,
}) => {
  const wonDeals = deals.filter((d) => d.status === 'WON');
  const lostDeals = deals.filter((d) => d.status === 'LOST');
  const inProgressDeals = deals.filter((d) => d.status === 'IN_PROGRESS');
  const untaggedDeals = deals.filter((d) => d.status === 'UNTAGGED');

  const wonTotalRevenue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const lostTotalRevenue = lostDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const inProgTotalRevenue = inProgressDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

  const totalDecided = wonDeals.length + lostDeals.length;
  const winRate = totalDecided > 0 ? Math.round((wonDeals.length / totalDecided) * 100) : 0;

  const formatTHB = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. Closed Won Card */}
      <div
        onClick={() => onFilterStatus(activeFilter === 'WON' ? 'ALL' : 'WON')}
        className={`p-4 rounded-xl border cursor-pointer transition-all ${
          activeFilter === 'WON'
            ? 'bg-emerald-950/60 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
            : 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">ปิดการขายสำเร็จ (Won)</p>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {wonDeals.length} <span className="text-xs font-normal text-slate-400">ออเดอร์</span>
              </h3>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {winRate}% Win
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">ยอดขายรวม:</span>
          <span className="font-bold text-emerald-300">{formatTHB(wonTotalRevenue)}</span>
        </div>
      </div>

      {/* 2. Closed Lost Card */}
      <div
        onClick={() => onFilterStatus(activeFilter === 'LOST' ? 'ALL' : 'LOST')}
        className={`p-4 rounded-xl border cursor-pointer transition-all ${
          activeFilter === 'LOST'
            ? 'bg-rose-950/60 border-rose-500 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500'
            : 'bg-slate-900/80 border-slate-800 hover:border-rose-500/40 hover:bg-slate-850'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">ขายไม่เสร็จ / หลุด (Lost)</p>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {lostDeals.length} <span className="text-xs font-normal text-slate-400">รายการ</span>
              </h3>
            </div>
          </div>
          <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
            {totalDecided > 0 ? 100 - winRate : 0}% หลุด
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">มูลค่าที่พลาดโอกาส:</span>
          <span className="font-semibold text-rose-300">{formatTHB(lostTotalRevenue)}</span>
        </div>
      </div>

      {/* 3. In Progress Card */}
      <div
        onClick={() => onFilterStatus(activeFilter === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
        className={`p-4 rounded-xl border cursor-pointer transition-all ${
          activeFilter === 'IN_PROGRESS'
            ? 'bg-sky-950/60 border-sky-500 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500'
            : 'bg-slate-900/80 border-slate-800 hover:border-sky-500/40 hover:bg-slate-850'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">กำลังติดตาม (In Progress)</p>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {inProgressDeals.length} <span className="text-xs font-normal text-slate-400">แชท</span>
              </h3>
            </div>
          </div>
          <span className="text-xs font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
            รอโอน/ตัดสินใจ
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">มูลค่าใน Pipeline:</span>
          <span className="font-semibold text-sky-300">{formatTHB(inProgTotalRevenue)}</span>
        </div>
      </div>

      {/* 4. Untagged Alert Card */}
      <div
        onClick={() => onFilterStatus(activeFilter === 'UNTAGGED' ? 'ALL' : 'UNTAGGED')}
        className={`p-4 rounded-xl border cursor-pointer transition-all ${
          activeFilter === 'UNTAGGED'
            ? 'bg-amber-950/60 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500'
            : 'bg-slate-900/80 border-slate-800 hover:border-amber-500/40 hover:bg-slate-850'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">ยังไม่ติดแท็ก (เตือนแอดมิน)</p>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {untaggedDeals.length} <span className="text-xs font-normal text-slate-400">เคส</span>
              </h3>
            </div>
          </div>
          {untaggedDeals.length > 0 ? (
            <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
              ต้องติดแท็ก
            </span>
          ) : (
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              ครบถ้วน
            </span>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">ซิงค์ไปยัง Google Sheet แล้ว:</span>
          <span className="font-semibold text-emerald-400 flex items-center gap-1">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {syncedRowsCount} แถว
          </span>
        </div>
      </div>

    </div>
  );
};
