/* ===== Dungeon room (main dashboard view) ===== */

// Crypto Fear & Greed Index — ดึงจาก alternative.me (รีเฟรชทุก 5 นาที)
function useFearGreed(){
  const [fng, setFng] = React.useState(null);
  React.useEffect(()=>{
    let alive = true;
    const load = async ()=>{
      try{
        const res = await fetch('https://api.alternative.me/fng/?limit=1', {cache:'no-store'});
        const d = await res.json();
        const row = d && d.data && d.data[0];
        if(alive && row) setFng({ value:Number(row.value), classification:row.value_classification });
      }catch(e){ /* คงค่าเดิมไว้ */ }
    };
    load();
    const id = setInterval(load, 5*60*1000);
    return ()=>{ alive=false; clearInterval(id); };
  },[]);
  return fng;
}

function fngColor(v){
  if(v==null) return '#8a93a0';
  if(v<25) return '#e5484d';   // Extreme Fear
  if(v<45) return '#f2922c';   // Fear
  if(v<55) return '#e7b53c';   // Neutral
  if(v<75) return '#6fe08c';   // Greed
  return '#3fbf5f';            // Extreme Greed
}

function FearGreedGauge(){
  const fng = useFearGreed();
  const v = fng ? fng.value : null;
  const color = fngColor(v);
  const ARC = Math.PI * 50;                 // ความยาวครึ่งวงกลม รัศมี 50 ≈ 157
  const fill = v==null ? 0 : (Math.max(0, Math.min(100, v)) / 100) * ARC;
  return (
    <div className="fng-widget frame">
      <div className="fng-title mono">Fear &amp; Greed</div>
      <svg className="fng-gauge" viewBox="0 0 120 70">
        <path d="M10,62 A50,50 0 0 1 110,62" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="9" strokeLinecap="round"/>
        <path d="M10,62 A50,50 0 0 1 110,62" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${fill} ${ARC * 2}`}/>
        <text x="60" y="58" textAnchor="middle" className="fng-score" style={{fill:color}}>{v==null?'—':v}</text>
      </svg>
      <div className="fng-class" style={{color}}>{fng ? fng.classification : 'loading…'}</div>
    </div>
  );
}

function Station({st, busyAgent, onClick, showLabels}){
  const busy = !!busyAgent;
  return (
    <div className={'station'+(st.zone?' work':'')+(busy?' busy':'')}
      style={{left:st.x+'%', top:st.y+'%'}} onClick={()=>onClick(st)} title={st.name}>
      <div className="ring"></div>
      <div className="tip">{st.icon} {st.name}{busy?' · busy':''}</div>
      {showLabels && st.zone && <div className="zone-tag">{st.tag || st.name}</div>}
      {busy && <div className="spark">✦</div>}
    </div>
  );
}

function Room({agents, busySet, onStationClick, tint, showLabels, showNames, onAgentAction, onAgentBubble, compact, map}){
  // Keep a STABLE DOM order (by id) and use z-index for depth — re-sorting the
  // DOM every frame was what made the agents flicker as they passed each other.
  const agentScale = compact ? 2.35 : 3;
  const activeMap = map || (typeof getMap === 'function' ? getMap() : {desktop:'assets/sao-office.png', mobile:'assets/sao-office.png'});
  const bg = compact ? (activeMap.mobile || activeMap.desktop) : (activeMap.desktop || activeMap.mobile);
  return (
    <div className="stage">
      <div className={'room sao-room'+(tint?' day-tint':'')+(compact?' compact-agents portrait':'')} style={{backgroundImage:`url(${bg})`}}>
        <FearGreedGauge />
        {agents.map(a=>(
          <Agent key={a.id} a={a} scale={agentScale} showName={showNames} z={100 + Math.round(a.pos.y)}
            onAction={onAgentAction} onBubble={onAgentBubble} />
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Room, Station, FearGreedGauge, useFearGreed });
