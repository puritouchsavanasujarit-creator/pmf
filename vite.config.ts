import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'node:crypto';
import path from 'node:path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import {
  extractTagsFromText,
  extractAmountFromText,
  determineStatusFromTags,
} from './shared/tagRules.js';

function devWorkerApiPlugin(envVars: Record<string, string>): Plugin {
  const devDeals = new Map<string, any>();

  const readJson = async (req: any): Promise<any> => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString('utf-8');
    return { raw, parsed: raw ? JSON.parse(raw) : {} };
  };

  const sendJson = (res: any, data: unknown, status = 200) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(data));
  };

  const getSecret = (key: string) => envVars[key] || process.env[key] || '';

  const safeEqual = (a: string, b: string) => {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  };

  const checkDashboardAuth = (req: any, res: any): boolean => {
    const expected = getSecret('DASHBOARD_TOKEN');
    if (!expected) {
      sendJson(
        res,
        { success: false, error: 'ยังไม่ได้ตั้งค่า DASHBOARD_TOKEN สำหรับเข้าถึงแดชบอร์ด' },
        503
      );
      return false;
    }
    const authHeader = String(req.headers.authorization || '');
    const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!safeEqual(provided, expected)) {
      sendJson(res, { success: false, error: 'ต้องเข้าสู่ระบบผู้ดูแลก่อนอ่านข้อมูล' }, 401);
      return false;
    }
    return true;
  };

  return {
    name: 'dev-worker-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlPath = (req.url || '').split('?')[0];
        if (!urlPath.startsWith('/api/')) return next();

        if (urlPath === '/api/health' || urlPath === '/api/health/') {
          if (req.method !== 'GET') {
            return sendJson(res, { success: false, error: 'Method not allowed' }, 405);
          }
          const hasDashboardToken = Boolean(getSecret('DASHBOARD_TOKEN'));
          const hasChannelSecret = Boolean(getSecret('LINE_CHANNEL_SECRET'));
          return sendJson(res, {
            success: hasDashboardToken && hasChannelSecret,
            dashboardToken: hasDashboardToken ? 'set' : 'missing',
            lineChannelSecret: hasChannelSecret ? 'set' : 'missing',
          });
        }

        if (urlPath === '/api/line/webhook' || urlPath === '/api/line/webhook/') {
          if (req.method === 'GET') {
            return sendJson(res, { status: 'active', message: 'LINE OA Webhook Endpoint is ready' });
          }
          if (req.method !== 'POST') {
            return sendJson(res, { success: false, error: 'Method not allowed' }, 405);
          }
          const channelSecret = getSecret('LINE_CHANNEL_SECRET');
          if (!channelSecret) {
            return sendJson(
              res,
              { success: false, error: 'Webhook ยังไม่พร้อมใช้งาน: ยังไม่ได้ตั้งค่า LINE_CHANNEL_SECRET' },
              503
            );
          }
          try {
            const { raw, parsed } = await readJson(req);
            const sig = String(req.headers['x-line-signature'] || '');
            const expectedSig = crypto
              .createHmac('sha256', channelSecret)
              .update(raw)
              .digest('base64');
            if (!sig || !safeEqual(sig, expectedSig)) {
              return sendJson(res, { success: false, error: 'Invalid LINE signature' }, 401);
            }
            const events = Array.isArray(parsed.events) ? parsed.events : [];
            const detected = events
              .map((event: any) => {
                const text = event?.message?.type === 'text' ? event.message.text || '' : '';
                const tags = extractTagsFromText(text);
                if (tags.length === 0) return null;
                const lineUserId = event.source?.userId || `U${Date.now()}`;
                const status = determineStatusFromTags(tags);
                const amount = extractAmountFromText(text) || 0;
                const nowIso = new Date().toISOString();
                devDeals.set(lineUserId, {
                  id: `deal-${lineUserId}`,
                  lineUserId,
                  displayName: `ลูกค้า LINE ${lineUserId.slice(-6)}`,
                  pictureUrl: '',
                  status,
                  tags,
                  amount,
                  product: '',
                  adminName: 'ยังไม่มีแอดมินรับเรื่อง',
                  lastMessage: text,
                  lastMessageTime: 'เมื่อสักครู่',
                  updatedAt: nowIso,
                  syncedToSheet: false,
                  syncedAt: null,
                  notes: '',
                  revision: devDeals.get(lineUserId)?.revision ?? 0,
                });
                return { lineUserId, tags, status, amount, message: text };
              })
              .filter(Boolean);
            return sendJson(res, {
              success: true,
              eventsReceived: events.length,
              detected,
              saved: detected.length,
            });
          } catch {
            return sendJson(res, { success: true, eventsReceived: 0, detected: [], saved: 0 });
          }
        }

        if (urlPath === '/api/deals' || urlPath === '/api/deals/' || urlPath.startsWith('/api/deals/')) {
          if (!checkDashboardAuth(req, res)) return;

          if (req.method === 'GET' && (urlPath === '/api/deals' || urlPath === '/api/deals/')) {
            return sendJson(res, { success: true, deals: Array.from(devDeals.values()) });
          }

          if (req.method === 'PUT') {
            try {
              const { parsed } = await readJson(req);
              const singleId = urlPath.startsWith('/api/deals/')
                ? decodeURIComponent(urlPath.slice('/api/deals/'.length))
                : null;
              const edits = singleId ? [{ ...(parsed || {}), lineUserId: singleId }] : parsed?.edits;
              if (!Array.isArray(edits) || edits.length === 0) {
                return sendJson(res, { success: false, error: 'ต้องส่งรายการ edits อย่างน้อย 1 รายการ' }, 400);
              }
              const revisions: Array<{ lineUserId: string; revision: number }> = [];
              for (const edit of edits) {
                const existing = devDeals.get(edit.lineUserId) || {
                  id: `deal-${edit.lineUserId}`,
                  lineUserId: edit.lineUserId,
                  displayName: `ลูกค้า LINE ${String(edit.lineUserId).slice(-6)}`,
                  pictureUrl: '',
                  lastMessage: '',
                  lastMessageTime: 'เมื่อสักครู่',
                  syncedToSheet: false,
                  syncedAt: null,
                  revision: 0,
                };
                const nextRev = (existing.revision ?? 0) + 1;
                devDeals.set(edit.lineUserId, {
                  ...existing,
                  status: edit.status ?? existing.status,
                  tags: Array.isArray(edit.tags) ? edit.tags : existing.tags,
                  amount: typeof edit.amount === 'number' ? edit.amount : existing.amount,
                  notes: typeof edit.notes === 'string' ? edit.notes : existing.notes,
                  adminName: typeof edit.adminName === 'string' ? edit.adminName : existing.adminName,
                  product: typeof edit.product === 'string' ? edit.product : existing.product,
                  updatedAt: new Date().toISOString(),
                  revision: nextRev,
                });
                revisions.push({ lineUserId: edit.lineUserId, revision: nextRev });
              }
              return sendJson(res, { success: true, saved: edits.length, revisions });
            } catch {
              return sendJson(res, { success: false, error: 'ข้อมูลที่ส่งมาไม่ใช่ JSON ที่ถูกต้อง' }, 400);
            }
          }

          if (req.method === 'DELETE') {
            const singleId = urlPath.startsWith('/api/deals/')
              ? decodeURIComponent(urlPath.slice('/api/deals/'.length))
              : null;
            if (singleId) {
              devDeals.delete(singleId);
              return sendJson(res, { success: true, reset: 1 });
            }
            const { parsed } = await readJson(req).catch(() => ({ parsed: {} }));
            const ids = Array.isArray(parsed?.lineUserIds) ? parsed.lineUserIds : [];
            ids.forEach((id: string) => devDeals.delete(id));
            return sendJson(res, { success: true, reset: ids.length });
          }

          return sendJson(res, { success: false, error: 'Method not allowed' }, 405);
        }

        return sendJson(res, { success: false, error: 'Not found' }, 404);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), devWorkerApiPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
