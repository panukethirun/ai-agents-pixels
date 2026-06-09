/* ===== Dungeon room (main dashboard view) ===== */

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

function Room({agents, busySet, onStationClick, tint, showLabels, showNames, onAgentAction, onAgentBubble, compact}){
  // Keep a STABLE DOM order (by id) and use z-index for depth — re-sorting the
  // DOM every frame was what made the agents flicker as they passed each other.
  const agentScale = compact ? 2.35 : 3;
  return (
    <div className="stage">
      <div className={'room sao-room'+(tint?' day-tint':'')+(compact?' compact-agents':'')} style={{backgroundImage:'url(assets/sao-office.png)'}}>
        {agents.map(a=>(
          <Agent key={a.id} a={a} scale={agentScale} showName={showNames} z={100 + Math.round(a.pos.y)}
            onAction={onAgentAction} onBubble={onAgentBubble} />
        ))}
      </div>
      <div className="room-hint mono">✦ Party standing by on the front rail</div>
    </div>
  );
}

Object.assign(window, { Room, Station });
