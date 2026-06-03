/* ===== Live signal engine: วิเคราะห์ราคาจริงจาก Binance → direction + confidence =====
 *
 * ใช้ข้อมูล klines จริงจาก mainnet (api.binance.com) คำนวณ RSI / SMA / momentum
 * แล้วสรุปเป็น LONG/SHORT + confidence 50-95% (ของจริง ไม่ใช่ค่าคงที่)
 * ⚠️ สัญญาณนี้ใช้ "เปิด position บน TESTNET (เงินปลอม)" เท่านั้น
 */

function _sma(arr, n) { const s = arr.slice(-n); return s.reduce((a, b) => a + b, 0) / s.length; }
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

function _pctMove(closes, n) {
  if (closes.length <= n) return 0;
  const last = closes[closes.length - 1];
  const prev = closes[closes.length - 1 - n];
  return prev ? (last - prev) / prev * 100 : 0;
}

// รวม indicator → สัญญาณ + confidence จาก timeframe 1HR
function computeSignal(sym, closes, chg24h) {
  closes = (closes || []).filter((n) => Number.isFinite(n));
  if (closes.length < 55) {
    return { sym, price: closes[closes.length - 1] || 0, direction: 'WAIT', confidence: 0, timeframe: '1HR', rsi: 50, bull: 0, bear: 0, score: 0, reasons: ['ข้อมูล 1HR ไม่พอ'], updatedAt: Date.now() };
  }
  const price = closes[closes.length - 1];
  const r = _rsi(closes, 14);
  const s20 = _sma(closes, 20), s50 = _sma(closes, 50);
  const m1 = _pctMove(closes, 1);
  const m4 = _pctMove(closes, 4);
  const m12 = _pctMove(closes, 12);
  const s20Prev = _sma(closes.slice(0, -6), 20);
  const trendSlope = s20Prev ? (s20 - s20Prev) / s20Prev * 100 : 0;
  const reasons = [];
  let bull = 0, bear = 0;
  // เทรนด์ (price vs SMA20/50)
  if (price > s20 && s20 > s50) { bull += 2; reasons.push('1HR trend up'); }
  else if (price < s20 && s20 < s50) { bear += 2; reasons.push('1HR trend down'); }
  else if (price > s20) { bull += 1; reasons.push('price > SMA20'); }
  else { bear += 1; reasons.push('price < SMA20'); }
  if (trendSlope > 0.15) { bull += 0.75; reasons.push('SMA20 rising'); }
  else if (trendSlope < -0.15) { bear += 0.75; reasons.push('SMA20 falling'); }
  // RSI
  if (r < 30) { bull += 1.5; reasons.push('RSI oversold'); }
  else if (r > 70) { bear += 1.5; reasons.push('RSI overbought'); }
  else if (r >= 55) { bull += 0.5; reasons.push('RSI bullish'); }
  else if (r <= 45) { bear += 0.5; reasons.push('RSI bearish'); }
  // โมเมนตัมจากแท่ง 1HR ล่าสุด ไม่ใช้ค่าคงที่
  [
    [m1, 0.35, '1H'],
    [m4, 0.9, '4H'],
    [m12, 1.8, '12H'],
  ].forEach(([move, threshold, label]) => {
    if (move > threshold) { bull += 0.75; reasons.push(label + ' +' + move.toFixed(2) + '%'); }
    else if (move < -threshold) { bear += 0.75; reasons.push(label + ' ' + move.toFixed(2) + '%'); }
  });
  // 24h เป็น context เสริม น้ำหนักต่ำกว่า 1HR
  if (chg24h > 3) { bull += 0.5; reasons.push('24h +' + chg24h.toFixed(1) + '%'); }
  else if (chg24h < -3) { bear += 0.5; reasons.push('24h ' + chg24h.toFixed(1) + '%'); }

  const net = bull - bear;
  const direction = net >= 0 ? 'LONG' : 'SHORT';
  const confidence = Math.round(50 + Math.min(1, Math.abs(net) / 5.25) * 45); // 50..95
  return {
    sym, price, direction, confidence, rsi: Math.round(r), sma20: s20, sma50: s50,
    chg24h, m1, m4, m12, bull: Number(bull.toFixed(2)), bear: Number(bear.toFixed(2)),
    score: Number(net.toFixed(2)), timeframe: '1HR', reasons: reasons.slice(0, 4), updatedAt: Date.now()
  };
}

