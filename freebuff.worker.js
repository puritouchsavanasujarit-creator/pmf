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
];

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

function toDeal(row) {
  let tags = [];
  try {
    const parsed = JSON.parse(row.tags || '[]');
    if (Array.isArray(parsed)) tags = parsed;
  } catch {
    tags = [];
  }

  return {
    id: `deal-${row.id}`,
    lineUserId: row.line_user_id || '',
    displayName: row.display_name || 'ลูกค้า LINE',
    pictureUrl: '',
    status: row.status,
    tags,
    amount: row.latest_amount ?? row.amount ?? 0,
    product: '',
    adminName: 'ยังไม่มีแอดมินรับเรื่อง',
    lastMessage: row.message || '',
    lastMessageTime: formatThaiRelative(row.created_at),
    updatedAt: row.created_at,
    syncedToSheet: false,
    syncedAt: null,
    notes: '',
  };
}

async function listDeals(env) {
  if (!env.DB) return [];
  await ensureSchema(env);
  const { results } = await env.DB.prepare(
    `SELECT d.*,
       (SELECT a.amount FROM deal_events a
         WHERE a.line_user_id = d.line_user_id AND a.amount IS NOT NULL
         ORDER BY a.created_at DESC, a.id DESC LIMIT 1) AS latest_amount
     FROM (
       SELECT *, ROW_NUMBER() OVER (
         PARTITION BY line_user_id ORDER BY created_at DESC, id DESC
       ) AS rn
       FROM deal_events
     ) d
     WHERE d.rn = 1
     ORDER BY d.created_at DESC
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

export async function handleDeals(request, env) {
  if (request.method !== 'GET') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  // The dashboard is private: no shared token configured means no access at all.
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

  try {
    const deals = await listDeals(env);
    return json({ success: true, deals });
  } catch (err) {
    console.error('Failed to load deals:', err);
    return json({ success: false, error: 'ไม่สามารถอ่านข้อมูลจากฐานข้อมูลได้' }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === WEBHOOK_PATH || url.pathname === `${WEBHOOK_PATH}/`) {
      return handleLineWebhook(request, env);
    }

    if (url.pathname === DEALS_PATH || url.pathname === `${DEALS_PATH}/`) {
      return handleDeals(request, env);
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status === 404 && request.method === 'GET') {
      return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
    }
    return response;
  },
};
