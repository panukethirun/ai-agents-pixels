/* ===== Simulation: stations / work-zones, tickers, outcomes ===== */

// positions are % of the room; (x,y)=hotspot marker, (ax,ay)=where the agent stands.
// zone:true  => a "work zone" (teal ring + always-on nameplate).  tag => short zone label.
const STATIONS = [
  // ---- work zones ----
  { id:'market',    name:'Market Terminal', tag:'MARKET',    icon:'📈', kind:'analyze',  zone:true,  x:13, y:15, ax:13, ay:31, dur:[2.0,3.4] },
  { id:'plan',      name:'Strategy Board',  tag:'PLAN',      icon:'🧭', kind:'plan',     zone:true,  x:33, y:13, ax:33, ay:31, dur:[1.8,2.8] },
  { id:'wins',      name:'Win Wall',        tag:'REVIEW',    icon:'🏆', kind:'review',   zone:true,  x:46, y:14, ax:46, ay:31, dur:[1.8,3.0] },
  { id:'macro',     name:'Macro Watch',     tag:'MACRO',     icon:'🌆', kind:'analyze',  zone:true,  x:59, y:15, ax:59, ay:31, dur:[2.0,3.2] },
  { id:'ops',       name:'Ops Console',     tag:'OPS',       icon:'🛰️', kind:'ops',      zone:true,  x:84, y:19, ax:84, ay:31, dur:[1.8,3.0] },
  { id:'pod',       name:'R&D Pod',         tag:'R&D',       icon:'🧪', kind:'backtest', zone:true,  x:20, y:40, ax:27, ay:47, dur:[2.4,3.8] },
  { id:'deal',      name:'Deal Desk',       tag:'DEALS',     icon:'🤝', kind:'trade',    zone:true,  x:80, y:36, ax:81, ay:45, dur:[2.2,3.6] },
  { id:'analytics', name:'Analytics Bay',   tag:'ANALYTICS', icon:'📊', kind:'analyze',  zone:true,  x:31, y:64, ax:31, ay:74, dur:[2.0,3.4] },
  { id:'desk',      name:'Trading Desk',    tag:'TRADING',   icon:'💹', kind:'trade',    zone:true,  x:19, y:67, ax:19, ay:81, dur:[2.4,4.0] },
  { id:'signals',   name:'Signal Garden',   tag:'SIGNALS',   icon:'🌱', kind:'signals',  zone:true,  x:47, y:68, ax:47, ay:78, dur:[2.0,3.2] },
  { id:'library',   name:'The Library',     tag:'RESEARCH',  icon:'📚', kind:'research', zone:true,  x:74, y:74, ax:78, ay:86, dur:[2.2,3.6] },
  // ---- leisure (keeps the office feeling alive) ----
  { id:'coffee',    name:'Coffee Bar',      icon:'☕', kind:'rest',  zone:false, x:75, y:19, ax:73, ay:30, dur:[1.2,2.2] },
  { id:'lounge',    name:'The Lounge',      icon:'🛋️', kind:'rest',  zone:false, x:47, y:43, ax:47, ay:60, dur:[1.4,2.6] },
  { id:'pingpong',  name:'Break Room',      icon:'🏓', kind:'break', zone:false, x:77, y:60, ax:72, ay:70, dur:[1.6,2.8] },
];

// เหรียญที่เทรด (คู่ USDT) — pair/stream ใช้ต่อ Binance ใน prices.jsx
const COINS = [
  { sym:'BTC',  pair:'BTCUSDT',  stream:'btcusdt'  },
  { sym:'ETH',  pair:'ETHUSDT',  stream:'ethusdt'  },
  { sym:'BNB',  pair:'BNBUSDT',  stream:'bnbusdt'  },
  { sym:'SOL',  pair:'SOLUSDT',  stream:'solusdt'  },
  { sym:'XRP',  pair:'XRPUSDT',  stream:'xrpusdt'  },
  { sym:'ADA',  pair:'ADAUSDT',  stream:'adausdt'  },
  { sym:'DOGE', pair:'DOGEUSDT', stream:'dogeusdt' },
  { sym:'AVAX', pair:'AVAXUSDT', stream:'avaxusdt' },
  { sym:'LINK', pair:'LINKUSDT', stream:'linkusdt' },
  { sym:'TON',  pair:'TONUSDT',  stream:'tonusdt'  },
];
const TICKERS = COINS.map(c=>c.sym);
// ราคา fallback ถ้า WebSocket ยังไม่ส่ง tick แรก (ใกล้เคียงราคาตลาดจริง)
const FALLBACK_PX = { BTC:69000, ETH:1975, BNB:680, SOL:80, XRP:1.26, ADA:0.22, DOGE:0.099, AVAX:8.7, LINK:8.8, TON:2.0 };
const livePrice = (sym)=> ((typeof window!=='undefined' && window.__livePrices && window.__livePrices[sym]) || FALLBACK_PX[sym] || 1);

