/* ===== Live signal engine: วิเคราะห์ราคาจริงจาก Binance → direction + confidence =====
 *
 * ใช้ข้อมูล klines จริงจาก mainnet (api.binance.com) คำนวณ RSI / SMA / momentum
 * แล้วสรุปเป็น LONG/SHORT + confidence 50-95% (ของจริง ไม่ใช่ค่าคงที่)
 * ⚠️ สัญญาณนี้ใช้ "เปิด position บน TESTNET (เงินปลอม)" เท่านั้น
 */

function _sma(arr, n) { const s = arr.slice(-n); return s.reduce((a, b) => a + b, 0) / s.length; }
function _ema(arr, n) {
  if (!arr || arr.length < n) return null;
  const k = 2 / (n + 1);
  let ema = _sma(arr.slice(0, n), n);
  for (let i = n; i < arr.length; i++) ema = arr[i] * k + ema * (1 - k);
  return ema;
}
function _rsi(closes, period) {
  period = period || 14;
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    if (ch >= 0) gains += ch; else losses -= ch;
  }
  const avgG = gains / period, avgL = losses / period;
  if (avgL === 0) return 100;
  return 100 - 100 / (1 + avgG / avgL);
}

const SIGNAL_TIMEFRAMES = [
  { value:'1h', label:'1h', binance:'1h', oiPeriod:'1h' },
  { value:'4h', label:'4h', binance:'4h', oiPeriod:'4h' },
  { value:'1d', label:'1d', binance:'1d', oiPeriod:'1d' },
  { value:'1week', label:'1week', binance:'1w', oiPeriod:'1d' },
];

function _timeframeConfig(value) {
  return SIGNAL_TIMEFRAMES.find(t => t.value === value) || SIGNAL_TIMEFRAMES[0];
}

function _fmtClockTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

