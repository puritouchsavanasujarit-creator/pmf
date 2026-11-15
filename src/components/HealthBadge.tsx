import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  KeyRound,
  Terminal,
} from 'lucide-react';

export interface HealthStatus {
  success: boolean;
  dashboardToken: 'set' | 'missing';
  lineChannelSecret: 'set' | 'missing';
}

interface HealthBadgeProps {
  health: HealthStatus | null;
  onRefresh: () => void;
  isChecking: boolean;
  onUseGeneratedToken?: (token: string) => void;
}

function generateSecureToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({
  health,
  onRefresh,
  isChecking,
  onUseGeneratedToken,
}) => {
  const [showGuide, setShowGuide] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!health) return null;

  const missing = [
    health.dashboardToken === 'missing' ? 'DASHBOARD_TOKEN' : null,
    health.lineChannelSecret === 'missing' ? 'LINE_CHANNEL_SECRET' : null,
  ].filter((name): name is string => name !== null);

  const badge =
    missing.length === 0
      ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-200'
      : 'bg-amber-950/50 border-amber-500/30 text-amber-200';

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleGenerateToken = () => {
    const token = generateSecureToken();
    setGeneratedToken(token);
  };

  return (
    <div className={`rounded-xl border text-xs ${badge}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
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

        <div className="flex items-center gap-1.5">
          {missing.length > 0 && (
            <button
              type="button"
              onClick={() => setShowGuide((prev) => !prev)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 font-medium text-amber-100 transition-colors"
            >
              <KeyRound className="w-3 h-3" />
              <span>วิธีตั้งค่า</span>
              {showGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isChecking}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-600/60 font-medium disabled:opacity-50"
            title="ตรวจสอบสถานะ secret จาก /api/health อีกครั้ง"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            เช็กใหม่
          </button>
        </div>
      </div>

      {missing.length > 0 && showGuide && (
        <div className="border-t border-amber-500/20 bg-slate-950/70 px-3 py-3 space-y-3 text-[11px] text-slate-300 rounded-b-xl">
          <div className="space-y-1.5">
            <p className="font-semibold text-amber-200 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              ขั้นตอนตั้งค่า Secrets บน Worker / โฮสติ้ง
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              {health.dashboardToken === 'missing' && (
                <li>
                  <span className="text-slate-200 font-medium">DASHBOARD_TOKEN</span>: รหัสผ่านสำหรับเข้าหน้าแดชบอร์ดและเรียก{' '}
                  <code className="text-emerald-300">/api/deals</code> (ตั้งค่าเองได้เลย)
                </li>
              )}
              {health.lineChannelSecret === 'missing' && (
                <li>
                  <span className="text-slate-200 font-medium">LINE_CHANNEL_SECRET</span>: นำมาจาก{' '}
                  LINE Developers Console &rarr; Messaging API &rarr; Basic settings &rarr; Channel secret
                </li>
              )}
            </ul>
          </div>

          {health.dashboardToken === 'missing' && (
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-200 font-medium">1. สร้างรหัส DASHBOARD_TOKEN แบบสุ่ม</span>
                <button
                  type="button"
                  onClick={handleGenerateToken}
                  className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition-colors"
                >
                  สุ่มรหัสปลอดภัย
                </button>
              </div>
              {generatedToken && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <code className="flex-1 min-w-0 truncate px-2 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-[11px]">
                    {generatedToken}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(generatedToken, 'token')}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
                  >
                    {copiedKey === 'token' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>คัดลอกแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>คัดลอก</span>
                      </>
                    )}
                  </button>
                  {onUseGeneratedToken && (
                    <button
                      type="button"
                      onClick={() => onUseGeneratedToken(generatedToken)}
                      className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 font-medium"
                    >
                      ใส่ช่องรหัส
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-200 font-medium">2. เพิ่มค่าใน Cloudflare Worker / Secrets หรือไฟล์ .env</span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    'npx wrangler secret put DASHBOARD_TOKEN\nnpx wrangler secret put LINE_CHANNEL_SECRET',
                    'cmd'
                  )
                }
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
              >
                {copiedKey === 'cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>คัดลอกคำสั่ง</span>
              </button>
            </div>
            <pre className="p-2 rounded bg-slate-950 border border-slate-800 text-[10px] text-sky-300 overflow-x-auto font-mono">
{`npx wrangler secret put DASHBOARD_TOKEN
npx wrangler secret put LINE_CHANNEL_SECRET`}
            </pre>
            <p className="text-[10px] text-slate-400">
              หากรันทดสอบในเครื่อง (Local Dev) ให้เพิ่มค่าทั้งสองในไฟล์ <code className="text-slate-300">.env</code> แล้วรีสตาร์ทเซิร์ฟเวอร์ จากนั้นกดปุ่ม <strong className="text-slate-200">&ldquo;เช็กใหม่&rdquo;</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