// hook: ดึง klines จริง + 24h ticker ทุก refreshMs แล้วคำนวณสัญญาณ
function useSignal(sym, refreshMs) {
  const [sig, setSig] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    const pair = sym.endsWith('USDT') ? sym : sym + 'USDT';
    const load = async () => {
      try {
        const [kRes, tRes] = await Promise.all([
          fetch('https://api.binance.com/api/v3/klines?symbol=' + pair + '&interval=1h&limit=100', { cache: 'no-store' }),
          fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=' + pair, { cache: 'no-store' }),
        ]);
        const klines = await kRes.json();
        const t = await tRes.json();
        if (!alive) return;
        const closes = Array.isArray(klines) ? klines.map((k) => parseFloat(k[4])) : [];
        setSig(computeSignal(sym.replace('USDT', ''), closes, parseFloat(t.priceChangePercent)));
      } catch (e) {
        setSig((prev) => prev ? { ...prev, error: String(e.message || e), stale: true } : null);
      }
    };
    load();
    const id = setInterval(load, refreshMs || 20000);
    return () => { alive = false; clearInterval(id); };
  }, [sym, refreshMs]);
  return sig;
}

function _px(p) {
  if (p == null) return '—';
  if (p >= 100) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 1) return p.toLocaleString('en-US', { maximumFractionDigits: 3 });
  return p.toLocaleString('en-US', { maximumFractionDigits: 5 });
}

function SignalCard({ signal, onTrade, tradeBusy, tradeMsg, auto, canTrade }) {
  const [notional, setNotional] = React.useState(150);
  if (!signal) {
    return (
      <div className="side-card frame tight signal-card">
        <div className="label">⚡ Live Signal</div>
        <div className="mono muted market-msg">วิเคราะห์ราคาจริงจาก Binance…</div>
      </div>
    );
  }
  const hot = signal.confidence >= 80;
  const dir = signal.direction;
  const dirClass = dir === 'LONG' ? 'long' : 'short';
  const parsedNotional = Math.max(10, Math.min(1000, Number(notional) || 0));
  return (
    <div className={'side-card frame tight signal-card' + (hot ? ' hot' : '')}>
      <div className="label market-head">
        <span>⚡ Live Signal · {signal.sym}</span>
        {auto && <span className="market-status mono"><span className="status-dot" style={{ background: 'var(--up)' }}></span>auto</span>}
      </div>

      <div className="signal-top">
        <span className={'thesis-badge ' + dirClass}>{dir}</span>
        <span className="signal-conf mono">{signal.confidence}%</span>
      </div>
      <div className="signal-bar"><div className={'signal-fill ' + dirClass} style={{ width: signal.confidence + '%' }}></div></div>
      <div className="signal-meta mono">{signal.timeframe || '1HR'} · ${_px(signal.price)}</div>

      <div className="signal-action">
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
              {tradeBusy ? 'Sending…' : !canTrade ? 'Connect testnet' : <><span>Open long</span><span>· {parsedNotional} USDT</span></>}
            </button>
            <button className="btn signal-btn short" disabled={tradeBusy || !canTrade}
              onClick={() => onTrade && onTrade('SHORT', parsedNotional)}>
              {tradeBusy ? 'Sending…' : !canTrade ? 'Connect testnet' : <><span>Open short</span><span>· {parsedNotional} USDT</span></>}
            </button>
          </div>
        </div>
      </div>
      {tradeMsg && <div className={'signal-msg mono ' + (tradeMsg.ok ? 'up' : 'down')}>
        <div>{tradeMsg.text}</div>
      </div>}
    </div>
  );
}

Object.assign(window, { useSignal, computeSignal, SignalCard });
