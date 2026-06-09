/* ===== App: state, multi-agent simulation loop, wiring ===== */
const {useState, useRef, useEffect} = React;

const START_BAL = 12480;
const WALK_SPEED = 12;
const PARTY_STANDING_STILL = true;

// agent start positions (spread around the floor) — % of room
const STARTS = [
  {x:47,y:WALK_LINE_Y}, // Ping-CEO / Kirito — center
  {x:55,y:WALK_LINE_Y}, // Asuna — center
  {x:86,y:WALK_LINE_Y}, // Alice — Quest Board
  {x:17,y:WALK_LINE_Y}, // Eugeo — Trading
  {x:73,y:WALK_LINE_Y}, // Sinon — DeepSeek signal scorer
];

function App(){
  const [view,setView]       = useState('dashboard');
  const [balance,setBalance] = useState(START_BAL);
  const [pnlToday,setPnl]    = useState(0);
  const [tasks,setTasks]     = useState(0);
  const [notifs,setNotifs]   = useState([]);
  const [history,setHistory] = useState([]);
  const [analyses,setAnalyses] = useState([]);
  const [activeAnalysisId,setActiveAnalysisId] = useState(null);
  const [equity,setEquity]   = useState([START_BAL]);
  const [agentView,setAgentView] = useState(
    AGENTS.map((a,i)=>({...a, pos:{...STARTS[i]}, flip:false, walking:false, bubble:a.standingBubble||null})));
  const [busySet,setBusySet] = useState({});       // stationId -> agentId
  const [floor,setFloor]     = useState({working:0, walking:0});
  const [clock,setClock]     = useState(570);
  const [day,setDay]         = useState(1);
  const [speed,setSpeed]     = useState(1);
  const [settings,setSettings] = useState({autopilot:true, anim:true, tint:true, aggr:1, labels:true, names:true, autoTrade:false});
  const [tradeBusy,setTradeBusy] = useState(false);
  const [tradeMsg,setTradeMsg]   = useState(null);
  const [accountRefresh,setAccountRefresh] = useState(0);
  const [signalTimeframe,setSignalTimeframe] = useState('4h');
  const [deepseek,setDeepseek] = useState({busy:false, result:null, error:null});

  // live crypto quotes straight from Binance WebSocket (also writes window.__livePrices for the sim)
  const market = useBinancePrices(COINS);
  // real Binance Futures testnet account (margin balance, unrealized PnL, positions) — polled via /api/testnet/account
  const account = useTestnetAccount(10000, accountRefresh);
  // live trading signal computed from REAL Binance klines (EMA/Donchian/RSI/OI/funding) → LONG/SHORT/WAIT
  const signal = useSignal('BTC', 10000, signalTimeframe);

  // ---- mutable sim refs ----
  const agentsRef = useRef(AGENTS.map((a,i)=>({
    id:a.id, name:a.name, role:a.role, tint:a.tint, map:a.map, palette:a.palette,
    image:a.image, resource:a.resource, bubbleFrame:a.bubbleFrame, standingBubble:a.standingBubble,
    bubbleLift:a.bubbleLift, bubbleOffsetX:a.bubbleOffsetX,
    actionLabel:a.actionLabel, actionTitle:a.actionTitle,
    home:{...STARTS[i]}, pos:{...STARTS[i]}, target:null, phase:'idle',
    workT:0, idleT:rnd(0.4, 2.6+i*0.4), pending:null, lastSt:null, flip:false,
  })));
  const clkRef=useRef(570), dayRef=useRef(1), balRef=useRef(START_BAL), pnlRef=useRef(0), idc=useRef(0);
  const sRef=useRef(settings), spRef=useRef(speed);
  useEffect(()=>{sRef.current=settings;},[settings]);
  useEffect(()=>{spRef.current=speed;},[speed]);

  // ---- simulation loop (runs once) ----
  useEffect(()=>{
    const nextId=()=>++idc.current;
    const pushNotif=(n)=>{ const id=nextId(), time=fmtClock(clkRef.current);
      setNotifs(l=>[{id,...n,time},...l].slice(0,40)); };
    const pushHist=(h)=>{ const id=nextId();
      setHistory(l=>[{id,...h},...l].slice(0,200)); };

    // stations another agent is already at or heading to
    const occupiedBy=(self)=>{
      const set=new Set();
      agentsRef.current.forEach(o=>{ if(o!==self && o.target) set.add(o.target.id); });
      return set;
    };

    const chooseNext=(self)=>{
      const w=sRef.current.aggr, occ=occupiedBy(self), pool=[];
      STATIONS.forEach(st=>{
        if(occ.has(st.id) && st.zone) return;            // don't double-book work zones
        let wt=2;
        if(st.kind==='trade') wt=[2,3,5][w];
        else if(['analyze','research','backtest','ops','signals','review','plan'].includes(st.kind)) wt=3;
        else wt=[3,2,1][w]; // rest/break
        if(st.id===self.lastSt) wt=Math.max(1,wt-2);
        for(let i=0;i<wt;i++) pool.push(st);
      });
      if(!pool.length) return null;
      return pick(pool);
    };

    const applyOutcome=(self,st,oc)=>{
      let c=clkRef.current+irnd(3,11), d=dayRef.current;
      if(c>=960){ c=570; d+=1; dayRef.current=d; setDay(d);
        pnlRef.current=0; setPnl(0);
        pushNotif({ic:'🔔',text:`Market closed — Day ${d} begins`,kind:'plain'}); }
      clkRef.current=c; setClock(c);
      if(oc.balanceDelta){ balRef.current+=oc.balanceDelta; setBalance(Math.round(balRef.current));
        pnlRef.current+=oc.pnlDelta; setPnl(Math.round(pnlRef.current)); }
      if(oc.taskInc) setTasks(t=>t+oc.taskInc);
      setEquity(e=>{ const n=[...e,balRef.current]; return n.length>60?n.slice(-60):n; });
      pushNotif({...oc.notif, who:self.name, tint:self.tint});
      pushHist({ day:d, time:fmtClock(c), who:self.name, tint:self.tint, station:st.name, icon:st.icon,
        action:(oc.bubble||'').replace('…',''), detail:oc.notif.text,
        side:oc.trade&&oc.trade.side, ticker:oc.trade&&oc.trade.ticker,
        qty:oc.trade&&oc.trade.qty, price:oc.trade&&oc.trade.price, pnl:oc.pnlDelta||0 });
    };

    const stepAgent=(self, dts, running)=>{
      if(PARTY_STANDING_STILL){
        self.pos={...self.home};
        self.target=null; self.pending=null; self.phase='idle'; self.bubble=self.standingBubble||null;
        return;
      }
      if(self.phase==='walking'){
        const t=self.target; if(!t){ self.phase='idle'; self.idleT=rnd(0.4,1.4); return; }
        const dx=t.ax-self.pos.x, dist=Math.abs(dx);
        self.pos.y = WALK_LINE_Y;
        if(dist<0.9){
          self.pos={x:t.ax,y:WALK_LINE_Y};
          const oc=generateOutcome(t); self.pending={st:t,oc};
          self.workT=rnd(t.dur[0],t.dur[1]); self.phase='working'; self.bubble=oc.bubble;
        } else {
          const stp=Math.min(dist, WALK_SPEED*dts);
          self.pos={x:self.pos.x+Math.sign(dx)*stp, y:WALK_LINE_Y};
          if(dx<-0.3) self.flip=true; else if(dx>0.3) self.flip=false;
        }
      } else if(self.phase==='working'){
        self.pos.y = WALK_LINE_Y;
        self.workT-=dts;
        if(self.workT<=0){
          const p=self.pending; self.pending=null;
          if(p) applyOutcome(self, p.st, p.oc);
          self.phase='idle'; self.idleT=rnd(0.5,2.0); self.bubble=null; self.target=null;
        }
      } else { // idle
        self.pos.y = WALK_LINE_Y;
        if(running){
          self.idleT-=dts;
          if(self.idleT<=0){
            const nx=chooseNext(self);
            if(nx){ self.target=nx; self.lastSt=nx.id; self.phase='walking'; }
            else self.idleT=0.5;
          }
        }
      }
    };

    const step=(dt)=>{
      const dts=dt*spRef.current, running=sRef.current.autopilot;
      const agents=agentsRef.current;
      agents.forEach(a=> stepAgent(a, dts, running));

      // derive render + busy + floor
      const busy={}; let nW=0, nWalk=0;
      agents.forEach(a=>{
        if(a.phase==='working' && a.target) busy[a.target.id]=a.id;
        if(a.phase==='working') nW++; else if(a.phase==='walking') nWalk++;
      });
      setBusySet(prev=>{
        const pk=Object.keys(prev), bk=Object.keys(busy);
        if(pk.length===bk.length && bk.every(k=>prev[k]===busy[k])) return prev;
        return busy;
      });
      setFloor(prev=> (prev.working===nW && prev.walking===nWalk)? prev : {working:nW, walking:nWalk});
      setAgentView(agents.map(a=>({
        id:a.id, name:a.name, role:a.role, tint:a.tint, map:a.map, palette:a.palette,
        image:a.image, resource:a.resource, bubbleFrame:a.bubbleFrame, standingBubble:a.standingBubble,
        bubbleLift:a.bubbleLift, bubbleOffsetX:a.bubbleOffsetX,
        actionLabel:a.actionLabel, actionTitle:a.actionTitle,
        pos:{x:a.pos.x, y:a.pos.y}, flip:a.flip,
        walking:(a.phase==='walking'), bubble:a.bubble,
        phase:a.phase, atStation:a.target&&a.target.name,
      })));
    };

    let raf, last=performance.now();
    const tick=(now)=>{ let dt=(now-last)/1000; last=now; if(dt>0.1)dt=0.1; step(dt); raf=requestAnimationFrame(tick); };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[]);

  // ---- handlers ----
  const onStationClick=(st)=>{
    if(PARTY_STANDING_STILL) return;
    // send the nearest non-working agent to this station
    const cands=agentsRef.current.filter(a=>a.phase!=='working');
    const list=cands.length?cands:agentsRef.current;
    let best=list[0], bd=Infinity;
    list.forEach(a=>{ const d=Math.abs(a.pos.x-st.ax); if(d<bd){bd=d;best=a;} });
    best.target=st; best.lastSt=st.id; best.pending=null; best.phase='walking'; best.bubble=null;
    if(view!=='dashboard') setView('dashboard');
  };
  const onCreateAnalysis=(analysis)=>{
    setAnalyses(list=>[analysis,...list]);
    setActiveAnalysisId(analysis.id);
    if(view!=='analysis') setView('analysis');
  };
  const onReset=()=>{
    balRef.current=START_BAL; pnlRef.current=0; clkRef.current=570; dayRef.current=1;
    agentsRef.current.forEach((a,i)=>{ a.home={...STARTS[i]}; a.pos={...STARTS[i]}; a.target=null; a.phase='idle';
      a.workT=0; a.idleT=rnd(0.4,2.6+i*0.4); a.pending=null; a.lastSt=null; a.flip=false;
      a.bubble=a.standingBubble||null; });
    setBalance(START_BAL); setPnl(0); setTasks(0); setNotifs([]); setHistory([]);
    setEquity([START_BAL]); setBusySet({}); setClock(570); setDay(1);
    setAgentView(AGENTS.map((a,i)=>({...a, pos:{...STARTS[i]}, flip:false, walking:false, bubble:a.standingBubble||null})));
  };

  // เพิ่มแจ้งเตือนเข้า activity log จากนอก sim loop (ใช้กับการเทรด testnet จริง)
  const pushNotifTop = (n)=> setNotifs(l=>[{id:++idc.current, time:fmtClock(clkRef.current), ...n},...l].slice(0,40));

  const sendDeepseekSignal = async ()=>{
    if(deepseek.busy) return;
    setDeepseek({busy:true, result:deepseek.result, error:null});
    try{
      const res = await fetch('/api/deepseek/signal', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({symbol:'BTCUSDT', timeframe:'1h'}) });
      const d = await res.json();
      if(!res.ok) throw new Error(d.error || ('HTTP '+res.status));
      setDeepseek({busy:false, result:d, error:null});
      const review = d.review || d.preliminary || {};
      const sig = review.signal || (d.features && d.features.preliminary_signal) || 'LOCAL';
      const score = review.signal_score ?? (d.features && d.features.preliminary_score);
      const text = d.configured
        ? `DeepSeek ${sig} · score ${score}`
        : `DeepSeek key pending · local ${sig} · score ${score}`;
      pushNotifTop({ic:'🧠', text, kind:sig.includes('SHORT')?'down':sig.includes('LONG')?'up':'plain', who:'Sinon', tint:'#65e3ff'});
    }catch(e){
      setDeepseek({busy:false, result:null, error:e.message||String(e)});
      pushNotifTop({ic:'⚠️', text:'DeepSeek signal ล้มเหลว: '+(e.message||e), kind:'plain', who:'Sinon', tint:'#65e3ff'});
    }
  };

  const buildExitPrices = (direction)=>{
    const price = signal && Number(signal.price);
    const stopDistance = signal && Number(signal.stopDistance);
    if(!(price > 0) || !(stopDistance > 0)) return {};
    const stopLossPrice = direction === 'LONG' ? price - stopDistance : price + stopDistance;
    const takeProfitPrice = direction === 'LONG' ? price + stopDistance * 2 : price - stopDistance * 2;
    if(!(stopLossPrice > 0) || !(takeProfitPrice > 0)) return {};
    return {
      stopLossPrice: Number(stopLossPrice.toFixed(2)),
      takeProfitPrice: Number(takeProfitPrice.toFixed(2)),
      exitRiskMode: 'ATR_3x_TP_2R',
    };
  };

  // ส่งคำสั่งจริงไป TESTNET (เงินปลอม) — ระบุ notional เป็น USDT แล้วส่ง JSON ผ่าน /api/testnet/order
  const placeTestnetOrder = async (direction, notionalUsdt, isAuto)=>{
    if(account.status!=='connected'){ setTradeMsg({ok:false, text:'ต่อ testnet ก่อน'}); return; }
    const side = direction==='LONG' ? 'BUY' : 'SELL';
    const amount = Math.max(10, Math.min(1000, Number(notionalUsdt) || 150));
    const exitPrices = buildExitPrices(direction);
    setTradeBusy(true); setTradeMsg(null);
    try{
      const res = await fetch('/api/testnet/order', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({symbol:'BTCUSDT', direction, side, notionalUsdt:amount, ...exitPrices}),
      });
      const d = await res.json();
      if(!res.ok) throw new Error(d.error || ('HTTP '+res.status));
      const fillPx = parseFloat(d.avgPrice) || parseFloat(d.markPrice) || (signal && signal.price) || 0;
      const qty = d.executedQty || d.origQty || '';
      const orderId = d.orderId ? `#${d.orderId}` : '#—';
      const sl = Number(d.stopLossPrice || exitPrices.stopLossPrice);
      const tp = Number(d.takeProfitPrice || exitPrices.takeProfitPrice);
      const exitNote = sl && tp ? ` · SL $${sl.toLocaleString('en-US')} · TP $${tp.toLocaleString('en-US')}` : '';
      const exitWarn = d.exitErrors && d.exitErrors.length ? `SL/TP บางรายการไม่สำเร็จ (${d.exitErrors.length})` : '';
      const txt = `${isAuto?'🤖 AUTO ':''}${direction} ${amount} USDT (${side} ${qty} BTC) @ ~$${Math.round(fillPx).toLocaleString('en-US')} · order ${orderId}${exitNote}`;
      const modeNote = direction==='LONG' ? 'ถ้ามี Short ค้างอยู่ BUY จะลด Short ก่อน' : 'ถ้ามี Long ค้างอยู่ SELL จะลด Long ก่อน';
      setTradeMsg({ok:true, text:'✅ SUCCESS '+txt, note:exitWarn || modeNote});
      pushNotifTop({ic:'⚡', text:txt, kind: direction==='LONG'?'up':'down', who:'Signal', tint:'var(--gold)'});
      setAccountRefresh(x=>x+1);
    }catch(e){
      setTradeMsg({ok:false, text:'❌ '+(e.message||e)});
      pushNotifTop({ic:'⚠️', text:'order ล้มเหลว: '+(e.message||e), kind:'plain', who:'Signal', tint:'var(--gold)'});
    }finally{ setTradeBusy(false); }
  };

  // AUTO mode (testnet, opt-in): ยิงคำสั่งเมื่อ confidence >= 80% + cooldown 60s ต่อทิศทาง
  const autoRef = useRef({t:0, dir:null});
  useEffect(()=>{
    if(!settings.autoTrade || !signal || signal.confidence < 80) return;
    if(account.status!=='connected' || tradeBusy) return;
    const now = Date.now();
    if(now - autoRef.current.t < 60000 && autoRef.current.dir===signal.direction) return;
    autoRef.current = {t:now, dir:signal.direction};
    placeTestnetOrder(signal.direction, 150, true);
  }, [signal, settings.autoTrade, account.status]);

  const acct = account && account.status === 'connected' ? account.account : null;
  const fmtMoney2 = (n)=> '$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2});
  const fmtSigned2 = (n)=> (n>=0?'+':'-')+'$'+Math.abs(Number(n||0)).toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2});
  const displayAgents = agentView.map(a=>{
    if(a.name === 'Eugeo') return {...a, nudgeX:10, bubble:`Balance ${fmtMoney2(acct ? acct.marginBalance : balance)}`};
    if(a.name === 'Alice') return {...a, nudgeX:-15, bubble:`Unrealized ${fmtSigned2(acct ? acct.unrealizedPnl : pnlToday)}`};
    if(a.name === 'Asuna'){
      // สัญญาณจริงจาก Binance klines (RSI/SMA/momentum) → LONG/SHORT + confidence
      if(!signal) return {...a, bubble:'Reading signal…'};
      if(signal.direction === 'WAIT') return {...a, bubble:'Analyzing…'};
      return {...a, bubble:`${signal.sym} ${signal.direction} ${signal.confidence}%!`};
    }
    if(a.name === 'Sinon'){
      if(deepseek.busy) return {...a, bubble:'Sending features...', actionBusy:true};
      if(deepseek.error) return {...a, bubble:'DeepSeek error', actionBusy:false};
      const review = deepseek.result && (deepseek.result.review || deepseek.result.preliminary);
      if(review){
        const sig = review.signal || 'NO_TRADE';
        const score = review.signal_score ?? (deepseek.result.features && deepseek.result.features.preliminary_score);
        return {...a, bubble:`${sig} ${score}`, actionBusy:false};
      }
      return {...a, bubble:'DeepSeek scorer', actionBusy:false};
    }
    return a;
  });

  return (
    <div className={'app'+(settings.anim?'':' no-anim')}>
      <div className="main">
        {view==='dashboard' &&
          <Room agents={displayAgents} busySet={busySet} onStationClick={onStationClick}
            tint={settings.tint} showLabels={settings.labels} showNames={settings.names}
            onAgentAction={(agent)=>{ if(agent.name === 'Sinon') sendDeepseekSignal(); }} />}
        {view==='analysis' && <Analysis analyses={analyses} activeAnalysisId={activeAnalysisId}
            setActiveAnalysisId={setActiveAnalysisId} onCreateAnalysis={onCreateAnalysis}
            agents={agentView} signal={signal} />}
        {view==='history'  && <History history={history} />}
        {view==='settings' && <Settings settings={settings} setSettings={setSettings}
            onReset={onReset} speed={speed} setSpeed={setSpeed} />}
      </div>

      <Sidebar view={view} setView={setView} balance={balance} pnlToday={pnlToday}
        tasksDone={tasks} notifs={notifs} equity={equity} running={settings.autopilot}
        agents={agentView} market={market} account={account} history={history}
        signal={signal} onTrade={placeTestnetOrder} tradeBusy={tradeBusy} tradeMsg={tradeMsg}
        autoTrade={settings.autoTrade} canTrade={account.status==='connected'}
        signalTimeframe={signalTimeframe} setSignalTimeframe={setSignalTimeframe} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
