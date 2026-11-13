import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken 
} from './services/firebaseAuth';
import { 
  CustomerDeal, 
  DealStatus, 
  TagRule, 
  LineWebhookConfig, 
  GoogleSheetInfo, 
  SyncLogEntry,
  AdminUser
} from './types';
import { 
  DEFAULT_TAG_RULES, 
  determineStatusFromTags,
  DEFAULT_ADMINS
} from './services/lineService';
import { 
  createTrackingSpreadsheet, 
  verifySpreadsheet, 
  appendDealToSheet, 
  batchSyncDeals 
} from './services/sheetsService';
import { Navbar } from './components/Navbar';
import { GoogleSheetsBar } from './components/GoogleSheetsBar';
import { StatsCards } from './components/StatsCards';
import { CustomerTable } from './components/CustomerTable';
import { LineOASetupModal } from './components/LineOASetupModal';
import { LineSimulatorModal } from './components/LineSimulatorModal';
import { TagRulesModal } from './components/TagRulesModal';
import { SyncLogsDrawer } from './components/SyncLogsDrawer';
import { ConfirmationModal } from './components/ConfirmationModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { LostRecoveryModal } from './components/LostRecoveryModal';
import { AdminManagementModal } from './components/AdminManagementModal';
import { exportDealsToCsv } from './utils/exportCsv';
import { 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Bot, 
  FileSpreadsheet, 
  Sparkles,
  Lock
} from 'lucide-react';

const STORAGE_KEYS = {
  TAG_RULES: 'line_oa_tag_rules_v1',
  LINE_CONFIG: 'line_oa_config_v1',
  SHEET_INFO: 'line_oa_sheet_info_v1',
  SYNC_LOGS: 'line_oa_sync_logs_v1',
  AUTO_SYNC: 'line_oa_auto_sync_v1',
  ADMINS: 'line_oa_admins_v1',
};

