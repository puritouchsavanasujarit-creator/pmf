import React from 'react';
import { 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Trash2, 
  FileSpreadsheet, 
  ExternalLink 
} from 'lucide-react';
import { SyncLogEntry } from '../types';

interface SyncLogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: SyncLogEntry[];
  onClearLogs: () => void;
  sheetUrl?: string;
}

export const SyncLogsDrawer: React.FC<SyncLogsDrawerProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  sheetUrl,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl text-slate-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">ประวัติการซิงค์ข้อมูล (Real-time Logs)</h3>
              <p className="text-[11px] text-slate-400">บันทึกทุกอีเวนต์การติดแท็กและการส่งออกไปที่ชีท</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Action bar */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">ทั้งหมด {logs.length} รายการ</span>
          <div className="flex items-center gap-2">
            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
              >
                <span>เปิดดูชีท</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {logs.length > 0 && (
              <button
                onClick={onClearLogs}
                className="text-slate-500 hover:text-rose-400 flex items-center gap-1 p-1"
                title="ล้างประวัติ"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ล้าง</span>
              </button>
            )}
          </div>
        </div>

        {/* Logs list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/40">
          {logs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              ยังไม่มีประวัติการส่งข้อมูล
            </div>
          ) : (
            logs.map((log) => {
              const isSuccess = log.status === 'SUCCESS';
              const isError = log.status === 'ERROR';

              return (
                <div key={log.id} className="pt-2.5 first:pt-0">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">
                      {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
                      {!isSuccess && !isError && <Info className="w-4 h-4 text-sky-400" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-white truncate">
                          {log.customerName}
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                          {log.timestamp}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                        {log.details}
                      </p>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {log.action}
                        </span>
                        {log.sheetRow && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            แถวที่ #{log.sheetRow}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
