import React from 'react';
import useStore from '../store/index';
import { VMETA, VORDER, STATUS_META, STATUSES } from '../data/constants';

const STATUS_ORDER = ['Blocked', 'Delayed', 'Not started', 'On Track', 'PRD Complete', 'Launched', 'Paused', 'Deprioritized'];

export default function ExecPage() {
  const projects = useStore(s => s.projects);
  const weekData = useStore(s => s.weekData);
  const activeWeek = useStore(s => s.activeWeek);
  const weeks = useStore(s => s.weeks);
  const activeWeekObj = weeks.find(w => w.id === activeWeek);

  const getStatus = (pid) => weekData[activeWeek]?.[pid]?.status || 'Not started';

  const atRisk = projects.filter(p => ['Blocked', 'Delayed'].includes(getStatus(p.id)));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Exec Summary</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            {activeWeekObj?.label || 'No week selected'} · {projects.length} projects total
          </div>
        </div>
      </div>

      <div className="exec-grid">
        {VORDER.map(v => {
          const vProjects = projects.filter(p => p.v === v);
          if (!vProjects.length) return null;

          const counts = {};
          vProjects.forEach(p => {
            const s = getStatus(p.id);
            counts[s] = (counts[s] || 0) + 1;
          });

          const atRiskV = vProjects.filter(p => ['Blocked', 'Delayed'].includes(getStatus(p.id)));

          return (
            <div key={v} className="exec-card">
              <div className="exec-card-header">
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: VMETA[v].color, flexShrink: 0 }} />
                {VMETA[v].label}
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--text4)' }}>
                  {vProjects.length} projects
                </span>
              </div>

              <div className="exec-stats">
                {[
                  { label: 'On Track', key: 'On Track', color: '#22c55e' },
                  { label: 'Launched', key: 'Launched', color: '#a855f7' },
                  { label: 'At Risk', key: null, color: '#ef4444' },
                  { label: 'PRD Done', key: 'PRD Complete', color: '#3b82f6' },
                ].map(({ label, key, color }) => {
                  const n = key
                    ? (counts[key] || 0)
                    : (counts['Blocked'] || 0) + (counts['Delayed'] || 0);
                  return (
                    <div key={label} className="exec-stat">
                      <div className="exec-stat-n" style={{ color: n > 0 ? color : 'var(--text4)' }}>{n}</div>
                      <div className="exec-stat-l">{label}</div>
                    </div>
                  );
                })}
              </div>

              {atRiskV.length > 0 && (
                <div className="exec-issues">
                  {atRiskV.map(p => {
                    const s = getStatus(p.id);
                    const meta = STATUS_META[s] || STATUS_META['Not started'];
                    return (
                      <div key={p.id} className="exec-issue">
                        <span className={`status-pill ${meta.pill}`} style={{ fontSize: 10 }}>{s}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {atRisk.length > 0 && (
        <div className="changelog-section" style={{ marginTop: 20 }}>
          <h3>All At-Risk Projects ({atRisk.length})</h3>
          {atRisk.map(p => {
            const s = getStatus(p.id);
            const meta = STATUS_META[s] || STATUS_META['Not started'];
            const wd = weekData[activeWeek]?.[p.id];
            return (
              <div key={p.id} className="log-item" style={{ alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flexShrink: 0, paddingTop: 2 }}>
                  <span className={`status-pill ${meta.pill}`} style={{ fontSize: 10 }}>{s}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {VMETA[p.v]?.label} · {p.owner}
                  </div>
                  {wd?.engNotes && (
                    <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>⚠ {wd.engNotes}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
