import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  PlusCircle, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Link as LinkIcon, 
  Zap, 
  Layers 
} from 'lucide-react';
import { GoogleSheetInfo } from '../types';

interface GoogleSheetsBarProps {
  sheetInfo: GoogleSheetInfo | null;
  isAuthenticated: boolean;
  onLogin: () => void;
  onCreateSheet: (title?: string) => Promise<void>;
  onConnectExistingSheet: (sheetId: string) => Promise<void>;
  onSyncAll: () => Promise<void>;
  isCreatingSheet: boolean;
  isSyncing: boolean;
  isAutoSyncEnabled: boolean;
  onToggleAutoSync: () => void;
  unsyncedCount: number;
}

export const GoogleSheetsBar: React.FC<GoogleSheetsBarProps> = ({
  sheetInfo,
  isAuthenticated,
  onLogin,
  onCreateSheet,
  onConnectExistingSheet,
  onSyncAll,
  isCreatingSheet,
  isSyncing,
  isAutoSyncEnabled,
  onToggleAutoSync,
  unsyncedCount,
}) => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [inputSheetId, setInputSheetId] = useState('');
  const [connectError, setConnectError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSheetId.trim()) return;
    setConnectError('');
    setIsConnecting(true);
    try {
      await onConnectExistingSheet(inputSheetId.trim());
      setShowConnectModal(false);
      setInputSheetId('');
    } catch (err: any) {
      setConnectError(err.message || 'ไม่สามารถเชื่อมต่อ Sheet ได้');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <>
      <div className="bg-slate-900 border-b border-slate-800/80 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          
          {/* Status info */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`p-2 rounded-lg flex items-center justify-center ${
              sheetInfo 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Google Sheets Integration
                </span>
                {sheetInfo ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle className="w-3 h-3" /> เชื่อมต่อแล้ว
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <AlertTriangle className="w-3 h-3" /> ยังไม่ระบุ Google Sheet
                  </span>
                )}
              </div>

              {sheetInfo ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <a
                    href={sheetInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-white hover:text-emerald-300 flex items-center gap-1 group transition-colors"
                  >
                    <span>{sheetInfo.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-300" />
                  </a>
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    (แท็บ: {sheetInfo.sheetName})
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-0.5">
                  เชื่อมต่อ Google Sheet เพื่อเริ่มส่งออกข้อมูลการปิดการขายจาก LINE OA อัตโนมัติ
                </p>
              )}
            </div>
          </div>

          {/* Action buttons & Real-time Auto-Sync toggle */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            
            {/* Auto-Sync Toggle */}
            <button
              onClick={onToggleAutoSync}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isAutoSyncEnabled
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="เมื่อมีแท็กใหม่เกิดขึ้น จะส่งออกข้อมูลไปยัง Google Sheets ในทันที"
            >
              <Zap className={`w-3.5 h-3.5 ${isAutoSyncEnabled ? 'text-emerald-400 fill-emerald-400' : 'text-slate-400'}`} />
              <span>Real-time Auto-Sync: <strong>{isAutoSyncEnabled ? 'เปิดใช้งาน' : 'ปิด'}</strong></span>
            </button>

            {!isAuthenticated ? (
              <button
                onClick={onLogin}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
              >
                เข้าสู่ระบบ Google เพื่อเชื่อมต่อ Sheet
              </button>
            ) : !sheetInfo ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onCreateSheet()}
                  disabled={isCreatingSheet}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all disabled:opacity-50"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{isCreatingSheet ? 'กำลังสร้าง...' : 'สร้าง Sheet ใหม่ทันที'}</span>
                </button>
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>เชื่อม Sheet เดิม</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onSyncAll}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-600/30 transition-all disabled:opacity-50"
                  title="ส่งข้อมูลทั้งหมดไปยัง Google Sheet"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'กำลังส่งข้อมูล...' : 'ซิงค์ข้อมูลทั้งหมดไปยัง Sheet'}</span>
                  {unsyncedCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/20 text-white">
                      +{unsyncedCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                  title="เปลี่ยน Google Sheet ปลายทาง"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">เชื่อมต่อ Google Sheet ที่มีอยู่</h3>
                  <p className="text-xs text-slate-400">ใส่ Spreadsheet ID หรือ URL ของ Google Sheet</p>
                </div>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConnectSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Spreadsheet ID หรือ Google Sheet Link
                </label>
                <input
                  type="text"
                  value={inputSheetId}
                  onChange={(e) => setInputSheetId(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs.../edit หรือ Spreadsheet ID"
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500 text-white placeholder-slate-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  * ต้องให้สิทธิ์เข้าถึงแก่บัญชี Google ที่คุณกำลังเข้าสู่ระบบอยู่
                </p>
              </div>

              {connectError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{connectError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isConnecting ? 'กำลังตรวจสอบ...' : 'ยืนยันการเชื่อมต่อ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
