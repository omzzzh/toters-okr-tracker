import React, { useEffect, useRef } from 'react';
import useStore from '../../store/index';

export default function WeekDropdown() {
  const open = useStore(s => s.weekDropdownOpen);
  const weeks = useStore(s => s.weeks);
  const activeWeek = useStore(s => s.activeWeek);
  const setActiveWeek = useStore(s => s.setActiveWeek);
  const setWeekDropdownOpen = useStore(s => s.setWeekDropdownOpen);
  const openWeekModal = useStore(s => s.openWeekModal);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setWeekDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!open) return null;

  // Group weeks by quarter
  const byQuarter = {};
  weeks.forEach(w => {
    const q = w.quarter || 'Other';
    if (!byQuarter[q]) byQuarter[q] = [];
    byQuarter[q].push(w);
  });

  return (
    <div className="week-dropdown" ref={ref}>
      <div className="week-dropdown-header">
        <span>Weeks</span>
        <button
          className="topbar-btn"
          style={{ fontSize: 11, padding: '3px 9px' }}
          onClick={() => openWeekModal()}
        >
          + New Week
        </button>
      </div>

      {Object.entries(byQuarter).map(([quarter, qWeeks]) => (
        <div key={quarter}>
          <div style={{ padding: '6px 14px 3px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text4)', background: 'var(--surface2)' }}>
            {quarter}
          </div>
          {qWeeks.map(w => (
            <div
              key={w.id}
              className={'week-dropdown-item' + (w.id === activeWeek ? ' active' : '')}
              onClick={() => { setActiveWeek(w.id); setWeekDropdownOpen(false); }}
            >
              <div className="week-dropdown-label">{w.label}</div>
              <div className="week-dropdown-actions" onClick={e => e.stopPropagation()}>
                <button
                  className="week-icon-btn"
                  title="Edit week"
                  onClick={() => { openWeekModal(w.id); setWeekDropdownOpen(false); }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
