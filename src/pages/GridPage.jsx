import React from 'react';
import useStore from '../store/index';
import { VMETA, VORDER, STATUS_META } from '../data/constants';
import { tago } from '../utils/helpers';

export default function GridPage() {
  const projects = useStore(s => s.projects);
  const weekData = useStore(s => s.weekData);
  const gridQuarter = useStore(s => s.gridQuarter);
  const gridVertical = useStore(s => s.gridVertical);
  const gridSearch = useStore(s => s.gridSearch);
  const setGridQuarter = useStore(s => s.setGridQuarter);
  const setGridVertical = useStore(s => s.setGridVertical);
  const setGridSearch = useStore(s => s.setGridSearch);
  const weeks = useStore(s => s.weeks);
  const latestWeekIdForProject = useStore(s => s.latestWeekIdForProject);
  const openProjectModal = useStore(s => s.openProjectModal);

  const quarters = [...new Set(weeks.map(w => w.quarter || 'Q2 2026'))];

  const getLatest = (pid) => {
    const wid = latestWeekIdForProject(pid, gridQuarter);
    return { weekId: wid, wd: weekData[wid]?.[pid] };
  };

  const filtered = projects.filter(p => {
    if (gridVertical !== 'all' && p.v !== gridVertical) return false;
    if (gridSearch && !p.name.toLowerCase().includes(gridSearch.toLowerCase()) && !p.owner.toLowerCase().includes(gridSearch.toLowerCase())) return false;
    return true;
  });

  const grouped = {};
  filtered.forEach(p => {
    const v = p.v;
    if (!grouped[v]) grouped[v] = [];
    grouped[v].push(p);
  });

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Project Grid</div>
      </div>

      <div className="grid-filters">
        <div className="subnav-search" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <svg style={{ position: 'absolute', left: 8, color: 'var(--text4)' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search…"
            value={gridSearch}
            onChange={e => setGridSearch(e.target.value)}
            style={{ padding: '5px 8px 5px 28px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12, width: 200, background: 'var(--surface2)', outline: 'none' }}
          />
        </div>

        <select className="filter-select" value={gridVertical} onChange={e => setGridVertical(e.target.value)}>
          <option value="all">All Verticals</option>
          {VORDER.map(v => <option key={v} value={v}>{VMETA[v].label}</option>)}
        </select>

        <select className="filter-select" value={gridQuarter} onChange={e => setGridQuarter(e.target.value)}>
          <option value="all">All Quarters</option>
          {quarters.map(q => <option key={q} value={q}>{q}</option>)}
        </select>

        <span style={{ fontSize: 11, color: 'var(--text4)', marginLeft: 4 }}>{filtered.length} projects</span>
      </div>

      {VORDER.filter(v => grouped[v]?.length).map(v => (
        <div key={v} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: VMETA[v].color }} />
            <span style={{ fontWeight: 700, fontSize: 13 }}>{VMETA[v].label}</span>
            <span style={{ fontSize: 11, color: 'var(--text4)' }}>{grouped[v].length}</span>
          </div>

          <div className="grid-cards">
            {grouped[v].map(p => {
              const { weekId, wd } = getLatest(p.id);
              const status = wd?.status || 'Not started';
              const meta = STATUS_META[status] || STATUS_META['Not started'];
              const topColor = {
                'On Track': '#22c55e', 'Launched': '#a855f7', 'PRD Complete': '#3b82f6',
                'Delayed': '#ef4444', 'Blocked': '#ef4444', 'Paused': '#f59e0b',
              }[status] || 'var(--border2)';

              return (
                <div
                  key={p.id}
                  className="grid-card"
                  style={{ borderTopColor: topColor, cursor: 'pointer' }}
                  onClick={() => openProjectModal(p.id)}
                >
                  <div className="grid-card-name">{p.name}</div>
                  <div className="grid-card-owner">{p.owner}</div>
                  <div className="grid-card-meta">
                    <span className={`status-pill ${meta.pill}`}>{status}</span>
                    {p.due && <span style={{ fontSize: 11, color: 'var(--text3)' }}>Due: {p.due}</span>}
                  </div>
                  {wd?.progress && (
                    <div className="grid-card-progress" style={{ WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {wd.progress}
                    </div>
                  )}
                  {wd?.updated_at && (
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 6 }}>
                      Updated {tago(wd.updated_at)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && <div className="empty">No projects match your filters.</div>}
    </div>
  );
}
