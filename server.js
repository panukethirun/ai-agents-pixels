/* ===== PixelCrypto dev server + Binance Futures TESTNET bridge =====
 *
 * Zero dependencies — Node built-ins only.
 *   1. เสิร์ฟไฟล์ static
 *   2. /api/testnet/*  → คุยกับ Binance Futures TESTNET (เงินปลอม) โดยเซ็น HMAC ฝั่ง server
 *
 * 🔑 คีย์อ่านจาก binance.config.json (ถูก .gitignore) หรือ env BINANCE_TESTNET_KEY / _SECRET
 *    คีย์/secret อยู่ฝั่ง server เท่านั้น — ไม่เคยส่งไปเบราว์เซอร์
 * ⚠️ ใช้คีย์จาก https://testnet.binancefuture.com เท่านั้น — อย่าใช้คีย์บัญชีจริง
 *
 * รัน:  node server.js   (พอร์ต 3000)
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const TESTNET = 'https://testnet.binancefuture.com';

// ---- โหลดคีย์ (server-side เท่านั้น) ----
function loadKeys() {
  let apiKey = '', apiSecret = '';
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'binance.config.json'), 'utf8'));
    apiKey = j.apiKey || ''; apiSecret = j.apiSecret || '';
  } catch (e) { /* ไม่มีไฟล์ก็ไม่เป็นไร */ }
  apiKey = process.env.BINANCE_TESTNET_KEY || apiKey;
  apiSecret = process.env.BINANCE_TESTNET_SECRET || apiSecret;
  return { apiKey, apiSecret };
}
const isPlaceholder = (s) => !s || /PUT_YOUR/.test(s);
const isConfigured = (k) => !isPlaceholder(k.apiKey) && !isPlaceholder(k.apiSecret);

// ---- ดิบ HTTP GET คืน JSON ----
function httpsGetJSON(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'GET', headers: headers || {} }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => { let d; try { d = JSON.parse(body); } catch (e) { d = body; } resolve({ status: res.statusCode, data: d }); });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => req.destroy(new Error('timeout')));
    req.end();
  });
}

// ---- sync เวลากับ Binance (กัน error -1021 นาฬิกาเครื่องคลาด) ----
let timeOffset = 0, lastSync = 0;
async function ensureTimeSync() {
  if (Date.now() - lastSync < 60000) return;
  try {
    const t = await httpsGetJSON(TESTNET + '/fapi/v1/time');
    if (t.data && t.data.serverTime) { timeOffset = t.data.serverTime - Date.now(); lastSync = Date.now(); }
  } catch (e) { /* ใช้ offset เดิม */ }
}

// ---- เรียก Futures testnet (signed = เซ็น HMAC ด้วย secret) ----
async function fapi(method, pathname, params, signed) {
  const keys = loadKeys();
  let qs = Object.entries(params || {}).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const headers = {};
  if (signed) {
    await ensureTimeSync();
    const ts = Date.now() + timeOffset;
    qs += (qs ? '&' : '') + 'timestamp=' + ts + '&recvWindow=10000';
    const sig = crypto.createHmac('sha256', keys.apiSecret).update(qs).digest('hex');
    qs += '&signature=' + sig;
    headers['X-MBX-APIKEY'] = keys.apiKey;
  }
  return new Promise((resolve, reject) => {
    const url = TESTNET + pathname + (qs ? '?' + qs : '');
    const req = https.request(url, { method, headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => { let d; try { d = JSON.parse(body); } catch (e) { d = body; } resolve({ status: res.statusCode, data: d }); });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => req.destroy(new Error('timeout')));
    req.end();
  });
}

