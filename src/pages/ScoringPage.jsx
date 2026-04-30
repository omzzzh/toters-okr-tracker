import React, { useState } from 'react';
import useStore from '../store/index';
import { VMETA, VORDER } from '../data/constants';
import { scoreColor } from '../utils/helpers';

function ScoreRow({ project, quarter }) {
  const okrScores = useStore(s => s.okrScores);
  const saveScore = useStore(s => s.saveScore);
  const userName = useStore(s => s.userName);

  const existing = okrScores[quarter]?.[project.id];
  const [score, setScore] = useState(existing?.score ?? null);
  const [note, setNote] = useState(existing?.note || '');
  const [editing, setEditing] = useState(false);

  const scoreVal = score !== null ? score : (existing?.score ?? 0);
  const color = scoreColor(Math.round(scoreVal * 10) / 10);

  const save = () => {
    saveScore(quarter, project.id, scoreVal, note);
    setEditing(false);
  };

  return (
    <div className="scoring-row">
      <div>
        <div style={{ fontWeight: 500, fontSize: 12 }}>{project.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{project.owner}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="range"
          className="score-slider"
          min={0} max={10} step={1}
          value={Math.round(scoreVal * 10)}
          onChange={e => { setScore(e.target.value / 10); setEditing(true); }}
          style={{ background: `linear-gradient(to right, ${color} ${scoreVal * 100}%, var(--border2) ${scoreVal * 100}%)` }}
        />
      </div>

      <div>
        <span className="score-badge" style={{ background: color }}>
          {existing?.score !== undefined ? existing.score.toFixed(1) : (score !== null ? scoreVal.toFixed(1) : '—')}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {editing ? (
          <>
            <input
              type="text"
              placeholder="Note…"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 11, outline: 'none' }}
            />
            <button className="btn primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={save}>Save</button>
          </>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {existing?.note || '—'}
          </span>
        )}
      </div>
    </div>
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

  const quarters = [...new Set(weeks.map(w => w.quarter || 'Q2 2026'))];

  const filtered = projects.filter(p => {
    if (scoringFilters.vertical !== 'all' && p.v !== (scoringFilters.vertical)) return false;
    if (scoringFilters.search && !p.name.toLowerCase().includes(scoringFilters.search.toLowerCase())) return false;
    if (scoringFilters.owner && !p.owner.toLowerCase().includes(scoringFilters.owner.toLowerCase())) return false;
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

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">OKR Scoring</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            {scoredCount}/{filtered.length} scored
            {avgScore !== null && ` · Avg: ${avgScore.toFixed(2)}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="filter-select" value={scoringQuarter} onChange={e => setScoringQuarter(e.target.value)}>
            {quarters.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          <select className="filter-select" value={scoringFilters.vertical} onChange={e => setScoringFilter('vertical', e.target.value)}>
            <option value="all">All Verticals</option>
            {VORDER.map(v => <option key={v} value={v}>{VMETA[v].label}</option>)}
          </select>
          <select className="filter-select" value={scoringFilters.band} onChange={e => setScoringFilter('band', e.target.value)}>
            <option value="all">All</option>
            <option value="unscored">Unscored</option>
            <option value="low">Low (&lt;0.4)</option>
            <option value="mid">Mid (0.4–0.7)</option>
            <option value="high">High (&gt;0.7)</option>
          </select>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 160px', gap: 8, padding: '8px 14px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text4)' }}>
          <div>Project</div>
          <div>Score</div>
          <div>Value</div>
          <div>Note</div>
        </div>

        {VORDER.map(v => {
          const vProjects = filtered.filter(p => p.v === v);
          if (!vProjects.length) return null;
          return (
            <div key={v}>
              <div style={{ padding: '6px 14px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: VMETA[v].color }} />
                <span style={{ fontWeight: 700, fontSize: 12 }}>{VMETA[v].label}</span>
                <span style={{ fontSize: 11, color: 'var(--text4)' }}>{vProjects.length}</span>
              </div>
              {vProjects.map(p => <ScoreRow key={p.id} project={p} quarter={scoringQuarter} />)}
            </div>
          );
        })}

        {filtered.length === 0 && <div className="empty">No projects to score.</div>}
      </div>
    </div>
  );
}
