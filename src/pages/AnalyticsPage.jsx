import React, { useState, useMemo } from 'react';
import useStore from '../store/index';
import { VMETA, VORDER, STATUS_META, STATUSES, PHASES, PHASE_COLORS, STATUS_COLORS, SHORT_MONTHS } from '../data/constants';
import MultiSelect from '../components/ui/MultiSelect';
import { OwnerChips } from '../components/ui/OwnerChip';
import { tago, buildSegments, calcAvgDays } from '../utils/helpers';

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function buildPhaseTransitions(phaseLog, currentPhase) {
  // phaseLog sorted ascending by ts
  if (!phaseLog.length && !currentPhase) return [];
  const transitions = [];
  phaseLog.forEach((e, i) => {
    const next = phaseLog[i + 1];
    const enteredAt = e.ts;
    const leftAt = next ? next.ts : null;
    const days = leftAt ? Math.round((leftAt - enteredAt) / 86400000) : Math.round((Date.now() - enteredAt) / 86400000);
    transitions.push({ phase: e.to, enteredAt, leftAt, days, by: e.by, current: !leftAt });
  });
  // If currentPhase not in log at all (set directly without log entry), add it
  if (currentPhase && !transitions.find(t => t.current)) {
    transitions.push({ phase: currentPhase, enteredAt: null, leftAt: null, days: null, by: null, current: true, noLog: true });
  }
  return transitions;
}

const STATUS_BADGE = {
  'On Track': 'b-green', Launched: 'b-purple', 'PRD Complete': 'b-blue',
  Delayed: 'b-red', Blocked: 'b-red', 'Not started': 'b-gray',
  Paused: 'b-amber', Deprioritized: 'b-gray',
};

