import { AdminUser } from '../types';

export const DEFAULT_ADMINS: AdminUser[] = [
  {
    id: 'admin-1',
    name: 'แอดมินแนน',
    role: 'หัวหน้าทีมขาย (Sales Lead)',
    phone: '081-234-5678',
    lineId: 'nan_sales',
    color: 'emerald',
    isDefault: true,
  },
  {
    id: 'admin-2',
    name: 'แอดมินบอย',
    role: 'เจ้าหน้าที่ฝ่ายขาย (Sales Rep)',
    phone: '089-876-5432',
    lineId: 'boy_line',
    color: 'sky',
    isDefault: true,
  },
  {
    id: 'admin-3',
    name: 'แอดมินเก่ง',
    role: 'ผู้ดูแลเคสพิเศษ (Key Account)',
    phone: '086-555-4321',
    lineId: 'keng_pro',
    color: 'purple',
    isDefault: true,
  },
];

export { DEFAULT_TAG_RULES, determineStatusFromTags } from '../../shared/tagRules.js';
