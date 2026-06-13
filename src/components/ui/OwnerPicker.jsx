import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function OwnerPicker({ value, onChange, team, compact = false }) {
  const [open, setOpen]     = useState(false);
  const [q, setQ]           = useState('');
  const [dropPos, setDropPos] = useState(null);
  const triggerRef          = useRef(null);
  const dropRef             = useRef(null);

  const selected = value
    ? value.split(/\/|,/).map(n => n.trim()).filter(Boolean)
    : [];

  const toggle = (name) => {
    const next = selected.includes(name)
      ? selected.filter(n => n !== name)
      : [...selected, name];
    onChange(next.join(' / '));
  };

  const openDrop = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, minWidth: Math.max(220, r.width) });
    }
    setOpen(true);
  };

  const closeDrop = () => { setOpen(false); setQ(''); };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inDrop    = dropRef.current?.contains(e.target);
      if (!inTrigger && !inDrop) closeDrop();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = team.filter(m =>
    !q ||
    m.name.toLowerCase().includes(q.toLowerCase()) ||
    (m.jobFamily || '').toLowerCase().includes(q.toLowerCase())
  );

  const dropdown = open && (
    <div
      ref={dropRef}
      style={{
        position: 'fixed',
        top: dropPos?.top ?? 0,
        left: dropPos?.left ?? 0,
        minWidth: dropPos?.minWidth ?? 220,
        zIndex: 9999,
        background: 'var(--white)',
        border: '1px solid var(--rule2)',
        borderRadius: 'var(--r2)',
        boxShadow: '0 8px 32px rgba(0,0,0,.14)',
        overflow: 'hidden',
      }}
    >
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
            style={compact ? { padding: '6px 12px' } : undefined}
            onClick={e => { e.stopPropagation(); toggle(m.name); }}
          >
            <div
              className="owner-picker-av"
              style={compact ? { background: m.color, width: 22, height: 22, fontSize: 9 } : { background: m.color }}
            >
              {initials(m.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: compact ? 12.5 : 13, fontWeight: 500 }}>{m.name}</div>
              {!compact && m.jobFamily && <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{m.jobFamily}</div>}
            </div>
            {selected.includes(m.name) && <span style={{ color: 'var(--accent)', fontSize: compact ? 12 : 14 }}>✓</span>}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--ink3)' }}>No matches.</div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="owner-picker-footer">
          <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{selected.length} selected</span>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: '2px 8px' }}
            onClick={e => { e.stopPropagation(); onChange(''); }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="owner-picker" ref={triggerRef} style={{ minWidth: 0 }}>
        <div
          onClick={() => open ? closeDrop() : openDrop()}
          style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', flexWrap: 'wrap' }}
        >
          {selected.length === 0 ? (
            <span style={{ color: 'var(--ink4)', fontSize: 11 }}>—</span>
          ) : (
            selected.map(n => {
              const m = team.find(t => t.name === n);
              return (
                <span key={n} className="owner-chip owner-chip-sm">
                  <span className="owner-chip-av" style={{ background: m?.color || '#9ca3af' }}>{initials(n)}</span>
                  <span className="owner-chip-name">{n}</span>
                </span>
              );
            })
          )}
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ opacity: .35, flexShrink: 0 }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        {createPortal(dropdown, document.body)}
      </div>
    );
  }

  return (
    <div className="owner-picker" ref={triggerRef}>
      <div
        className={'owner-picker-trigger' + (open ? ' open' : '')}
        onClick={() => open ? closeDrop() : openDrop()}
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
      {createPortal(dropdown, document.body)}
    </div>
  );
}
