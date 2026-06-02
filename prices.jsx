/* ===== Live crypto prices: Binance WebSocket hook + sidebar panel =====
 *
 * เบราว์เซอร์ต่อ Binance ตรง (public market data ไม่ต้องใช้ API key):
 *   - WebSocket  wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/...  → real-time
 *   - REST       api.binance.com/api/v3/ticker/24hr?symbols=[...]                 → snapshot/fallback
 * ⚠️ ราคาจริงแบบ real-time แต่ "การเทรดของ agent เป็น paper เท่านั้น" — ไม่มีการส่งคำสั่งจริง
 */

// connect Binance live tickers for `coins` ([{sym,pair,stream}]); returns {status, quotes:[]}
function useBinancePrices(coins){
  const [state, setState] = React.useState({status:'connecting', quotes:(coins||[]).map(c=>({sym:c.sym, price:null, changePct:null}))});

  React.useEffect(()=>{
    if(!coins || !coins.length) return;

    const bySym = {};                                   // sym -> {sym, price, changePct}
    const pairToSym = {};
    coins.forEach(c=>{ bySym[c.sym] = {sym:c.sym, price:null, changePct:null}; pairToSym[c.pair] = c.sym; });

    let ws, closed=false, reconnectT=null;

    const publish = (status)=>{
      const lp = {};
      coins.forEach(c=>{ const q=bySym[c.sym]; if(q.price!=null) lp[c.sym]=q.price; });
      window.__livePrices = lp;                          // ให้ sim.jsx อ่านราคาจริงไปใช้เทรด
      setState({status, quotes: coins.map(c=>({...bySym[c.sym]}))});
    };

    // REST snapshot — เติมราคาทันทีไม่ต้องรอ tick แรก (และเป็น fallback ถ้า WS ต่อไม่ติด)
    const snapshot = async ()=>{
      try{
        const syms = encodeURIComponent(JSON.stringify(coins.map(c=>c.pair)));
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols='+syms, {cache:'no-store'});
        if(!res.ok) throw new Error('HTTP '+res.status);
        const arr = await res.json();
        arr.forEach(t=>{ const s=pairToSym[t.symbol]; if(s){ bySym[s].price=parseFloat(t.lastPrice); bySym[s].changePct=parseFloat(t.priceChangePercent); } });
        if(!closed) publish(ws && ws.readyState===1 ? 'live' : 'connecting');
      }catch(e){ /* ปล่อยให้ WS เป็นช่องทางหลัก */ }
    };

    const connect = ()=>{
      const streams = coins.map(c=>c.stream+'@ticker').join('/');
      try{ ws = new WebSocket('wss://stream.binance.com:9443/stream?streams='+streams); }
      catch(e){ setState(s=>({...s, status:'error'})); return; }
      ws.onopen = ()=>{ if(!closed) publish('live'); };
      ws.onmessage = (ev)=>{                              // mutate เฉยๆ — publish ตาม interval ด้านล่าง
        try{
          const d = JSON.parse(ev.data).data; if(!d) return;
          const s = pairToSym[d.s]; if(!s) return;
          bySym[s].price = parseFloat(d.c);
          bySym[s].changePct = parseFloat(d.P);
        }catch(e){}
      };
      ws.onclose = ()=>{ if(!closed){ setState(s=>({...s, status:'error'})); reconnectT=setTimeout(connect, 3000); } };
      ws.onerror = ()=>{ try{ ws.close(); }catch(e){} };
    };

    snapshot();
    connect();
    // publish รวบเป็นจังหวะ ~1s (ticker push ทุก ~1s/เหรียญ) กัน React re-render ถี่เกินไป
    const pub = setInterval(()=> publish(ws && ws.readyState===1 ? 'live' : 'connecting'), 1000);

    return ()=>{ closed=true; clearInterval(pub); if(reconnectT) clearTimeout(reconnectT); if(ws){ try{ ws.close(); }catch(e){} } };
  },[coins]);

  return state;
}

function fmtPrice(n){
  if(n==null) return '—';
  if(n>=100) return n.toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2});
  if(n>=1)   return n.toLocaleString('en-US',{minimumFractionDigits:3, maximumFractionDigits:3});
  return n.toLocaleString('en-US',{minimumFractionDigits:5, maximumFractionDigits:5});
}
function fmtPct(n){ if(n==null) return ''; return (n>=0?'+':'')+n.toFixed(2)+'%'; }

function MarketPrices({market}){
  const {status, quotes} = market || {};
  const list = quotes || [];
  const ok = list.filter(q=>q.price!=null).length;
  const haveAny = ok>0;
  const dot = status==='live' ? 'var(--up)' : status==='error' ? 'var(--down)' : 'var(--gold)';
  const statusText = status==='live' ? `live · ${ok}/${list.length}`
                   : status==='error' ? (haveAny?'reconnecting…':'offline') : 'connecting…';
  return (
    <div className="side-card frame tight market-card">
      <div className="label market-head">
        <span>Live Prices</span>
        <span className="market-status mono"><span className="status-dot" style={{background:dot}}></span>{statusText}</span>
      </div>

      {!haveAny && status==='error' && (
        <div className="mono muted market-msg">ต่อ Binance ไม่ได้ — เครือข่ายบล็อก wss/binance.com หรือเปล่า?</div>
      )}

      <div className="market-list">
        {list.map(q=>{
          const up = (q.changePct||0) >= 0;
          return (
            <div className="market-row" key={q.sym}>
              <span className="mk-sym">{q.sym}</span>
              <span className="mk-px mono">{fmtPrice(q.price)}</span>
              <span className={'mk-chg mono '+(q.price==null?'muted':up?'up':'down')}>
                {q.price==null ? '—' : fmtPct(q.changePct)}
              </span>
            </div>
          );
        })}
        {!haveAny && status!=='error' && <div className="mono muted market-msg">connecting to Binance…</div>}
      </div>

      <div className="market-foot mono">Binance · real-time · paper trading</div>
    </div>
  );
}

Object.assign(window, { useBinancePrices, MarketPrices });
