// Local smoke test for the worker routes (run with bun).
import worker, { handleLineWebhook, handleDeals } from '../freebuff.worker.js';

const assetsFetch = async (req) => {
  const url = new URL(req.url);
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return new Response('<html>app</html>', { headers: { 'content-type': 'text/html' } });
  }
  return new Response('not found', { status: 404 });
};

const CHANNEL_SECRET = 'test-channel-secret';
const DASHBOARD_TOKEN = 'test-dashboard-token';

const base = 'https://example.com';
const env = {
  ASSETS: { fetch: assetsFetch },
  LINE_CHANNEL_SECRET: CHANNEL_SECRET,
  DASHBOARD_TOKEN,
};

const results = [];
const check = (name, cond, extra = '') => results.push({ name, pass: !!cond, extra });

async function sign(raw) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(CHANNEL_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
  return Buffer.from(mac).toString('base64');
}

const payload = {
  destination: 'U1234',
  events: [
    {
      type: 'message',
      replyToken: 'rt-1',
      timestamp: 1700000000000,
      source: { type: 'user', userId: 'Uabc' },
      message: { type: 'text', id: '1', text: 'ปิดการขายแล้วนะ #ปิดการขาย ยอด 12,900 บาท' },
    },
    {
      type: 'message',
      replyToken: 'rt-2',
      source: { type: 'user', userId: 'Udef' },
      message: { type: 'text', id: '2', text: 'ขอคิดก่อน #ขายไม่เสร็จ' },
    },
    {
      type: 'message',
      replyToken: 'rt-3',
      source: { type: 'user', userId: 'Ughi' },
      message: { type: 'text', id: '3', text: 'สวัสดีครับ ไม่มีแท็ก' },
    },
  ],
};
const raw = JSON.stringify(payload);
const signature = await sign(raw);

// --- Webhook ---
let res = await worker.fetch(new Request(`${base}/api/line/webhook`), env);
check('GET webhook -> 200', res.status === 200);

res = await worker.fetch(
  new Request(`${base}/api/line/webhook`, {
    method: 'POST',
    headers: { 'X-Line-Signature': signature },
    body: raw,
  }),
  env
);
let body = await res.json();
check('signed POST -> 200', res.status === 200, JSON.stringify(body));
check('eventsReceived = 3', body.eventsReceived === 3);
check('detected 2 tagged events', body.detected?.length === 2, JSON.stringify(body.detected));
check('WON detected', body.detected?.[0]?.status === 'WON');
check('amount parsed', body.detected?.[0]?.amount === 12900);
check('LOST detected', body.detected?.[1]?.status === 'LOST');
check('no CORS wildcard', !res.headers.get('Access-Control-Allow-Origin'));

res = await handleLineWebhook(new Request(`${base}/api/line/webhook`, { method: 'POST', body: raw }), env);
check('unsigned POST -> 401', res.status === 401, `status=${res.status}`);

res = await handleLineWebhook(
  new Request(`${base}/api/line/webhook`, {
    method: 'POST',
    headers: { 'X-Line-Signature': 'bogus' },
    body: raw,
  }),
  env
);
check('bad signature -> 401', res.status === 401, `status=${res.status}`);

res = await handleLineWebhook(
  new Request(`${base}/api/line/webhook`, {
    method: 'POST',
    headers: { 'X-Line-Signature': signature },
    body: raw,
  }),
  { ...env, LINE_CHANNEL_SECRET: '' }
);
check('unconfigured secret -> 503', res.status === 503, `status=${res.status}`);

res = await handleLineWebhook(new Request(`${base}/api/line/webhook`, { method: 'PUT' }), env);
check('PUT webhook -> 405', res.status === 405);

// --- Deals ---
res = await handleDeals(new Request(`${base}/api/deals`), env);
check('deals without token -> 401', res.status === 401, `status=${res.status}`);

res = await handleDeals(
  new Request(`${base}/api/deals`, { headers: { Authorization: 'Bearer wrong' } }),
  env
);
check('deals with wrong token -> 401', res.status === 401, `status=${res.status}`);

res = await handleDeals(
  new Request(`${base}/api/deals`, { headers: { Authorization: `Bearer ${DASHBOARD_TOKEN}` } }),
  env
);
body = await res.json();
check('deals with token -> 200', res.status === 200, JSON.stringify(body));
check('deals empty without DB binding', Array.isArray(body.deals) && body.deals.length === 0);
check('deals no CORS wildcard', !res.headers.get('Access-Control-Allow-Origin'));

