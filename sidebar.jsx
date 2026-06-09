/* ===== Sidebar (taskbar): brand, nav, live stats, notifications ===== */

function Spark({data}){
  const ref = React.useRef(null);
  React.useEffect(()=>{
    const cv = ref.current; if(!cv) return;
    const ctx = cv.getContext('2d');
    const W=cv.width, H=cv.height;
    ctx.clearRect(0,0,W,H);
    // dotted baseline grid
    ctx.fillStyle='rgba(63,138,89,.25)';
    for(let y=10;y<H;y+=12) for(let x=0;x<W;x+=5) ctx.fillRect(x,y,2,1);
    const pts = data.length>1 ? data : [0,0];
    let mn=Math.min(...pts), mx=Math.max(...pts); if(mx===mn){mx+=1;mn-=1;}
    const pad=6;
    const X=i=> (i/(pts.length-1))*(W-pad*2)+pad;
    const Y=v=> H-pad - ((v-mn)/(mx-mn))*(H-pad*2);
    // area
    ctx.beginPath(); ctx.moveTo(X(0),H);
    pts.forEach((v,i)=>ctx.lineTo(X(i),Y(v)));
    ctx.lineTo(X(pts.length-1),H); ctx.closePath();
    ctx.fillStyle='rgba(111,224,140,.16)'; ctx.fill();
    // line
    ctx.beginPath(); pts.forEach((v,i)=> i?ctx.lineTo(X(i),Y(v)):ctx.moveTo(X(i),Y(v)));
    ctx.strokeStyle='#6fe08c'; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.stroke();
    // head dot
    const lx=X(pts.length-1), ly=Y(pts[pts.length-1]);
    ctx.fillStyle='#d7ffe2'; ctx.fillRect(lx-2,ly-2,4,4);
  },[data]);
  return <canvas ref={ref} width={264} height={46} className="spark" />;
}

function NavBtn({icon,label,id,view,setView,badge}){
  return (
    <button className={'nav-btn'+(view===id?' active':'')} onClick={()=>setView(id)} title={label} aria-label={label}>
      <span className="ico">{icon}</span>
      {badge>0 && <span className="badge">{badge}</span>}
    </button>
  );
}

function TopNav({view,setView}){
  return (
    <nav className="top-nav frame" aria-label="Main navigation">
      <NavBtn icon="🏠" label="Dashboard" id="dashboard" view={view} setView={setView} />
      <NavBtn icon="🧠" label="Analysis"  id="analysis"  view={view} setView={setView} />
      <NavBtn icon="📜" label="History"   id="history"   view={view} setView={setView} badge={0} />
      <NavBtn icon="⚙️" label="Settings"  id="settings"  view={view} setView={setView} />
    </nav>
  );
}

