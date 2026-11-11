import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  PieChart, 
  Award, 
  DollarSign 
} from 'lucide-react';
import { CustomerDeal, TagRule } from '../types';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deals: CustomerDeal[];
  tagRules: TagRule[];
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  deals,
  tagRules,
}) => {
  if (!isOpen) return null;

  const wonDeals = deals.filter((d) => d.status === 'WON');
  const lostDeals = deals.filter((d) => d.status === 'LOST');
  const inProgressDeals = deals.filter((d) => d.status === 'IN_PROGRESS');

  const totalWonRevenue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalLostRevenue = lostDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalPipelineRevenue = inProgressDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

  const totalClosed = wonDeals.length + lostDeals.length;
  const winRate = totalClosed > 0 ? Math.round((wonDeals.length / totalClosed) * 100) : 0;
  const avgDealValue = wonDeals.length > 0 ? Math.round(totalWonRevenue / wonDeals.length) : 0;

  // Analysis of reasons for lost deals from tags
  const lostReasonsCount: { [reason: string]: number } = {};
  lostDeals.forEach((d) => {
    const lossTags = d.tags.filter((t) => 
      t.includes('แพง') || t.includes('เงียบ') || t.includes('ยกเลิก') || t.includes('ชะลอ') || t.includes('ขายไม่เสร็จ')
    );
    if (lossTags.length === 0) {
      lostReasonsCount['ไม่ระบุสาเหตุชัดเจน'] = (lostReasonsCount['ไม่ระบุสาเหตุชัดเจน'] || 0) + 1;
    } else {
      lossTags.forEach((tag) => {
        lostReasonsCount[tag] = (lostReasonsCount[tag] || 0) + 1;
      });
    }
  });

  // Sales rep performance calculation
  const adminStats: { 
    [name: string]: { wonCount: number; lostCount: number; revenue: number; total: number } 
  } = {};

  deals.forEach((d) => {
    const name = d.adminName || 'ยังไม่ระบุแอดมิน';
    if (!adminStats[name]) {
      adminStats[name] = { wonCount: 0, lostCount: 0, revenue: 0, total: 0 };
    }
    adminStats[name].total += 1;
    if (d.status === 'WON') {
      adminStats[name].wonCount += 1;
      adminStats[name].revenue += d.amount || 0;
    } else if (d.status === 'LOST') {
      adminStats[name].lostCount += 1;
    }
  });

  const adminLeaderboard = Object.entries(adminStats).sort(
    ([, a], [, b]) => b.revenue - a.revenue || b.wonCount - a.wonCount
  );

  const formatTHB = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                สรุปสถิติ & ประสิทธิภาพการปิดการขาย (Sales Analytics)
              </h3>
              <p className="text-xs text-slate-400">
                วิเคราะห์แนวโน้มยอดขาย อัตราการปิดการขาย และสาเหตุที่ขายไม่เสร็จใน LINE OA
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

        {/* Highlight Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <p className="text-[11px] text-slate-400 font-medium">อัตราปิดการขาย (Win Rate)</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-0.5">{winRate}%</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{wonDeals.length} จาก {totalClosed} เคสที่ปิดผล</p>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <p className="text-[11px] text-slate-400 font-medium">ยอดปิดการขายรวม</p>
            <p className="text-xl font-extrabold text-emerald-300 mt-0.5">{formatTHB(totalWonRevenue)}</p>
            <p className="text-[10px] text-emerald-500/80 mt-0.5">รับเงินเรียบร้อย</p>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <p className="text-[11px] text-slate-400 font-medium">ยอดหลุด / ขายไม่เสร็จ</p>
            <p className="text-xl font-extrabold text-rose-400 mt-0.5">{formatTHB(totalLostRevenue)}</p>
            <p className="text-[10px] text-rose-400/80 mt-0.5">{lostDeals.length} เคสที่พลาดโอกาส</p>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <p className="text-[11px] text-slate-400 font-medium">เฉลี่ยต่อออเดอร์ (Ticket Size)</p>
            <p className="text-xl font-extrabold text-sky-300 mt-0.5">{formatTHB(avgDealValue)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">สำหรับเคสปิดสำเร็จ</p>
          </div>
        </div>

        {/* Visual Progress Bar of Funnel */}
        <div className="mt-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-2 font-medium">
            <span className="text-slate-300">สัดส่วนสถานะการขายทั้งหมด ({deals.length} เคส)</span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                ปิดการขาย ({wonDeals.length})
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                ขายไม่เสร็จ ({lostDeals.length})
              </span>
              <span className="flex items-center gap-1 text-sky-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
                ติดตามต่อ ({inProgressDeals.length})
              </span>
            </div>
          </div>

          {deals.length > 0 && (
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${(wonDeals.length / deals.length) * 100}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`ปิดการขาย: ${wonDeals.length} เคส`}
              ></div>
              <div
                style={{ width: `${(lostDeals.length / deals.length) * 100}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`ขายไม่เสร็จ: ${lostDeals.length} เคส`}
              ></div>
              <div
                style={{ width: `${(inProgressDeals.length / deals.length) * 100}%` }}
                className="bg-sky-500 h-full transition-all"
                title={`กำลังติดตาม: ${inProgressDeals.length} เคส`}
              ></div>
            </div>
          )}
        </div>

        {/* 2 Columns: Reasons for Lost Deals vs Admin Leaderboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          
          {/* Reasons for Lost Deals */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 mb-3">
              <XCircle className="w-4 h-4" />
              <span>สาเหตุที่ "ขายไม่เสร็จ" (Top Loss Reasons)</span>
            </h4>

            {lostDeals.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">ยังไม่มีเคสขายไม่เสร็จ</p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {Object.entries(lostReasonsCount)
                  .sort(([, a], [, b]) => b - a)
                  .map(([reason, count]) => {
                    const pct = Math.round((count / lostDeals.length) * 100);
                    return (
                      <div key={reason}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-slate-300 font-mono text-[11px]">{reason}</span>
                          <span className="text-slate-400 text-[10px]">
                            {count} เคส ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="bg-rose-500 h-full rounded-full"
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Admin Sales Rep Leaderboard */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-3">
              <Award className="w-4 h-4" />
              <span>ผลงานแอดมินผู้ดูแล (Sales Rep Leaderboard)</span>
            </h4>

            <div className="space-y-2.5 text-xs">
              {adminLeaderboard.map(([name, stat], idx) => {
                const repClosed = stat.wonCount + stat.lostCount;
                const repWinRate = repClosed > 0 ? Math.round((stat.wonCount / repClosed) * 100) : 0;

                return (
                  <div
                    key={name}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        idx === 0 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-white">{name}</p>
                        <p className="text-[10px] text-slate-400">
                          ปิดได้ {stat.wonCount} ออเดอร์ • วินเรท {repWinRate}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-400">{formatTHB(stat.revenue)}</p>
                      <p className="text-[10px] text-slate-500">รวม {stat.total} แชท</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 mt-5 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            ปิดหน้าต่างสรุปผล
          </button>
        </div>

      </div>
    </div>
  );
};
