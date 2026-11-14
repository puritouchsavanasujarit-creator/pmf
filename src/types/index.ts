export type DealStatus = 'WON' | 'LOST' | 'IN_PROGRESS' | 'UNTAGGED';

export interface CustomerDeal {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl: string;
  status: DealStatus;
  tags: string[];
  amount: number;
  product: string;
  adminName: string;
  lastMessage: string;
  lastMessageTime: string;
  updatedAt: string;
  syncedToSheet: boolean;
  syncedAt: string | null;
  sheetRow?: number;
  notes: string;
  phone?: string;
  // D1 revision of the saved override; 0 means no override yet.
  revision?: number;
}

export interface LineWebhookConfig {
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
  webhookUrl: string;
  isEnabled: boolean;
  autoSyncToSheets: boolean;
}

export interface TagRule {
  id: string;
  tag: string;
  mapsToStatus: DealStatus;
  color: string;
  description: string;
  isSystem?: boolean;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  action: 'AUTO_SYNC' | 'MANUAL_SYNC' | 'CREATE_SHEET' | 'TAG_EVENT' | 'WEBHOOK_EVENT';
  customerName: string;
  status: 'SUCCESS' | 'ERROR' | 'INFO';
  details: string;
  sheetRow?: number | null;
}

export interface GoogleSheetInfo {
  spreadsheetId: string;
  title: string;
  url: string;
  sheetName: string;
  totalSyncedRows: number;
  lastSyncedAt: string | null;
}

export interface AdminUser {
  id: string;
  name: string;
  role: string;
  phone?: string;
  lineId?: string;
  color?: string;
  avatarUrl?: string;
  isDefault?: boolean;
}