function Sidebar({view,setView,balance,pnlToday,tasksDone,notifs,equity,statusLabel,running,agents,market,account,history,
                  signal,onTrade,tradeBusy,tradeMsg,autoTrade,canTrade,signalTimeframe,setSignalTimeframe}){
  const listRef = React.useRef(null);
  const acct = account && account.status === 'connected' ? account.account : null;
  const fmtMoney2 = (n)=> '$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2});
  const fmtSigned2 = (n)=> (n>=0?'+':'-')+'$'+Math.abs(Number(n||0)).toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2});
  const fmtPct2 = (n)=> (n>=0?'+':'')+Number(n||0).toFixed(2)+'%';
  const currentPosition = (positions, paperHistory)=>{
    const p = positions && positions.find(pos=>Number(pos.positionAmt)!==0);
    if(p){
      const amt = Number(p.positionAmt)||0;
      return {status: amt > 0 ? 'Long' : 'Short', symbol:p.symbol, cls:amt > 0 ? 'long' : 'short'};
    }
    const h = paperHistory && paperHistory.find(x=>x.side);
    if(h) return {status:h.side === 'BUY' ? 'Long' : 'Short', symbol:h.ticker || 'Paper', cls:h.side === 'BUY' ? 'long' : 'short'};
    return {status:'No position', symbol:'', cls:'flat'};
  };
  const uPnl = acct ? acct.unrealizedPnl : 0;
  const uPct = acct && acct.walletBalance ? (uPnl/acct.walletBalance*100) : 0;
  const paperBase = Math.max(1, balance - pnlToday);
  const paperPct = pnlToday / paperBase * 100;
  const openPnlPct = acct ? uPct : paperPct;
  const pos = currentPosition(acct ? acct.positions : null, acct ? null : history);
  return (
    <>
    <TopNav view={view} setView={setView} />
    <aside className="sidebar">
      <div className="side-card frame tight">
        <div className="brand">
          <div className="ava"><AvatarFace scale={4} /></div>
          <div>
            <h1>DUNGEONOPS</h1>
            <div className="sub">
              <span className="status-dot" style={{background: running?'var(--up)':'var(--gold)'}}></span>
              {running? `${agents?agents.length:0} heroes in party` : 'party paused'}
            </div>
          </div>
        </div>
      </div>

      <div className="side-card frame">
        <div className="label market-head">
          <span>Live Stats</span>
          <span className="market-status mono">
            <span className="status-dot" style={{background: acct?'var(--up)':account&&account.status==='error'?'var(--down)':'var(--gold)'}}></span>
            {acct ? 'testnet' : account&&account.status==='nokeys' ? 'paper (no keys)' : account&&account.status==='error' ? 'paper (offline)' : 'paper'}
          </span>
        </div>
        <div className="stats">
          {acct ? (
            <>
              <div className="stat"><span className="k">Balance</span><span className="v">{fmtMoney2(acct.marginBalance)}</span></div>
              <div className="stat"><span className="k">Unrealized P&amp;L</span>
                <span className={'v '+(uPnl>=0?'up':'down')}>{fmtSigned2(uPnl)}<span className="v-pct">({fmtPct2(uPct)})</span></span></div>
              <div className="stat position-stat"><span className="k">Open Positions</span>
                <span className={'v position-current '+pos.cls}>
                  <span>{pos.status}</span>
                  {pos.symbol && <small>{pos.symbol}</small>}
                  <em className={openPnlPct>=0?'up':'down'}>{fmtPct2(openPnlPct)}</em>
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="stat"><span className="k">Balance</span><span className="v">{fmtMoney2(balance)}</span></div>
              <div className="stat"><span className="k">P&amp;L Today</span>
                <span className={'v '+(pnlToday>=0?'up':'down')}>{fmtSigned2(pnlToday)}<span className="v-pct">({fmtPct2(paperPct)})</span></span></div>
              <div className="stat position-stat"><span className="k">Positions</span>
                <span className={'v position-current '+pos.cls}>
                  <span>{pos.status}</span>
                  {pos.symbol && <small>{pos.symbol}</small>}
                  <em className={openPnlPct>=0?'up':'down'}>{fmtPct2(openPnlPct)}</em>
                </span></div>
            </>
          )}
        </div>
      </div>

      <SignalCard signal={signal} onTrade={onTrade} tradeBusy={tradeBusy} tradeMsg={tradeMsg}
        auto={autoTrade} canTrade={canTrade}
        timeframe={signalTimeframe} onTimeframeChange={setSignalTimeframe} />

      <MarketPrices market={market} />

      <div className="side-card frame tight">
        <div className="label">The Team</div>
        <div className="team">
          {(agents||[]).map(a=>{
            const act = a.phase==='working' ? (a.atStation||'working')
                      : a.phase==='walking' ? 'on the move' : 'idle';
            return (
              <div className="teammate" key={a.id} title={`${a.name} · ${a.role} — ${act}`}>
                <div className="tm-face" style={{borderColor:a.tint}}>
                  <MiniFace palette={a.palette} map={a.map} image={a.image} scale={3} />
                  <span className={'tm-dot'+(a.phase==='working'?' on':a.phase==='walking'?' go':'')}></span>
                </div>
                <div className="tm-name">{a.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="side-card frame notif-wrap">
        <div className="label">Activity Log</div>
        <div className="notif-list" ref={listRef}>
          {notifs.length===0 && <div className="mono muted" style={{fontSize:16}}>Waiting for the agent…</div>}
          {notifs.map(n=>(
            <div key={n.id} className={'notif '+(n.kind||'plain')}>
              <span className="ic">{n.ic}</span>
              <div>
                <div className="tx">{n.text}</div>
                <div className="tm">
                  {n.who && <span className="who" style={{color:n.tint}}>{n.who}</span>}
                  {n.who && ' · '}{n.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
    </>
  );
}

Object.assign(window, { Sidebar, Spark, TopNav });
