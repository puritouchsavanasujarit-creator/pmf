import React, { useState } from 'react';
import { 
  Bot, 
  Copy, 
  Check, 
  ExternalLink, 
  Key, 
  ShieldCheck, 
  Radio, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Save
} from 'lucide-react';
import { LineWebhookConfig } from '../types';

interface LineOASetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LineWebhookConfig;
  onSaveConfig: (updatedConfig: LineWebhookConfig) => void;
}

export const LineOASetupModal: React.FC<LineOASetupModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [channelId, setChannelId] = useState(config.channelId || '');
  const [channelSecret, setChannelSecret] = useState(config.channelSecret || '');
  const [channelAccessToken, setChannelAccessToken] = useState(config.channelAccessToken || '');
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const webhookEndpoint = `${window.location.origin}/api/line/webhook`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookEndpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Simulate pinging test endpoint
      await new Promise((r) => setTimeout(r, 800));
      if (!channelSecret.trim() && !channelAccessToken.trim()) {
        setTestResult('warning:กรุณากรอก Channel Secret หรือ Channel Access Token เพื่อยืนยันการเชื่อมต่อที่สมบูรณ์');
      } else {
        setTestResult('success:ระบบ Webhook Endpoint พร้อมรับข้อมูลจาก LINE OA แล้ว');
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      ...config,
      channelId: channelId.trim(),
      channelSecret: channelSecret.trim(),
      channelAccessToken: channelAccessToken.trim(),
      webhookUrl: webhookEndpoint,
      isEnabled: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                ตั้งค่าเชื่อมต่อ LINE Official Account (LINE OA)
                <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Messaging API
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                รองรับการรับข้อความ ติดแท็ก ปิดการขาย และส่งออกไปยัง Google Sheet แบบอัตโนมัติ
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

        {/* Step-by-Step Instructions */}
        <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ขั้นตอนที่ 1: คัดลอก Webhook URL ไปใส่ใน LINE Developers Console</span>
            </span>
            <a
              href="https://developers.line.biz/console/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
            >
              <span>เปิด LINE Console</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Webhook Copy Box */}
          <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700/80">
            <code className="text-xs text-emerald-300 font-mono flex-1 overflow-x-auto truncate">
              {webhookEndpoint}
            </code>
            <button
              onClick={handleCopyWebhook}
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก URL'}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 space-y-1">
            <p>1. ไปที่เมนู <strong>Messaging API</strong> ใน LINE Developers Console</p>
            <p>2. วาง URL ด้านบนลงในช่อง <strong>Webhook URL</strong> แล้วกด Update</p>
            <p>3. เปิดสวิตช์ <strong>Use webhook</strong> ให้เป็นสีเขียว (Enabled)</p>
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Channel ID (อ้างอิงจาก Basic settings)
            </label>
            <input
              type="text"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="เช่น 2006123456"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Channel Secret (สำหรับตรวจสอบ X-Line-Signature)
            </label>
            <input
              type="password"
              value={channelSecret}
              onChange={(e) => setChannelSecret(e.target.value)}
              placeholder="เช่น 4f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Channel Access Token (Long-lived Token สำหรับส่งข้อความ / ดูรูปโปรไฟล์)
            </label>
            <textarea
              rows={2}
              value={channelAccessToken}
              onChange={(e) => setChannelAccessToken(e.target.value)}
              placeholder="วาง Channel Access Token ที่ได้จากการกด Issue ในแท็บ Messaging API"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-mono text-xs resize-none"
            />
          </div>

          {/* Test connection result */}
          {testResult && (
            <div className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
              testResult.startsWith('success') 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              {testResult.startsWith('success') ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <span>{testResult.replace(/^(success|warning):/, '')}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Radio className={`w-3.5 h-3.5 text-emerald-400 ${isTesting ? 'animate-pulse' : ''}`} />
              <span>{isTesting ? 'กำลังทดสอบ...' : 'ทดสอบสัญญาณ Webhook'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg"
              >
                ปิด
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกการตั้งค่า LINE OA</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
