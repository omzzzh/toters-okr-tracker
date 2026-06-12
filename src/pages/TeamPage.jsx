import React, { useState } from 'react';
import useStore from '../store/index';

const COLORS = [
  '#a855f7','#3b82f6','#22c55e','#f59e0b','#10b981',
  '#6366f1','#ec4899','#f97316','#e8500a','#0ea5e9',
  '#14b8a6','#8b5cf6','#ef4444','#84cc16',
];

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function MemberRow({ member, onEdit }) {
  return (
    <tr className="tm-row" onClick={() => onEdit(member.id)}>
      <td className="tm-td tm-td-av">
        <div className="tm-av-sm" style={{ background: member.color }}>{initials(member.name)}</div>
      </td>
      <td className="tm-td tm-td-name">{member.name}</td>
      <td className="tm-td tm-td-role">{member.role || <span style={{ color: 'var(--ink4)' }}>—</span>}</td>
      <td className="tm-td tm-td-email">{member.email}</td>
      <td className="tm-td tm-td-actions">
        <span className="tm-edit-lnk">Edit</span>
      </td>
    </tr>
  );
}

function MemberFormRow({ initial, colSpan, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(initial?.name || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [role, setRole] = useState(initial?.role || '');
  const [color, setColor] = useState(initial?.color || COLORS[0]);

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
                    outline: color === c ? `2px solid var(--ink)` : '2px solid transparent',
                    outlineOffset: 1,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="tm-inline-fields">
            <div className="tm-inline-row">
              <div className="mf" style={{ margin: 0, flex: 2 }}>
                <label>Name</label>
                <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} autoFocus />
              </div>
              <div className="mf" style={{ margin: 0, flex: 2 }}>
                <label>Role</label>
                <input type="text" placeholder="e.g. Product Manager" value={role} onChange={e => setRole(e.target.value)} />
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
                onClick={() => name.trim() && onSave({ name: name.trim(), email: email.trim(), role: role.trim(), color })}
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

export default function TeamPage() {
  const team = useStore(s => s.team);
  const addMember = useStore(s => s.addMember);
  const updateMember = useStore(s => s.updateMember);
  const deleteMember = useStore(s => s.deleteMember);

  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = team.filter(m =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.role || '').toLowerCase().includes(search.toLowerCase())
  );

  const COL_SPAN = 5;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Team Members</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--white)', border: '1px solid var(--rule2)', borderRadius: 20, padding: '5px 14px', fontSize: 12.5, color: 'var(--ink)', outline: 'none', width: 180 }}
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
              <th className="tm-th">Role</th>
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
            {filtered.map(m =>
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
            )}
            {filtered.length === 0 && !adding && (
              <tr>
                <td colSpan={COL_SPAN} style={{ padding: '20px 16px', fontSize: 13, color: 'var(--ink3)' }}>
                  No team members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
