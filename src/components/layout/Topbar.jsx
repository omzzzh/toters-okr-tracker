import React, { useState, useEffect, useRef, useContext } from 'react';
import useStore from '../../store/index';
import { SCRIPT_URL as CONFIG_SCRIPT_URL } from '../../config';
import { AuthContext } from '../AuthGate';

export default function Topbar() {
  const { signOut } = useContext(AuthContext);
  const userName = useStore(s => s.userName);
  const setUserName = useStore(s => s.setUserName);
  const openProjectModal = useStore(s => s.openProjectModal);
  const activeWeek = useStore(s => s.activeWeek);
  const setActiveWeek = useStore(s => s.setActiveWeek);
  const weeks = useStore(s => s.weeks);
  const syncStatus = useStore(s => s.syncStatus);
  const syncError  = useStore(s => s.syncError);
  const lastSynced = useStore(s => s.lastSynced);
  const settingsScriptUrl = useStore(s => s.settings?.scriptUrl);
  const scriptUrl = CONFIG_SCRIPT_URL || settingsScriptUrl;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(userName);
  const inputRef = useRef(null);

  const initials = (name) => (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const handleChipClick = () => { setDraft(userName); setEditing(true); };
  const handleBlur = () => { setUserName(draft.trim() || userName); setEditing(false); };
  const handleKey = (e) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    if (e.key === 'Escape') { setDraft(userName); setEditing(false); }
  };

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  // Group weeks by quarter for optgroups
  const qMap = {};
  weeks.forEach(w => {
    const q = w.quarter || 'Q2 2026';
    if (!qMap[q]) qMap[q] = [];
    qMap[q].push(w);
  });
  const qOrder = ['Q2 2026', 'Q1 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027'].filter(q => qMap[q]);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="logo">
          <div className="logo-mark">T</div>
          <div>
            <div className="logo-text">Toters Product</div>
            <div className="logo-sub">OKR Tracker</div>
          </div>
        </div>

        {/* Week selector — center of topbar */}
        <div className="topbar-week-sel">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ink3)', flexShrink: 0 }}>
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <select
            value={activeWeek || ''}
            onChange={e => setActiveWeek(e.target.value)}
          >
            {qOrder.map(q => (
              <optgroup key={q} label={q}>
                {qMap[q].map(w => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {scriptUrl && (
          <div className="sync-indicator" title={syncStatus === 'error' ? syncError : syncStatus === 'synced' && lastSynced ? `Last synced ${new Date(lastSynced).toLocaleTimeString()}` : ''}>
            {syncStatus === 'syncing' && <><span className="sync-dot syncing" />Syncing…</>}
            {syncStatus === 'synced'  && <><span className="sync-dot synced"  />Synced</>}
            {syncStatus === 'error'   && <><span className="sync-dot error"   />Sync error</>}
            {syncStatus === 'idle'    && <><span className="sync-dot idle"    />Sheets DB</>}
          </div>
        )}

        <div className="topbar-right">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKey}
              style={{ background: 'var(--paper)', border: '1px solid var(--rule2)', borderRadius: 20, padding: '5px 12px', fontSize: 12, outline: 'none', width: 140 }}
              placeholder="Your name"
            />
          ) : (
            <div className="user-chip" onClick={handleChipClick} title="Click to set your name">
              <div className="user-dot">{initials(userName)}</div>
              <span>{userName || 'Set name'}</span>
            </div>
          )}
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 11px' }} onClick={() => openProjectModal()}>
            + Project
          </button>
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 9px', color: 'var(--ink3)' }} onClick={signOut} title="Sign out">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
