import React, { useState } from 'react';
import useStore from '../store/index';
import { VMETA, VORDER, STATUS_META } from '../data/constants';
import { tago } from '../utils/helpers';
import { OwnerChip, OwnerChipsByIds } from '../components/ui/OwnerChip';
import { useToastCtx } from '../App';

function sbadge(s) {
  const m = { 'On Track': 'b-green', Launched: 'b-purple', 'PRD Complete': 'b-blue', Delayed: 'b-red', Blocked: 'b-red', 'Not started': 'b-gray', Paused: 'b-amber', Deprioritized: 'b-gray' };
  return <span className={`badge ${m[s] || 'b-gray'}`}>{s}</span>;
}

export default function ExecPage() {
  const projects = useStore(s => s.projects);
  const weekData = useStore(s => s.weekData);
  const activeWeek = useStore(s => s.activeWeek);
  const weeks = useStore(s => s.weeks);
  const aiCache = useStore(s => s.aiCache);
  const setAICache = useStore(s => s.setAICache);
  const settings = useStore(s => s.settings);
  const team = useStore(s => s.team);
  const showToast = useToastCtx();

  const [aiGenerating, setAiGenerating] = useState(false);

  const wk = weeks.find(w => w.id === activeWeek);

  const wd = (pid) => weekData[activeWeek]?.[pid] || { status: 'Not started', progress: '', plan: '' };

  if (!wk) {
    return <div className="exec-page"><div className="empty">Select a week from the sidebar.</div></div>;
  }

  const total = projects.length;
  const upd = projects.filter(p => weekData[activeWeek]?.[p.id]?.updated_at).length;
  const launched = projects.filter(p => wd(p.id).status === 'Launched').length;
  const onT = projects.filter(p => { const s = wd(p.id).status; return s === 'On Track' || s === 'Launched'; }).length;
  const atR = projects.filter(p => { const s = wd(p.id).status; return s === 'Delayed' || s === 'Blocked'; }).length;

  const cachedSummary = aiCache[activeWeek];

  const launchedList = projects.filter(p => wd(p.id).status === 'Launched');
  const keyProgress = projects.filter(p => {
    const d = wd(p.id);
    return d.updated_at && d.progress && (d.status === 'On Track' || d.status === 'PRD Complete');
  }).slice(0, 10);
  const blockerList = projects.filter(p => {
    const d = wd(p.id);
    return (d.status === 'Blocked' || d.status === 'Delayed') && d.progress;
  });

  const generateAI = async () => {
    if (aiGenerating) return;
    setAiGenerating(true);
    const updatedProjs = projects.filter(p => weekData[activeWeek]?.[p.id]?.updated_at);
    const summaryData = updatedProjs.slice(0, 30).map(p => {
      const d = wd(p.id);
      const ownerStr = (p.ownerIds || []).map(id => team.find(m => m.id === id)?.name).filter(Boolean).join(', ');
      return `[${VMETA[p.v]?.label}] ${p.name} (${ownerStr}) — Status: ${d.status} | Progress: ${d.progress} | Plan: ${d.plan}`;
    }).join('\n');

    const prompt = `You are writing an executive summary for a product team's weekly OKR update.\n\nWeek: ${wk?.label}\n\nHere is the project update data:\n${summaryData}\n\nWrite a concise executive summary (4-6 paragraphs) that:\n1. Opens with an overall health statement and key momentum\n2. Highlights the most important progress and any launches\n3. Calls out specific blockers and delays that need attention (${atR} projects are at risk)\n4. Ends with the main priorities for next week\n\nWrite in a direct, executive-friendly tone. Be specific about project names and verticals. Don't use bullet points — write flowing paragraphs.`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await res.json();
      if (data.content?.[0]?.text) {
        setAICache(activeWeek, data.content[0].text);
        showToast('✓ AI summary generated');
      } else {
        showToast('⚠️ Could not generate summary (API key needed)');
      }
    } catch (e) {
      showToast('⚠️ AI summary failed: ' + e.message);
    }
    setAiGenerating(false);
  };

  const exportMD = () => {
    let md = `# Executive Summary — Week of ${wk.label}\n\n`;
    md += `**Total projects:** ${total} | **Updated:** ${upd} | **On track:** ${onT} | **At risk:** ${atR} | **Launched:** ${launched}\n\n`;
    if (cachedSummary) md += `## AI Summary\n\n${cachedSummary.text}\n\n`;
    md += `## Vertical Health\n\n`;
    VORDER.forEach(v => {
      const vp = projects.filter(p => p.v === v);
      const st = (s) => vp.filter(p => wd(p.id).status === s).length;
      const vOn = vp.filter(p => { const s2 = wd(p.id).status; return s2 === 'On Track' || s2 === 'Launched'; }).length;
      md += `- **${VMETA[v].label}**: ${vp.length} projects, ${vOn} on track, ${st('Delayed')} delayed, ${st('Blocked')} blocked\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `exec-summary-${(wk.label || '').replace(/[^a-z0-9]/gi, '-')}.md`;
    a.click();
    showToast('✓ Exported');
  };

  return (
    <div className="exec-page">
      <div className="exec-header">
        <div>
          <div className="exec-title">Executive Summary</div>
          <div className="exec-week">Week of {wk.label}</div>
        </div>
        <div className="exec-actions">
          <button className="btn btn-ghost btn-sm" onClick={exportMD}>Export .md</button>
          <button className="btn btn-accent btn-sm" onClick={generateAI}>✦ Generate AI summary</button>
        </div>
      </div>

      {/* Stats */}
      <div className="exec-stats">
        <div className="exec-stat"><div className="exec-stat-val">{total}</div><div className="exec-stat-label">Total projects</div></div>
        <div className="exec-stat"><div className="exec-stat-val" style={{ color: 'var(--green)' }}>{upd}</div><div className="exec-stat-label">Updated</div></div>
        <div className="exec-stat"><div className="exec-stat-val" style={{ color: 'var(--accent)' }}>{onT}</div><div className="exec-stat-label">On track</div></div>
        <div className="exec-stat"><div className="exec-stat-val" style={{ color: 'var(--red)' }}>{atR}</div><div className="exec-stat-label">At risk</div></div>
        <div className="exec-stat"><div className="exec-stat-val" style={{ color: 'var(--purple)' }}>{launched}</div><div className="exec-stat-label">Launched</div></div>
      </div>

      {/* AI Summary box */}
      <div className="ai-summary-box">
        <div className="ai-summary-header">
          <span className="ai-badge">✦ AI Summary</span>
          {cachedSummary && <span className="ai-summary-ts">Generated {tago(cachedSummary.ts)}</span>}
        </div>
        {aiGenerating ? (
          <div className="ai-generating">
            <div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" />
            <span style={{ marginLeft: 6, color: 'var(--ink3)', fontSize: 13 }}>Generating executive summary…</span>
          </div>
        ) : cachedSummary ? (
          <div className="ai-summary-text">{cachedSummary.text}</div>
        ) : (
          <div style={{ color: 'var(--ink3)', fontFamily: 'var(--sans)', fontSize: 13 }}>
            Click "Generate AI summary" to create an executive briefing for this week.
          </div>
        )}
      </div>

      {/* Launched this week */}
      <div className="exec-section">
        <div className="exec-section-title">🚀 Launched this week</div>
        {launchedList.length ? (
          <table className="exec-table">
            <thead><tr>
              <th style={{ width: '18%' }}>Project</th>
              <th style={{ width: '12%' }}>Vertical</th>
              <th style={{ width: '15%' }}>Owner</th>
              <th>Progress</th>
            </tr></thead>
            <tbody>
              {launchedList.map(p => {
                const d = wd(p.id);
                return (
                  <tr key={p.id} className="good-row">
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td><span style={{ fontSize: 11, color: VMETA[p.v]?.color, fontWeight: 600 }}>{VMETA[p.v]?.label}</span></td>
                    <td><OwnerChipsByIds ownerIds={p.ownerIds} team={team} size="sm" /></td>
                    <td style={{ fontSize: 12.5 }}>{d.progress}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--ink3)', padding: '8px 0' }}>No launches this week.</div>
        )}
      </div>

      {/* Key progress */}
      <div className="exec-section">
        <div className="exec-section-title">✅ Key progress</div>
        <table className="exec-table">
          <thead><tr>
            <th style={{ width: '18%' }}>Project</th>
            <th style={{ width: '12%' }}>Vertical</th>
            <th style={{ width: '15%' }}>Owner</th>
            <th style={{ width: '27%' }}>Progress this week</th>
            <th>Plan for next week</th>
          </tr></thead>
          <tbody>
            {keyProgress.map(p => {
              const d = wd(p.id);
              return (
                <tr key={p.id} className="good-row">
                  <td style={{ fontWeight: 500, fontSize: 12.5 }}>{p.name}</td>
                  <td><span style={{ fontSize: 11, color: VMETA[p.v]?.color, fontWeight: 600 }}>{VMETA[p.v]?.label}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--ink3)' }}>{(p.ownerIds || []).map(id => team.find(m => m.id === id)?.name).filter(Boolean).join(', ')}</td>
                  <td style={{ fontSize: 12.5 }}>{d.progress}</td>
                  <td style={{ fontSize: 12.5 }}>{d.plan}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Blockers & delays */}
      <div className="exec-section">
        <div className="exec-section-title">⚠️ Blockers & delays</div>
        {blockerList.length ? (
          <table className="exec-table">
            <thead><tr>
              <th style={{ width: '18%' }}>Project</th>
              <th style={{ width: '12%' }}>Vertical</th>
              <th style={{ width: '10%' }}>Status</th>
              <th style={{ width: '15%' }}>Owner</th>
              <th>Issue / progress note</th>
            </tr></thead>
            <tbody>
              {blockerList.map(p => {
                const d = wd(p.id);
                return (
                  <tr key={p.id} className="risk-row">
                    <td style={{ fontWeight: 500, fontSize: 12.5 }}>{p.name}</td>
                    <td><span style={{ fontSize: 11, color: VMETA[p.v]?.color, fontWeight: 600 }}>{VMETA[p.v]?.label}</span></td>
                    <td>{sbadge(d.status)}</td>
                    <td><OwnerChipsByIds ownerIds={p.ownerIds} team={team} size="sm" /></td>
                    <td style={{ fontSize: 12.5 }}>{d.progress}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--ink3)', padding: '8px 0' }}>No blockers or delays logged this week.</div>
        )}
      </div>

      {/* Vertical health snapshot */}
      <div className="exec-section">
        <div className="exec-section-title">📊 Vertical health snapshot</div>
        <table className="exec-table">
          <thead><tr>
            <th>Vertical</th>
            <th>Total</th>
            <th>On track</th>
            <th>Delayed</th>
            <th>Blocked</th>
            <th>Launched</th>
            <th>Not started</th>
          </tr></thead>
          <tbody>
            {VORDER.map(v => {
              const vp = projects.filter(p => p.v === v);
              const st = (s) => vp.filter(p => wd(p.id).status === s).length;
              const vOn = vp.filter(p => { const s = wd(p.id).status; return s === 'On Track' || s === 'Launched'; }).length;
              return (
                <tr key={v}>
                  <td style={{ fontWeight: 600, color: VMETA[v].color }}>{VMETA[v].label}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{vp.length}</td>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--green)' }}>{vOn}</td>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--red)' }}>{st('Delayed')}</td>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--red)' }}>{st('Blocked')}</td>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--purple)' }}>{st('Launched')}</td>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--ink3)' }}>{st('Not started')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
