import React, { useState, useEffect, useRef } from 'react';
import useStore from '../../store/index';
import { VMETA, VORDER, PHASES, STATUSES } from '../../data/constants';
import { useToastCtx } from '../../App';
import OwnerPicker from '../ui/OwnerPicker';


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