res = await handleDeals(
  new Request(`${base}/api/deals`, { headers: { Authorization: `Bearer ${DASHBOARD_TOKEN}` } }),
  { ...env, DASHBOARD_TOKEN: '' }
);
check('deals unconfigured token -> 503', res.status === 503, `status=${res.status}`);

res = await handleDeals(new Request(`${base}/api/deals`, { method: 'POST' }), env);
check('POST deals -> 405', res.status === 405);

// --- Dashboard writes ---
res = await worker.fetch(
  new Request(`${base}/api/deals/Uabc`, { method: 'PUT', body: '{}' }),
  env
);
check('PUT deal without token -> 401', res.status === 401, `status=${res.status}`);

res = await worker.fetch(
  new Request(`${base}/api/deals/Uabc`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${DASHBOARD_TOKEN}` },
    body: JSON.stringify({ status: 'BOGUS' }),
  }),
  env
);
check('PUT invalid status -> 400', res.status === 400, `status=${res.status}`);

res = await worker.fetch(
  new Request(`${base}/api/deals/Uabc`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${DASHBOARD_TOKEN}` },
  }),
  env
);
check('GET deal subpath -> 405', res.status === 405, `status=${res.status}`);

// --- Batch dashboard writes ---
res = await worker.fetch(new Request(`${base}/api/deals`, { method: 'PUT', body: '{}' }), env);
check('batch PUT without token -> 401', res.status === 401, `status=${res.status}`);

res = await worker.fetch(
  new Request(`${base}/api/deals`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${DASHBOARD_TOKEN}` },
    body: JSON.stringify({ edits: [] }),
  }),
  env
);
check('batch PUT empty edits -> 400', res.status === 400, `status=${res.status}`);

res = await worker.fetch(
  new Request(`${base}/api/deals`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${DASHBOARD_TOKEN}` },
    body: JSON.stringify({ edits: Array.from({ length: 101 }, (_, i) => ({ lineUserId: `U${i}` })) }),
  }),
  env
);
check('batch PUT too many edits -> 400', res.status === 400, `status=${res.status}`);

res = await worker.fetch(
  new Request(`${base}/api/deals`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${DASHBOARD_TOKEN}` },
    body: JSON.stringify({ edits: [{ lineUserId: 'Uabc', status: 'NOPE' }] }),
  }),
  env
);
check('batch PUT invalid status -> 400', res.status === 400, `status=${res.status}`);

// --- Resetting overrides ---
res = await worker.fetch(new Request(`${base}/api/deals`, { method: 'DELETE', body: '{}' }), env);
check('reset without token -> 401', res.status === 401, `status=${res.status}`);

res = await worker.fetch(
  new Request(`${base}/api/deals`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${DASHBOARD_TOKEN}` },
    body: JSON.stringify({ lineUserIds: [] }),
  }),
  env
);
check('reset with empty ids -> 400', res.status === 400, `status=${res.status}`);

res = await worker.fetch(
  new Request(`${base}/api/deals/Uabc`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${DASHBOARD_TOKEN}` },
  }),
  env
);
check('POST deal subpath -> 405', res.status === 405, `status=${res.status}`);

// --- Health ---
res = await worker.fetch(new Request(`${base}/api/health`), env);
const health = await res.json();
check('health -> 200', res.status === 200, `status=${res.status}`);
check(
  'health reports both secrets as set',
  health.dashboardToken === 'set' && health.lineChannelSecret === 'set',
  JSON.stringify(health)
);
check(
  'health leaks no secret value',
  !JSON.stringify(health).includes(DASHBOARD_TOKEN) &&
    !JSON.stringify(health).includes(CHANNEL_SECRET),
  JSON.stringify(health)
);
res = await worker.fetch(new Request(`${base}/api/health`, { method: 'POST' }), env);
check('health POST -> 405', res.status === 405, `status=${res.status}`);

// --- Static ---
res = await worker.fetch(new Request(`${base}/`), env);
check('GET / -> 200 html', res.status === 200 && (await res.text()).includes('app'));

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.pass ? '' : '  ' + r.extra}`);
console.log(failed.length === 0 ? 'ALL PASS' : `${failed.length} FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
