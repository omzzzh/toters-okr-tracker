import React, { useState, useEffect } from 'react';
import useStore from '../store/index';
import { VMETA, VORDER } from '../data/constants';
import MultiSelect from '../components/ui/MultiSelect';
import { scoreColor } from '../utils/helpers';

const SCORE_STEPS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

function ScoreRow({ project, quarter }) {
  const existing = useStore(s => s.okrScores[quarter]?.[project.id]);
  const saveScore = useStore(s => s.saveScore);

  const [val, setVal] = useState(existing?.score ?? null);
  const [note, setNote] = useState(existing?.note || '');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setVal(existing?.score ?? null);
    setNote(existing?.note || '');
    setDirty(false);
  }, [quarter, project.id, existing?.score, existing?.note]);

  const scoreVal = val !== null ? val : 0;
  const color = scoreColor(scoreVal);

  const handleDot = (d) => {
    setVal(d);
    setDirty(true);
  };

  const handleSave = () => {
    saveScore(quarter, project.id, scoreVal, note);
    setDirty(false);
  };

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 500, fontSize: 12.5 }}>{project.name}</div>
        <div className="sc-obj-label">{project.owner}</div>
      </td>
      <td>
        <div className="score-input-wrap">
          <div className="score-dots">
            {SCORE_STEPS.map(d => {
              const filled = val !== null && d <= val;
              return (
                <div
                  key={d}
                  className={'score-dot' + (filled ? ' filled' : '')}
                  style={filled ? { background: color, borderColor: color } : {}}
                  title={d.toFixed(1)}
                  onClick={() => handleDot(d)}
                />
              );
            })}
          </div>
        </div>
        <div className="score-bar-wrap">
          <div className="score-bar" style={{ width: `${scoreVal * 100}%`, background: color }} />
        </div>
      </td>
      <td>
        <span className="score-val" style={{ color }}>
          {val !== null ? val.toFixed(1) : '—'}
        </span>
      </td>
      <td>
        <textarea
          className="score-note"
          rows={1}
          value={note}
          onChange={e => { setNote(e.target.value); setDirty(true); }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
          placeholder="Note…"
        />
      </td>
      <td style={{ textAlign: 'center' }}>
        {dirty ? (
          <button className="sc-save-btn" onClick={handleSave}>Save</button>
        ) : existing?.score !== undefined ? (
          <span style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'var(--mono)' }}>✓</span>
        ) : null}
      </td>
    </tr>
  );
}

