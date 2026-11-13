/**
 * Cloudflare Worker entrypoint for Freebuff Sites.
 *
 * - Serves the built Vite SPA from the ASSETS binding.
 * - Handles the LINE OA webhook at /api/line/webhook (production API route),
 *   verifying X-Line-Signature when LINE_CHANNEL_SECRET is configured, detecting
 *   deal tags with the shared rules module, persisting them in D1 and replying
 *   200 to LINE.
 * - Serves the latest state per customer to the dashboard at GET /api/deals.
 */

import {
  extractTagsFromText,
  extractAmountFromText,
  determineStatusFromTags,
} from './shared/tagRules.js';

const WEBHOOK_PATH = '/api/line/webhook';
const DEALS_PATH = '/api/deals';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS deal_events (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     line_user_id TEXT,
     display_name TEXT,
     event_type TEXT,
     message TEXT,
     tags TEXT NOT NULL,
     status TEXT NOT NULL,
     amount REAL,
     created_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_deal_events_user
     ON deal_events (line_user_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS deal_overrides (
     line_user_id TEXT PRIMARY KEY,
     status TEXT,
     tags TEXT,
     amount REAL,
     notes TEXT,
     admin_name TEXT,
     product TEXT,
     updated_at TEXT NOT NULL
   )`,
];

const DEAL_STATUSES = ['WON', 'LOST', 'IN_PROGRESS', 'UNTAGGED'];

// D1 has no migration runner here, so the Worker creates its own schema once per isolate.
let schemaPromise = null;

function ensureSchema(env) {
  if (!schemaPromise) {
    schemaPromise = env.DB.batch(SCHEMA_STATEMENTS.map((sql) => env.DB.prepare(sql))).catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyLineSignature(body, signature, channelSecret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(channelSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return safeEqual(btoa(String.fromCharCode(...new Uint8Array(mac))), signature);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function displayNameFor(lineUserId) {
  return lineUserId ? `ลูกค้า LINE ${lineUserId.slice(-6)}` : 'ลูกค้า LINE';
}

function formatThaiRelative(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 60_000) return 'เมื่อสักครู่';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  return `${Math.floor(hours / 24)} วันที่แล้ว`;
}

/**
 * Detects tags per LINE event. Returns one entry per message that carries tags.
 */
function detectEvents(events) {
  const detected = [];
  for (const event of events) {
    const text = event?.message?.type === 'text' ? event.message.text || '' : '';
    const tags = extractTagsFromText(text);
    if (tags.length === 0) continue;
    const occurredAt = Number.isFinite(event.timestamp)
      ? new Date(event.timestamp).toISOString()
      : new Date().toISOString();
    detected.push({
      eventType: event.type,
      replyToken: event.replyToken ?? null,
      lineUserId: event.source?.userId ?? null,
      message: text,
      tags,
      status: determineStatusFromTags(tags),
      amount: extractAmountFromText(text),
      timestamp: event.timestamp ?? null,
      occurredAt,
    });
  }
  return detected;
}

async function saveDetectedEvents(env, detected) {
  if (!env.DB || detected.length === 0) return 0;
  await ensureSchema(env);
  await env.DB.batch(
    detected.map((event) =>
      env.DB.prepare(
        `INSERT INTO deal_events
           (line_user_id, display_name, event_type, message, tags, status, amount, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        event.lineUserId,
        displayNameFor(event.lineUserId),
        event.eventType,
        event.message,
        JSON.stringify(event.tags),
        event.status,
        event.amount,
        event.occurredAt
      )
    )
  );
  return detected.length;
}

