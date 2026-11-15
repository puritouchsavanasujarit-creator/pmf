import React, { useMemo, useState } from 'react';
import {
  Flame,
  Calendar,
  Grid3X3,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { CustomerDeal, DealStatus, TagRule } from '../types';

interface TagStatusHeatmapProps {
  deals: CustomerDeal[];
  tagRules: TagRule[];
}

type HeatmapMode = 'matrix' | 'timeline';

interface StatusBuckets {
  WON: number;
  IN_PROGRESS: number;
  LOST: number;
  UNTAGGED: number;
}

interface TagAggregation {
  tag: string;
  counts: StatusBuckets;
  amounts: StatusBuckets;
  total: number;
  daily: Record<string, StatusBuckets & { total: number; amount: number }>;
}

interface HoveredCellInfo {
  tag: string;
  status?: DealStatus;
  dateKey?: string;
  dateLabel?: string;
  counts: StatusBuckets;
  total: number;
  amount: number;
}

const STATUS_COLUMNS: {
  key: DealStatus;
  label: string;
  shortLabel: string;
  headerClass: string;
  dotClass: string;
}[] = [
  {
    key: 'WON',
    label: 'ปิดการขาย',
    shortLabel: 'WON',
    headerClass: 'text-emerald-400',
    dotClass: 'bg-emerald-500',
  },
  {
    key: 'IN_PROGRESS',
    label: 'กำลังติดตาม',
    shortLabel: 'IN PROGRESS',
    headerClass: 'text-sky-400',
    dotClass: 'bg-sky-500',
  },
  {
    key: 'LOST',
    label: 'ขายไม่เสร็จ',
    shortLabel: 'LOST',
    headerClass: 'text-rose-400',
    dotClass: 'bg-rose-500',
  },
  {
    key: 'UNTAGGED',
    label: 'ยังไม่ติดแท็ก',
    shortLabel: 'UNTAGGED',
    headerClass: 'text-amber-400',
    dotClass: 'bg-amber-500',
  },
];

const STATUS_THAI_LABEL: Record<DealStatus, string> = {
  WON: 'ปิดการขาย (Won)',
  IN_PROGRESS: 'กำลังติดตาม (In Progress)',
  LOST: 'ขายไม่เสร็จ (Lost)',
  UNTAGGED: 'ยังไม่ติดแท็ก (Untagged)',
};

function getLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getHeatmapCellClass(status: DealStatus, count: number, maxCount: number): string {
  if (count <= 0 || maxCount <= 0) {
    return 'bg-slate-900/60 text-slate-600 border-slate-800/70 hover:border-slate-700';
  }

  const ratio = count / maxCount;
  const level = ratio <= 0.25 ? 1 : ratio <= 0.5 ? 2 : ratio <= 0.75 ? 3 : 4;

  const palettes: Record<DealStatus, Record<number, string>> = {
    WON: {
      1: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60 hover:border-emerald-500',
      2: 'bg-emerald-900/80 text-emerald-200 border-emerald-700/70 hover:border-emerald-400',
      3: 'bg-emerald-700/85 text-white border-emerald-500/80 hover:border-emerald-300',
      4: 'bg-emerald-500 text-slate-950 font-bold border-emerald-300 shadow-sm shadow-emerald-500/30',
    },
    IN_PROGRESS: {
      1: 'bg-sky-950/80 text-sky-300 border-sky-800/60 hover:border-sky-500',
      2: 'bg-sky-900/80 text-sky-200 border-sky-700/70 hover:border-sky-400',
      3: 'bg-sky-700/85 text-white border-sky-500/80 hover:border-sky-300',
      4: 'bg-sky-500 text-slate-950 font-bold border-sky-300 shadow-sm shadow-sky-500/30',
    },
    LOST: {
      1: 'bg-rose-950/80 text-rose-300 border-rose-800/60 hover:border-rose-500',
      2: 'bg-rose-900/80 text-rose-200 border-rose-700/70 hover:border-rose-400',
      3: 'bg-rose-700/85 text-white border-rose-500/80 hover:border-rose-300',
      4: 'bg-rose-500 text-white font-bold border-rose-300 shadow-sm shadow-rose-500/30',
    },
    UNTAGGED: {
      1: 'bg-amber-950/80 text-amber-300 border-amber-800/60 hover:border-amber-500',
      2: 'bg-amber-900/80 text-amber-200 border-amber-700/70 hover:border-amber-400',
      3: 'bg-amber-700/85 text-white border-amber-500/80 hover:border-amber-300',
      4: 'bg-amber-500 text-slate-950 font-bold border-amber-300 shadow-sm shadow-amber-500/30',
    },
  };

  return palettes[status][level];
}

function getDominantStatus(counts: StatusBuckets): DealStatus {
  const order: DealStatus[] = ['WON', 'LOST', 'IN_PROGRESS', 'UNTAGGED'];
  let bestStatus: DealStatus = 'IN_PROGRESS';
  let bestVal = -1;
  for (const st of order) {
    if (counts[st] > bestVal) {
      bestVal = counts[st];
      bestStatus = st;
    }
  }
  return bestStatus;
}

export const TagStatusHeatmap: React.FC<TagStatusHeatmapProps> = ({ deals, tagRules }) => {
  const [mode, setMode] = useState<HeatmapMode>('matrix');
  const [hoveredCell, setHoveredCell] = useState<HoveredCellInfo | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);

  const {
    recentDealsCount,
    untaggedRecentCount,
    tagRows,
    maxMatrixCount,
    maxDailyCount,
    last30Days,
  } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startWindow = new Date(todayStart);
    startWindow.setDate(startWindow.getDate() - 29);

    // Build ordered 30-day list
    const days: { key: string; shortLabel: string; fullLabel: string }[] = [];
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(startWindow);
      d.setDate(startWindow.getDate() + i);
      days.push({
        key: getLocalDateKey(d),
        shortLabel: `${d.getDate()}/${d.getMonth() + 1}`,
        fullLabel: d.toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'short',
          year: '2-digit',
        }),
      });
    }

    const validDayKeys = new Set(days.map((d) => d.key));
    const windowMs = startWindow.getTime();

    const recentDeals = deals.filter((deal) => {
      const ts = new Date(deal.updatedAt).getTime();
      return Number.isFinite(ts) && ts >= windowMs;
    });

    const tagMap = new Map<string, TagAggregation>();
    let untaggedCount = 0;

    for (const deal of recentDeals) {
      if (!deal.tags || deal.tags.length === 0) {
        untaggedCount += 1;
        continue;
      }

      const dealDate = new Date(deal.updatedAt);
      const dayKey = getLocalDateKey(dealDate);
      const status: DealStatus = deal.status || 'UNTAGGED';
      const amount = deal.amount || 0;

      // Deduplicate tags within a single deal so frequency reflects deal count accurately
      const uniqueTags = Array.from(new Set(deal.tags.map((t) => t.trim()).filter(Boolean)));

      for (const tag of uniqueTags) {
        let agg = tagMap.get(tag);
        if (!agg) {
          agg = {
            tag,
            counts: { WON: 0, IN_PROGRESS: 0, LOST: 0, UNTAGGED: 0 },
            amounts: { WON: 0, IN_PROGRESS: 0, LOST: 0, UNTAGGED: 0 },
            total: 0,
            daily: {},
          };
          tagMap.set(tag, agg);
        }

        agg.counts[status] += 1;
        agg.amounts[status] += amount;
        agg.total += 1;

        if (validDayKeys.has(dayKey)) {
          if (!agg.daily[dayKey]) {
            agg.daily[dayKey] = { WON: 0, IN_PROGRESS: 0, LOST: 0, UNTAGGED: 0, total: 0, amount: 0 };
          }
          agg.daily[dayKey][status] += 1;
          agg.daily[dayKey].total += 1;
          agg.daily[dayKey].amount += amount;
        }
      }
    }

    const sortedRows = Array.from(tagMap.values()).sort(
      (a, b) => b.total - a.total || a.tag.localeCompare(b.tag, 'th')
    );

    let maxMatrix = 0;
    let maxDaily = 0;
    for (const row of sortedRows) {
      for (const col of STATUS_COLUMNS) {
        if (row.counts[col.key] > maxMatrix) {
          maxMatrix = row.counts[col.key];
        }
      }
      for (const dayBucket of Object.values(row.daily)) {
        if (dayBucket.total > maxDaily) {
          maxDaily = dayBucket.total;
        }
      }
    }

    return {
      recentDealsCount: recentDeals.length,
      untaggedRecentCount: untaggedCount,
      tagRows: sortedRows,
      maxMatrixCount: maxMatrix,
      maxDailyCount: maxDaily,
      last30Days: days,
    };
  }, [deals]);

  const ruleByTag = useMemo(() => {
    const map = new Map<string, TagRule>();
    for (const rule of tagRules) {
      map.set(rule.tag.toLowerCase(), rule);
    }
    return map;
  }, [tagRules]);

  const displayedRows = showAllTags ? tagRows : tagRows.slice(0, 10);

  const formatTHB = (val: number) =>
    new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(val);

  const renderCorrelationBadge = (row: TagAggregation) => {
    const decided = row.counts.WON + row.counts.LOST;
    if (decided === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
          <Minus className="w-2.5 h-2.5" />
          กำลังติดตาม
        </span>
      );
    }

    const wonPct = Math.round((row.counts.WON / decided) * 100);
    if (wonPct >= 60) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <TrendingUp className="w-2.5 h-2.5" />
          {wonPct}% ปิดได้
        </span>
      );
    }
    if (wonPct <= 40) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
          <TrendingDown className="w-2.5 h-2.5" />
          {100 - wonPct}% หลุด
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
        {wonPct}% / {100 - wonPct}%
      </span>
    );
  };

  return (
    <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Heatmap ความถี่แท็ก × สถานะการขาย (30 วันล่าสุด)</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            วิเคราะห์ความสัมพันธ์ระหว่างแท็ก LINE OA กับผลลัพธ์การขายจาก {recentDealsCount} เคสในช่วง 30 วันที่ผ่านมา
            {untaggedRecentCount > 0 && (
              <span className="text-amber-400/90"> (มี {untaggedRecentCount} เคสยังไม่ติดแท็ก)</span>
            )}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setMode('matrix');
              setHoveredCell(null);
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
              mode === 'matrix'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid3X3 className="w-3 h-3" />
            <span>ตารางสหสัมพันธ์ (Status)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('timeline');
              setHoveredCell(null);
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
              mode === 'timeline'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>ไทม์ไลน์ 30 วัน</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {tagRows.length === 0 ? (
        <div className="py-8 text-center rounded-lg border border-dashed border-slate-800 bg-slate-900/40">
          <p className="text-xs text-slate-400 font-medium">
            ยังไม่มีข้อมูลแท็กในช่วง 30 วันล่าสุด
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            ลองติดแท็กให้ลูกค้าหรือทดสอบด้วยปุ่ม "จำลองแท็ก (Simulator)" เพื่อดู Heatmap ความสัมพันธ์
          </p>
        </div>
      ) : mode === 'matrix' ? (
        /* Mode 1: Tag × Deal Status Correlation Matrix */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-1.5">
            <thead>
              <tr className="text-[11px]">
                <th className="pb-1 px-2 text-slate-400 font-semibold min-w-[140px]">
                  แท็ก (LINE OA Tag)
                </th>
                {STATUS_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`pb-1 px-2 text-center font-semibold min-w-[90px] ${col.headerClass}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${col.dotClass}`}></span>
                      <span>{col.label}</span>
                    </div>
                  </th>
                ))}
                <th className="pb-1 px-2 text-center text-slate-400 font-semibold min-w-[60px]">
                  รวม
                </th>
                <th className="pb-1 px-2 text-right text-slate-400 font-semibold min-w-[100px]">
                  สหสัมพันธ์
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.map((row) => (
                <tr key={row.tag} className="group">
                  <td className="px-2 py-1 rounded-lg bg-slate-900/70 border border-slate-800/80">
                    <span className="font-mono text-[11px] font-semibold text-slate-200 block truncate max-w-[170px]" title={row.tag}>
                      {row.tag}
                    </span>
                    {ruleByTag.get(row.tag.toLowerCase())?.description && (
                      <span className="text-[10px] text-slate-500 block truncate max-w-[170px]">
                        {ruleByTag.get(row.tag.toLowerCase())?.description}
                      </span>
                    )}
                  </td>

                  {STATUS_COLUMNS.map((col) => {
                    const count = row.counts[col.key];
                    const amount = row.amounts[col.key];
                    const pct = row.total > 0 ? Math.round((count / row.total) * 100) : 0;
                    const cellClass = getHeatmapCellClass(col.key, count, maxMatrixCount);

                    return (
                      <td key={col.key} className="p-0">
                        <button
                          type="button"
                          onMouseEnter={() =>
                            setHoveredCell({
                              tag: row.tag,
                              status: col.key,
                              counts: row.counts,
                              total: count,
                              amount,
                            })
                          }
                          onFocus={() =>
                            setHoveredCell({
                              tag: row.tag,
                              status: col.key,
                              counts: row.counts,
                              total: count,
                              amount,
                            })
                          }
                          onClick={() =>
                            setHoveredCell({
                              tag: row.tag,
                              status: col.key,
                              counts: row.counts,
                              total: count,
                              amount,
                            })
                          }
                          className={`w-full py-2 px-2 rounded-lg border text-center transition-all cursor-pointer ${cellClass}`}
                          title={`${row.tag} • ${col.label}: ${count} เคส (${pct}%)`}
                        >
                          <div className="text-xs leading-none">{count}</div>
                          <div className="text-[9px] opacity-75 mt-0.5 leading-none">
                            {count > 0 ? `${pct}%` : '-'}
                          </div>
                        </button>
                      </td>
                    );
                  })}

                  <td className="px-2 py-1 text-center font-bold text-xs text-slate-200 bg-slate-900/40 rounded-lg border border-slate-800/60">
                    {row.total}
                  </td>

                  <td className="px-2 py-1 text-right whitespace-nowrap">
                    {renderCorrelationBadge(row)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Mode 2: 30-Day Daily Heatmap */
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Day labels header */}
            <div className="flex items-center gap-2 mb-1.5 text-[9px] text-slate-500">
              <div className="w-36 shrink-0 font-semibold text-slate-400 text-[11px]">
                แท็ก (30 วันย้อนหลัง)
              </div>
              <div className="flex-1 grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1 text-center">
                {last30Days.map((day, idx) => (
                  <span key={day.key} className="truncate">
                    {idx === 0 || idx === 14 || idx === 29 ? day.shortLabel : ''}
                  </span>
                ))}
              </div>
              <div className="w-10 text-right shrink-0 font-semibold text-slate-400">รวม</div>
            </div>

            {/* Rows per tag */}
            <div className="space-y-1.5">
              {displayedRows.map((row) => (
                <div key={row.tag} className="flex items-center gap-2">
                  <div className="w-36 shrink-0 truncate font-mono text-[11px] font-medium text-slate-200" title={row.tag}>
                    {row.tag}
                  </div>
                  <div className="flex-1 grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1">
                    {last30Days.map((day) => {
                      const bucket = row.daily[day.key];
                      const dayTotal = bucket?.total || 0;
                      const dominantStatus = bucket ? getDominantStatus(bucket) : 'IN_PROGRESS';
                      const cellClass = getHeatmapCellClass(dominantStatus, dayTotal, maxDailyCount);
                      const dayAmount = bucket?.amount || 0;

                      return (
                        <button
                          key={day.key}
                          type="button"
                          onMouseEnter={() =>
                            setHoveredCell({
                              tag: row.tag,
                              dateKey: day.key,
                              dateLabel: day.fullLabel,
                              counts: bucket || { WON: 0, IN_PROGRESS: 0, LOST: 0, UNTAGGED: 0 },
                              total: dayTotal,
                              amount: dayAmount,
                            })
                          }
                          onClick={() =>
                            setHoveredCell({
                              tag: row.tag,
                              dateKey: day.key,
                              dateLabel: day.fullLabel,
                              counts: bucket || { WON: 0, IN_PROGRESS: 0, LOST: 0, UNTAGGED: 0 },
                              total: dayTotal,
                              amount: dayAmount,
                            })
                          }
                          className={`h-5 rounded-[4px] border text-[9px] flex items-center justify-center transition-all cursor-pointer ${cellClass}`}
                          title={`${row.tag} (${day.fullLabel}): ${dayTotal} เคส`}
                        >
                          {dayTotal > 0 ? dayTotal : ''}
                        </button>
                      );
                    })}
                  </div>
                  <div className="w-10 text-right shrink-0 text-xs font-bold text-slate-300">
                    {row.total}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Show more / less tags toggle */}
      {tagRows.length > 10 && (
        <div className="mt-2.5 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAllTags(!showAllTags)}
            className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 px-3 py-1 rounded-md bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            {showAllTags
              ? 'แสดงเฉพาะ 10 แท็กยอดนิยม'
              : `ดูแท็กทั้งหมด (${tagRows.length} แท็ก)`}
          </button>
        </div>
      )}

      {/* Legend & Interactive Inspection Bar */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
        {/* Hover Detail Readout */}
        <div className="flex items-center gap-2 text-slate-300 min-h-[24px]">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {hoveredCell ? (
            hoveredCell.status ? (
              <span>
                <span className="font-mono font-bold text-white">{hoveredCell.tag}</span>
                {' × '}
                <span className="font-semibold text-emerald-300">
                  {STATUS_THAI_LABEL[hoveredCell.status]}
                </span>
                {': '}
                <strong className="text-white">{hoveredCell.total} เคส</strong>
                {hoveredCell.amount > 0 && (
                  <span className="text-slate-400"> (มูลค่ารวม {formatTHB(hoveredCell.amount)})</span>
                )}
              </span>
            ) : (
              <span>
                <span className="font-mono font-bold text-white">{hoveredCell.tag}</span>
                {' วันที่ '}
                <span className="text-slate-200 font-medium">{hoveredCell.dateLabel}</span>
                {': '}
                <strong className="text-white">{hoveredCell.total} เคส</strong>
                {hoveredCell.total > 0 && (
                  <span className="text-slate-400">
                    {' '}
                    (ปิดได้ {hoveredCell.counts.WON} • ติดตาม {hoveredCell.counts.IN_PROGRESS} • หลุด{' '}
                    {hoveredCell.counts.LOST}
                    {hoveredCell.amount > 0 ? ` • ${formatTHB(hoveredCell.amount)}` : ''})
                  </span>
                )}
              </span>
            )
          ) : (
            <span className="text-slate-500">
              วางเมาส์หรือคลิกที่ช่องสีเพื่อดูรายละเอียดจำนวนเคสและยอดเงิน
            </span>
          )}
        </div>

        {/* Intensity Scale Legend */}
        <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-400">
          <span>ความถี่: น้อย</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-slate-900 border border-slate-800 inline-block"></span>
            <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-800 inline-block"></span>
            <span className="w-3 h-3 rounded bg-emerald-900 border border-emerald-700 inline-block"></span>
            <span className="w-3 h-3 rounded bg-emerald-700 border border-emerald-500 inline-block"></span>
            <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-300 inline-block"></span>
          </div>
          <span>มาก</span>
        </div>
      </div>
    </div>
  );
};
