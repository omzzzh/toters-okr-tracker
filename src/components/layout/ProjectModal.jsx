import React, { useState, useEffect } from 'react';
import useStore from '../../store/index';
import { VMETA, VORDER, PHASES } from '../../data/constants';
import { useToastCtx } from '../../App';

export default function ProjectModal() {
  const open = useStore(s => s.projectModalOpen);
  const editId = useStore(s => s.projectModalEditId);
  const closeProjectModal = useStore(s => s.closeProjectModal);
  const projects = useStore(s => s.projects);
  const addProject = useStore(s => s.addProject);
  const updateProject = useStore(s => s.updateProject);
  const deleteProjects = useStore(s => s.deleteProjects);
  const showToast = useToastCtx();

  const blank = { v: 'shopping', obj: '', name: '', owner: '', prdDate: '', due: '', phase: '' };
  const [form, setForm] = useState(blank);

  const editProject = projects.find(p => p.id === editId);

  useEffect(() => {
    if (!open) return;
    setForm(editProject ? { ...editProject } : blank);
  }, [open, editId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editId) {
      updateProject(editId, form);
      showToast('Project updated');
    } else {
      addProject({ ...form, id: 'p' + Date.now() });
      showToast('Project added');
    }
    closeProjectModal();
  };

  const handleDelete = () => {
    if (!editId) return;
    if (!confirm(`Delete "${editProject?.name}"? This cannot be undone.`)) return;
    deleteProjects([editId]);
    showToast('Project deleted');
    closeProjectModal();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeProjectModal()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <h2>{editId ? 'Edit Project' : 'Add Project'}</h2>

        <div className="modal-field">
          <label>Vertical</label>
          <select value={form.v} onChange={e => set('v', e.target.value)}>
            {VORDER.map(v => <option key={v} value={v}>{VMETA[v].label}</option>)}
          </select>
        </div>

        <div className="modal-field">
          <label>Objective</label>
          <input type="text" placeholder="e.g. A1] Improve ease of use" value={form.obj} onChange={e => set('obj', e.target.value)} />
        </div>

        <div className="modal-field">
          <label>Project Name *</label>
          <input type="text" placeholder="Project name" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>

        <div className="modal-field">
          <label>Owner(s)</label>
          <input type="text" placeholder="e.g. Marwa Stephan / John Homsy" value={form.owner} onChange={e => set('owner', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="modal-field">
            <label>Due Date</label>
            <input type="text" placeholder="e.g. May 17" value={form.due} onChange={e => set('due', e.target.value)} />
          </div>
          <div className="modal-field">
            <label>Original PRD Date</label>
            <input type="text" placeholder="e.g. Mar 12" value={form.prdDate} onChange={e => set('prdDate', e.target.value)} />
          </div>
        </div>

        <div className="modal-field">
          <label>Phase</label>
          <select value={form.phase} onChange={e => set('phase', e.target.value)}>
            <option value="">— none —</option>
            {PHASES.filter(Boolean).map(ph => <option key={ph} value={ph}>{ph}</option>)}
          </select>
        </div>

        <div className="modal-actions">
          {editId && (
            <button className="btn danger" onClick={handleDelete}>Delete</button>
          )}
          <button className="btn" onClick={closeProjectModal}>Cancel</button>
          <button className="btn primary" onClick={handleSave}>
            {editId ? 'Save Changes' : 'Add Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
