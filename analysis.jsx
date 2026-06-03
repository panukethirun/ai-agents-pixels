/* ===== Analysis view: structured mock agent workflow ===== */

const {ANALYSIS_SCENARIOS, createWorkflowAnalysis, normalizeTicker} = AnalysisModel;

function ThesisBadge({decision}){
  return <span className={'thesis-badge '+decision.toLowerCase()}>{decision}</span>;
}

function ScenarioPicker({value, onChange}){
  return (
    <div className="scenario-grid">
      {ANALYSIS_SCENARIOS.map(scenario => (
        <button
          key={scenario.id}
          className={'scenario-btn'+(value===scenario.id?' on':'')}
          onClick={() => onChange(scenario.id)}
          type="button">
          <span>{scenario.label}</span>
          <small>{scenario.riskLevel} risk</small>
        </button>
      ))}
    </div>
  );
}

function AnalysisForm({onCreateAnalysis}){
  const [ticker, setTicker] = React.useState('BTC');
  const [scenarioId, setScenarioId] = React.useState('momentum_breakout');
  const [error, setError] = React.useState('');

  const run = (event) => {
    event.preventDefault();
    const symbol = normalizeTicker(ticker);
    if(!symbol){
      setError('Ticker required');
      return;
    }
    setError('');
    const analysis = createWorkflowAnalysis({
      ticker: symbol,
      scenarioId,
      id: `analysis-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    });
    onCreateAnalysis(analysis);
  };

  return (
    <form className="analysis-form" onSubmit={run}>
      <div className="analysis-input-row">
        <label className="analysis-field">
          <span>Ticker</span>
          <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="BTC" />
        </label>
        <button className="btn on analysis-run" type="submit">Run Workflow</button>
      </div>
      {error && <div className="analysis-error">{error}</div>}
      <ScenarioPicker value={scenarioId} onChange={setScenarioId} />
    </form>
  );
}

function AnalysisList({analyses, activeAnalysisId, setActiveAnalysisId}){
  if(!analyses.length){
    return <div className="analysis-empty mono">No analysis yet.</div>;
  }
  return (
    <div className="analysis-session-list">
      {analyses.map(item => (
        <button
          key={item.id}
          type="button"
          className={'analysis-session'+(item.id===activeAnalysisId?' on':'')}
          onClick={() => setActiveAnalysisId(item.id)}>
          <span>{item.ticker}</span>
          <small>{item.scenarioLabel}</small>
          <ThesisBadge decision={item.finalThesis.decision} />
        </button>
      ))}
    </div>
  );
}

function AgentReport({report, tint}){
  return (
    <div className="agent-report">
      <div className="agent-report-head">
        <div className="agent-dot" style={{background:tint}}></div>
        <div>
          <div className="agent-title">{report.name}</div>
          <div className="agent-role">{report.stage} · {report.role}</div>
        </div>
        <div className="agent-confidence">{report.confidence}%</div>
      </div>
      <div className={'stance '+report.stance}>{report.stance}</div>
      <p>{report.summary}</p>
      <ul>
        {report.findings.map((finding, index) => <li key={index}>{finding}</li>)}
      </ul>
      {report.passesTo && <div className="handoff mono">Passes to {report.passesTo}</div>}
    </div>
  );
}

function ClaudeBrief({brief}){
  if(!brief) return null;
  return (
    <div className={'claude-brief '+brief.stance}>
      <div className="claude-brief-head">
        <span className="claude-tag">✨ Claude Market Brief</span>
        <span className="claude-meta mono">{brief.name} · {brief.sector}</span>
      </div>
      <p className="claude-brief-body">{brief.brief}</p>
      <ul className="claude-brief-obs">
        {brief.observations.map((note, index) => <li key={index}>{note}</li>)}
      </ul>
      <div className="claude-brief-foot mono">
        <span className={'stance '+brief.stance}>{brief.stance}</span>
        <span>conviction {brief.confidence}%</span>
      </div>
    </div>
  );
}

function FinalThesis({analysis}){
  const thesis = analysis.finalThesis;
  return (
    <div className={'final-thesis '+thesis.decision.toLowerCase()}>
      <div className="final-head">
        <div>
          <div className="label">Final Thesis</div>
          <h3>{analysis.ticker} · {analysis.scenarioLabel}</h3>
        </div>
        <ThesisBadge decision={thesis.decision} />
      </div>
      <div className="thesis-stats">
        <div><span>Confidence</span><strong>{thesis.confidence}%</strong></div>
        <div><span>Risk</span><strong>{thesis.riskLevel}</strong></div>
        <div><span>Size</span><strong>{thesis.budgetRange}</strong></div>
        <div><span>Window</span><strong>{thesis.holdingWindow}</strong></div>
      </div>
      <p>{thesis.rationale}</p>
      <div className="thesis-columns">
        <div>
          <h4>Risk Warnings</h4>
          <ul>{thesis.riskWarnings.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </div>
        <div>
          <h4>Next Steps</h4>
          <ul>{thesis.nextSteps.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}

function Analysis({analyses, activeAnalysisId, setActiveAnalysisId, onCreateAnalysis, agents, signal}){
  const active = analyses.find(item => item.id===activeAnalysisId) || analyses[0];
  const tintByName = {};
  (agents || []).forEach(agent => { tintByName[agent.name] = agent.tint; });

  return (
    <div className="view-pane frame analysis-view">
      <div className="analysis-top">
        <div>
          <h2>Agent Analysis</h2>
          <div className="desc">
            Claude-authored crypto briefs woven into a 6-agent spot LONG/SHORT workflow.
            {window.AnalysisClaude && <span className="claude-stamp mono"> · ✨ authored {window.AnalysisClaude.GENERATED_AT}</span>}
          </div>
        </div>
        <div className="analysis-top-right">
          {signal && (
            <div className={'live-signal-pill mono '+(signal.confidence>=80?'hot ':'')+(signal.direction==='LONG'?'long':'short')}>
              <span>⚡ Live {signal.sym}</span>
              <strong>{signal.direction} {signal.confidence}%</strong>
              <small>RSI {signal.rsi} · 24h {signal.chg24h>=0?'+':''}{signal.chg24h.toFixed(1)}%</small>
            </div>
          )}
          <div className="analysis-count mono">{analyses.length} session runs</div>
        </div>
      </div>

      <div className="analysis-layout">
        <aside className="analysis-left">
          <AnalysisForm onCreateAnalysis={onCreateAnalysis} />
          <div className="label">Session Runs</div>
          <AnalysisList analyses={analyses} activeAnalysisId={activeAnalysisId} setActiveAnalysisId={setActiveAnalysisId} />
        </aside>

        <section className="analysis-main">
          {!active && <div className="analysis-placeholder mono">Run a workflow to see the agent handoff.</div>}
          {active && (
            <>
              <ClaudeBrief brief={active.claudeBrief} />
              <FinalThesis analysis={active} />
              <div className="label">Agent Reports</div>
              <div className="agent-report-grid">
                {active.reports.map(report => (
                  <AgentReport key={report.agentId} report={report} tint={tintByName[report.name] || 'var(--green)'} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

Object.assign(window, { Analysis, ThesisBadge });
