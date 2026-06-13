import React, { useState, useEffect } from 'react';
import useStore from '../../store/index';
import { VMETA, VORDER } from '../../data/constants';
import { useToastCtx } from '../../App';
import OwnerPicker from '../ui/OwnerPicker';

export default function ProjectModal() {
  const open             = useStore(s => s.projectModalOpen);
  const editId           = useStore(s => s.projectModalEditId);
  const closeProjectModal= useStore(s => s.closeProjectModal);
  const projects         = useStore(s => s.projects);
  const objectives       = useStore(s => s.objectives);
  const quarters         = useStore(s => s.quarters);
  const addProject       = useStore(s => s.addProject);
  const updateProject    = useStore(s => s.updateProject);
  const deleteProjects   = useStore(s => s.deleteProjects);
  const team             = useStore(s => s.team);
  const weeks            = useStore(s => s.weeks);
  const showToast        = useToastCtx();

  const defaultQuarterId = quarters[0]?.id || weeks[0]?.quarterId || 'q2-2026';
  const blank = {
    v: 'shopping', quarterId: defaultQuarterId, objectiveId: '',
    name: '', ownerIds: [], prdDate: '', due: '',
    description: '', prdLink: '', designLink: '', briefLink: '', otherLinks: '',
  };

  const [form, setForm] = useState(blank);
  const editProject = projects.find(p => p.id === editId);

  useEffect(() => {
    if (!open) return;
    setForm(editProject ? { ...blank, ...editProject } : { ...blank, quarterId: defaultQuarterId });
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

  // Filter objectives to selected vertical + quarter
  const relevantObjectives = objectives.filter(o =>
    (!form.quarterId || o.quarterId === form.quarterId) &&
    (!form.v || o.v === form.v)
  );
  // If no matches with vertical filter, fall back to just quarter
  const objectiveOptions = relevantObjectives.length > 0
    ? relevantObjectives
    : objectives.filter(o => !form.quarterId || o.quarterId === form.quarterId);

  return (
    <div className="modal-bg open" onClick={e => e.target === e.currentTarget && closeProjectModal()}>
      <div className="modal">
        <div className="modal-title">{editId ? 'Edit project' : 'Add project'}</div>

        <div className="mf">
          <label>Project name</label>
          <input type="text" placeholder="e.g. Homepage search revamp" value={form.name} onChange={e => setF('name', e.target.value)} autoFocus />
        </div>

        <div className="mf-row">
          <div className="mf">
            <label>Vertical</label>
            <select value={form.v} onChange={e => { setF('v', e.target.value); setF('objectiveId', ''); }}>
              {VORDER.map(v => <option key={v} value={v}>{VMETA[v].label}</option>)}
            </select>
          </div>
          <div className="mf">
            <label>Quarter</label>
            <select value={form.quarterId || defaultQuarterId} onChange={e => { setF('quarterId', e.target.value); setF('objectiveId', ''); }}>
              {quarters.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mf">
          <label>Objective / OKR</label>
          <select value={form.objectiveId || ''} onChange={e => setF('objectiveId', e.target.value)}>
            <option value="">— No objective —</option>
            {objectiveOptions.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="mf-row">
          <div className="mf" style={{ flex: 2 }}>
            <label>Owner(s)</label>
            <OwnerPicker value={form.ownerIds || []} onChange={ids => setF('ownerIds', ids)} team={team} />
          </div>
          <div className="mf">
            <label>Due date</label>
            <input type="text" placeholder="e.g. End May" value={form.due} onChange={e => setF('due', e.target.value)} />
          </div>
        </div>

        <div className="mf">
          <label>Original PRD date</label>
          <input type="text" placeholder="e.g. Mar 12" value={form.prdDate || ''} onChange={e => setF('prdDate', e.target.value)} />
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