function parseTags(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// An override row (saved from the dashboard) wins over the original LINE event.
function toDeal(row) {
  return {
    id: `deal-${row.id}`,
    lineUserId: row.line_user_id || '',
    displayName: row.display_name || 'ลูกค้า LINE',
    pictureUrl: '',
    status: row.override_status ?? row.status,
    tags: row.override_tags ? parseTags(row.override_tags) : parseTags(row.tags),
    amount: row.override_amount ?? row.latest_amount ?? row.amount ?? 0,
    product: row.override_product ?? '',
    adminName: row.override_admin_name ?? 'ยังไม่มีแอดมินรับเรื่อง',
    lastMessage: row.message || '',
    lastMessageTime: formatThaiRelative(row.created_at),
    updatedAt: row.override_updated_at ?? row.created_at,
    syncedToSheet: false,
    syncedAt: null,
    notes: row.override_notes ?? '',
  };
}

async function listDeals(env) {
  if (!env.DB) return [];
  await ensureSchema(env);
  const { results } = await env.DB.prepare(
    `SELECT d.*,
       o.status AS override_status,
       o.tags AS override_tags,
       o.amount AS override_amount,
       o.notes AS override_notes,
       o.admin_name AS override_admin_name,
       o.product AS override_product,
       o.updated_at AS override_updated_at,
       (SELECT a.amount FROM deal_events a
         WHERE a.line_user_id = d.line_user_id AND a.amount IS NOT NULL
         ORDER BY a.created_at DESC, a.id DESC LIMIT 1) AS latest_amount
     FROM (
       SELECT *, ROW_NUMBER() OVER (
         PARTITION BY line_user_id ORDER BY created_at DESC, id DESC
       ) AS rn
       FROM deal_events
     ) d
     LEFT JOIN deal_overrides o ON o.line_user_id = d.line_user_id
     WHERE d.rn = 1
     ORDER BY COALESCE(o.updated_at, d.created_at) DESC
     LIMIT 100`
  ).all();
  return (results || []).map(toDeal);
}

export async function handleLineWebhook(request, env) {
  if (request.method === 'GET') {
    return json({ status: 'active', message: 'LINE OA Webhook Endpoint is ready' });
  }

  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  const body = await request.text();

  // Without the channel secret every event is unverifiable, so refuse to write anything.
  const channelSecret = env?.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    return json(
      { success: false, error: 'Webhook ยังไม่พร้อมใช้งาน: ยังไม่ได้ตั้งค่า LINE_CHANNEL_SECRET' },
      503
    );
  }

  const signature = request.headers.get('X-Line-Signature') || '';
  const valid = signature ? await verifyLineSignature(body, signature, channelSecret) : false;
  if (!valid) {
    return json({ success: false, error: 'Invalid LINE signature' }, 401);
  }

  let payload;
  try {
    payload = JSON.parse(body || '{}');
  } catch {
    // LINE retries on non-2xx, so acknowledge malformed bodies.
    return json({ success: true, eventsReceived: 0, detected: [], saved: 0 });
  }

  const events = Array.isArray(payload.events) ? payload.events : [];
  const detected = detectEvents(events);

  let saved = 0;
  try {
    saved = await saveDetectedEvents(env, detected);
  } catch (err) {
    // Never fail the webhook because of storage: LINE would retry the same events.
    console.error('Failed to persist LINE tag events:', err);
  }

  if (detected.length > 0) {
    console.log('LINE OA webhook tag events:', JSON.stringify(detected));
  }

  return json({ success: true, eventsReceived: events.length, detected, saved });
}

// The dashboard is private: no shared token configured means no access at all.
function requireDashboardAuth(request, env) {
  if (!env?.DASHBOARD_TOKEN) {
    return json(
      { success: false, error: 'ยังไม่ได้ตั้งค่า DASHBOARD_TOKEN สำหรับเข้าถึงแดชบอร์ด' },
      503
    );
  }

  const authHeader = request.headers.get('Authorization') || '';
  const providedToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!safeEqual(providedToken, env.DASHBOARD_TOKEN)) {
    return json({ success: false, error: 'ต้องเข้าสู่ระบบผู้ดูแลก่อนอ่านข้อมูล' }, 401);
  }

  return null;
}

export async function handleDeals(request, env) {
  if (request.method !== 'GET') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  const denied = requireDashboardAuth(request, env);
  if (denied) return denied;

  try {
    const deals = await listDeals(env);
    return json({ success: true, deals });
  } catch (err) {
    console.error('Failed to load deals:', err);
    return json({ success: false, error: 'ไม่สามารถอ่านข้อมูลจากฐานข้อมูลได้' }, 500);
  }
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.slice(0, maxLength) : null;
}

function normalizeDealEdit(body) {
  if (!body || typeof body !== 'object') return { error: 'ข้อมูลที่ส่งมาไม่ถูกต้อง' };

  const status = body.status;
  if (status !== undefined && !DEAL_STATUSES.includes(status)) {
    return { error: 'สถานะการขายไม่ถูกต้อง' };
  }

  let tags = null;
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) return { error: 'แท็กต้องเป็นรายการข้อความ' };
    tags = JSON.stringify(body.tags.slice(0, 50).map((tag) => String(tag).slice(0, 60)));
  }

  let amount = null;
  if (body.amount !== undefined) {
    amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) return { error: 'ยอดเงินไม่ถูกต้อง' };
  }

  return {
    fields: {
      status: status ?? null,
      tags,
      amount,
      notes: cleanText(body.notes, 500),
      adminName: cleanText(body.adminName, 120),
      product: cleanText(body.product, 200),
    },
  };
}

const OVERRIDE_UPSERT = `INSERT INTO deal_overrides
     (line_user_id, status, tags, amount, notes, admin_name, product, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(line_user_id) DO UPDATE SET
     status = excluded.status,
     tags = excluded.tags,
     amount = excluded.amount,
     notes = excluded.notes,
     admin_name = excluded.admin_name,
     product = excluded.product,
     updated_at = excluded.updated_at`;

