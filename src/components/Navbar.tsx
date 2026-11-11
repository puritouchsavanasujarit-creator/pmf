import React from 'react';
import { User } from 'firebase/auth';
import { 
  Bot, 
  FileSpreadsheet, 
  Settings2, 
  Tag, 
  History, 
  PlayCircle, 
  LogOut, 
  Radio, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  HeartHandshake,
  Download,
  Users
} from 'lucide-react';
import { GoogleSheetInfo } from '../types';

interface NavbarProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  sheetInfo: GoogleSheetInfo | null;
  onOpenLineConfig: () => void;
  onOpenTagRules: () => void;
  onOpenSimulator: () => void;
  onOpenLogs: () => void;
  logsCount: number;
  isAutoSyncEnabled: boolean;
  onToggleAutoSync: () => void;
  onOpenAnalytics: () => void;
  onOpenLostRecovery: () => void;
  onExportCsv: () => void;
  onOpenAdminManagement: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  sheetInfo,
  onOpenLineConfig,
  onOpenTagRules,
  onOpenSimulator,
  onOpenLogs,
  logsCount,
  isAutoSyncEnabled,
  onToggleAutoSync,
  onOpenAnalytics,
  onOpenLostRecovery,
  onExportCsv,
  onOpenAdminManagement,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20 text-white font-bold">
              <Bot className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-tight">LINE OA Sales Tracker</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Radio className="w-3 h-3 animate-pulse" /> Real-time
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                ตรวจสอบการติดแท็ก • ปิดการขาย • ขายไม่เสร็จ ส่งออก Google Sheets
              </p>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex items-center gap-2">
            
            {/* Analytics Button */}
            <button
              onClick={onOpenAnalytics}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors"
              title="ดูสถิติและประสิทธิภาพการปิดการขาย"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>สถิติยอดขาย</span>
            </button>

            {/* Lost Recovery Button */}
            <button
              onClick={onOpenLostRecovery}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 transition-colors"
              title="ผู้ช่วยกู้คืนลูกค้าที่ขายไม่เสร็จ"
            >
              <HeartHandshake className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">กู้คืนเคสหลุด</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={onExportCsv}
              className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors"
              title="ส่งออกไฟล์ CSV สำรองข้อมูล"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>CSV</span>
            </button>

            {/* Manage Admins Button */}
            <button
              onClick={onOpenAdminManagement}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors"
              title="จัดการรายชื่อแอดมิน (เพิ่ม-ลบ แอดมิน)"
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>จัดการแอดมิน</span>
            </button>

            {/* Tag Rules Button */}
            <button
              onClick={onOpenTagRules}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors"
              title="ตั้งค่าเงื่อนไขการตรวจจับแท็ก"
            >
              <Tag className="w-3.5 h-3.5 text-sky-400" />
              <span>กฎแท็ก</span>
            </button>

            {/* LINE OA API Config Button */}
            <button
              onClick={onOpenLineConfig}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors"
              title="ตั้งค่า LINE Official Account Webhook & API"
            >
              <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">ตั้งค่า LINE OA</span>
            </button>

            {/* Test Simulator Button */}
            <button
              onClick={onOpenSimulator}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="จำลองอีเวนต์การติดแท็กจาก LINE OA"
            >
              <PlayCircle className="w-4 h-4 text-emerald-100" />
              <span>จำลองแท็ก (Simulator)</span>
            </button>

            {/* Sync Logs Drawer */}
            <button
              onClick={onOpenLogs}
              className="relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors"
              title="ประวัติการส่งข้อมูลเรียลไทม์"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">ประวัติซิงค์</span>
              {logsCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {logsCount}
                </span>
              )}
            </button>

            {/* Google Authentication Section */}
            <div className="ml-2 pl-2 border-l border-slate-800 flex items-center">
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-slate-800/70 border border-slate-700/60">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Google User'}
                        className="w-6 h-6 rounded-full border border-slate-600 object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {user.displayName ? user.displayName[0] : 'G'}
                      </div>
                    )}
                    <span className="text-xs font-medium text-slate-200 max-w-[110px] truncate hidden sm:inline">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                  </div>
                  <button
                    onClick={onLogout}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="ออกจากระบบ Google"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onLogin}
                  disabled={isLoggingIn}
                  className="gsi-material-button shadow-sm !h-8 !px-2.5 !text-xs disabled:opacity-50"
                  title="เชื่อมต่อกับ Google Sheets ด้วยบัญชี Google"
                >
                  <div className="gsi-material-button-content-wrapper !gap-2">
                    <div className="gsi-material-button-icon !w-4 !h-4">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        <path fill="none" d="M0 0h48v48H0z" />
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents font-medium">
                      {isLoggingIn ? 'กำลังเชื่อมต่อ...' : 'Sign in with Google'}
                    </span>
                  </div>
                </button>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