function sendJSON(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

// ---- API routes (testnet only) ----
async function handleApi(req, res) {
  const u = new URL(req.url, 'http://localhost');
  const pathname = u.pathname;
  const method = req.method;
  const q = u.searchParams;

  // สถานะการเชื่อมต่อ + คีย์ถูกตั้งหรือยัง (ไม่เปิดเผยคีย์)
  if (pathname === '/api/testnet/status') {
    try {
      const t = await fapi('GET', '/fapi/v1/time');
      return sendJSON(res, 200, { testnet: true, reachable: t.status === 200, serverTime: t.data && t.data.serverTime, configured: isConfigured(loadKeys()) });
    } catch (e) {
      return sendJSON(res, 200, { testnet: true, reachable: false, configured: isConfigured(loadKeys()), error: String(e.message || e) });
    }
  }

  // ยอดคงเหลือในบัญชี futures testnet (ต้องมีคีย์) — read-only ไม่มีการส่งคำสั่งเทรด
  if (pathname === '/api/testnet/account') {
    if (!isConfigured(loadKeys())) {
      return sendJSON(res, 400, { error: 'ยังไม่ได้ตั้งคีย์', help: 'คัดลอก binance.config.example.json → binance.config.json แล้วใส่คีย์ testnet จากนั้นรีสตาร์ท server' });
    }
    try {
      const r = await fapi('GET', '/fapi/v2/account', {}, true);
      if (r.status !== 200) return sendJSON(res, r.status, { error: 'binance error', detail: r.data });
      const a = r.data || {};
      const balances = (Array.isArray(a.assets) ? a.assets : [])
        .filter((b) => parseFloat(b.walletBalance) !== 0 || b.asset === 'USDT')
        .map((b) => ({ asset: b.asset, balance: b.walletBalance, availableBalance: b.availableBalance, unrealizedProfit: b.unrealizedProfit }));
      const positions = (Array.isArray(a.positions) ? a.positions : [])
        .filter((p) => parseFloat(p.positionAmt) !== 0)
        .map((p) => ({ symbol: p.symbol, positionAmt: p.positionAmt, entryPrice: p.entryPrice, unrealizedProfit: p.unrealizedProfit }));
      return sendJSON(res, 200, {
        testnet: true,
        totalWalletBalance: a.totalWalletBalance,
        totalMarginBalance: a.totalMarginBalance,
        totalUnrealizedProfit: a.totalUnrealizedProfit,
        availableBalance: a.availableBalance,
        positions,
        balances,
      });
    } catch (e) {
      return sendJSON(res, 502, { error: String(e.message || e) });
    }
  }

  // ส่งคำสั่ง MARKET ไป TESTNET เท่านั้น (เงินปลอม) — มี safety rails
  if (pathname === '/api/testnet/order' && method === 'POST') {
    if (!isConfigured(loadKeys())) return sendJSON(res, 400, { error: 'ยังไม่ได้ตั้งคีย์ testnet' });
    const symbol = String(q.get('symbol') || '').toUpperCase();
    const side = String(q.get('side') || '').toUpperCase();
    const quantity = parseFloat(q.get('quantity'));
    const reduceOnly = q.get('reduceOnly') === 'true';
    // 🔒 safety rails: BTCUSDT เท่านั้น + ขนาดออเดอร์จำกัด กัน fat-finger (เป็น testnet อยู่แล้ว)
    if (symbol !== 'BTCUSDT') return sendJSON(res, 400, { error: 'อนุญาตเฉพาะ BTCUSDT (กันพลาด)' });
    if (!['BUY', 'SELL'].includes(side)) return sendJSON(res, 400, { error: 'side ต้องเป็น BUY หรือ SELL' });
    if (!(quantity > 0) || quantity > 0.05) return sendJSON(res, 400, { error: 'quantity ต้อง > 0 และ <= 0.05' });
    try {
      const params = { symbol, side, type: 'MARKET', quantity, newOrderRespType: 'RESULT' };
      if (reduceOnly) params.reduceOnly = 'true';
      const r = await fapi('POST', '/fapi/v1/order', params, true);
      if (r.status !== 200) return sendJSON(res, r.status, { error: 'binance error', detail: r.data });
      const o = r.data || {};
      return sendJSON(res, 200, { testnet: true, orderId: o.orderId, symbol: o.symbol, side: o.side, type: o.type, status: o.status, executedQty: o.executedQty, avgPrice: o.avgPrice, origQty: o.origQty });
    } catch (e) {
      return sendJSON(res, 502, { error: String(e.message || e) });
    }
  }

  return sendJSON(res, 404, { error: 'unknown endpoint' });
}

// ---- static files ----
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jsx': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  // กันเสิร์ฟไฟล์ความลับ
  if (/binance\.config\.json$/.test(filePath)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const pathname = req.url.split('?')[0];
  if (pathname.startsWith('/api/')) { handleApi(req, res).catch((e) => sendJSON(res, 500, { error: String(e) })); return; }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  const k = loadKeys();
  console.log(`PixelCrypto server on http://localhost:${PORT}`);
  console.log(`Binance testnet keys: ${isConfigured(k) ? 'configured ✓' : 'NOT set (ใส่ใน binance.config.json)'}`);
});
