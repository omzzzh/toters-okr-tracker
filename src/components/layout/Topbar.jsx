import React from 'react';
import useStore from '../../store/index';

export default function Topbar() {
  const activeWeek = useStore(s => s.activeWeek);
  const weeks = useStore(s => s.weeks);
  const userName = useStore(s => s.userName);
  const setUserName = useStore(s => s.setUserName);
  const setWeekDropdownOpen = useStore(s => s.setWeekDropdownOpen);
  const weekDropdownOpen = useStore(s => s.weekDropdownOpen);
  const openWeekModal = useStore(s => s.openWeekModal);
  const openProjectModal = useStore(s => s.openProjectModal);

  const currentWeek = weeks.find(w => w.id === activeWeek);

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div className="topbar-brand-dot" />
        Toters OKR
      </div>

      <button
        className="topbar-week"
        onClick={() => setWeekDropdownOpen(!weekDropdownOpen)}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {currentWeek ? currentWeek.label : 'Select week'}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <div className="topbar-spacer" />

      <button className="topbar-btn" onClick={() => openProjectModal()}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Project
      </button>

      <button className="topbar-btn primary" onClick={() => openWeekModal()}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New Week
      </button>

      <div className="topbar-username">
        <label htmlFor="tb-username">You:</label>
        <input
          id="tb-username"
          type="text"
          placeholder="Your name"
          value={userName}
          onChange={e => setUserName(e.target.value)}
        />
      </div>
    </header>
  );
}
