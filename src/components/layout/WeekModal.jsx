import React, { useState, useEffect } from 'react';
import useStore from '../../store/index';
import { formatWeekLabel, getMonday, quarterFromMonday } from '../../utils/helpers';
import { useToastCtx } from '../../App';

export default function WeekModal() {
  const open = useStore(s => s.weekModalOpen);
  const editId = useStore(s => s.weekModalEditId);
  const closeWeekModal = useStore(s => s.closeWeekModal);
  const weeks = useStore(s => s.weeks);
  const addWeek = useStore(s => s.addWeek);
  const renameWeek = useStore(s => s.renameWeek);
  const deleteWeek = useStore(s => s.deleteWeek);
  const setActiveWeek = useStore(s => s.setActiveWeek);
  const showToast = useToastCtx();

  const [tab, setTab] = useState('new'); // 'new' | 'edit'
  const [label, setLabel] = useState('');
  const [quarter, setQuarter] = useState('');
  const [copyFrom, setCopyFrom] = useState('');
  const [useDate, setUseDate] = useState(true);
  const [dateVal, setDateVal] = useState('');

  const editWeek = weeks.find(w => w.id === editId);

  useEffect(() => {
    if (!open) return;
    if (editId && editWeek) {
      setTab('edit');
      setLabel(editWeek.label);
      setQuarter(editWeek.quarter || '');
    } else {
      setTab('new');
      // Default to current week's Monday
      const mon = getMonday(new Date());
      const iso = mon.toISOString().slice(0, 10);
      setDateVal(iso);
      setLabel(formatWeekLabel(mon));
      setQuarter(quarterFromMonday(mon));
      setCopyFrom(weeks[0]?.id || '');
    }
  }, [open, editId]);

  const handleDateChange = (val) => {
    setDateVal(val);
    if (!val) return;
    const d = new Date(val + 'T00:00:00');
    const mon = getMonday(d);
    setLabel(formatWeekLabel(mon));
    setQuarter(quarterFromMonday(mon));
  };

  const handleSave = () => {
    if (!label.trim()) return;
    if (tab === 'edit' && editId) {
      renameWeek(editId, label.trim());
      showToast('Week updated');
    } else {
      const id = addWeek(label.trim(), quarter.trim(), copyFrom || null);
      setActiveWeek(id);
      showToast('Week created');
    }
    closeWeekModal();
  };

  const handleDelete = () => {
    if (!editId) return;
    if (!confirm(`Delete week "${editWeek?.label}"? This cannot be undone.`)) return;
    deleteWeek(editId);
    showToast('Week deleted');
    closeWeekModal();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeWeekModal()}>
      <div className="modal">
        <h2>{editId ? 'Edit Week' : 'New Week'}</h2>

        {!editId && (
          <div className="modal-tabs">
            <div className={'modal-tab' + (tab === 'new' ? ' active' : '')} onClick={() => setTab('new')}>Create from date</div>
            <div className={'modal-tab' + (tab === 'manual' ? ' active' : '')} onClick={() => setTab('manual')}>Manual</div>
          </div>
        )}

        {tab === 'new' && !editId && (
          <div className="modal-field">
            <label>Pick any day in the week</label>
            <input type="date" value={dateVal} onChange={e => handleDateChange(e.target.value)} />
          </div>
        )}

        <div className="modal-field">
          <label>Week Label</label>
          <input
            type="text"
            placeholder="e.g. Apr 27 – May 1, 2026"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
        </div>

        <div className="modal-field">
          <label>Quarter</label>
          <input
            type="text"
            placeholder="e.g. Q2 2026"
            value={quarter}
            onChange={e => setQuarter(e.target.value)}
          />
        </div>

        {!editId && (
          <div className="modal-field">
            <label>Copy statuses from</label>
            <select value={copyFrom} onChange={e => setCopyFrom(e.target.value)}>
              <option value="">— blank —</option>
              {weeks.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
            </select>
          </div>
        )}

        <div className="modal-actions">
          {editId && (
            <button className="btn danger" onClick={handleDelete}>Delete Week</button>
          )}
          <button className="btn" onClick={closeWeekModal}>Cancel</button>
          <button className="btn primary" onClick={handleSave}>
            {editId ? 'Save Changes' : 'Create Week'}
          </button>
        </div>
      </div>
    </div>
  );
}
