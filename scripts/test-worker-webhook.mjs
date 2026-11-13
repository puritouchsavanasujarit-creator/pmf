// Local smoke test for the worker route logic (run with bun).
import worker, { handleLineWebhook } from '../freebuff.worker.js';

const assetsFetch = async (req) => {
  const url = new URL(req.url);
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return new Response('<html>app</html>', { headers: { 'content-type': 'text/html' } });
  }
  return new Response('not found', { status: 404 });
};

const env = { ASSETS: { fetch: assetsFetch } };
const base = 'https://example.com';

const results = [];
const check = (name, cond, extra = '') => results.push({ name, pass: !!cond, extra });

// 1. GET webhook
let res = await worker.fetch(new Request(`${base}/api/line/webhook`), env);
let body = await res.json();
check('GET /api/line/webhook -> 200', res.status === 200, JSON.stringify(body));
check('GET reports active', body.status === 'active');

// 2. Static asset still served
res = await worker.fetch(new Request(`${base}/`), env);
check('GET / -> 200 html', res.status === 200 && (await res.text()).includes('app'));

// 3. POST with tags, no secret configured
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
res = await worker.fetch(
  new Request(`${base}/api/line/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }),
  env
);
body = await res.json();
check('POST -> 200', res.status === 200, JSON.stringify(body));
check('eventsReceived = 3', body.eventsReceived === 3);
check('detected 2 tagged events', body.detected?.length === 2, JSON.stringify(body.detected));
check('WON detected', body.detected?.[0]?.status === 'WON');
check('amount parsed', body.detected?.[0]?.amount === 12900);
check('LOST detected', body.detected?.[1]?.status === 'LOST');

// 4. Malformed body still 200
res = await worker.fetch(
  new Request(`${base}/api/line/webhook`, { method: 'POST', body: 'not-json' }),
  env
);
check('malformed body -> 200', res.status === 200);

// 5. Signature verification with secret
const secret = 'test-channel-secret';
const signedEnv = { ...env, LINE_CHANNEL_SECRET: secret };
const raw = JSON.stringify(payload);
const key = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(secret),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign']
);
const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
const sig = Buffer.from(mac).toString('base64');

res = await handleLineWebhook(
  new Request(`${base}/api/line/webhook`, {
    method: 'POST',
    headers: { 'X-Line-Signature': sig },
    body: raw,
  }),
  signedEnv
);
check('valid signature -> 200', res.status === 200, `status=${res.status}`);

res = await handleLineWebhook(
  new Request(`${base}/api/line/webhook`, {
    method: 'POST',
    headers: { 'X-Line-Signature': 'bogus' },
    body: raw,
  }),
  signedEnv
);
check('invalid signature -> 401', res.status === 401, `status=${res.status}`);

res = await handleLineWebhook(
  new Request(`${base}/api/line/webhook`, { method: 'POST', body: raw }),
  signedEnv
);
check('missing signature -> 401', res.status === 401, `status=${res.status}`);

// 6. OPTIONS + wrong method
res = await handleLineWebhook(new Request(`${base}/api/line/webhook`, { method: 'OPTIONS' }), env);
check('OPTIONS -> 204', res.status === 204);
res = await handleLineWebhook(new Request(`${base}/api/line/webhook`, { method: 'PUT' }), env);
check('PUT -> 405', res.status === 405);

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.pass ? '' : '  ' + r.extra}`);
console.log(failed.length === 0 ? 'ALL PASS' : `${failed.length} FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
