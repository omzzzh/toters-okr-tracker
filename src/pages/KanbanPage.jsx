import React, { useState, useMemo } from 'react';
import useStore from '../store/index';
import { VMETA, VORDER, PHASES, PHASE_COLORS, STATUS_COLORS, STATUS_META } from '../data/constants';
import MultiSelect from '../components/ui/MultiSelect';
import { OwnerChips } from '../components/ui/OwnerChip';

const KANBAN_COLS = [
  { id: 'none',            label: 'No Phase',       color: '#b0b6bf' },
  { id: 'Discovery',       label: 'Discovery',      color: PHASE_COLORS.Discovery },
  { id: 'Alignment',       label: 'Alignment',      color: PHASE_COLORS.Alignment },
  { id: 'PRD Development', label: 'PRD Development',color: PHASE_COLORS['PRD Development'] },
  { id: 'ENG Handover',    label: 'ENG Handover',   color: PHASE_COLORS['ENG Handover'] },
  { id: 'Development',     label: 'Development',    color: PHASE_COLORS.Development },
  { id: 'launched',        label: '🚀 Launched',    color: '#6b3fa0' },
];

const STATUS_BADGE = {
  'On Track': 'b-green', Launched: 'b-purple', 'PRD Complete': 'b-blue',
  Delayed: 'b-red', Blocked: 'b-red', 'Not started': 'b-gray',
  Paused: 'b-amber', Deprioritized: 'b-gray',
};

export default function KanbanPage() {
  const projects = useStore(s => s.projects);
  const weekData = useStore(s => s.weekData);
  const weeks = useStore(s => s.weeks);
  const openProjectModal = useStore(s => s.openProjectModal);

  const [filterOwner, setFilterOwner] = useState([]);
  const [filterV, setFilterV] = useState([]);
  const [search, setSearch] = useState('');

  const getLatestStatus = (pid) => {
    for (let i = weeks.length - 1; i >= 0; i--) {
      const d = weekData[weeks[i].id]?.[pid];
      if (d?.updated_at) return d.status || 'Not started';
    }
    return weekData[weeks[0]?.id]?.[pid]?.status || 'Not started';
  };

  const getLatestWD = (pid) => {
    for (let i = weeks.length - 1; i >= 0; i--) {
      const d = weekData[weeks[i].id]?.[pid];
      if (d?.updated_at) return d;
    }
    return weekData[weeks[0]?.id]?.[pid] || {};
  };

  const allOwners = useMemo(() => {
    const s = new Set();
    projects.forEach(p => {
      if (p.owner) p.owner.split(/\/|,/).forEach(o => { const t = o.trim(); if (t) s.add(t); });
    });
    return [...s].sort();
  }, [projects]);

  const filtered = useMemo(() => projects.filter(p => {
    if (filterV.length > 0 && !filterV.includes(p.v)) return false;
    if (filterOwner.length > 0) {
      const ownerParts = p.owner.split(/\/|,/).map(s => s.trim().toLowerCase());
      if (!filterOwner.some(o => ownerParts.some(op => op.includes(o.toLowerCase())))) return false;
    }
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [projects, filterOwner, filterV, search]);

  const getColId = (p) => {
    const s = getLatestStatus(p.id);
    if (s === 'Launched') return 'launched';
    if (p.phase && PHASES.includes(p.phase)) return p.phase;
    return 'none';
  };

  const colMap = useMemo(() => {
    const m = {};
    KANBAN_COLS.forEach(c => { m[c.id] = []; });
    filtered.forEach(p => {
      const col = getColId(p);
      (m[col] = m[col] || []).push(p);
    });
    return m;
  }, [filtered, weekData, weeks]);

  return (
    <div className="kanban-page">
      <div className="kanban-toolbar">
        <span className="kanban-title">Kanban Board</span>
        <MultiSelect
          options={allOwners}
          selected={filterOwner}
          onChange={setFilterOwner}
          placeholder="All team members"
        />
        <MultiSelect
          options={VORDER.map(v => ({ value: v, label: VMETA[v].label, color: VMETA[v].color }))}
          selected={filterV}
          onChange={setFilterV}
          placeholder="All verticals"
        />
        <input
          type="text"
          placeholder="Search projects…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span style={{ fontSize: 11, color: 'var(--ink3)', marginLeft: 'auto', fontFamily: 'var(--mono)' }}>
          {filtered.length} projects
        </span>
      </div>

      <div className="kanban-board">
        {KANBAN_COLS.map(col => {
          const cards = colMap[col.id] || [];
          return (
            <div key={col.id} className="kanban-col">
              <div className="kanban-col-hd" style={{ borderTop: `3px solid ${col.color}` }}>
                <span className="kanban-col-label" style={{ color: col.color }}>{col.label}</span>
                <span className="kanban-col-cnt">{cards.length}</span>
              </div>
              <div className="kanban-col-body">
                {cards.map(p => {
                  const status = getLatestStatus(p.id);
                  const wd = getLatestWD(p.id);
                  const badgeCls = STATUS_BADGE[status] || 'b-gray';
                  return (
                    <div
                      key={p.id}
                      className="kanban-card"
                      style={{ borderLeft: `3px solid ${STATUS_COLORS[status] || '#d0ccc4'}` }}
                      onClick={() => openProjectModal(p.id)}
                      title="Click to edit"
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: VMETA[p.v]?.color, flexShrink: 0, marginTop: 3 }} />
                        <div className="kanban-card-name">{p.name}</div>
                      </div>
                      {p.obj && <div className="kanban-card-obj">{p.obj}</div>}
                      <div className="kanban-card-foot">
                        {p.owner ? <OwnerChips ownerStr={p.owner} size="sm" /> : null}
                        <span className={`badge ${badgeCls}`} style={{ fontSize: 10, padding: '1px 6px' }}>{status}</span>
                      </div>
                      {wd.progress && (
                        <div className="kanban-card-progress">{wd.progress}</div>
                      )}
                      {p.due && (
                        <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 6, fontFamily: 'var(--mono)' }}>
                          Due: {p.due}
                        </div>
                      )}
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <div className="kanban-empty">Empty</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
