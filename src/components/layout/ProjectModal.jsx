import React, { useState, useEffect, useRef } from 'react';
import useStore from '../../store/index';
import { VMETA, VORDER, PHASES, STATUSES } from '../../data/constants';
import { useToastCtx } from '../../App';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function OwnerPicker({ value, onChange, team }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  const selected = value
    ? value.split(/\/|,/).map(n => n.trim()).filter(Boolean)
    : [];

  const toggle = (name) => {
    const next = selected.includes(name)
      ? selected.filter(n => n !== name)
      : [...selected, name];
    onChange(next.join(' / '));
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = team.filter(m => !q || m.name.toLowerCase().includes(q.toLowerCase()) || (m.role || '').toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="owner-picker" ref={ref}>
      <div
        className={'owner-picker-trigger' + (open ? ' open' : '')}
        onClick={() => setOpen(o => !o)}
      >
        {selected.length === 0 ? (
          <span style={{ color: 'var(--ink4)' }}>Select owners…</span>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {selected.map(n => {
              const m = team.find(t => t.name === n);
              return (
                <span key={n} className="owner-picker-chip" style={{ background: m?.color || '#9ca3af' }}>
                  {initials(n)} {n}
                </span>
              );
            })}
          </div>
        )}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, marginLeft: 'auto', opacity: .5 }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      {open && (
        <div className="owner-picker-dropdown">
          <input
            className="owner-picker-search"
            placeholder="Search team…"
            value={q}
            onChange={e => setQ(e.target.value)}
            onClick={e => e.stopPropagation()}
            autoFocus
          />
          <div className="owner-picker-list">
            {filtered.map(m => (
              <div
                key={m.id || m.name}
                className={'owner-picker-item' + (selected.includes(m.name) ? ' selected' : '')}
                onClick={e => { e.stopPropagation(); toggle(m.name); }}
              >
                <div className="owner-picker-av" style={{ background: m.color }}>{initials(m.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                  {m.role && <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{m.role}</div>}
                </div>
                {selected.includes(m.name) && <span style={{ color: 'var(--accent)', fontSize: 14 }}>✓</span>}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--ink3)' }}>No matches.</div>
            )}
          </div>
          {selected.length > 0 && (
            <div className="owner-picker-footer">
              <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{selected.length} selected</span>
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={e => { e.stopPropagation(); onChange(''); }}>
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectModal() {
  const open = useStore(s => s.projectModalOpen);
  const editId = useStore(s => s.projectModalEditId);
  const closeProjectModal = useStore(s => s.closeProjectModal);
  const projects = useStore(s => s.projects);
  const addProject = useStore(s => s.addProject);
  const updateProject = useStore(s => s.updateProject);
  const deleteProjects = useStore(s => s.deleteProjects);
  const team = useStore(s => s.team);
  const showToast = useToastCtx();

  const blank = { v: 'shopping', obj: '', name: '', owner: '', prdDate: '', due: '', phase: '', description: '', prdLink: '', designLink: '', briefLink: '', otherLinks: '' };
  const [form, setForm] = useState(blank);

  const editProject = projects.find(p => p.id === editId);

  useEffect(() => {
    if (!open) return;
    setForm(editProject ? { ...editProject } : blank);
  }, [open, editId]);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editId) {
      updateProject(editId, form);
      showToast('✓ Project updated');
    } else {
      addProject({ ...form, id: 'p' + Date.now() });
      showToast('✓ Project added');
    }
    closeProjectModal();
  };

  const handleDelete = () => {
    if (!editId) return;
    if (!window.confirm(`Delete "${editProject?.name}"? This cannot be undone.`)) return;
    deleteProjects([editId]);
    showToast('✓ Project deleted');
    closeProjectModal();
  };

  if (!open) return null;

  return (
    <div className="modal-bg open" onClick={e => e.target === e.currentTarget && closeProjectModal()}>
      <div className="modal">
        <div className="modal-title">{editId ? 'Edit project' : 'Add project'}</div>

        <div className="mf">
          <label>Project name</label>
          <input type="text" placeholder="e.g. Homepage search revamp" value={form.name} onChange={e => setF('name', e.target.value)} autoFocus />
        </div>

        <div className="mf">
          <label>Objective / OKR</label>
          <input type="text" placeholder="e.g. A1] Improve app ease of use" value={form.obj} onChange={e => setF('obj', e.target.value)} />
        </div>

        <div className="mf-row">
          <div className="mf" style={{ flex: 2 }}>
            <label>Owner(s)</label>
            <OwnerPicker value={form.owner} onChange={v => setF('owner', v)} team={team} />
          </div>
          <div className="mf">
            <label>Due date</label>
            <input type="text" placeholder="e.g. End May" value={form.due} onChange={e => setF('due', e.target.value)} />
          </div>
        </div>

        <div className="mf-row">
          <div className="mf">
            <label>Vertical</label>
            <select value={form.v} onChange={e => setF('v', e.target.value)}>
              {VORDER.map(v => <option key={v} value={v}>{VMETA[v].label}</option>)}
            </select>
          </div>
          <div className="mf">
            <label>Original PRD date</label>
            <input type="text" placeholder="e.g. Mar 12" value={form.prdDate} onChange={e => setF('prdDate', e.target.value)} />
          </div>
        </div>

        <div className="mf">
          <label>Description</label>
          <textarea rows={2} placeholder="What is this project about?" value={form.description || ''} onChange={e => setF('description', e.target.value)} />
        </div>

        <div className="mf">
          <label>Link to PRD</label>
          <input type="text" placeholder="https://…" value={form.prdLink || ''} onChange={e => setF('prdLink', e.target.value)} />
        </div>
        <div className="mf">
          <label>Link to Design</label>
          <input type="text" placeholder="https://…" value={form.designLink || ''} onChange={e => setF('designLink', e.target.value)} />
        </div>
        <div className="mf">
          <label>Link to Product Brief</label>
          <input type="text" placeholder="https://…" value={form.briefLink || ''} onChange={e => setF('briefLink', e.target.value)} />
        </div>
        <div className="mf">
          <label>Other relevant links</label>
          <input type="text" placeholder="https://…" value={form.otherLinks || ''} onChange={e => setF('otherLinks', e.target.value)} />
        </div>

        <div className="modal-foot">
          {editId && (
            <button className="modal-del-btn" onClick={handleDelete}>Delete project</button>
          )}
          <button className="btn btn-ghost" onClick={closeProjectModal}>Cancel</button>
          <button className="btn btn-save" onClick={handleSave}>{editId ? 'Save changes' : 'Add project'}</button>
        </div>
      </div>
    </div>
  );
}
