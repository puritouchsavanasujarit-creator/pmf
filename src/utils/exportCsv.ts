import { CustomerDeal } from '../types';
import { formatStatusThai } from '../services/sheetsService';

export function exportDealsToCsv(deals: CustomerDeal[], filename = 'line_oa_sales_deals.csv') {
  const headers = [
    'LINE User ID',
    'ชื่อลูกค้า (Customer Name)',
    'สถานะ (Sales Status)',
    'แท็ก (Tags)',
    'ยอดเงิน (Amount THB)',
    'สินค้า/บริการ (Product)',
    'แอดมินผู้ดูแล (Sales Rep)',
    'ข้อความล่าสุด (Latest Message)',
    'โน้ตเพิ่มเติม (Notes)',
    'อัปเดตล่าสุด (Last Updated)',
    'สถานะซิงค์ชีท (Sheet Synced)',
  ];

  const rows = deals.map((d) => [
    `"${d.lineUserId}"`,
    `"${d.displayName.replace(/"/g, '""')}"`,
    `"${formatStatusThai(d.status)}"`,
    `"${d.tags.join(', ')}"`,
    d.amount || 0,
    `"${(d.product || '').replace(/"/g, '""')}"`,
    `"${(d.adminName || '').replace(/"/g, '""')}"`,
    `"${(d.lastMessage || '').replace(/"/g, '""')}"`,
    `"${(d.notes || '').replace(/"/g, '""')}"`,
    `"${new Date(d.updatedAt).toLocaleString('th-TH')}"`,
    d.syncedToSheet ? 'ซิงค์แล้ว' : 'ยังไม่ซิงค์',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  // Include UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility with Thai language
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