async function upsertOverrides(env, entries) {
  await ensureSchema(env);
  const updatedAt = new Date().toISOString();
  await env.DB.batch(
    entries.map((entry) =>
      env.DB.prepare(OVERRIDE_UPSERT).bind(
        entry.lineUserId,
        entry.fields.status,
        entry.fields.tags,
        entry.fields.amount,
        entry.fields.notes,
        entry.fields.adminName,
        entry.fields.product,
        updatedAt
      )
    )
  );
}

const MAX_EDITS_PER_REQUEST = 100;

function parseEdits(body, singleLineUserId) {
  const edits = singleLineUserId ? [{ ...(body || {}), lineUserId: singleLineUserId }] : body?.edits;

  if (!Array.isArray(edits) || edits.length === 0) {
    return { error: 'ต้องส่งรายการ edits อย่างน้อย 1 รายการ' };
  }
  if (edits.length > MAX_EDITS_PER_REQUEST) {
    return { error: `แก้ไขได้ครั้งละไม่เกิน ${MAX_EDITS_PER_REQUEST} รายการ` };
  }

  const entries = [];
  for (const edit of edits) {
    const lineUserId = typeof edit?.lineUserId === 'string' ? edit.lineUserId.trim() : '';
    if (!lineUserId) return { error: 'ไม่พบรหัสลูกค้า LINE' };
    const normalized = normalizeDealEdit(edit);
    if (normalized.error) return { error: normalized.error };
    entries.push({ lineUserId, fields: normalized.fields });
  }
  return { entries };
}

/**
 * Saves dashboard edits: one customer when `lineUserId` is given, otherwise every
 * entry in `body.edits`. LINE events stay untouched; overrides are merged on top
 * when the dashboard reads the deals back.
 */
export async function handleDealsWrite(request, env, lineUserId) {
  if (request.method !== 'PUT') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  const denied = requireDashboardAuth(request, env);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'ข้อมูลที่ส่งมาไม่ใช่ JSON ที่ถูกต้อง' }, 400);
  }

  const parsed = parseEdits(body, lineUserId);
  if (parsed.error) {
    return json({ success: false, error: parsed.error }, 400);
  }

  try {
    await upsertOverrides(env, parsed.entries);
    return json({ success: true, saved: parsed.entries.length });
  } catch (err) {
    console.error('Failed to save deal overrides:', err);
    return json({ success: false, error: 'ไม่สามารถบันทึกการแก้ไขลงฐานข้อมูลได้' }, 500);
  }
}

function parseLineUserIds(body, singleLineUserId) {
  const ids = singleLineUserId ? [singleLineUserId] : body?.lineUserIds;

  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: 'ต้องระบุ lineUserIds อย่างน้อย 1 รายการ' };
  }
  if (ids.length > MAX_EDITS_PER_REQUEST) {
    return { error: `รีเซ็ตได้ครั้งละไม่เกิน ${MAX_EDITS_PER_REQUEST} รายการ` };
  }

  const cleaned = [];
  for (const id of ids) {
    const value = typeof id === 'string' ? id.trim() : '';
    if (!value) return { error: 'ไม่พบรหัสลูกค้า LINE' };
    cleaned.push(value);
  }
  return { ids: cleaned };
}

/**
 * Drops dashboard overrides so the customer falls back to the latest LINE event.
 */
export async function handleDealsReset(request, env, lineUserId) {
  if (request.method !== 'DELETE') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  const denied = requireDashboardAuth(request, env);
  if (denied) return denied;

  let body = null;
  if (!lineUserId) {
    try {
      body = await request.json();
    } catch {
      body = null;
    }
  }

  const parsed = parseLineUserIds(body, lineUserId);
  if (parsed.error) {
    return json({ success: false, error: parsed.error }, 400);
  }

  try {
    await ensureSchema(env);
    await env.DB.batch(
      parsed.ids.map((id) =>
        env.DB.prepare('DELETE FROM deal_overrides WHERE line_user_id = ?').bind(id)
      )
    );
    return json({ success: true, reset: parsed.ids.length });
  } catch (err) {
    console.error('Failed to reset deal overrides:', err);
    return json({ success: false, error: 'ไม่สามารถรีเซ็ตค่าได้' }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === WEBHOOK_PATH || url.pathname === `${WEBHOOK_PATH}/`) {
      return handleLineWebhook(request, env);
    }

    if (url.pathname === DEALS_PATH || url.pathname === `${DEALS_PATH}/`) {
      if (request.method === 'PUT') return handleDealsWrite(request, env);
      if (request.method === 'DELETE') return handleDealsReset(request, env);
      return handleDeals(request, env);
    }

    if (url.pathname.startsWith(`${DEALS_PATH}/`)) {
      const lineUserId = decodeURIComponent(url.pathname.slice(DEALS_PATH.length + 1));
      return request.method === 'DELETE'
        ? handleDealsReset(request, env, lineUserId)
        : handleDealsWrite(request, env, lineUserId);
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status === 404 && request.method === 'GET') {
      return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
    }
    return response;
  },
};
