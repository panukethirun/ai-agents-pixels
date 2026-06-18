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
  let apiKey = '', apiSecret = '', deepseekApiKey = '', lineChannelAccessToken = '', lineToId = '';
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'binance.config.json'), 'utf8'));
    apiKey = j.apiKey || '';
    apiSecret = j.apiSecret || '';
    deepseekApiKey = j.DEEPSEEK_API_KEY || j.deepseekApiKey || '';
    lineChannelAccessToken = j.LINE_CHANNEL_ACCESS_TOKEN || j.lineChannelAccessToken || '';
    lineToId = j.LINE_TO_ID || j.lineToId || '';
  } catch (e) { /* ไม่มีไฟล์ก็ไม่เป็นไร */ }
  apiKey = process.env.BINANCE_TESTNET_KEY || apiKey;
  apiSecret = process.env.BINANCE_TESTNET_SECRET || apiSecret;
  deepseekApiKey = process.env.DEEPSEEK_API_KEY || deepseekApiKey;
  lineChannelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || lineChannelAccessToken;
  lineToId = process.env.LINE_TO_ID || lineToId;
  return { apiKey, apiSecret, deepseekApiKey, lineChannelAccessToken, lineToId };
}
const isPlaceholder = (s) => !s || /PUT_YOUR/.test(s);
const isConfigured = (k) => !isPlaceholder(k.apiKey) && !isPlaceholder(k.apiSecret);
const isDeepseekConfigured = (k) => !isPlaceholder(k.deepseekApiKey);
const isLineConfigured = (k) => !isPlaceholder(k.lineChannelAccessToken) && !isPlaceholder(k.lineToId);

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

async function fetchJSONFirst(urls, headers) {
  const attempts = [];
  for (const url of urls) {
    try {
      const r = await httpsGetJSON(url, headers);
      attempts.push({
        url,
        status: r.status,
        type: Array.isArray(r.data) ? 'array' : typeof r.data,
        size: Array.isArray(r.data) ? r.data.length : undefined,
        code: r.data && r.data.code,
        msg: r.data && r.data.msg,
      });
      if (r.status === 200) return { ...r, url, attempts };
    } catch (e) {
      attempts.push({ url, error: String(e.message || e) });
    }
  }
  return { status: 0, data: null, url: urls[urls.length - 1], attempts };
}

async function fetchOptionalJSON(urls, fallback) {
  const r = await fetchJSONFirst(urls);
  return r.status === 200 ? r : { ...r, data: fallback };
}

function httpsPostJSON(url, headers, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload || {});
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...(headers || {}) },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => { let d; try { d = JSON.parse(raw); } catch (e) { d = raw; } resolve({ status: res.statusCode, data: d }); });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
    req.write(body);
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

function readJSONBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') {
    return Promise.resolve(req.body.trim() ? JSON.parse(req.body) : {});
  }
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 4096) req.destroy(new Error('body too large'));
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(new Error('invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function roundStep(value, step) {
  return Math.floor(value / step) * step;
}

function roundPrice(value) {
  return Number(value).toFixed(2);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function sma(values, n) {
  const xs = values.slice(-n);
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function ema(values, n) {
  if (!values || values.length < n) return 0;
  const k = 2 / (n + 1);
  let out = sma(values.slice(0, n), n);
  for (let i = n; i < values.length; i++) out = values[i] * k + out * (1 - k);
  return out;
}

function rsi(values, period) {
  if (!values || values.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const ch = values[i] - values[i - 1];
    if (ch >= 0) gains += ch; else losses -= ch;
  }
  const avgG = gains / period, avgL = losses / period;
  return avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
}

function zscore(values) {
  const xs = (values || []).map(Number).filter(Number.isFinite);
  if (xs.length < 5) return 0;
  const last = xs[xs.length - 1];
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / xs.length;
  const sd = Math.sqrt(variance);
  return sd ? (last - mean) / sd : 0;
}

function atr(klines, period) {
  if (!klines || klines.length < period + 1) return 0;
  const trs = [];
  for (let i = 1; i < klines.length; i++) {
    const prevClose = klines[i - 1].close;
    trs.push(Math.max(klines[i].high - klines[i].low, Math.abs(klines[i].high - prevClose), Math.abs(klines[i].low - prevClose)));
  }
  return sma(trs, period);
}

function pct(now, prev) {
  return prev ? (now - prev) / prev * 100 : 0;
}

function macdHistogram(closes) {
  const fast = ema(closes, 12), slow = ema(closes, 26);
  const macdSeries = [];
  for (let i = 26; i <= closes.length; i++) macdSeries.push(ema(closes.slice(0, i), 12) - ema(closes.slice(0, i), 26));
  return fast - slow - ema(macdSeries, 9);
}

function mapSignal(score) {
  if (score >= 70) return 'STRONG_LONG';
  if (score >= 40) return 'WEAK_LONG';
  if (score <= -70) return 'STRONG_SHORT';
  if (score <= -40) return 'WEAK_SHORT';
  return 'NO_TRADE';
}

function scoreDeepseekFeatures(f) {
  let trendScore = 0;
  if (f.price > f.ema50 && f.ema50 > f.ema200) trendScore = 30;
  else if (f.price < f.ema50 && f.ema50 < f.ema200) trendScore = -30;
  else if (f.price > f.ema200) trendScore = 10;
  else if (f.price < f.ema200) trendScore = -10;

  let momentumScore = 0;
  if (f.rsi14 >= 55 && f.rsi14 <= 70) momentumScore += 10;
  else if (f.rsi14 >= 30 && f.rsi14 <= 45) momentumScore -= 10;
  if (f.macd_histogram > 0) momentumScore += 7;
  else if (f.macd_histogram < 0) momentumScore -= 7;
  momentumScore += f.last_24h_return_pct > 0 ? 4 : -4;
  momentumScore += f.last_72h_return_pct > 0 ? 4 : -4;

  let derivativesScore = 0;
  if (f.price_change_1h_pct > 0 && f.open_interest_change_1h_pct > 0) derivativesScore += 20;
  if (f.price_change_1h_pct < 0 && f.open_interest_change_1h_pct > 0) derivativesScore -= 20;
  if (f.price_change_1h_pct > 0 && f.open_interest_change_1h_pct < 0) derivativesScore += 5;
  if (f.price_change_1h_pct < 0 && f.open_interest_change_1h_pct < 0) derivativesScore -= 5;

  let fundingPenalty = 0;
  if (f.funding_zscore_90 > 2) fundingPenalty -= 15;
  if (f.funding_zscore_90 < -2) fundingPenalty += 15;

  let riskScore = 0;
  if (f.atr_pct > 3) riskScore -= 15;
  else if (f.atr_pct > 2) riskScore -= 8;
  else if (f.atr_pct < 0.4) riskScore -= 5;
  else riskScore += 5;

  const raw = trendScore + momentumScore + derivativesScore + fundingPenalty + riskScore;
  const preliminaryScore = clamp(raw, -100, 100);
  return {
    trend_score: trendScore,
    momentum_score: momentumScore,
    derivatives_score: derivativesScore,
    funding_penalty: fundingPenalty,
    risk_score: riskScore,
    preliminary_score: preliminaryScore,
    preliminary_signal: mapSignal(preliminaryScore),
  };
}

function deepseekTimeframeConfig(value) {
  const configs = {
    '1h': { value: '1h', binance: '1h', oiPeriod: '1h', lookback24: 24, lookback72: 72 },
    '4h': { value: '4h', binance: '4h', oiPeriod: '4h', lookback24: 6, lookback72: 18 },
    '1d': { value: '1d', binance: '1d', oiPeriod: '1d', lookback24: 1, lookback72: 3 },
    '1week': { value: '1week', binance: '1w', oiPeriod: '1d', lookback24: 1, lookback72: 3 },
  };
  return configs[value] || configs['1h'];
}

async function buildDeepseekFeatures(timeframe) {
  const tf = deepseekTimeframeConfig(timeframe);
  const symbol = 'BTCUSDT';
  const primary = 'https://fapi.binance.com';
  const fapi1 = 'https://fapi1.binance.com';
  const testnet = TESTNET;
  const [kRes, oiRes, fRes, premiumRes] = await Promise.all([
    fetchJSONFirst([
      `${primary}/fapi/v1/klines?symbol=${symbol}&interval=${tf.binance}&limit=260`,
      `${fapi1}/fapi/v1/klines?symbol=${symbol}&interval=${tf.binance}&limit=260`,
      `${testnet}/fapi/v1/klines?symbol=${symbol}&interval=${tf.binance}&limit=260`,
    ]),
    fetchOptionalJSON([
      `${primary}/futures/data/openInterestHist?symbol=${symbol}&period=${tf.oiPeriod}&limit=90`,
      `${testnet}/futures/data/openInterestHist?symbol=${symbol}&period=${tf.oiPeriod}&limit=90`,
    ], []),
    fetchOptionalJSON([
      `${primary}/fapi/v1/fundingRate?symbol=${symbol}&limit=100`,
      `${testnet}/fapi/v1/fundingRate?symbol=${symbol}&limit=100`,
    ], []),
    fetchOptionalJSON([
      `${primary}/fapi/v1/premiumIndex?symbol=${symbol}`,
      `${fapi1}/fapi/v1/premiumIndex?symbol=${symbol}`,
      `${testnet}/fapi/v1/premiumIndex?symbol=${symbol}`,
    ], {}),
  ]);
  if (kRes.status !== 200 || !Array.isArray(kRes.data)) {
    const err = new Error('binance klines unavailable');
    err.debug = { timeframe: tf.value, attempts: kRes.attempts };
    throw err;
  }
  const klines = kRes.data.map((k) => ({
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  })).filter((k) => Number.isFinite(k.close));
  if (klines.length < 201) throw new Error('not enough klines for DeepSeek features');
  const closes = klines.map((k) => k.close);
  const volumes = klines.map((k) => k.volume);
  const price = closes[closes.length - 1];
  const atr14 = atr(klines, 14);
  const oiRows = Array.isArray(oiRes.data) ? oiRes.data : [];
  const oiValues = oiRows.map((x) => parseFloat(x.sumOpenInterestValue || x.sumOpenInterest)).filter(Number.isFinite);
  const fundingRows = Array.isArray(fRes.data) ? fRes.data : [];
  const fundingValues = fundingRows.map((x) => parseFloat(x.fundingRate)).filter(Number.isFinite);
  const lastOi = oiValues[oiValues.length - 1] || 0;
  const prevOi = oiValues[oiValues.length - 2] || lastOi;
  const dcWindow = klines.slice(-56, -1);
  const donchianHigh = Math.max(...dcWindow.map((k) => k.high));
  const donchianLow = Math.min(...dcWindow.map((k) => k.low));
  const premium = premiumRes.data || {};
  const mark = parseFloat(premium.markPrice) || price;
  const index = parseFloat(premium.indexPrice) || price;
  const fundingRatePct = (parseFloat(premium.lastFundingRate) || fundingValues[fundingValues.length - 1] || 0) * 100;
  const features = {
    symbol: 'BTCUSDT_PERP',
    timeframe: tf.value,
    price: Number(price.toFixed(2)),
    price_change_1h_pct: Number(pct(price, closes[closes.length - 2]).toFixed(4)),
    ema50: Number(ema(closes, 50).toFixed(2)),
    ema200: Number(ema(closes, 200).toFixed(2)),
    rsi14: Number(rsi(closes, 14).toFixed(2)),
    macd_histogram: Number(macdHistogram(closes).toFixed(4)),
    atr14: Number(atr14.toFixed(2)),
    atr_pct: Number((atr14 / price * 100).toFixed(4)),
    volume_zscore_48: Number(zscore(volumes.slice(-48)).toFixed(4)),
    open_interest_change_1h_pct: Number(pct(lastOi, prevOi).toFixed(4)),
    open_interest_zscore_48: Number(zscore(oiValues.slice(-48)).toFixed(4)),
    funding_rate_pct: Number(fundingRatePct.toFixed(5)),
    funding_zscore_90: Number(zscore(fundingValues.slice(-90)).toFixed(4)),
    basis_pct: Number(((mark - index) / index * 100).toFixed(4)),
    donchian_55_breakout: price > donchianHigh ? 'up' : price < donchianLow ? 'down' : 'none',
    last_24h_return_pct: Number(pct(price, closes[Math.max(0, closes.length - 1 - tf.lookback24)]).toFixed(4)),
    last_72h_return_pct: Number(pct(price, closes[Math.max(0, closes.length - 1 - tf.lookback72)]).toFixed(4)),
    estimated_fee_roundtrip_pct: 0.08,
    estimated_slippage_pct: 0.03,
    data_source: kRes.url && kRes.url.includes('testnet') ? 'binance_futures_testnet' : 'binance_futures_mainnet',
    data_warnings: [
      oiRes.status === 200 ? null : 'open interest unavailable',
      fRes.status === 200 ? null : 'funding history unavailable',
      premiumRes.status === 200 ? null : 'premium index unavailable',
    ].filter(Boolean),
  };
  return { ...features, ...scoreDeepseekFeatures(features) };
}

async function scoreWithDeepseek(keys, timeframe) {
  let features = null;
  try {
    features = await buildDeepseekFeatures(timeframe);
  } catch (e) {
    return {
      configured: isDeepseekConfigured(keys),
      localOnly: !isDeepseekConfigured(keys),
      timeframe,
      error: 'feature build failed',
      debug: {
        stage: 'buildDeepseekFeatures',
        message: String(e.message || e),
        detail: e.debug || null,
      },
    };
  }
  if (!isDeepseekConfigured(keys)) {
    return {
      configured: false,
      localOnly: true,
      message: 'รอ DEEPSEEK_API_KEY ใน binance.config.json',
      features,
      preliminary: {
        signal: features.preliminary_signal,
        signal_score: features.preliminary_score,
        confidence: Math.min(95, Math.max(35, Math.abs(features.preliminary_score))),
      },
    };
  }
  const payload = {
    model: 'deepseek-chat',
    response_format: { type: 'json_object' },
    temperature: 0.1,
    messages: [
      { role: 'system', content: DEEPSEEK_SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(features) },
    ],
  };
  const r = await httpsPostJSON('https://api.deepseek.com/chat/completions', {
    Authorization: `Bearer ${keys.deepseekApiKey}`,
  }, payload);
  if (r.status !== 200) return {
    configured: true,
    error: 'deepseek error',
    detail: r.data,
    features,
    debug: {
      stage: 'deepseekRequest',
      status: r.status,
      endpoint: 'https://api.deepseek.com/chat/completions',
      detail: r.data,
    },
  };
  const content = r.data && r.data.choices && r.data.choices[0] && r.data.choices[0].message && r.data.choices[0].message.content;
  const review = parseDeepseekJSON(content);
  if (!review) return {
    configured: true,
    error: 'DeepSeek did not return valid JSON',
    raw: content,
    features,
    debug: {
      stage: 'parseDeepseekJSON',
      raw: content,
    },
  };
  return {
    configured: true,
    localOnly: false,
    features,
    review: normalizeDeepseekReview(features, review),
    debug: {
      stage: 'ok',
      status: r.status,
      model: r.data && r.data.model,
      usage: r.data && r.data.usage,
    },
  };
}

const DEEPSEEK_SYSTEM_PROMPT = `You are a quantitative crypto futures signal scoring engine.
Task:
Evaluate BTCUSDT perpetual futures directional signal using ONLY the provided numeric features.
Do not use news, assumptions, opinions, or external knowledge.
Do not predict exact price.
Return strict JSON only.
The system already calculated a preliminary score. You may adjust the final score by maximum +/- 15 points only.
Do not reverse the signal unless risk is extreme or the data clearly contradicts the preliminary score.
Scoring range: -100 = strongest short, 0 = no trade, +100 = strongest long.
Signal mapping: +70 to +100 STRONG_LONG, +40 to +69 WEAK_LONG, -39 to +39 NO_TRADE, -40 to -69 WEAK_SHORT, -70 to -100 STRONG_SHORT.
Use trend, momentum, derivatives confirmation, funding crowded penalty, volatility/risk, and cost filter.
Return strict JSON only with keys: signal, signal_score, confidence, trend_score, momentum_score, derivatives_score, risk_score, funding_penalty, recommended_action, max_leverage, entry_condition, stop_loss_logic, take_profit_logic, invalidation, reason_short.`;

function parseDeepseekJSON(content) {
  if (!content) return null;
  try { return JSON.parse(content); } catch (e) {}
  const match = String(content).match(/\{[\s\S]*\}/);
  if (!match) return null;
  return JSON.parse(match[0]);
}

function normalizeDeepseekReview(features, review) {
  const out = { ...(review || {}) };
  const prelim = Number(features && features.preliminary_score) || 0;
  const rawScore = Number(out.signal_score);
  out.signal_score = clamp(Number.isFinite(rawScore) ? rawScore : prelim, prelim - 15, prelim + 15);
  out.signal_score = clamp(Math.round(out.signal_score), -100, 100);
  const allowedSignals = new Set(['STRONG_LONG', 'WEAK_LONG', 'NO_TRADE', 'WEAK_SHORT', 'STRONG_SHORT']);
  if (!allowedSignals.has(out.signal)) out.signal = mapSignal(out.signal_score);
  const action = String(out.recommended_action || '').toUpperCase();
  if (['LONG', 'BUY', 'SHORT_LONG', 'ENTERLONG'].includes(action)) out.recommended_action = 'ENTER_LONG';
  else if (['SHORT', 'SELL', 'ENTERSHORT'].includes(action)) out.recommended_action = 'ENTER_SHORT';
  else if (['EXITLONG', 'CLOSE_LONG'].includes(action)) out.recommended_action = 'EXIT_LONG';
  else if (['EXITSHORT', 'CLOSE_SHORT'].includes(action)) out.recommended_action = 'EXIT_SHORT';
  else if (!['ENTER_LONG', 'ENTER_SHORT', 'WAIT', 'EXIT_LONG', 'EXIT_SHORT'].includes(action)) out.recommended_action = 'WAIT';
  else out.recommended_action = action;
  if (out.signal === 'NO_TRADE') out.recommended_action = 'WAIT';
  const confidence = Number(out.confidence);
  out.confidence = clamp(Math.round(Number.isFinite(confidence) ? confidence : Math.abs(out.signal_score)), 0, 100);
  const lev = Number(out.max_leverage);
  out.max_leverage = clamp(Math.round(Number.isFinite(lev) ? lev : 1), 0, 3);
  return out;
}

const LINE_SIGNAL_CONFIDENCE_THRESHOLD = 80;

function formatLineSignalMessage(signal) {
  const dir = String(signal.direction || '').toUpperCase();
  const confidence = Math.round(Number(signal.confidence) || 0);
  const price = Number(signal.price);
  const timeframe = signal.timeframe || '4h';
  const updatedAt = signal.updatedAt ? new Date(Number(signal.updatedAt)).toLocaleString('en-US', { hour12: false }) : new Date().toLocaleString('en-US', { hour12: false });
  const priceText = Number.isFinite(price) ? '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—';
  const score = signal.score == null ? '—' : signal.score;
  const rsi = signal.rsi == null ? '—' : signal.rsi;
  const atr = signal.stopDistance == null ? '—' : Number(signal.stopDistance).toLocaleString('en-US', { maximumFractionDigits: 2 });
  return [
    `Symbol: ${signal.sym || 'BTC'}USDT`,
    `Direction: ${dir}`,
    `Confidence: ${confidence}%`,
    `Timeframe: ${timeframe}`,
    `Price: ${priceText}`,
    `Score: ${score} | RSI: ${rsi}`,
    `3ATR Stop Distance: ${atr}`,
    `Updated: ${updatedAt}`,
    '',
    'Testnet dashboard signal only. Not financial advice.',
  ].join('\n');
}

async function sendLineSignal(keys, signal) {
  const text = formatLineSignalMessage(signal);
  const r = await httpsPostJSON('https://api.line.me/v2/bot/message/push', {
    Authorization: `Bearer ${keys.lineChannelAccessToken}`,
  }, {
    to: keys.lineToId,
    messages: [{ type: 'text', text }],
  });
  return { status: r.status, data: r.data, text };
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
      const keys = loadKeys();
      return sendJSON(res, 200, { testnet: true, reachable: t.status === 200, serverTime: t.data && t.data.serverTime, configured: isConfigured(keys), deepseekConfigured: isDeepseekConfigured(keys), lineConfigured: isLineConfigured(keys) });
    } catch (e) {
      const keys = loadKeys();
      return sendJSON(res, 200, { testnet: true, reachable: false, configured: isConfigured(keys), deepseekConfigured: isDeepseekConfigured(keys), lineConfigured: isLineConfigured(keys), error: String(e.message || e) });
    }
  }

  // DeepSeek scorer: server computes market features first, then sends numeric JSON only.
  if (pathname === '/api/deepseek/signal' && method === 'POST') {
    const keys = loadKeys();
    let body = {};
    try { body = await readJSONBody(req); }
    catch (e) { return sendJSON(res, 400, { error: e.message }); }
    try {
      const allowed = new Set(['1h', '4h', '1d', '1week']);
      const requested = Array.isArray(body.timeframes) ? body.timeframes : [body.timeframe || '1h'];
      const timeframes = [...new Set(requested.filter((t) => allowed.has(t)))].slice(0, 4);
      const list = timeframes.length ? timeframes : ['1h'];
      if (list.length > 1) {
        const results = await Promise.all(list.map((tf) => scoreWithDeepseek(keys, tf)));
        return sendJSON(res, 200, {
          configured: isDeepseekConfigured(keys),
          localOnly: !isDeepseekConfigured(keys),
          multi: true,
          timeframes: list,
          results,
          debug: {
            environment: process.env.VERCEL ? 'vercel' : 'local',
            deepseekConfigured: isDeepseekConfigured(keys),
            resultCount: results.length,
            failedCount: results.filter((r) => r && r.error).length,
          },
        });
      }
      const result = await scoreWithDeepseek(keys, list[0]);
      return sendJSON(res, result.error ? 502 : 200, result);
    } catch (e) {
      return sendJSON(res, 502, {
        configured: isDeepseekConfigured(keys),
        error: String(e.message || e),
        debug: {
          stage: 'apiRoute',
          environment: process.env.VERCEL ? 'vercel' : 'local',
          deepseekConfigured: isDeepseekConfigured(keys),
        },
      });
    }
  }

  // ส่ง signal เข้า LINE Messaging API หลังผู้ใช้กด confirm เท่านั้น.
  if (pathname === '/api/line/signal' && method === 'POST') {
    const keys = loadKeys();
    if (!isLineConfigured(keys)) return sendJSON(res, 400, { error: 'ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN / LINE_TO_ID' });
    let body = {};
    try { body = await readJSONBody(req); }
    catch (e) { return sendJSON(res, 400, { error: e.message }); }
    const signal = body.signal || {};
    const direction = String(signal.direction || '').toUpperCase();
    const confidence = Number(signal.confidence) || 0;
    if (body.confirmed !== true) return sendJSON(res, 400, { error: 'LINE request must be confirmed by app logic' });
    if (!['LONG', 'SHORT'].includes(direction)) return sendJSON(res, 400, { error: 'ส่ง LINE เฉพาะสัญญาณ LONG หรือ SHORT เท่านั้น' });
    if (confidence < LINE_SIGNAL_CONFIDENCE_THRESHOLD) {
      return sendJSON(res, 400, { error: `confidence ต้อง >= ${LINE_SIGNAL_CONFIDENCE_THRESHOLD}%` });
    }
    try {
      const r = await sendLineSignal(keys, signal);
      if (r.status < 200 || r.status >= 300) return sendJSON(res, r.status || 502, { error: 'line push failed', detail: r.data });
      return sendJSON(res, 200, { ok: true, lineStatus: r.status, text: r.text });
    } catch (e) {
      return sendJSON(res, 502, { error: String(e.message || e) });
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
    let body = {};
    try { body = await readJSONBody(req); }
    catch (e) { return sendJSON(res, 400, { error: e.message }); }
    const symbol = String(body.symbol || q.get('symbol') || '').toUpperCase();
    const direction = String(body.direction || '').toUpperCase();
    const side = String(body.side || q.get('side') || (direction === 'LONG' ? 'BUY' : direction === 'SHORT' ? 'SELL' : '')).toUpperCase();
    const reduceOnly = body.reduceOnly === true || q.get('reduceOnly') === 'true';
    const notionalUsdt = parseFloat(body.notionalUsdt || q.get('notionalUsdt'));
    const stopLossPrice = parseFloat(body.stopLossPrice || q.get('stopLossPrice'));
    const takeProfitPrice = parseFloat(body.takeProfitPrice || q.get('takeProfitPrice'));
    let quantity = parseFloat(body.quantity || q.get('quantity'));
    // 🔒 safety rails: BTCUSDT เท่านั้น + ขนาดออเดอร์จำกัด กัน fat-finger (เป็น testnet อยู่แล้ว)
    if (symbol !== 'BTCUSDT') return sendJSON(res, 400, { error: 'อนุญาตเฉพาะ BTCUSDT (กันพลาด)' });
    if (!['BUY', 'SELL'].includes(side)) return sendJSON(res, 400, { error: 'side ต้องเป็น BUY หรือ SELL' });
    if (notionalUsdt && (!(notionalUsdt >= 10) || notionalUsdt > 1000)) {
      return sendJSON(res, 400, { error: 'notionalUsdt ต้องอยู่ระหว่าง 10 ถึง 1000 USDT' });
    }
    try {
      let markPrice = 0;
      if (notionalUsdt || stopLossPrice || takeProfitPrice) {
        const pr = await fapi('GET', '/fapi/v1/ticker/price', { symbol }, false);
        if (pr.status !== 200) return sendJSON(res, pr.status, { error: 'binance price error', detail: pr.data });
        markPrice = parseFloat(pr.data && pr.data.price);
        if (notionalUsdt) quantity = roundStep(notionalUsdt / markPrice, 0.001);
      }
      if (!(quantity > 0) || quantity > 0.05) return sendJSON(res, 400, { error: 'quantity ต้อง > 0 และ <= 0.05' });
      if (!reduceOnly && markPrice) {
        if (Number.isFinite(stopLossPrice)) {
          const validStop = side === 'BUY' ? stopLossPrice < markPrice : stopLossPrice > markPrice;
          if (!validStop) return sendJSON(res, 400, { error: 'stopLossPrice อยู่ผิดฝั่งของราคา current mark' });
        }
        if (Number.isFinite(takeProfitPrice)) {
          const validTarget = side === 'BUY' ? takeProfitPrice > markPrice : takeProfitPrice < markPrice;
          if (!validTarget) return sendJSON(res, 400, { error: 'takeProfitPrice อยู่ผิดฝั่งของราคา current mark' });
        }
      }
      quantity = quantity.toFixed(3);
      const params = { symbol, side, type: 'MARKET', quantity, newOrderRespType: 'RESULT' };
      if (reduceOnly) params.reduceOnly = 'true';
      const r = await fapi('POST', '/fapi/v1/order', params, true);
      if (r.status !== 200) return sendJSON(res, r.status, { error: 'binance error', detail: r.data });
      const o = r.data || {};
      const exitOrders = [];
      const exitErrors = [];
      const exitSide = side === 'BUY' ? 'SELL' : 'BUY';
      const placeExit = async (type, stopPrice) => {
        if (reduceOnly || !(Number.isFinite(stopPrice) && stopPrice > 0)) return;
        const exitParams = {
          symbol,
          side: exitSide,
          type,
          quantity,
          stopPrice: roundPrice(stopPrice),
          reduceOnly: 'true',
          workingType: 'MARK_PRICE',
          newOrderRespType: 'RESULT',
        };
        const er = await fapi('POST', '/fapi/v1/order', exitParams, true);
        if (er.status === 200) {
          exitOrders.push({ type, orderId: er.data && er.data.orderId, stopPrice: exitParams.stopPrice });
        } else {
          exitErrors.push({ type, stopPrice: exitParams.stopPrice, detail: er.data });
        }
      };
      await placeExit('STOP_MARKET', stopLossPrice);
      await placeExit('TAKE_PROFIT_MARKET', takeProfitPrice);
      return sendJSON(res, 200, {
        testnet: true,
        orderId: o.orderId,
        symbol: o.symbol,
        side: o.side,
        direction: side === 'BUY' ? 'LONG' : 'SHORT',
        notionalUsdt,
        markPrice,
        type: o.type,
        status: o.status,
        executedQty: o.executedQty,
        avgPrice: o.avgPrice,
        origQty: o.origQty,
        stopLossPrice: Number.isFinite(stopLossPrice) ? roundPrice(stopLossPrice) : null,
        takeProfitPrice: Number.isFinite(takeProfitPrice) ? roundPrice(takeProfitPrice) : null,
        exitOrders,
        exitErrors,
      });
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

function requestHandler(req, res) {
  const pathname = req.url.split('?')[0];
  if (pathname.startsWith('/api/')) { handleApi(req, res).catch((e) => sendJSON(res, 500, { error: String(e) })); return; }
  serveStatic(req, res);
}

if (require.main === module) {
  const server = http.createServer(requestHandler);
  server.listen(PORT, () => {
    const k = loadKeys();
    console.log(`PixelCrypto server on http://localhost:${PORT}`);
    console.log(`Binance testnet keys: ${isConfigured(k) ? 'configured ✓' : 'NOT set (ใส่ใน binance.config.json)'}`);
  });
}

module.exports = { handleApi, requestHandler };