const DASHBOARD_TOKEN_KEY = 'line_oa_dashboard_token_v1';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(true);

  // App core state
  // Real deal data lives in D1 and is loaded from the Worker API (see the effect below).
  const [deals, setDeals] = useState<CustomerDeal[]>([]);

  // Admin token for the private deals API (kept in this browser, sent as a Bearer header).
  const [dashboardToken, setDashboardToken] = useState<string>(
    () => localStorage.getItem(DASHBOARD_TOKEN_KEY) || ''
  );
  const [tokenInput, setTokenInput] = useState('');
  const [dealsError, setDealsError] = useState<string | null>(null);

  const [tagRules, setTagRules] = useState<TagRule[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TAG_RULES);
    return saved ? JSON.parse(saved) : DEFAULT_TAG_RULES;
  });

  const [lineConfig, setLineConfig] = useState<LineWebhookConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LINE_CONFIG);
    return saved
      ? JSON.parse(saved)
      : {
          channelId: '',
          channelSecret: '',
          channelAccessToken: '',
          webhookUrl: '',
          isEnabled: true,
          autoSyncToSheets: true,
        };
  });

  const [sheetInfo, setSheetInfo] = useState<GoogleSheetInfo | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHEET_INFO);
    return saved ? JSON.parse(saved) : null;
  });

  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SYNC_LOGS);
    return saved ? JSON.parse(saved) : [];
  });

  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC);
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [admins, setAdmins] = useState<AdminUser[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ADMINS);
    return saved ? JSON.parse(saved) : DEFAULT_ADMINS;
  });

  // UI & Filter state
  const [activeFilter, setActiveFilter] = useState<DealStatus | 'ALL'>('ALL');
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Modals
  const [isLineConfigOpen, setIsLineConfigOpen] = useState(false);
  const [isTagRulesOpen, setIsTagRulesOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isLostRecoveryOpen, setIsLostRecoveryOpen] = useState(false);
  const [lostRecoveryDealId, setLostRecoveryDealId] = useState<string | null>(null);
  const [isAdminsOpen, setIsAdminsOpen] = useState(false);

  // Toast / notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Confirmation dialog
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);


  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TAG_RULES, JSON.stringify(tagRules));
  }, [tagRules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LINE_CONFIG, JSON.stringify(lineConfig));
  }, [lineConfig]);

  useEffect(() => {
    if (sheetInfo) {
      localStorage.setItem(STORAGE_KEYS.SHEET_INFO, JSON.stringify(sheetInfo));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SHEET_INFO);
    }
  }, [sheetInfo]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SYNC_LOGS, JSON.stringify(syncLogs));
  }, [syncLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, JSON.stringify(isAutoSyncEnabled));
  }, [isAutoSyncEnabled]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(admins));
  }, [admins]);

  // Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, _token) => {
        setUser(currentUser);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load the latest deal state per customer from the private D1 API
  const loadDeals = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/deals', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDealsError(data.error || `ไม่สามารถโหลดข้อมูลได้ (HTTP ${res.status})`);
        return;
      }
      setDealsError(null);
      if (Array.isArray(data.deals)) setDeals(data.deals);
    } catch (err) {
      console.error('โหลดข้อมูลดีลจาก D1 ไม่สำเร็จ:', err);
    }
  }, []);

  // Refresh automatically every 20 seconds and whenever the tab regains focus
  useEffect(() => {
    if (!dashboardToken) return;
    loadDeals(dashboardToken);
    const interval = setInterval(() => loadDeals(dashboardToken), 20000);
    const onFocus = () => loadDeals(dashboardToken);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [dashboardToken, loadDeals]);

  const handleTokenSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const token = tokenInput.trim();
    if (!token) return;
    localStorage.setItem(DASHBOARD_TOKEN_KEY, token);
    setTokenInput('');
    setDashboardToken(token);
  };

  const addLog = useCallback(
    (
      action: 'AUTO_SYNC' | 'MANUAL_SYNC' | 'CREATE_SHEET' | 'TAG_EVENT' | 'WEBHOOK_EVENT',
      customerName: string,
      status: 'SUCCESS' | 'ERROR' | 'INFO',
      details: string,
      sheetRow?: number | null
    ) => {
      const newEntry: SyncLogEntry = {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toLocaleTimeString('th-TH', { hour12: false }),
        action,
        customerName,
        status,
        details,
        sheetRow: sheetRow ?? null,
      };
      setSyncLogs((prev) => [newEntry, ...prev.slice(0, 99)]);
    },
    []
  );

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setNeedsAuth(false);
        showToast(`เข้าสู่ระบบ Google ในนาม ${res.user.displayName || res.user.email} สำเร็จ`, 'success');
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      showToast(err.message || 'การเข้าสู่ระบบ Google ขัดข้อง กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    showToast('ออกจากระบบ Google เรียบร้อยแล้ว', 'info');
  };

  // Google Sheet: Create New Sheet
  const handleCreateSheet = async (title?: string) => {
    let token = await getAccessToken();
    if (!token) {
      try {
        const signinRes = await googleSignIn();
        if (signinRes) {
          token = signinRes.accessToken;
          setUser(signinRes.user);
        } else {
          return;
        }
      } catch (err: any) {
        showToast(err.message || 'จำเป็นต้องเข้าสู่ระบบ Google เพื่อสร้าง Sheet', 'error');
        return;
      }
    }

    setIsCreatingSheet(true);
    try {
      const defaultTitle = title || `LINE OA Sales & Tag Tracker (${new Date().toLocaleDateString('th-TH')})`;
      const created = await createTrackingSpreadsheet(defaultTitle, token!);
      const newSheetInfo: GoogleSheetInfo = {
        spreadsheetId: created.spreadsheetId,
        title: created.title,
        url: created.url,
        sheetName: created.sheetName,
        totalSyncedRows: 0,
        lastSyncedAt: new Date().toISOString(),
      };
      setSheetInfo(newSheetInfo);

      addLog('CREATE_SHEET', 'ระบบอัตโนมัติ', 'SUCCESS', `สร้าง Google Sheet ใหม่ "${created.title}" เรียบร้อยแล้ว`);
      showToast(`สร้าง Google Sheet สำเร็จแล้ว! พร้อมส่งออกข้อมูลแบบเรียลไทม์`, 'success');

      // Prompt to batch sync existing deals
      setConfirmation({
        isOpen: true,
        title: 'ส่งออกข้อมูลที่มีอยู่ไปยัง Sheet ใหม่?',
        message: `สร้าง Google Sheet "${created.title}" เรียบร้อยแล้ว คุณต้องการส่งข้อมูลลูกค้าและแท็กทั้ง ${deals.length} รายการเข้าไปทันทีเลยหรือไม่?`,
        confirmText: 'ส่งออกข้อมูลทั้งหมดทันที',
        onConfirm: async () => {
          setConfirmation((prev) => ({ ...prev, isOpen: false }));
          await performBatchSync(newSheetInfo, deals, token!);
        },
      });
    } catch (err: any) {
      console.error('Create sheet error:', err);
      showToast(err.message || 'สร้าง Google Sheet ไม่สำเร็จ', 'error');
      addLog('CREATE_SHEET', 'ระบบอัตโนมัติ', 'ERROR', `เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Google Sheet: Connect Existing Sheet
  const handleConnectExistingSheet = async (sheetId: string) => {
    let token = await getAccessToken();
    if (!token) {
      const signinRes = await googleSignIn();
      if (!signinRes) return;
      token = signinRes.accessToken;
      setUser(signinRes.user);
    }

    const verified = await verifySpreadsheet(sheetId, token!);
    const cleanId = sheetId.includes('/d/')
      ? sheetId.split('/d/')[1].split('/')[0]
      : sheetId.trim();

    const newSheetInfo: GoogleSheetInfo = {
      spreadsheetId: cleanId,
      title: verified.title,
      url: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
      sheetName: verified.primarySheet,
      totalSyncedRows: 0,
      lastSyncedAt: new Date().toISOString(),
    };

    setSheetInfo(newSheetInfo);
    addLog('CREATE_SHEET', 'ระบบ', 'SUCCESS', `เชื่อมต่อกับ Google Sheet "${verified.title}" สำเร็จ`);
    showToast(`เชื่อมต่อกับ Google Sheet "${verified.title}" สำเร็จแล้ว`, 'success');
  };

  // Google Sheet: Single Deal Real-time Sync
  const handleSyncSingleDeal = async (deal: CustomerDeal) => {
    let token = await getAccessToken();
    if (!token) {
      const signinRes = await googleSignIn();
      if (!signinRes) return;
      token = signinRes.accessToken;
      setUser(signinRes.user);
    }

    let activeSheet = sheetInfo;
    if (!activeSheet) {
      // Prompt creation of sheet first
      await handleCreateSheet();
      return;
    }

    try {
      const result = await appendDealToSheet(activeSheet.spreadsheetId, activeSheet.sheetName, deal, token!);
      
      const now = new Date().toISOString();
      const updatedDeal: CustomerDeal = {
        ...deal,
        syncedToSheet: true,
        syncedAt: now,
        sheetRow: result.rowNumber,
      };

      setDeals((prev) => prev.map((d) => (d.id === deal.id ? updatedDeal : d)));
      setSheetInfo((prev) => (prev ? { ...prev, totalSyncedRows: prev.totalSyncedRows + 1, lastSyncedAt: now } : null));

      addLog(
        'MANUAL_SYNC',
        deal.displayName,
        'SUCCESS',
        `ส่งข้อมูลสถานะ "${deal.status}" (แท็ก: ${deal.tags.join(', ') || 'ไม่มี'}) ลงในแถวที่ #${result.rowNumber}`,
        result.rowNumber
      );
      showToast(`ส่งข้อมูล "${deal.displayName}" ไปยัง Google Sheet สำเร็จ (แถวที่ #${result.rowNumber})`, 'success');
    } catch (err: any) {
      console.error('Sync single deal error:', err);
      showToast(err.message || 'ส่งข้อมูลไปยัง Sheet ไม่สำเร็จ', 'error');
      addLog('MANUAL_SYNC', deal.displayName, 'ERROR', `ซิงค์ไม่สำเร็จ: ${err.message}`);
    }
  };

  // Batch Sync execution helper
  const performBatchSync = async (targetSheet: GoogleSheetInfo, dealsToSync: CustomerDeal[], token: string) => {
    setIsSyncingAll(true);
    try {
      const count = await batchSyncDeals(targetSheet.spreadsheetId, targetSheet.sheetName, dealsToSync, token);
      const now = new Date().toISOString();

      setDeals((prev) =>
        prev.map((d, index) => ({
          ...d,
          syncedToSheet: true,
          syncedAt: now,
          sheetRow: index + 2, // header is row 1
        }))
      );

      setSheetInfo((prev) => (prev ? { ...prev, totalSyncedRows: count, lastSyncedAt: now } : null));

      addLog('MANUAL_SYNC', 'ลูกค้าทั้งหมด', 'SUCCESS', `ซิงค์ข้อมูลลูกค้าทั้งหมด ${count} รายการไปยังชีทเสร็จสิ้น`);
      showToast(`ส่งออกข้อมูลลูกค้าทั้ง ${count} รายการไปยัง Google Sheet สำเร็จ!`, 'success');
    } catch (err: any) {
      console.error('Batch sync error:', err);
      showToast(err.message || 'เกิดข้อผิดพลาดในการซิงค์ข้อมูลชุดใหญ่', 'error');
      addLog('MANUAL_SYNC', 'ลูกค้าทั้งหมด', 'ERROR', `การซิงค์ล้มเหลว: ${err.message}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Google Sheet: Sync All Deals Trigger with User Confirmation
  const handleSyncAllDeals = async () => {
    if (!sheetInfo) {
      await handleCreateSheet();
      return;
    }

    setConfirmation({
      isOpen: true,
      title: 'ยืนยันการซิงค์ข้อมูลทั้งหมดไปยัง Google Sheet',
      message: `คุณต้องการซิงค์ข้อมูลการปิดการขายและแท็กของลูกค้าทั้งหมด (${deals.length} รายการ) ไปยัง Google Sheet "${sheetInfo.title}" หรือไม่? ข้อมูลจะถูกบันทึก/อัปเดตลงในชีท`,
      confirmText: 'ยืนยันการส่งออกข้อมูล',
      onConfirm: async () => {
        setConfirmation((prev) => ({ ...prev, isOpen: false }));
        let token = await getAccessToken();
        if (!token) {
          const signinRes = await googleSignIn();
          if (!signinRes) return;
          token = signinRes.accessToken;
          setUser(signinRes.user);
        }
        await performBatchSync(sheetInfo, deals, token!);
      },
    });
  };

  // Simulation & Real-time Tag Event Handler
  const handleSimulateEvent = async (eventData: {
    customerId: string;
    customerName?: string;
    message: string;
    tags: string[];
    amount: number;
    adminName: string;
    product: string;
    notes?: string;
  }) => {
    const determinedStatus = determineStatusFromTags(eventData.tags, tagRules);
    const nowIso = new Date().toISOString();

    let targetDeal: CustomerDeal;

    if (eventData.customerId === 'new') {
      targetDeal = {
        id: 'deal-' + Date.now(),
        lineUserId: 'U' + Math.random().toString(36).substring(2, 12).toUpperCase(),
        displayName: eventData.customerName || 'ลูกค้าใหม่ LINE OA',
        pictureUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        status: determinedStatus,
        tags: eventData.tags,
        amount: eventData.amount,
        product: eventData.product,
        adminName: eventData.adminName,
        lastMessage: eventData.message,
        lastMessageTime: 'เมื่อสักครู่',
        updatedAt: nowIso,
        syncedToSheet: false,
        syncedAt: null,
        notes: eventData.notes || '',
      };
      setDeals((prev) => [targetDeal, ...prev]);
    } else {
      const existing = deals.find((d) => d.id === eventData.customerId);
      if (!existing) return;

      targetDeal = {
        ...existing,
        status: determinedStatus,
        tags: eventData.tags,
        amount: eventData.amount > 0 ? eventData.amount : existing.amount,
        product: eventData.product || existing.product,
        adminName: eventData.adminName || existing.adminName,
        lastMessage: eventData.message,
        lastMessageTime: 'เมื่อสักครู่',
        updatedAt: nowIso,
        notes: eventData.notes !== undefined ? eventData.notes : existing.notes,
        syncedToSheet: false,
      };
      setDeals((prev) => prev.map((d) => (d.id === existing.id ? targetDeal : d)));
    }

    addLog(
      'TAG_EVENT',
      targetDeal.displayName,
      'INFO',
      `ตรวจพบการติดแท็ก: [${eventData.tags.join(', ')}] -> ปรับสถานะเป็น "${targetDeal.status}"`
    );

    // If Real-time Auto-Sync is ON and Sheet is connected, immediately export to Google Sheets!
    if (isAutoSyncEnabled && sheetInfo) {
      const token = await getAccessToken();
      if (token) {
        try {
          const appendRes = await appendDealToSheet(
            sheetInfo.spreadsheetId,
            sheetInfo.sheetName,
            targetDeal,
            token
          );

          const syncedDeal: CustomerDeal = {
            ...targetDeal,
            syncedToSheet: true,
            syncedAt: new Date().toISOString(),
            sheetRow: appendRes.rowNumber,
          };

          setDeals((prev) => prev.map((d) => (d.id === targetDeal.id ? syncedDeal : d)));
          setSheetInfo((prev) => (prev ? { ...prev, totalSyncedRows: prev.totalSyncedRows + 1 } : null));

          addLog(
            'AUTO_SYNC',
            targetDeal.displayName,
            'SUCCESS',
            `⚡ Real-time Auto-Sync: ส่งข้อมูลการปิดการขายเข้า Google Sheet แถวที่ #${appendRes.rowNumber} อัตโนมัติ`,
            appendRes.rowNumber
          );
          showToast(`⚡ Real-time ซิงค์อัตโนมัติ: บันทึก "${targetDeal.displayName}" ลง Google Sheet แถวที่ #${appendRes.rowNumber} แล้ว`, 'success');
          return;
        } catch (err: any) {
          console.error('Auto sync failed:', err);
          addLog('AUTO_SYNC', targetDeal.displayName, 'ERROR', `Auto-sync ล้มเหลว: ${err.message}`);
        }
      }
    }

    showToast(`อัปเดตข้อมูลและแท็กของ "${targetDeal.displayName}" เรียบร้อยแล้ว`, 'info');
  };

  const handleUpdateDeal = (updatedDeal: CustomerDeal) => {
    setDeals((prev) => prev.map((d) => (d.id === updatedDeal.id ? updatedDeal : d)));
    addLog('TAG_EVENT', updatedDeal.displayName, 'INFO', `แก้ไขข้อมูล deal และสถานะเป็น "${updatedDeal.status}"`);
  };

  const handleOpenLostRecovery = (dealId?: string) => {
    if (dealId) {
      setLostRecoveryDealId(dealId);
    }
    setIsLostRecoveryOpen(true);
  };

  const handleReopenDeal = async (deal: CustomerDeal, newStatus: 'WON' | 'IN_PROGRESS', addedTag: string) => {
    const updatedTags = Array.from(new Set([...deal.tags.filter((t) => !t.includes('ขายไม่เสร็จ')), addedTag, '#ปิดการขาย']));
    const nowIso = new Date().toISOString();
    
    const updatedDeal: CustomerDeal = {
      ...deal,
      status: newStatus,
      tags: updatedTags,
      updatedAt: nowIso,
      syncedToSheet: false,
      notes: `${deal.notes ? deal.notes + ' | ' : ''}กู้คืนสำเร็จเมื่อ ${new Date().toLocaleTimeString('th-TH')}`,
    };

    setDeals((prev) => prev.map((d) => (d.id === deal.id ? updatedDeal : d)));
    addLog('TAG_EVENT', deal.displayName, 'INFO', `กู้คืนออเดอร์สำเร็จ! ปรับสถานะเป็น "${newStatus}" พร้อมแท็ก ${addedTag}`);

    // If AutoSync is ON, push to Sheet right away!
    if (isAutoSyncEnabled && sheetInfo) {
      const token = await getAccessToken();
      if (token) {
        try {
          const res = await appendDealToSheet(sheetInfo.spreadsheetId, sheetInfo.sheetName, updatedDeal, token);
          setDeals((prev) =>
            prev.map((d) =>
              d.id === deal.id
                ? { ...updatedDeal, syncedToSheet: true, syncedAt: nowIso, sheetRow: res.rowNumber }
                : d
            )
          );
          addLog('AUTO_SYNC', deal.displayName, 'SUCCESS', `ส่งเคสกู้คืนเข้าชีทแถวที่ #${res.rowNumber} อัตโนมัติ`, res.rowNumber);
          showToast(`กู้คืนและบันทึก "${deal.displayName}" เข้า Google Sheet สำเร็จแล้ว!`, 'success');
          return;
        } catch (err: any) {
          console.error('Auto sync recovery failed:', err);
        }
      }
    }

    showToast(`กู้คืนออเดอร์ "${deal.displayName}" สำเร็จแล้ว`, 'success');
  };

  const handleExportCsv = () => {
    exportDealsToCsv(deals, `LINE_OA_Deals_${new Date().toISOString().split('T')[0]}.csv`);
    showToast(`ส่งออกข้อมูลลูกค้าทั้ง ${deals.length} รายการเป็นไฟล์ CSV เรียบร้อย`, 'success');
  };

  const handleAddAdmin = (newAdmin: AdminUser) => {
    setAdmins((prev) => [...prev, newAdmin]);
    addLog('TAG_EVENT', newAdmin.name, 'INFO', `เพิ่มแอดมินใหม่: "${newAdmin.name}" (${newAdmin.role})`);
    showToast(`เพิ่มแอดมิน "${newAdmin.name}" เรียบร้อยแล้ว`, 'success');
  };

  const handleUpdateAdmin = (updatedAdmin: AdminUser) => {
    const oldAdmin = admins.find((a) => a.id === updatedAdmin.id);
    setAdmins((prev) => prev.map((a) => (a.id === updatedAdmin.id ? updatedAdmin : a)));

    // If admin name changed, update deals assigned to old name
    if (oldAdmin && oldAdmin.name !== updatedAdmin.name) {
      setDeals((prev) =>
        prev.map((d) => (d.adminName === oldAdmin.name ? { ...d, adminName: updatedAdmin.name } : d))
      );
    }
    showToast(`อัปเดตข้อมูล "${updatedAdmin.name}" เรียบร้อยแล้ว`, 'success');
  };

  const handleDeleteAdmin = (adminId: string, reassignToName?: string) => {
    const target = admins.find((a) => a.id === adminId);
    if (!target) return;

    setAdmins((prev) => prev.filter((a) => a.id !== adminId));

    const newAssignee = reassignToName || 'ยังไม่มีแอดมินรับเรื่อง';
    setDeals((prev) =>
      prev.map((d) => (d.adminName === target.name ? { ...d, adminName: newAssignee } : d))
    );

    addLog('TAG_EVENT', target.name, 'INFO', `ลบแอดมิน "${target.name}" และโอนเคสไปที่ "${newAssignee}"`);
    showToast(`ลบแอดมิน "${target.name}" เรียบร้อยแล้ว`, 'info');
  };

  const handleResetAdmins = () => {
    setAdmins(DEFAULT_ADMINS);
    showToast('คืนค่ารายชื่อแอดมินเริ่มต้นเรียบร้อยแล้ว', 'info');
  };

  const unsyncedCount = deals.filter((d) => !d.syncedToSheet).length;
  const syncedRowsCount = deals.filter((d) => d.syncedToSheet).length;

  // The dashboard is private: ask for the admin token before showing any deal data.
  if (!dashboardToken) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
        <form
          onSubmit={handleTokenSubmit}
          className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">แดชบอร์ดผู้ดูแล</h1>
              <p className="text-xs text-slate-400">ข้อมูลดีลจาก D1 ถูกจำกัดสิทธิ์</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            กรอกรหัสผู้ดูแล (DASHBOARD_TOKEN) เพื่ออ่านข้อมูลจริง รหัสจะถูกเก็บไว้ในเบราว์เซอร์นี้เท่านั้น
          </p>

          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="DASHBOARD_TOKEN"
            autoFocus
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />

          {dealsError && <p className="text-xs text-rose-400">{dealsError}</p>}

          <button
            type="submit"
            className="w-full px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30"
          >
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className={`px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium flex items-center gap-2.5 max-w-md ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/40 shadow-emerald-500/10'
              : toast.type === 'error'
              ? 'bg-rose-950/95 text-rose-200 border-rose-500/40 shadow-rose-500/10'
              : 'bg-slate-900/95 text-slate-200 border-slate-700 shadow-slate-900/50'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Zap className="w-4 h-4 text-sky-400 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Navbar */}
      <Navbar
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        sheetInfo={sheetInfo}
        onOpenLineConfig={() => setIsLineConfigOpen(true)}
        onOpenTagRules={() => setIsTagRulesOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenLogs={() => setIsLogsOpen(true)}
        logsCount={syncLogs.length}
        isAutoSyncEnabled={isAutoSyncEnabled}
        onToggleAutoSync={() => setIsAutoSyncEnabled(!isAutoSyncEnabled)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenLostRecovery={() => handleOpenLostRecovery()}
        onExportCsv={handleExportCsv}
        onOpenAdminManagement={() => setIsAdminsOpen(true)}
      />

      {/* Deals API error / token reset */}
      {dealsError && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-xs text-rose-200 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {dealsError}
            </span>
            <button
              onClick={() => {
                localStorage.removeItem(DASHBOARD_TOKEN_KEY);
                setDashboardToken('');
                setDealsError(null);
              }}
              className="px-2 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 font-medium"
            >
              เปลี่ยนรหัสผู้ดูแล
            </button>
          </div>
        </div>
      )}

      {/* Google Sheets Connection Bar */}
      <GoogleSheetsBar
        sheetInfo={sheetInfo}
        isAuthenticated={!!user}
        onLogin={handleLogin}
        onCreateSheet={handleCreateSheet}
        onConnectExistingSheet={handleConnectExistingSheet}
        onSyncAll={handleSyncAllDeals}
        isCreatingSheet={isCreatingSheet}
        isSyncing={isSyncingAll}
        isAutoSyncEnabled={isAutoSyncEnabled}
        onToggleAutoSync={() => setIsAutoSyncEnabled(!isAutoSyncEnabled)}
        unsyncedCount={unsyncedCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Welcome & Instruction Banner if first time */}
        {!sheetInfo && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  ระบบพร้อมเชื่อมต่อ LINE OA และ Google Sheets
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Real-time Active
                  </span>
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  ตรวจจับการติดแท็ก <strong>#ปิดการขาย</strong>, <strong>#ขายไม่เสร็จ</strong> หรือ <strong>#กำลังติดตาม</strong> และส่งออกไปที่ชีทแบบเรียลไทม์ทันที
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleCreateSheet()}
                disabled={isCreatingSheet}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isCreatingSheet ? 'กำลังสร้าง Sheet...' : 'สร้าง Sheet ติดตามยอดขายทันที'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Stats & KPIs */}
        <StatsCards
          deals={deals}
          onFilterStatus={setActiveFilter}
          activeFilter={activeFilter}
          syncedRowsCount={syncedRowsCount}
        />

        {/* Deals Table */}
        <CustomerTable
          deals={deals}
          tagRules={tagRules}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onUpdateDeal={handleUpdateDeal}
          onSyncSingleDeal={handleSyncSingleDeal}
          isSheetConnected={!!sheetInfo}
          onOpenLostRecoveryWithDeal={handleOpenLostRecovery}
          onExportCsv={handleExportCsv}
          admins={admins}
          onOpenAdminManagement={() => setIsAdminsOpen(true)}
        />

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>LINE OA Sales & Tag Tracker • เชื่อมต่อ Google Sheets API แบบเรียลไทม์</p>
      </footer>

      {/* LINE OA Webhook Configuration Modal */}
      <LineOASetupModal
        isOpen={isLineConfigOpen}
        onClose={() => setIsLineConfigOpen(false)}
        config={lineConfig}
        onSaveConfig={(updated) => {
          setLineConfig(updated);
          showToast('บันทึกการตั้งค่า LINE OA เรียบร้อยแล้ว', 'success');
        }}
      />

      {/* Tag Rules Modal */}
      <TagRulesModal
        isOpen={isTagRulesOpen}
        onClose={() => setIsTagRulesOpen(false)}
        tagRules={tagRules}
        onUpdateRules={(updated) => {
          setTagRules(updated);
          showToast('อัปเดตกฎการตรวจจับแท็กแล้ว', 'success');
        }}
      />

      {/* LINE Event Simulator Modal */}
      <LineSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        deals={deals}
        tagRules={tagRules}
        onSimulateEvent={handleSimulateEvent}
        isAutoSyncEnabled={isAutoSyncEnabled}
        admins={admins}
      />

      {/* Admin Management Modal */}
      <AdminManagementModal
        isOpen={isAdminsOpen}
        onClose={() => setIsAdminsOpen(false)}
        admins={admins}
        onAddAdmin={handleAddAdmin}
        onUpdateAdmin={handleUpdateAdmin}
        onDeleteAdmin={handleDeleteAdmin}
        onResetAdmins={handleResetAdmins}
        deals={deals}
      />

      {/* Sync Logs Drawer */}
      <SyncLogsDrawer
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        logs={syncLogs}
        onClearLogs={() => {
          setSyncLogs([]);
          showToast('ล้างประวัติการซิงค์เรียบร้อย', 'info');
        }}
        sheetUrl={sheetInfo?.url}
      />

      {/* Analytics Modal */}
      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        deals={deals}
        tagRules={tagRules}
      />

      {/* Lost Deals Recovery Modal */}
      <LostRecoveryModal
        isOpen={isLostRecoveryOpen}
        onClose={() => {
          setIsLostRecoveryOpen(false);
          setLostRecoveryDealId(null);
        }}
        deals={deals}
        selectedDealId={lostRecoveryDealId}
        onReopenDeal={handleReopenDeal}
      />

      {/* Reusable Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        confirmText={confirmation.confirmText}
        isDestructive={confirmation.isDestructive}
        onConfirm={confirmation.onConfirm}
        onCancel={() => setConfirmation((prev) => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}
