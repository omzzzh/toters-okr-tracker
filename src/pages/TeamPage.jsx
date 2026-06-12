import React, { useState } from 'react';
import useStore from '../store/index';

const COLORS = [
  '#a855f7','#3b82f6','#22c55e','#f59e0b','#10b981',
  '#6366f1','#ec4899','#f97316','#e8500a','#0ea5e9',
  '#14b8a6','#8b5cf6','#ef4444','#84cc16',
];

const LEVELS = ['IC1','IC2','IC3','IC4','M4','M5','M6','M7'];
const JOB_FAMILIES = ['PM','Designer','UX Research','Lead'];

const JF_COLORS = {
  PM:           { bg: '#eff6ff', color: '#1d4ed8' },
  Designer:     { bg: '#f5f3ff', color: '#6d28d9' },
  'UX Research':{ bg: '#f0fdfa', color: '#0f766e' },
  Lead:         { bg: '#fff7ed', color: '#c2410c' },
};

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function JFBadge({ value }) {
  if (!value) return <span style={{ color: 'var(--ink4)' }}>—</span>;
  const s = JF_COLORS[value] || { bg: 'var(--paper)', color: 'var(--ink3)' };
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, letterSpacing: '.02em' }}>
      {value}
    </span>
  );
}

function LevelBadge({ value }) {
  if (!value) return <span style={{ color: 'var(--ink4)' }}>—</span>;
  return (
    <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'var(--paper)', color: 'var(--ink2)', border: '1px solid var(--rule2)', letterSpacing: '.04em' }}>
      {value}
    </span>
  );
}

function MemberRow({ member, onEdit }) {
  return (
    <tr className="tm-row" onClick={() => onEdit(member.id)}>
      <td className="tm-td tm-td-av">
        <div className="tm-av-sm" style={{ background: member.color }}>{initials(member.name)}</div>
      </td>
      <td className="tm-td tm-td-name">{member.name}</td>
      <td className="tm-td"><JFBadge value={member.jobFamily} /></td>
      <td className="tm-td tm-td-email">{member.email}</td>
      <td className="tm-td tm-td-actions">
        <span className="tm-edit-lnk">Edit</span>
      </td>
    </tr>
  );
}

