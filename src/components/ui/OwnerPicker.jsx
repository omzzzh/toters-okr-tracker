import React, { useState, useEffect, useRef } from 'react';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

/**
 * Dropdown that lets users pick one or more team members as owners.
 * value: owner string (names joined by " / ")
 * onChange: called with new owner string on every change
 * team: array of team member objects from the store
 * compact: tighter trigger style for use inside table cells
 */
export default function OwnerPicker({ value, onChange, team, compact = false }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState('');
  const ref             = useRef(null);

  const selected = value
    ? value.split(/\/|,/).map(n => n.trim()).filter(Boolean)
    : [];

  const toggle = (name) => {
    const next = selected.includes(name)
      ? selected.filter(n => n !== name)
      : [...selected, name];
    onChange(next.join(' / '));
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQ('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = team.filter(m =>
    !q ||
    m.name.toLowerCase().includes(q.toLowerCase()) ||
    (m.role || '').toLowerCase().includes(q.toLowerCase())
  );

  if (compact) {
    return (
      <div className="owner-picker" ref={ref} style={{ minWidth: 0 }}>
        <div
          onClick={() => setOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', flexWrap: 'wrap' }}
        >
          {selected.length === 0 ? (
            <span style={{ color: 'var(--ink4)', fontSize: 11 }}>—</span>
          ) : (
            selected.map(n => {
              const m = team.find(t => t.name === n);
              return (
                <span key={n} className="owner-chip owner-chip-sm" style={{ cursor: 'pointer' }}>
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
        {open && (
          <div className="owner-picker-dropdown" style={{ minWidth: 200 }}>
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
                  style={{ padding: '6px 12px' }}
                  onClick={e => { e.stopPropagation(); toggle(m.name); }}
                >
                  <div className="owner-picker-av" style={{ background: m.color, width: 22, height: 22, fontSize: 9 }}>{initials(m.name)}</div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500 }}>{m.name}</div>
                  {selected.includes(m.name) && <span style={{ color: 'var(--accent)', fontSize: 12 }}>✓</span>}
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--ink3)' }}>No matches.</div>
              )}
            </div>
            {selected.length > 0 && (
              <div className="owner-picker-footer">
                <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{selected.length} selected</span>
                <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={e => { e.stopPropagation(); onChange(''); }}>Clear</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="owner-picker" ref={ref}>
      <div
        className={'owner-picker-trigger' + (open ? ' open' : '')}
        onClick={() => setOpen(o => !o)}
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

      {open && (
        <div className="owner-picker-dropdown">
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
                onClick={e => { e.stopPropagation(); toggle(m.name); }}
              >
                <div className="owner-picker-av" style={{ background: m.color }}>{initials(m.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                  {m.jobFamily && <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{m.jobFamily}</div>}
                </div>
                {selected.includes(m.name) && <span style={{ color: 'var(--accent)', fontSize: 14 }}>✓</span>}
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
      )}
    </div>
  );
}
