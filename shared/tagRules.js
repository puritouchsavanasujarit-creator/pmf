/**
 * Shared tag rules + helpers used by both the React app and the Cloudflare Worker
 * (`freebuff.worker.js`). Keep this file dependency-free and plain JS so Vite,
 * tsc (allowJs) and workerd can all load it.
 */

/** @typedef {'WON'|'LOST'|'IN_PROGRESS'|'UNTAGGED'} DealStatus */
/** @typedef {{ id: string, tag: string, mapsToStatus: DealStatus, color: string, description: string, isSystem?: boolean }} TagRule */

/** @type {TagRule[]} */
export const DEFAULT_TAG_RULES = [
  // WON
  {
    id: 'rule-won-1',
    tag: '#ปิดการขาย',
    mapsToStatus: 'WON',
    color: 'emerald',
    description: 'ลูกค้าตกลงซื้อสินค้า/บริการเรียบร้อย',
    isSystem: true,
  },
  {
    id: 'rule-won-2',
    tag: '#โอนแล้ว',
    mapsToStatus: 'WON',
    color: 'emerald',
    description: 'ชำระเงินและแนบสลิปเรียบร้อย',
    isSystem: true,
  },
  {
    id: 'rule-won-3',
    tag: '#มัดจำแล้ว',
    mapsToStatus: 'WON',
    color: 'teal',
    description: 'ชำระค่ามัดจำสินค้าแล้ว',
    isSystem: true,
  },
  {
    id: 'rule-won-4',
    tag: '#ส่งของแล้ว',
    mapsToStatus: 'WON',
    color: 'green',
    description: 'จัดส่งพัสดุและแจ้งเลขแทร็กกิ้งแล้ว',
    isSystem: true,
  },

  // LOST (ขายไม่เสร็จ)
  {
    id: 'rule-lost-1',
    tag: '#ขายไม่เสร็จ',
    mapsToStatus: 'LOST',
    color: 'rose',
    description: 'ไม่สามารถปิดการขายได้ สิ้นสุดการสนทนา',
    isSystem: true,
  },
  {
    id: 'rule-lost-2',
    tag: '#ยกเลิก',
    mapsToStatus: 'LOST',
    color: 'rose',
    description: 'ลูกค้ายกเลิกคำสั่งซื้อหรือเปลี่ยนใจ',
    isSystem: true,
  },
  {
    id: 'rule-lost-3',
    tag: '#เงียบหาย',
    mapsToStatus: 'LOST',
    color: 'amber',
    description: 'ลูกค้าอ่านไม่ตอบ / ไม่ตอบเกิน 48 ชม.',
    isSystem: true,
  },
  {
    id: 'rule-lost-4',
    tag: '#ราคาแพง',
    mapsToStatus: 'LOST',
    color: 'orange',
    description: 'ลูกค้าแจ้งว่างบไม่พอ หรือสินค้าแพงเกินไป',
    isSystem: true,
  },

  // IN_PROGRESS
  {
    id: 'rule-prog-1',
    tag: '#สนใจ',
    mapsToStatus: 'IN_PROGRESS',
    color: 'sky',
    description: 'ลูกค้าทักมาสอบถามรายละเอียด สนใจสินค้า',
    isSystem: true,
  },
  {
    id: 'rule-prog-2',
    tag: '#รอโอน',
    mapsToStatus: 'IN_PROGRESS',
    color: 'blue',
    description: 'สรุปยอดเงินและส่งเลขบัญชีแล้ว รอสลิป',
    isSystem: true,
  },
  {
    id: 'rule-prog-3',
    tag: '#ขอใบเสนอราคา',
    mapsToStatus: 'IN_PROGRESS',
    color: 'indigo',
    description: 'ส่งใบเสนอราคา (Quotation) แล้ว',
    isSystem: true,
  },
  {
    id: 'rule-prog-4',
    tag: '#รอตัดสินใจ',
    mapsToStatus: 'IN_PROGRESS',
    color: 'violet',
    description: 'ลูกค้าขอปรึกษาทีมหรือผู้บริหารก่อน',
    isSystem: true,
  },
];

/** Highest priority wins: a deal tagged both #ปิดการขาย and #ราคาแพง counts as WON. */
const TAG_STATUS_PRIORITY = /** @type {DealStatus[]} */ (['WON', 'LOST', 'IN_PROGRESS']);

/**
 * @param {string} text
 * @returns {string[]}
 */
export function extractTagsFromText(text) {
  const matches = text.match(/#[\w\u0E00-\u0E7F]+/g);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Matches e.g. 1,500 บาท or 2500.- or 3500 thb
 * @param {string} text
 * @returns {number | null}
 */
export function extractAmountFromText(text) {
  const match = text.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*(?:บาท|.-|฿|thb)?/i);
  if (!match) return null;
  const num = parseFloat(match[1].replace(/,/g, ''));
  return !isNaN(num) && num > 0 ? num : null;
}

/**
 * @param {string[]} [tags]
 * @param {TagRule[]} [rules]
 * @returns {DealStatus}
 */
export function determineStatusFromTags(tags, rules = DEFAULT_TAG_RULES) {
  if (!tags || tags.length === 0) return 'UNTAGGED';

  const lowerTags = tags.map((t) => t.toLowerCase());

  for (const status of TAG_STATUS_PRIORITY) {
    const statusTags = rules.filter((r) => r.mapsToStatus === status).map((r) => r.tag.toLowerCase());
    if (lowerTags.some((t) => statusTags.includes(t))) return status;
  }

  return 'IN_PROGRESS';
}
