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

// รวม indicator → สัญญาณ + confidence
function computeSignal(sym, closes, chg24h) {
  const price = closes[closes.length - 1];
  const r = _rsi(closes, 14);
  const s20 = _sma(closes, 20), s50 = _sma(closes, 50);
  const reasons = [];
  let bull = 0, bear = 0;
  // เทรนด์ (price vs SMA20/50)
  if (price > s20 && s20 > s50) { bull += 2; reasons.push('เทรนด์ขาขึ้น (ราคา>SMA20>SMA50)'); }
  else if (price < s20 && s20 < s50) { bear += 2; reasons.push('เทรนด์ขาลง (ราคา<SMA20<SMA50)'); }
  else if (price > s20) { bull += 1; reasons.push('ราคาเหนือ SMA20'); }
  else { bear += 1; reasons.push('ราคาใต้ SMA20'); }
  // RSI
  if (r < 30) { bull += 1.5; reasons.push('RSI oversold (<30)'); }
  else if (r > 70) { bear += 1.5; reasons.push('RSI overbought (>70)'); }
  else if (r >= 55) { bull += 0.5; reasons.push('RSI โน้มขึ้น'); }
  else if (r <= 45) { bear += 0.5; reasons.push('RSI โน้มลง'); }
  // โมเมนตัม 24 ชม.
  if (chg24h > 3) { bull += 1; reasons.push('24h +' + chg24h.toFixed(1) + '%'); }
  else if (chg24h < -3) { bear += 1; reasons.push('24h ' + chg24h.toFixed(1) + '%'); }
  else if (chg24h > 0.5) bull += 0.5;
  else if (chg24h < -0.5) bear += 0.5;

  const net = bull - bear;
  const direction = net >= 0 ? 'LONG' : 'SHORT';
  const confidence = Math.round(50 + Math.min(1, Math.abs(net) / 4.5) * 45); // 50..95
  return { sym, price, direction, confidence, rsi: Math.round(r), sma20: s20, sma50: s50, chg24h, reasons, updatedAt: Date.now() };
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
        const closes = klines.map((k) => parseFloat(k[4]));
        setSig(computeSignal(sym.replace('USDT', ''), closes, parseFloat(t.priceChangePercent)));
      } catch (e) { /* เก็บค่าเดิมไว้ */ }
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
      <div className="signal-meta mono">RSI {signal.rsi} · 24h {signal.chg24h >= 0 ? '+' : ''}{signal.chg24h.toFixed(2)}% · ${_px(signal.price)}</div>

      {hot ? (
        <div className="signal-action">
          <div className="signal-hot mono">⚡ SIGNAL ≥ 80% — {dir} {signal.sym}</div>
          {auto ? (
            <div className="mono muted" style={{ fontSize: 13 }}>🤖 auto armed — จะยิงให้อัตโนมัติบน testnet</div>
          ) : (
            <button className={'btn signal-btn ' + dirClass} disabled={tradeBusy || !canTrade}
              onClick={() => onTrade && onTrade(dir)}>
              {tradeBusy ? 'กำลังส่ง…' : !canTrade ? 'ต่อ testnet ก่อน' : `เปิด ${dir} บน testnet`}
            </button>
          )}
        </div>
      ) : (
        <div className="signal-meta mono muted" style={{ marginTop: 6 }}>confidence &lt; 80% — รอสัญญาณชัดกว่านี้</div>
      )}
      {tradeMsg && <div className={'signal-msg mono ' + (tradeMsg.ok ? 'up' : 'down')}>{tradeMsg.text}</div>}
    </div>
  );
}

Object.assign(window, { useSignal, computeSignal, SignalCard });
