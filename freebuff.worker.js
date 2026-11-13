/**
 * Cloudflare Worker entrypoint for Freebuff Sites.
 *
 * - Serves the built Vite SPA from the ASSETS binding.
 * - Handles the LINE OA webhook at /api/line/webhook (production API route),
 *   verifying X-Line-Signature when LINE_CHANNEL_SECRET is configured, detecting
 *   deal tags with the shared rules module and replying 200 to LINE.
 */

import {
  extractTagsFromText,
  extractAmountFromText,
  determineStatusFromTags,
} from './shared/tagRules.js';

const WEBHOOK_PATH = '/api/line/webhook';

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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Line-Signature',
    },
  });
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
    detected.push({
      eventType: event.type,
      replyToken: event.replyToken ?? null,
      lineUserId: event.source?.userId ?? null,
      message: text,
      tags,
      status: determineStatusFromTags(tags),
      amount: extractAmountFromText(text),
      timestamp: event.timestamp ?? null,
    });
  }
  return detected;
}

export async function handleLineWebhook(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Line-Signature',
      },
    });
  }

  if (request.method === 'GET') {
    return json({
      status: 'active',
      message: 'LINE OA Webhook Endpoint is ready',
      signatureVerification: env?.LINE_CHANNEL_SECRET ? 'enabled' : 'disabled',
    });
  }

  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  const body = await request.text();

  const channelSecret = env?.LINE_CHANNEL_SECRET;
  if (channelSecret) {
    const signature = request.headers.get('X-Line-Signature') || '';
    const valid = signature ? await verifyLineSignature(body, signature, channelSecret) : false;
    if (!valid) {
      return json({ success: false, error: 'Invalid LINE signature' }, 401);
    }
  }

  let payload;
  try {
    payload = JSON.parse(body || '{}');
  } catch {
    // LINE retries on non-2xx, so acknowledge malformed bodies.
    return json({ success: true, eventsReceived: 0, detected: [] });
  }

  const events = Array.isArray(payload.events) ? payload.events : [];
  const detected = detectEvents(events);

  if (detected.length > 0) {
    console.log('LINE OA webhook tag events:', JSON.stringify(detected));
  }

  return json({ success: true, eventsReceived: events.length, detected });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === WEBHOOK_PATH || url.pathname === `${WEBHOOK_PATH}/`) {
      return handleLineWebhook(request, env);
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status === 404 && request.method === 'GET') {
      return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
    }
    return response;
  },
};
