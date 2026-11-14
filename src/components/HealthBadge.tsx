import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export interface HealthStatus {
  success: boolean;
  dashboardToken: 'set' | 'missing';
  lineChannelSecret: 'set' | 'missing';
}

interface HealthBadgeProps {
  health: HealthStatus | null;
  onRefresh: () => void;
  isChecking: boolean;
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({ health, onRefresh, isChecking }) => {
  if (!health) return null;

  const missing = [
    health.dashboardToken === 'missing' ? 'DASHBOARD_TOKEN' : null,
    health.lineChannelSecret === 'missing' ? 'LINE_CHANNEL_SECRET' : null,
  ].filter((name): name is string => name !== null);

  const badge =
    missing.length === 0
      ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-200'
      : 'bg-amber-950/50 border-amber-500/30 text-amber-200';

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs ${badge}`}
    >
      <span className="flex items-center gap-2">
        {missing.length === 0 ? (
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
        ) : (
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
        )}
        {missing.length === 0 ? (
          <span>Worker เห็น secret ครบทั้งสองตัวแล้ว</span>
        ) : (
          <span>
            ยังไม่ได้ตั้งค่า <span className="font-semibold">{missing.join(', ')}</span> — Worker
            จะตอบ 503
          </span>
        )}
      </span>

      <button
        onClick={onRefresh}
        disabled={isChecking}
        className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-600/60 font-medium disabled:opacity-50"
        title="ตรวจสอบสถานะ secret จาก /api/health อีกครั้ง"
      >
        <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
        เช็กใหม่
      </button>
    </div>
  );
};