export default function AnalyticsPage() {
  const projects = useStore(s => s.projects);
  const weekData = useStore(s => s.weekData);
  const weeks = useStore(s => s.weeks);
  const changeLog = useStore(s => s.changeLog);

  const [filterV, setFilterV] = useState([]);
  const [filterPhase, setFilterPhase] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [search, setSearch] = useState('');

  // Latest status for a project (most recent week with data)
  const getLatestStatus = (pid) => {
    for (let i = weeks.length - 1; i >= 0; i--) {
      const d = weekData[weeks[i].id]?.[pid];
      if (d?.updated_at) return d.status || 'Not started';
    }
    return weekData[weeks[0]?.id]?.[pid]?.status || 'Not started';
  };

  const filtered = useMemo(() => projects.filter(p => {
    if (filterV.length > 0 && !filterV.includes(p.v)) return false;
    if (filterPhase.length > 0 && !filterPhase.includes(p.phase || '')) return false;
    if (filterStatus.length > 0 && !filterStatus.includes(getLatestStatus(p.id))) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.owner.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [projects, filterV, filterPhase, filterStatus, search, weekData, weeks]);

  // ── KPI stats ──
  const total = filtered.length;
  const launched = filtered.filter(p => getLatestStatus(p.id) === 'Launched').length;
  const atRisk = filtered.filter(p => ['Blocked', 'Delayed'].includes(getLatestStatus(p.id))).length;
  const onTrack = filtered.filter(p => getLatestStatus(p.id) === 'On Track').length;
  const avgDaysToLaunch = calcAvgDays(filtered, 'Launched', changeLog);

  // ── Phase distribution ──
  const phaseCounts = {};
  PHASES.filter(Boolean).forEach(ph => { phaseCounts[ph] = 0; });
  phaseCounts['No phase'] = 0;
  filtered.forEach(p => {
    const ph = p.phase || 'No phase';
    phaseCounts[ph] = (phaseCounts[ph] || 0) + 1;
  });
  const maxPhase = Math.max(1, ...Object.values(phaseCounts));

  // ── Status distribution ──
  const statusCounts = {};
  filtered.forEach(p => {
    const s = getLatestStatus(p.id);
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  const maxStatus = Math.max(1, ...Object.values(statusCounts));

  // ── Weekly status trend (chronological, last 8 weeks) ──
  const trendWeeks = weeks.slice(-8);
  const weekTrend = trendWeeks.map(w => {
    const counts = {};
    STATUSES.forEach(s => { counts[s] = 0; });
    filtered.forEach(p => {
      const s = weekData[w.id]?.[p.id]?.status || 'Not started';
      counts[s]++;
    });
    return { week: w, counts };
  });
  const maxWeekTotal = Math.max(1, ...weekTrend.map(wt =>
    Object.values(wt.counts).reduce((a, b) => a + b, 0)));
  const TREND_ORDER = ['Launched', 'On Track', 'PRD Complete', 'Paused', 'Delayed', 'Blocked', 'Deprioritized', 'Not started'];

  // ── Phase funnel (using changeLog phase events) ──
  const PHASE_ORDER = PHASES.filter(Boolean);
  // Count projects that have ever reached each phase
  const phaseReachCount = {};
  PHASE_ORDER.forEach(ph => { phaseReachCount[ph] = 0; });
  projects.forEach(p => {
    const phLog = changeLog.filter(e => e.pid === p.id && e.field === 'phase');
    const reached = new Set(phLog.map(e => e.to));
    if (p.phase) reached.add(p.phase);
    reached.forEach(ph => {
      if (phaseReachCount[ph] !== undefined) phaseReachCount[ph]++;
    });
  });

  // ── Owner workload ──
  const ownerMap = {};
  filtered.forEach(p => {
    const owner = p.owner || 'Unassigned';
    if (!ownerMap[owner]) ownerMap[owner] = { onTrack: 0, atRisk: 0, launched: 0, other: 0, total: 0 };
    const s = getLatestStatus(p.id);
    ownerMap[owner].total++;
    if (s === 'Launched') ownerMap[owner].launched++;
    else if (s === 'On Track' || s === 'PRD Complete') ownerMap[owner].onTrack++;
    else if (s === 'Delayed' || s === 'Blocked') ownerMap[owner].atRisk++;
    else ownerMap[owner].other++;
  });
  const ownerRows = Object.entries(ownerMap).sort((a, b) => b[1].total - a[1].total).slice(0, 12);

  // ── Recent changelog (filtered projects only) ──
  const recentLog = [...changeLog]
    .filter(e => filtered.find(p => p.id === e.pid))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 25);

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="an-header">
        <div className="an-title">Performance Dashboard</div>
        <div className="an-controls">
          <MultiSelect
            options={VORDER.map(v => ({ value: v, label: VMETA[v].label, color: VMETA[v].color }))}
            selected={filterV}
            onChange={setFilterV}
            placeholder="All verticals"
          />
          <MultiSelect
            options={PHASES.filter(Boolean).map(ph => ({ value: ph, label: ph, color: PHASE_COLORS[ph] }))}
            selected={filterPhase}
            onChange={setFilterPhase}
            placeholder="All phases"
          />
          <MultiSelect
            options={STATUSES}
            selected={filterStatus}
            onChange={setFilterStatus}
            placeholder="All statuses"
          />
          <input
            type="text"
            placeholder="Search project or owner…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--white)', border: '1px solid var(--rule2)', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: 'var(--ink)', outline: 'none', width: 180 }}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="an-cards" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {[
          { val: total,         label: 'Total Projects',     color: 'var(--ink)' },
          { val: launched,      label: 'Launched',           color: 'var(--purple)' },
          { val: onTrack,       label: 'On Track',           color: 'var(--green)' },
          { val: atRisk,        label: 'At Risk',            color: 'var(--red)' },
          { val: avgDaysToLaunch ? `${avgDaysToLaunch}d` : '—', label: 'Avg. Days to Launch', color: 'var(--ink2)' },
        ].map(({ val, label, color }) => (
          <div key={label} className="an-card">
            <div className="an-card-val" style={{ color }}>{val}</div>
            <div className="an-card-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Phase Pipeline */}
      <div className="an-section">
        <div className="an-section-title">Phase Pipeline — Current Distribution</div>
        <div style={{ background: 'var(--white)', border: '1px solid var(--rule)', borderRadius: 'var(--r2)', padding: '18px 22px' }}>
          {PHASE_ORDER.map((ph, pi) => {
            const count = phaseCounts[ph] || 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            const funnel = phaseReachCount[ph] || 0;
            return (
              <div key={ph} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: pi < PHASE_ORDER.length - 1 ? 12 : 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: PHASE_COLORS[ph], flexShrink: 0 }} />
                <div style={{ width: 130, fontSize: 12.5, fontWeight: 600, color: PHASE_COLORS[ph], flexShrink: 0 }}>{ph}</div>
                <div style={{ flex: 1, height: 24, background: 'var(--paper2)', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`, background: PHASE_COLORS[ph],
                    borderRadius: 5, minWidth: count > 0 ? 30 : 0,
                    display: 'flex', alignItems: 'center', paddingLeft: 8,
                    transition: 'width .4s',
                  }}>
                    {count > 0 && <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{count}</span>}
                  </div>
                </div>
                <div style={{ width: 36, textAlign: 'right', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink3)' }}>{pct.toFixed(0)}%</div>
                <div style={{ width: 70, fontSize: 10.5, color: 'var(--ink4)', fontFamily: 'var(--mono)' }} title="projects ever in this phase">
                  {funnel} ever reached
                </div>
              </div>
            );
          })}
          {phaseCounts['No phase'] > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--rule2)' }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--rule2)', flexShrink: 0 }} />
              <div style={{ width: 130, fontSize: 12.5, fontWeight: 600, color: 'var(--ink3)', flexShrink: 0 }}>No phase</div>
              <div style={{ flex: 1, height: 24, background: 'var(--paper2)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(phaseCounts['No phase'] / total) * 100}%`, background: 'var(--rule2)', borderRadius: 5 }} />
              </div>
              <div style={{ width: 36, textAlign: 'right', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink3)' }}>
                {((phaseCounts['No phase'] / total) * 100).toFixed(0)}%
              </div>
              <div style={{ width: 70 }} />
            </div>
          )}
        </div>
      </div>

      {/* 2-col: Status dist + Weekly trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        {/* Status distribution */}
        <div className="an-section" style={{ marginBottom: 0 }}>
          <div className="an-section-title">Status Distribution</div>
          <div style={{ background: 'var(--white)', border: '1px solid var(--rule)', borderRadius: 'var(--r2)', padding: '16px 20px' }}>
            {STATUSES.map(s => {
              const count = statusCounts[s] || 0;
              if (!count) return null;
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                  <div style={{ width: 11, height: 11, borderRadius: 3, background: STATUS_COLORS[s], flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--ink2)' }}>{s}</div>
                  <div style={{ width: 90, height: 9, background: 'var(--paper2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / maxStatus) * 100}%`, background: STATUS_COLORS[s] }} />
                  </div>
                  <div style={{ width: 22, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink)' }}>{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly status trend */}
        <div className="an-section" style={{ marginBottom: 0 }}>
          <div className="an-section-title">Weekly Status Trend</div>
          <div style={{ background: 'var(--white)', border: '1px solid var(--rule)', borderRadius: 'var(--r2)', padding: '16px 20px' }}>
            {weekTrend.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>No weeks available.</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90, marginBottom: 6 }}>
                  {weekTrend.map(({ week, counts }) => (
                    <div key={week.id} style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', height: '100%', gap: 1 }} title={week.label}>
                      {TREND_ORDER.map(s => {
                        const c = counts[s] || 0;
                        if (!c) return null;
                        return (
                          <div key={s}
                            style={{ height: `${(c / maxWeekTotal) * 100}%`, background: STATUS_COLORS[s], borderRadius: 2, minHeight: 2 }}
                            title={`${week.label}\n${s}: ${c}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                  {weekTrend.map(({ week }) => (
                    <div key={week.id} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--ink4)', fontFamily: 'var(--mono)', overflow: 'hidden' }}>
                      {week.label.split('–')[0]?.trim().split(' ').pop()}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {TREND_ORDER.filter(s => weekTrend.some(wt => wt.counts[s] > 0)).map(s => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--ink3)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLORS[s] }} />
                      {s}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Project Lifecycle Timelines */}
      <div className="an-section">
        <div className="an-section-title">Project Lifecycle — Phase Transitions & Duration</div>
        {filtered.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--ink3)', padding: '12px 0' }}>No projects match the current filters.</div>
        )}
        {filtered.slice(0, 40).map(p => {
          const projLog = changeLog.filter(e => e.pid === p.id).sort((a, b) => a.ts - b.ts);
          const latestStatus = getLatestStatus(p.id);
          const badgeCls = STATUS_BADGE[latestStatus] || 'b-gray';
          const sparkWeeks = weeks.slice(-10);

          const phaseLog = projLog.filter(e => e.field === 'phase');
          const phaseSegs = buildSegments(phaseLog, p.phase || '');
          const totalDur = phaseSegs.reduce((a, s) => a + s.dur, 0) || 1;
          const transitions = buildPhaseTransitions(phaseLog, p.phase);
          const totalTrackedDays = transitions.reduce((a, t) => a + (t.days || 0), 0);

          return (
            <div key={p.id} className="proj-timeline-card">
              <div className="ptc-header">
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: VMETA[p.v]?.color, flexShrink: 0 }} />
                <div className="ptc-name">{p.name}</div>
                <div className="ptc-owner">{p.owner ? <OwnerChips ownerStr={p.owner} size="sm" /> : null}</div>
                <span className={`badge ${badgeCls}`}>{latestStatus}</span>
                {p.phase && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: PHASE_COLORS[p.phase], background: PHASE_COLORS[p.phase] + '22', padding: '2px 8px', borderRadius: 10 }}>
                    {p.phase}
                  </span>
                )}
                {totalTrackedDays > 0 && (
                  <div className="ptc-total">{totalTrackedDays}d tracked</div>
                )}
              </div>

              {/* Visual phase bar */}
              {phaseSegs.length > 0 && (
                <div className="phase-bar" style={{ marginBottom: 6 }}>
                  {phaseSegs.map((seg, i) => (
                    <div
                      key={i}
                      className="phase-seg"
                      style={{ width: `${(seg.dur / totalDur) * 100}%`, background: PHASE_COLORS[seg.label] || '#d0ccc4' }}
                      title={`${seg.label}: ${Math.round(seg.dur / 86400000)}d`}
                    >
                      {(seg.dur / totalDur) > 0.14 ? seg.label : ''}
                    </div>
                  ))}
                </div>
              )}

              {/* Phase transition table */}
              {transitions.length > 0 && (
                <div style={{ marginBottom: 10, background: 'var(--paper)', borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--rule)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 90px 90px 70px 1fr', gap: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink3)', fontFamily: 'var(--display)', background: 'var(--paper2)', borderBottom: '1px solid var(--rule2)', padding: '5px 10px' }}>
                    <span>Phase</span><span>Entered</span><span>Exited</span><span>Days</span><span>By</span>
                  </div>
                  {transitions.map((t, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 90px 90px 70px 1fr', gap: 0, padding: '6px 10px', borderBottom: i < transitions.length - 1 ? '1px solid var(--rule)' : 'none', background: t.current ? PHASE_COLORS[t.phase] + '0d' : 'var(--white)', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: PHASE_COLORS[t.phase] || '#d0ccc4', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: t.current ? 700 : 500, color: t.current ? PHASE_COLORS[t.phase] : 'var(--ink)' }}>{t.phase}</span>
                        {t.current && <span style={{ fontSize: 9, color: PHASE_COLORS[t.phase], fontFamily: 'var(--mono)', background: PHASE_COLORS[t.phase] + '20', padding: '1px 4px', borderRadius: 3 }}>now</span>}
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink3)' }}>{fmtDate(t.enteredAt)}</span>
                      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink3)' }}>{t.leftAt ? fmtDate(t.leftAt) : '–'}</span>
                      <span style={{ fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 600, color: t.days > 30 ? 'var(--red)' : t.days > 14 ? 'var(--amber)' : 'var(--ink)' }}>
                        {t.days !== null ? `${t.days}d` : '—'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--ink4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.by || '—'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Weekly status sparkline */}
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                {sparkWeeks.map(w => {
                  const d = weekData[w.id]?.[p.id];
                  const s = d?.status || 'Not started';
                  const hasData = !!d?.updated_at;
                  return (
                    <div key={w.id} title={`${w.label}: ${s}`} style={{
                      width: 18, height: 18, borderRadius: 3, flexShrink: 0,
                      background: hasData ? STATUS_COLORS[s] : 'var(--paper2)',
                      border: `1.5px solid ${hasData ? STATUS_COLORS[s] : 'var(--rule2)'}`,
                      opacity: hasData ? 1 : 0.35,
                    }} />
                  );
                })}
                <span style={{ fontSize: 9.5, color: 'var(--ink4)', marginLeft: 5, fontFamily: 'var(--mono)' }}>← weekly status</span>
              </div>

              {/* Recent change events (status changes) */}
              {projLog.filter(e => e.field === 'status').length > 0 && (
                <div className="status-events">
                  {projLog.filter(e => e.field === 'status').slice(-4).map((e, i) => (
                    <div key={i} className="se-item">
                      <div className="se-dot" style={{ background: STATUS_COLORS[e.to] || '#d0ccc4' }} />
                      <div style={{ fontSize: 9.5, fontFamily: 'var(--mono)', color: 'var(--ink4)', textTransform: 'uppercase', width: 44, flexShrink: 0 }}>status</div>
                      <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{e.from || '—'}</div>
                      <div className="se-arrow">→</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)' }}>{e.to}</div>
                      <div className="se-by">{e.by} · {tago(e.ts)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Owner Workload */}
      <div className="an-section">
        <div className="an-section-title">Owner Workload</div>
        <div style={{ background: 'var(--white)', border: '1px solid var(--rule)', borderRadius: 'var(--r2)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--paper2)', borderBottom: '1.5px solid var(--rule2)' }}>
                {['Owner', 'Total', 'On Track', 'Launched', 'At Risk', 'Load'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink2)', fontFamily: 'var(--display)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ownerRows.map(([owner, d]) => (
                <tr key={owner} style={{ borderBottom: '1px solid var(--rule)' }}>
                  <td style={{ padding: '9px 14px', fontWeight: 500, fontSize: 12.5 }}>{owner}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--mono)', fontSize: 12 }}>{d.total}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green)' }}>{d.onTrack}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--purple)' }}>{d.launched}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: d.atRisk > 0 ? 'var(--red)' : 'var(--ink3)' }}>{d.atRisk}</td>
                  <td style={{ padding: '9px 14px', minWidth: 130 }}>
                    <div style={{ height: 7, background: 'var(--paper2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', display: 'flex' }}>
                        {d.launched > 0 && <div style={{ width: `${(d.launched / d.total) * 100}%`, background: '#6b3fa0' }} />}
                        {d.onTrack > 0 && <div style={{ width: `${(d.onTrack / d.total) * 100}%`, background: '#1a7a4a' }} />}
                        {d.atRisk > 0 && <div style={{ width: `${(d.atRisk / d.total) * 100}%`, background: '#c0392b' }} />}
                        {d.other > 0 && <div style={{ width: `${(d.other / d.total) * 100}%`, background: 'var(--paper3)' }} />}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ownerRows.length === 0 && <div style={{ padding: '16px', fontSize: 12, color: 'var(--ink3)' }}>No data.</div>}
        </div>
      </div>

      {/* Change Log */}
      <div className="an-section">
        <div className="an-section-title">Recent Changes ({recentLog.length})</div>
        <div style={{ background: 'var(--white)', border: '1px solid var(--rule)', borderRadius: 'var(--r2)', overflow: 'hidden' }}>
          {recentLog.length === 0 && (
            <div style={{ padding: '16px', fontSize: 12, color: 'var(--ink3)' }}>No changes recorded yet. Status and phase changes will appear here.</div>
          )}
          {recentLog.map((e, i) => {
            const proj = projects.find(p => p.id === e.pid);
            const week = weeks.find(w => w.id === e.weekId);
            const dotColor = e.field === 'phase' ? (PHASE_COLORS[e.to] || '#d0ccc4') : (STATUS_COLORS[e.to] || '#d0ccc4');
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', borderBottom: i < recentLog.length - 1 ? '1px solid var(--rule)' : 'none' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink4)', width: 46, textTransform: 'uppercase', flexShrink: 0 }}>{e.field}</div>
                <div style={{ fontWeight: 500, fontSize: 12.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj?.name || e.pid}</div>
                <div style={{ fontSize: 12, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>
                  {e.from || '—'} → <strong style={{ color: 'var(--ink)' }}>{e.to}</strong>
                </div>
                {week && <div style={{ fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{week.label}</div>}
                <div style={{ fontSize: 11, color: 'var(--ink4)', minWidth: 68, textAlign: 'right', flexShrink: 0 }}>{tago(e.ts)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