function _fmtCountdown(ms) {
  const total = Math.max(0, Math.ceil((ms || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function _parseKline(k) {
  return { high:parseFloat(k[2]), low:parseFloat(k[3]), close:parseFloat(k[4]) };
}

function _pctMove(closes, n) {
  if (closes.length <= n) return 0;
  const last = closes[closes.length - 1];
  const prev = closes[closes.length - 1 - n];
  return prev ? (last - prev) / prev * 100 : 0;
}

function _zscore(values) {
  const xs = (values || []).map(Number).filter(Number.isFinite);
  if (xs.length < 5) return 0;
  const last = xs[xs.length - 1];
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / xs.length;
  const sd = Math.sqrt(variance);
  return sd ? (last - mean) / sd : 0;
}

function _atr(klines, period) {
  if (!klines || klines.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < klines.length; i++) {
    const high = klines[i].high, low = klines[i].low, prevClose = klines[i - 1].close;
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  return _sma(trs, period);
}

function _donchian(klines, period) {
  if (!klines || klines.length < period + 1) return { high:null, low:null };
  const window = klines.slice(-(period + 1), -1);
  return {
    high: Math.max(...window.map(k => k.high)),
    low: Math.min(...window.map(k => k.low)),
  };
}

function _marketMeta(oiHist, fundingHist) {
  const oiValues = Array.isArray(oiHist) ? oiHist.map(x => parseFloat(x.sumOpenInterestValue || x.sumOpenInterest)) : [];
  const fundingValues = Array.isArray(fundingHist) ? fundingHist.map(x => parseFloat(x.fundingRate)) : [];
  return {
    oiZ: _zscore(oiValues),
    fundingZ: _zscore(fundingValues),
    hasOi: oiValues.length >= 5,
    hasFunding: fundingValues.length >= 5,
  };
}

// สูตร non-ML: EMA trend + Donchian breakout + RSI + OI/funding filters.
function computeSignal(sym, klines, marketMeta, timeframe) {
  const tf = timeframe || '4h';
  klines = (klines || []).filter(k => k && Number.isFinite(k.close) && Number.isFinite(k.high) && Number.isFinite(k.low));
  const closes = klines.map(k => k.close);
  if (closes.length < 201) {
    return { sym, price: closes[closes.length - 1] || 0, direction: 'WAIT', confidence: 0, timeframe: tf, rsi: 50, score: 0, atr: 0, stopDistance: 0, oiZ: 0, fundingZ: 0, updatedAt: Date.now() };
  }
  const price = closes[closes.length - 1];
  const r = _rsi(closes, 14);
  const ema50 = _ema(closes, 50), ema200 = _ema(closes, 200);
  const dc = _donchian(klines, 55);
  const atr = _atr(klines, 14) || 0;
  const oiZ = marketMeta && Number.isFinite(marketMeta.oiZ) ? marketMeta.oiZ : 0;
  const fundingZ = marketMeta && Number.isFinite(marketMeta.fundingZ) ? marketMeta.fundingZ : 0;
  const metaOk = !!(marketMeta && marketMeta.hasOi && marketMeta.hasFunding);
  const longChecks = [
    price > ema200,
    ema50 > ema200,
    price > dc.high,
    r > 55,
    metaOk && oiZ > 0,
    metaOk && fundingZ < 1.5,
  ];
  const shortChecks = [
    price < ema200,
    ema50 < ema200,
    price < dc.low,
    r < 45,
    metaOk && oiZ > 0,
    metaOk && fundingZ > -1.5,
  ];
  const longOk = longChecks.every(Boolean);
  const shortOk = shortChecks.every(Boolean);
  const direction = longOk ? 'LONG' : shortOk ? 'SHORT' : 'WAIT';
  const longScore = longChecks.filter(Boolean).length / longChecks.length;
  const shortScore = shortChecks.filter(Boolean).length / shortChecks.length;
  const score = longOk ? longScore : shortOk ? -shortScore : (longScore >= shortScore ? longScore : -shortScore);
  const confidence = direction === 'WAIT'
    ? Math.round(Math.max(longScore, shortScore) * 65)
    : Math.round(80 + Math.min(1, Math.abs(score)) * 15);
  return {
    sym, price, direction, confidence, timeframe: tf,
    rsi: Math.round(r), ema50, ema200, donchianHigh: dc.high, donchianLow: dc.low,
    atr, stopDistance: atr * 3, oiZ, fundingZ, score: Number(score.toFixed(2)), updatedAt: Date.now()
  };
}

// hook: ดึง klines จริง + 24h ticker ทุก refreshMs แล้วคำนวณสัญญาณ
function useSignal(sym, refreshMs, timeframe) {
  const [sig, setSig] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    const pair = sym.endsWith('USDT') ? sym : sym + 'USDT';
    const refresh = refreshMs || 20000;
    const tf = _timeframeConfig(timeframe);
    // เปลี่ยน timeframe → โชว์สถานะกำลังคำนวณใหม่ทันที (ค่าจริงตามมาเมื่อ fetch เสร็จ)
    setSig((prev) => prev ? { ...prev, loading: true } : prev);
    const load = async () => {
      try {
        const [kRes, oiRes, fRes] = await Promise.all([
          fetch('https://fapi.binance.com/fapi/v1/klines?symbol=' + pair + '&interval=' + tf.binance + '&limit=260', { cache: 'no-store' }),
          fetch('https://fapi.binance.com/futures/data/openInterestHist?symbol=' + pair + '&period=' + tf.oiPeriod + '&limit=60', { cache: 'no-store' }),
          fetch('https://fapi.binance.com/fapi/v1/fundingRate?symbol=' + pair + '&limit=100', { cache: 'no-store' }),
        ]);
        const klines = await kRes.json();
        const oi = oiRes.ok ? await oiRes.json() : [];
        const funding = fRes.ok ? await fRes.json() : [];
        if (!alive) return;
        const rows = Array.isArray(klines) ? klines.map(_parseKline) : [];
        setSig({...computeSignal(sym.replace('USDT', ''), rows, _marketMeta(oi, funding), tf.label), nextRefreshAt: Date.now() + refresh});
      } catch (e) {
        setSig((prev) => prev ? { ...prev, error: String(e.message || e), stale: true, nextRefreshAt: Date.now() + refresh } : null);
      }
    };
    load();
    const id = setInterval(load, refresh);
    return () => { alive = false; clearInterval(id); };
  }, [sym, refreshMs, timeframe]);
  return sig;
}

function _px(p) {
  if (p == null) return '—';
  if (p >= 100) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 1) return p.toLocaleString('en-US', { maximumFractionDigits: 3 });
  return p.toLocaleString('en-US', { maximumFractionDigits: 5 });
}

function _exitPlan(signal, direction) {
  const price = signal && Number(signal.price);
  const stopDistance = signal && Number(signal.stopDistance);
  if (!(price > 0) || !(stopDistance > 0)) return null;
  return direction === 'LONG'
    ? { stopLoss: price - stopDistance, takeProfit: price + stopDistance * 2 }
    : { stopLoss: price + stopDistance, takeProfit: price - stopDistance * 2 };
}

function SignalCard({ signal, onTrade, tradeBusy, tradeMsg, auto, canTrade, timeframe, onTimeframeChange, deepseek, onAskAI, onOpenDeepseekLog, lineBusy, lineMsg, autoLine, onSendLine }) {
  const [notional, setNotional] = React.useState(150);
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!signal) {
    return (
      <div className="side-card frame tight signal-card">
        <div className="label">⚡ Live Signal</div>
        <div className="signal-frame-row">
          <span className="mono muted">Timeframe</span>
          <select className="signal-frame-select" value={timeframe || '4h'} onChange={(e)=>onTimeframeChange && onTimeframeChange(e.target.value)}>
            {SIGNAL_TIMEFRAMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="mono muted market-msg">วิเคราะห์ราคาจริงจาก Binance…</div>
      </div>
    );
  }
  const hot = signal.confidence >= 80;
  const dir = signal.direction;
  const dirClass = dir === 'LONG' ? 'long' : dir === 'SHORT' ? 'short' : 'wait';
  const lineReady = signal.confidence >= 90 && (dir === 'LONG' || dir === 'SHORT');
  const parsedNotional = Math.max(10, Math.min(1000, Number(notional) || 0));
  const longExit = _exitPlan(signal, 'LONG');
  const shortExit = _exitPlan(signal, 'SHORT');
  // DeepSeek (Ask AI) summary
  const ds = deepseek || {};
  const dsResult = ds.result;
  const dsPrimary = dsResult && dsResult.multi
    ? (dsResult.results || []).find(r => r.features && r.features.timeframe === '1h') || (dsResult.results || [])[0]
    : dsResult;
  const dsReview = dsPrimary && (dsPrimary.review || dsPrimary.preliminary);
  const dsSig = dsReview && (dsReview.signal || (dsPrimary.features && dsPrimary.features.preliminary_signal));
  const dsScore = dsReview && (dsReview.signal_score ?? (dsPrimary.features && dsPrimary.features.preliminary_score));
  const dsCls = dsSig ? (dsSig.includes('LONG') ? 'up' : dsSig.includes('SHORT') ? 'short' : '') : '';
  return (
    <div className={'side-card frame tight signal-card' + (hot ? ' hot' : '')}>
      <div className="label market-head">
        <span>⚡ Live Signal · {signal.sym}</span>
        {auto && <span className="market-status mono"><span className="status-dot" style={{ background: 'var(--up)' }}></span>auto</span>}
      </div>

      <div className="signal-frame-row">
        <span className="mono muted">Timeframe</span>
        <select className="signal-frame-select" value={timeframe || '4h'} onChange={(e)=>onTimeframeChange && onTimeframeChange(e.target.value)}>
          {SIGNAL_TIMEFRAMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="signal-top">
        <span className={'thesis-badge ' + dirClass}>{dir}</span>
        <span className="signal-conf mono">{signal.confidence}%</span>
      </div>
      <div className="signal-bar"><div className={'signal-fill ' + dirClass} style={{ width: signal.confidence + '%' }}></div></div>
      <div className={'signal-meta mono' + (signal.loading ? ' calc' : '')}>SL/TP auto · Long ${_px(longExit && longExit.stopLoss)}/${_px(longExit && longExit.takeProfit)}</div>
      <div className={'signal-meta mono' + (signal.loading ? ' calc' : '')}>SL/TP auto · Short ${_px(shortExit && shortExit.stopLoss)}/${_px(shortExit && shortExit.takeProfit)}</div>
      <div className="signal-meta mono">
        {signal.loading
          ? `กำลังคำนวณ ${timeframe || signal.timeframe || '4h'} ใหม่…`
          : `Updated ${_fmtClockTime(signal.updatedAt)} · Next ${_fmtCountdown((signal.nextRefreshAt || 0) - now)}`}
      </div>

      <div className="signal-action">
        <div className="signal-askai">
          <button className="btn ask-ai-btn" type="button" onClick={() => onAskAI && onAskAI()} disabled={ds.busy}>
            <img className="ask-ai-icon" src="assets/ask-ai-whale.png" alt="" />
            {ds.busy ? 'Asking AI…' : 'Ask AI'}
          </button>
          {dsResult && !ds.busy &&
            <button className="ask-ai-view mono" type="button" onClick={() => onOpenDeepseekLog && onOpenDeepseekLog()}>Log ›</button>}
        </div>
        {ds.error
          ? <div className="ask-ai-note mono down">DeepSeek error</div>
          : dsReview
            ? <div className="ask-ai-note mono">DeepSeek: <strong className={dsCls}>{dsSig || '—'}</strong> · score {dsScore ?? '—'} · 4 TF</div>
            : null}

        {lineReady && (
          <div className="line-confirm">
            <div className={'line-auto-state mono ' + (autoLine ? 'on' : 'off')}>
              {lineBusy ? 'Sending LINE…' : autoLine ? 'Auto LINE armed' : 'Auto LINE off'}
            </div>
            {!autoLine && <button className="btn line-confirm-btn" type="button" disabled={lineBusy}
              onClick={() => onSendLine && onSendLine(signal)}>
              Send LINE now
            </button>}
            <div className="line-confirm-note mono">High confidence signal · {autoLine ? 'will send automatically' : 'enable Auto LINE in Settings'}</div>
          </div>
        )}
        {lineMsg && <div className={'line-msg mono ' + (lineMsg.ok ? 'up' : 'down')}>{lineMsg.text}</div>}

        {auto && hot && <div className="mono muted" style={{ fontSize: 13 }}>🤖 auto armed — จะยิงให้อัตโนมัติบน testnet</div>}
        <div className="signal-order">
          <label className="trade-field mono">
            <span>USDT</span>
            <input type="number" min="10" max="1000" step="10" value={notional}
              onChange={(e) => setNotional(e.target.value)} />
          </label>
          <div className="signal-btn-pair">
            <button className="btn signal-btn long" disabled={tradeBusy || !canTrade}
              onClick={() => onTrade && onTrade('LONG', parsedNotional)}>
              {tradeBusy ? 'Sending…' : !canTrade ? 'Connect testnet' : 'Long'}
            </button>
            <button className="btn signal-btn short" disabled={tradeBusy || !canTrade}
              onClick={() => onTrade && onTrade('SHORT', parsedNotional)}>
              {tradeBusy ? 'Sending…' : !canTrade ? 'Connect testnet' : 'Short'}
            </button>
          </div>
        </div>
      </div>
      {tradeMsg && <div className={'signal-msg mono ' + (tradeMsg.ok ? 'up' : 'down')}>
        <div>{tradeMsg.text}</div>
        {tradeMsg.note && <div>{tradeMsg.note}</div>}
      </div>}
    </div>
  );
}

Object.assign(window, { useSignal, computeSignal, SignalCard, SIGNAL_TIMEFRAMES });