export default function ScoringPage() {
  const projects = useStore(s => s.projects);
  const scoringFilters = useStore(s => s.scoringFilters);
  const setScoringFilter = useStore(s => s.setScoringFilter);
  const scoringQuarter = useStore(s => s.scoringQuarter);
  const setScoringQuarter = useStore(s => s.setScoringQuarter);
  const weeks = useStore(s => s.weeks);
  const okrScores = useStore(s => s.okrScores);

  const quarters = [...new Set(weeks.map(w => w.quarter || 'Q2 2026'))].sort().reverse();

  const verticalFilter = Array.isArray(scoringFilters.vertical) ? scoringFilters.vertical : (scoringFilters.vertical === 'all' ? [] : [scoringFilters.vertical]);

  const filtered = projects.filter(p => {
    if (verticalFilter.length > 0 && !verticalFilter.includes(p.v)) return false;
    if (scoringFilters.search && !p.name.toLowerCase().includes(scoringFilters.search.toLowerCase())) return false;
    if (scoringFilters.band !== 'all') {
      const s = okrScores[scoringQuarter]?.[p.id]?.score;
      if (s === undefined) return scoringFilters.band === 'unscored';
      if (scoringFilters.band === 'unscored') return false;
      if (scoringFilters.band === 'low' && s >= 0.4) return false;
      if (scoringFilters.band === 'mid' && (s < 0.4 || s >= 0.7)) return false;
      if (scoringFilters.band === 'high' && s < 0.7) return false;
    }
    return true;
  });

  const scoredCount = filtered.filter(p => okrScores[scoringQuarter]?.[p.id]?.score !== undefined).length;
  const avgScore = scoredCount
    ? filtered.reduce((a, p) => a + (okrScores[scoringQuarter]?.[p.id]?.score || 0), 0) / scoredCount
    : null;
  const highCount = filtered.filter(p => {
    const s = okrScores[scoringQuarter]?.[p.id]?.score;
    return s !== undefined && s >= 0.7;
  }).length;

  return (
    <div className="scoring-page">
      {/* Header */}
      <div className="sc-header">
        <div>
          <div className="sc-title">OKR Scoring</div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 3 }}>
            Rate project outcomes 0.0 – 1.0 · {scoringQuarter}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="sc-quarter-select"
            value={scoringQuarter}
            onChange={e => setScoringQuarter(e.target.value)}
          >
            {quarters.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          <MultiSelect
            options={VORDER.map(v => ({ value: v, label: VMETA[v].label, color: VMETA[v].color }))}
            selected={verticalFilter}
            onChange={v => setScoringFilter('vertical', v)}
            placeholder="All verticals"
          />
          <select
            style={{ background: 'var(--white)', border: '1px solid var(--rule2)', borderRadius: 20, padding: '5px 12px', fontSize: 12, outline: 'none', cursor: 'pointer' }}
            value={scoringFilters.band}
            onChange={e => setScoringFilter('band', e.target.value)}
          >
            <option value="all">All</option>
            <option value="unscored">Unscored</option>
            <option value="low">Low (&lt;0.4)</option>
            <option value="mid">Mid (0.4–0.7)</option>
            <option value="high">High (&gt;0.7)</option>
          </select>
          <input
            type="text"
            placeholder="Search…"
            value={scoringFilters.search || ''}
            onChange={e => setScoringFilter('search', e.target.value)}
            style={{ background: 'var(--white)', border: '1px solid var(--rule2)', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: 'var(--ink)', outline: 'none', width: 140 }}
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="sc-summary">
        {[
          { val: filtered.length,                    label: 'Total',      color: 'var(--ink)' },
          { val: scoredCount,                         label: 'Scored',     color: 'var(--accent)' },
          { val: filtered.length - scoredCount,       label: 'Unscored',   color: 'var(--ink3)' },
          { val: avgScore !== null ? avgScore.toFixed(2) : '—', label: 'Avg Score', color: avgScore !== null ? scoreColor(avgScore) : 'var(--ink3)' },
          { val: highCount,                           label: '≥ 0.7 High', color: 'var(--green)' },
        ].map(({ val, label, color }) => (
          <div key={label} className="sc-sum-card">
            <div className="sc-sum-val" style={{ color }}>{val}</div>
            <div className="sc-sum-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Scoring tables grouped by vertical */}
      {VORDER.map(v => {
        const vp = filtered.filter(p => p.v === v);
        if (!vp.length) return null;
        const vScored = vp.filter(p => okrScores[scoringQuarter]?.[p.id]?.score !== undefined).length;
        const vAvg = vScored
          ? (vp.reduce((a, p) => a + (okrScores[scoringQuarter]?.[p.id]?.score || 0), 0) / vScored)
          : null;
        return (
          <div key={v} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: VMETA[v].color }} />
              <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13.5, color: VMETA[v].color }}>{VMETA[v].label}</span>
              <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{vScored}/{vp.length} scored</span>
              {vAvg !== null && (
                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: scoreColor(vAvg), fontWeight: 600 }}>avg {vAvg.toFixed(2)}</span>
              )}
            </div>
            <table className="score-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Project</th>
                  <th style={{ width: '38%' }}>Score (0 – 1)</th>
                  <th style={{ width: '7%' }}>Value</th>
                  <th style={{ width: '20%' }}>Note</th>
                  <th style={{ width: '7%' }}></th>
                </tr>
              </thead>
              <tbody>
                {vp.map(p => <ScoreRow key={p.id} project={p} quarter={scoringQuarter} />)}
              </tbody>
            </table>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>
          No projects match the current filters.
        </div>
      )}
    </div>
  );
}
