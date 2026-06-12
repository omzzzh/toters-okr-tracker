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
  const showToast = useToastCtx();

  const [label, setLabel] = useState('');
  const [quarter, setQuarter] = useState('Q2 2026');
  const [copyFrom, setCopyFrom] = useState('');
  const [dateVal, setDateVal] = useState('');

  useEffect(() => {
    if (!open) return;
    const mon = getMonday(new Date());
    setDateVal(mon.toISOString().slice(0, 10));
    setLabel(formatWeekLabel(mon));
    setQuarter(quarterFromMonday(mon));
    setCopyFrom(weeks[0]?.id || '');
  }, [open]);

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
    addWeek(label.trim(), quarter.trim(), copyFrom || null);
    showToast('✓ Week created');
    closeWeekModal();
  };

  if (!open) return null;

  return (
    <div className="modal-bg open" onClick={e => e.target === e.currentTarget && closeWeekModal()}>
      <div className="modal">
        <div className="modal-title">Add week</div>
        <div className="mf">
          <label>Pick any day in the week</label>
          <input type="date" value={dateVal} onChange={e => handleDateChange(e.target.value)} />
        </div>
        <div className="mf">
          <label>Week label</label>
          <input
            type="text"
            placeholder="e.g. Apr 27 – May 1, 2026"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
        </div>
        <div className="mf">
          <label>Quarter</label>
          <select value={quarter} onChange={e => setQuarter(e.target.value)}>
            {['Q1 2026','Q2 2026','Q3 2026','Q4 2026','Q1 2027','Q2 2027'].map(q =>
              <option key={q} value={q}>{q}</option>
            )}
          </select>
        </div>
        <div className="mf">
          <label>Copy from prior week</label>
          <select value={copyFrom} onChange={e => setCopyFrom(e.target.value)}>
            <option value="">— Start blank —</option>
            {weeks.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
          <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 5, lineHeight: 1.5 }}>
            Copied content will appear in light grey until each PM saves their update for the new week.
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={closeWeekModal}>Cancel</button>
          <button className="btn btn-save" onClick={handleSave}>Add week</button>
        </div>
      </div>
    </div>
  );
}
