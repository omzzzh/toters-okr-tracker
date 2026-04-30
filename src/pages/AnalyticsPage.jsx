import React from 'react';
import useStore from '../store/index';
import { VMETA, VORDER, STATUS_META, STATUSES, STATUS_COLORS } from '../data/constants';
import { tago } from '../utils/helpers';

export default function AnalyticsPage() {
  const projects = useStore(s => s.projects);
  const weekData = useStore(s => s.weekData);
  const activeWeek = useStore(s => s.activeWeek);
  const weeks = useStore(s => s.weeks);
  const changeLog = useStore(s => s.changeLog);
  const analyticsFilters = useStore(s => s.analyticsFilters);
  const setAnalyticsFilter = useStore(s => s.setAnalyticsFilter);

  const weekObj = weeks.find(w => w.id === activeWeek);

  const getStatus = (pid) => weekData[activeWeek]?.[pid]?.status || 'Not started';

  const filtered = projects.filter(p => {
    if (analyticsFilters.vertical !== 'all' && p.v !== analyticsFilters.vertical) return false;
    if (analyticsFilters.status && getStatus(p.id) !== analyticsFilters.status) return false;
    if (analyticsFilters.owner && !p.owner.toLowerCase().includes(analyticsFilters.owner.toLowerCase())) return false;
    if (analyticsFilters.search && !p.name.toLowerCase().includes(analyticsFilters.search.toLowerCase())) return false;
    return true;
  });

  // Status counts
  const statusCounts = {};
  filtered.forEach(p => {
    const s = getStatus(p.id);
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  const maxCount = Math.max(1, ...Object.values(statusCounts));

  // Summary stats
  const launched = filtered.filter(p => getStatus(p.id) === 'Launched').length;
  const onTrack = filtered.filter(p => getStatus(p.id) === 'On Track').length;
  const atRisk = filtered.filter(p => ['Blocked', 'Delayed'].includes(getStatus(p.id))).length;
  const updated = Object.values(weekData[activeWeek] || {}).filter(d => d.updated_at && (Date.now() - d.updated_at) < 7 * 86400000).length;

  // Recent changelog
  const recentLog = [...changeLog]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 30);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Analytics</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{weekObj?.label || 'No week selected'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="filter-select" value={analyticsFilters.vertical} onChange={e => setAnalyticsFilter('vertical', e.target.value)}>
            <option value="all">All Verticals</option>
            {VORDER.map(v => <option key={v} value={v}>{VMETA[v].label}</option>)}
          </select>
        </div>
      </div>

      <div className="stat-cards">
        {[
          { n: filtered.length, l: 'Total Projects', color: 'var(--text)' },
          { n: launched, l: 'Launched', color: '#a855f7' },
          { n: onTrack, l: 'On Track', color: '#22c55e' },
          { n: atRisk, l: 'At Risk', color: '#ef4444' },
          { n: updated, l: 'Updated This Week', color: '#3b82f6' },
        ].map(({ n, l, color }) => (
          <div key={l} className="stat-card">
            <div className="stat-card-n" style={{ color }}>{n}</div>
            <div className="stat-card-l">{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="status-bars">
          <h3>Status Breakdown</h3>
          {STATUSES.map(s => {
            const count = statusCounts[s] || 0;
            if (!count && !['On Track', 'Delayed', 'Blocked'].includes(s)) return null;
            const meta = STATUS_META[s] || STATUS_META['Not started'];
            const color = STATUS_COLORS[s] || '#9ca3af';
            return (
              <div key={s} className="bar-row">
                <div className="bar-label">
                  <span className={`status-pill ${meta.pill}`} style={{ fontSize: 10 }}>{s}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(count / maxCount) * 100}%`, background: color }} />
                </div>
                <div className="bar-count">{count}</div>
              </div>
            );
          })}
        </div>

        <div className="status-bars">
          <h3>By Vertical</h3>
          {VORDER.map(v => {
            const vProjects = filtered.filter(p => p.v === v);
            if (!vProjects.length) return null;
            return (
              <div key={v} className="bar-row">
                <div className="bar-label" style={{ color: VMETA[v].color, fontWeight: 600 }}>
                  {VMETA[v].label}
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(vProjects.length / filtered.length) * 100}%`, background: VMETA[v].color }} />
                </div>
                <div className="bar-count">{vProjects.length}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="changelog-section">
        <h3>Change Log ({recentLog.length} recent)</h3>
        {recentLog.length === 0 && <div style={{ color: 'var(--text4)', fontSize: 12 }}>No changes recorded yet.</div>}
        {recentLog.map((e, i) => {
          const project = projects.find(p => p.id === e.pid);
          const week = weeks.find(w => w.id === e.weekId);
          return (
            <div key={i} className="log-item">
              <div className="log-time">{tago(e.ts)}</div>
              <div className="log-project">{project?.name || e.pid}</div>
              <div className="log-change">
                {e.field}: <strong>{e.from || '—'}</strong> → <strong>{e.to}</strong>
                {' '}by {e.by}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
