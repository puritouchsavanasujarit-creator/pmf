import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface HealthStatus {
  dashboardToken: 'set' | 'missing';
  lineChannelSecret: 'set' | 'missing';
}

export const HealthBadge: React.FC<{ health: HealthStatus | null }> = ({ health }) => {
  if (!health) return null;

  const missing = [
    health.dashboardToken === 'missing' ? 'DASHBOARD_TOKEN' : null,
    health.lineChannelSecret === 'missing' ? 'LINE_CHANNEL_SECRET' : null,
  ].filter((name): name is string => name !== null);

  if (missing.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-200">
        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
        <span>Worker เห็น secret ครบทั้งสองตัวแล้ว</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-950/50 border border-amber-500/30 text-xs text-amber-200">
      <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
      <span>
        ยังไม่ได้ตั้งค่า <span className="font-semibold">{missing.join(', ')}</span> — Worker จะตอบ 503
      </span>
    </div>
  );
};