const rnd  = (a,b)=> a + Math.random()*(b-a);
const irnd = (a,b)=> Math.floor(rnd(a,b+1));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];

function fmtMoney(n){ return '$'+Math.round(n).toLocaleString('en-US'); }
// crypto price: ทศนิยมปรับตามขนาดราคา
function fmtPx(p){
  if(p==null) return '0';
  if(p>=100) return p.toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2});
  if(p>=1)   return p.toLocaleString('en-US',{minimumFractionDigits:3, maximumFractionDigits:3});
  return p.toLocaleString('en-US',{minimumFractionDigits:5, maximumFractionDigits:5});
}
// crypto qty: เหรียญแพง→ทศนิยมเยอะ, เหรียญถูก→จำนวนเต็ม
function fmtQty(q){
  if(q==null) return '0';
  if(q>=1000) return Math.round(q).toLocaleString('en-US');
  if(q>=1)    return q.toLocaleString('en-US',{maximumFractionDigits:2});
  if(q>=0.01) return q.toFixed(3);
  return q.toFixed(5);
}
function fmtSigned(n){ const s=n>=0?'+':'-'; return s+'$'+Math.abs(Math.round(n)).toLocaleString('en-US'); }
function fmtClock(mins){
  let h=Math.floor(mins/60), m=mins%60; const ap=h>=12?'PM':'AM';
  let hh=h%12; if(hh===0) hh=12;
  return `${hh}:${String(m).padStart(2,'0')} ${ap}`;
}

// what happens when the agent finishes working a station
function generateOutcome(st){
  const T = pick(TICKERS);
  switch(st.kind){
    case 'trade': {
      const side = Math.random()<0.55 ? 'BUY':'SELL';
      const price = livePrice(T);                  // ราคาจริงจาก Binance (fallback ถ้ายังไม่มา)
      const notional = rnd(500, 8000);             // ขนาดสถานะเป็น USDT
      const qty = notional/price;
      const win = Math.random()<0.66;
      const delta = win ? rnd(120,640) : -rnd(80,360);
      return {
        bubble:`${side==='BUY'?'Buying':'Selling'} ${T}…`,
        balanceDelta:delta, pnlDelta:delta, taskInc:1,
        trade:{ side, ticker:T, qty, price },
        notif:{ ic: delta>=0?'✅':'🔻',
          text:`${side} ${T} ×${fmtQty(qty)} @ $${fmtPx(price)} → ${fmtSigned(delta)}`,
          kind: delta>=0?'up':'down' },
      };
    }
    case 'analyze':  return out('📊', `Momentum building on ${T}`, st, 1, pick([`Scanning the tape`,`Charting ${T}`,`Hunting setups`,`Reading the order flow`]));
    case 'research': return out('📚', `Filed a research note on ${T}`, st, 1, pick([`Reading ${T} docs`,`Studying tokenomics`,`Digging through on-chain data`]));
    case 'backtest': { const x=+(rnd(0.4,4.2)).toFixed(1);
      return out('🧪', `Backtest beat the market by ${x}%`, st, 1, pick([`Backtesting strategy`,`Reviewing the journal`,`Stress-testing risk`])); }
    case 'plan':     return out('🧭', pick([`Risk capped at 2% / trade`,`Confirmed the day's plan`,`Set stop-losses`]), st, 1, pick([`Reviewing the plan`,`Checking risk limits`,`Marking key levels`]));
    case 'ops':      return out('🛰️', pick([`Feeds synced · 12ms latency`,`Order book rebalanced`,`Risk engine all green`]), st, 1, pick([`Syncing data feeds`,`Rebalancing the book`,`Tuning the risk engine`]));
    case 'signals':  { const dir=Math.random()<.5?'LONG':'SHORT';
      return out('🌱', `New ${dir} signal on ${T}`, st, 1, pick([`Cultivating signals`,`Watering the model`,`Pruning weak signals`])); }
    case 'review':   { const x=irnd(58,74);
      return out('🏆', `Win rate holding at ${x}%`, st, 1, pick([`Tallying the win wall`,`Grading yesterday's trades`,`Updating the scorecard`])); }
    case 'rest':     return out('☕', pick([`Focus recharged`,`Logged the morning recap`,`Patience — waiting for a setup`]), st, 0, pick([`Brewing coffee`,`Catching a breather`,`Letting a trade breathe`]));
    case 'break':    return out('🏓', pick([`Break — clearing the head`,`Staying sharp`]), st, 0, pick([`Quick ping-pong break`,`Stretching it out`]));
    default:         return out('•','Working',st,0,'Working');
  }
}
function out(ic, text, st, taskInc, bubble){
  return { bubble:bubble+'…', balanceDelta:0, pnlDelta:0, taskInc, notif:{ic,text,kind:'plain'} };
}

Object.assign(window, { STATIONS, COINS, TICKERS, generateOutcome, fmtMoney, fmtSigned, fmtClock, fmtPx, fmtQty, livePrice, rnd, irnd, pick });
