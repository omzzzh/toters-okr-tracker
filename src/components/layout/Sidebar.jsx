import React, { useState, useEffect, useRef } from 'react';
import useStore from '../../store/index';

const SECTIONS = [
  {
    views: [
      { id: 'exec', label: 'Executive Summary', icon: '📊' },
    ],
  },
  {
    views: [
      { id: 'okr',    label: 'OKR Tracker',  icon: '📋' },
      { id: 'kanban', label: 'Kanban Board',  icon: '🗂' },
    ],
  },
  {
    views: [
      { id: 'analytics', label: 'Performance', icon: '⚡' },
      { id: 'scoring',   label: 'OKR Scoring', icon: '🎯' },
    ],
  },
  {
    views: [
      { id: 'grid',    label: 'Project Grid',   icon: '⊞' },
      { id: 'project', label: 'Project Detail', icon: '🔍' },
    ],
  },
  {
    views: [
      { id: 'team', label: 'Team', icon: '👥' },
    ],
  },
];

export default function Sidebar() {
  const activeView = useStore(s => s.activeView);
  const setActiveView = useStore(s => s.setActiveView);
  const activeWeek = useStore(s => s.activeWeek);
  const setActiveWeek = useStore(s => s.setActiveWeek);
  const weeks = useStore(s => s.weeks);
  const weekData = useStore(s => s.weekData);
  const collapsedQuarters = useStore(s => s.collapsedQuarters);
  const toggleQuarter = useStore(s => s.toggleQuarter);
  const openWeekModal = useStore(s => s.openWeekModal);
  const renameWeek = useStore(s => s.renameWeek);
  const deleteWeek = useStore(s => s.deleteWeek);

  const [menuWeekId, setMenuWeekId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const dropdownRef = useRef(null);
  const renameInputRef = useRef(null);

  // Group weeks by quarter
  const qMap = {};
  weeks.forEach(w => {
    const q = w.quarter || 'Q2 2026';
    if (!qMap[q]) qMap[q] = [];
    qMap[q].push(w);
  });
  const qOrder = ['Q2 2026', 'Q1 2026', 'Q3 2026', 'Q4 2026'].filter(q => qMap[q]);

  const updatedCount = (wid) => weekData[wid]
    ? Object.values(weekData[wid]).filter(d => d.updated_at).length
    : 0;

  const openMenu = (e, wid) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left });
    setMenuWeekId(wid);
    setRenaming(false);
    setRenameVal(weeks.find(w => w.id === wid)?.label || '');
  };

  const closeMenu = () => { setMenuWeekId(null); setRenaming(false); };

  useEffect(() => {
    if (!menuWeekId) return;
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) closeMenu(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuWeekId]);

  useEffect(() => { if (renaming && renameInputRef.current) renameInputRef.current.focus(); }, [renaming]);

  const handleRename = () => {
    if (!renameVal.trim()) return;
    renameWeek(menuWeekId, renameVal.trim());
    closeMenu();
  };

  const handleDelete = () => {
    const w = weeks.find(x => x.id === menuWeekId);
    if (!w) return;
    if (!window.confirm(`Delete "${w.label}"? All updates and comments for this week will be permanently removed.`)) return;
    deleteWeek(menuWeekId);
    closeMenu();
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-top">
        {SECTIONS.map((sec, si) => (
          <React.Fragment key={si}>
            {si > 0 && <div className="sidebar-divider" />}
            {sec.views.map(v => (
              <div
                key={v.id}
                className={'sidebar-nav-item' + (activeView === v.id ? ' active' : '')}
                onClick={() => setActiveView(v.id)}
              >
                <span className="sidebar-nav-icon">{v.icon}</span>
                {v.label}
              </div>
            ))}
          </React.Fragment>
        ))}
        <div className="sidebar-divider" />
        {qOrder.map(q => {
          const isOpen = !collapsedQuarters.has(q);
          return (
            <div key={q} className={'sidebar-section' + (isOpen ? ' open' : '')}>
              <div className="sidebar-quarter" onClick={() => toggleQuarter(q)}>
                <span className="sidebar-q-icon">▶</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: .6 }}>
                  <rect x=".5" y=".5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                  <line x1=".5" y1="4" x2="11.5" y2="4" stroke="currentColor" strokeWidth="1.2"/>
                  <line x1="3.5" y1=".5" x2="3.5" y2="4" stroke="currentColor" strokeWidth="1.2"/>
                  <line x1="8.5" y1=".5" x2="8.5" y2="4" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                {q}
              </div>
              <div className="sidebar-weeks">
                {qMap[q].map(w => (
                  <div
                    key={w.id}
                    className={'sidebar-week' + (w.id === activeWeek ? ' active' : '')}
                    onClick={() => setActiveWeek(w.id)}
                  >
                    <span className="sw-dot" />
                    <span className="sw-label">{w.label}</span>
                    <span className="sw-cnt">{updatedCount(w.id)}</span>
                    <span
                      className="sw-menu-btn"
                      onClick={e => openMenu(e, w.id)}
                      title="Rename or delete"
                    >⋯</span>
                  </div>
                ))}
                <div className="sidebar-add" onClick={() => openWeekModal(null, q)}>+ Add week</div>
              </div>
            </div>
          );
        })}
      </div>
      <div>
        <div className="sidebar-divider" />
        <div
          className={'sidebar-nav-item' + (activeView === 'settings' ? ' active' : '')}
          onClick={() => setActiveView('settings')}
        >
          <span className="sidebar-nav-icon">⚙️</span>
          Settings
        </div>
      </div>

      {/* Week menu dropdown */}
      {menuWeekId && (
        <div
          ref={dropdownRef}
          className="sw-dropdown"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <div className={'sw-rename-row' + (renaming ? ' open' : '')}>
            <input
              ref={renameInputRef}
              className="sw-rename-input"
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              placeholder="Week label…"
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') closeMenu(); }}
            />
            <button className="sw-rename-ok" onClick={handleRename}>✓</button>
          </div>
          {!renaming && (
            <>
              <div className="sw-dd-item" onClick={() => setRenaming(true)}>✏️ Rename week</div>
              <div className="sw-dd-sep" />
              <div className="sw-dd-item danger" onClick={handleDelete}>🗑 Delete week</div>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