function MemberFormRow({ initial, colSpan, onSave, onCancel, onDelete }) {
  const [name, setName]           = useState(initial?.name      || '');
  const [email, setEmail]         = useState(initial?.email     || '');
  const [role, setRole]           = useState(initial?.role      || '');
  const [level, setLevel]         = useState(initial?.level     || '');
  const [jobFamily, setJobFamily] = useState(initial?.jobFamily || '');
  const [color, setColor]         = useState(initial?.color     || COLORS[0]);

  const selectStyle = {
    width: '100%', background: 'var(--white)', border: '1px solid var(--rule2)',
    borderRadius: 'var(--r)', color: 'var(--ink)', fontFamily: 'var(--sans)',
    fontSize: 13, padding: '7px 10px', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <tr className="tm-form-row-tr">
      <td colSpan={colSpan} style={{ padding: 0 }}>
        <div className="tm-inline-form">
          <div className="tm-inline-av-col">
            <div className="tm-av-lg" style={{ background: color }}>{initials(name) || '?'}</div>
            <div className="tm-color-picker">
              {COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 14, height: 14, borderRadius: '50%', background: c, cursor: 'pointer',
                    outline: color === c ? '2px solid var(--ink)' : '2px solid transparent',
                    outlineOffset: 1,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="tm-inline-fields">
            <div className="tm-inline-row">
              <div className="mf" style={{ margin: 0, flex: 3 }}>
                <label>Name</label>
                <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} autoFocus />
              </div>
              <div className="mf" style={{ margin: 0, flex: 1 }}>
                <label>Level</label>
                <select value={level} onChange={e => setLevel(e.target.value)} style={selectStyle}>
                  <option value="">—</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="mf" style={{ margin: 0, flex: 2 }}>
                <label>Job Family</label>
                <select value={jobFamily} onChange={e => setJobFamily(e.target.value)} style={selectStyle}>
                  <option value="">—</option>
                  {JOB_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="tm-inline-row" style={{ marginTop: 8 }}>
              <div className="mf" style={{ margin: 0, flex: 3 }}>
                <label>Role</label>
                <input type="text" placeholder="e.g. Product Manager II" value={role} onChange={e => setRole(e.target.value)} />
              </div>
              <div className="mf" style={{ margin: 0, flex: 3 }}>
                <label>Email</label>
                <input type="email" placeholder="name@totersapp.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
              {onDelete && (
                <button
                  className="btn"
                  style={{ marginRight: 'auto', color: 'var(--red)', border: '1px solid var(--red)', background: 'var(--red-bg)', fontSize: 12 }}
                  onClick={onDelete}
                >
                  Remove
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
              <button
                className="btn btn-save btn-sm"
                onClick={() => name.trim() && onSave({ name: name.trim(), email: email.trim(), role: role.trim(), level, jobFamily, color })}
              >
                {initial ? 'Save' : 'Add member'}
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

const JF_ORDER = ['PM', 'Designer', 'UX Research', 'Lead'];

export default function TeamPage() {
  const team        = useStore(s => s.team);
  const addMember   = useStore(s => s.addMember);
  const updateMember = useStore(s => s.updateMember);
  const deleteMember = useStore(s => s.deleteMember);

  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding]       = useState(false);
  const [search, setSearch]       = useState('');
  const [jfFilter, setJfFilter]   = useState('all');

  const filtered = team.filter(m => {
    const matchSearch = !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.role || '').toLowerCase().includes(search.toLowerCase());
    const matchJf = jfFilter === 'all' || m.jobFamily === jfFilter;
    return matchSearch && matchJf;
  });

  // Group by job family for display
  const grouped = JF_ORDER.map(jf => ({
    jf,
    members: filtered.filter(m => m.jobFamily === jf),
  })).filter(g => g.members.length > 0);
  const ungrouped = filtered.filter(m => !m.jobFamily);

  const COL_SPAN = 5;

  const renderRows = (members) => members.map(m =>
    editingId === m.id ? (
      <MemberFormRow
        key={m.id}
        initial={m}
        colSpan={COL_SPAN}
        onSave={patch => { updateMember(m.id, patch); setEditingId(null); }}
        onCancel={() => setEditingId(null)}
        onDelete={() => {
          if (window.confirm(`Remove ${m.name}?`)) { deleteMember(m.id); setEditingId(null); }
        }}
      />
    ) : (
      <MemberRow key={m.id} member={m} onEdit={id => { setEditingId(id); setAdding(false); }} />
    )
  );

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Team Members <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink3)', marginLeft: 6 }}>{team.length} people</span></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--paper)', border: '1px solid var(--rule2)', borderRadius: 20, overflow: 'hidden' }}>
            {['all', ...JF_ORDER].map(jf => (
              <button
                key={jf}
                onClick={() => setJfFilter(jf)}
                style={{
                  padding: '5px 13px', fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)',
                  background: jfFilter === jf ? 'var(--accent)' : 'transparent',
                  color: jfFilter === jf ? '#fff' : 'var(--ink2)',
                  fontWeight: jfFilter === jf ? 600 : 400,
                }}
              >
                {jf === 'all' ? 'All' : jf}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--white)', border: '1px solid var(--rule2)', borderRadius: 20, padding: '5px 14px', fontSize: 12.5, color: 'var(--ink)', outline: 'none', width: 160 }}
          />
          <button className="btn btn-save btn-sm" onClick={() => { setAdding(true); setEditingId(null); }}>
            + Add member
          </button>
        </div>
      </div>

      <div className="tm-table-wrap">
        <table className="tm-table">
          <thead>
            <tr>
              <th className="tm-th tm-th-av" />
              <th className="tm-th">Name</th>
              <th className="tm-th" style={{ width: 110 }}>Family</th>
              <th className="tm-th">Email</th>
              <th className="tm-th tm-th-actions" />
            </tr>
          </thead>
          <tbody>
            {adding && (
              <MemberFormRow
                colSpan={COL_SPAN}
                onSave={m => { addMember(m); setAdding(false); }}
                onCancel={() => setAdding(false)}
              />
            )}
            {jfFilter !== 'all' || search ? (
              <>
                {renderRows(filtered)}
                {filtered.length === 0 && !adding && (
                  <tr>
                    <td colSpan={COL_SPAN} style={{ padding: '20px 16px', fontSize: 13, color: 'var(--ink3)' }}>No team members found.</td>
                  </tr>
                )}
              </>
            ) : (
              <>
                {grouped.map(({ jf, members }) => (
                  <React.Fragment key={jf}>
                    <tr>
                      <td colSpan={COL_SPAN} style={{ padding: '10px 14px 4px', background: 'var(--paper)', borderBottom: '1px solid var(--rule)' }}>
                        <JFBadge value={jf} />
                        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink3)' }}>{members.length}</span>
                      </td>
                    </tr>
                    {renderRows(members)}
                  </React.Fragment>
                ))}
                {ungrouped.length > 0 && renderRows(ungrouped)}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
