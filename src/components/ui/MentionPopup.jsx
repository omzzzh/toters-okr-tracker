import React, { useEffect, useRef } from 'react';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function MentionPopup({ popup, onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!popup.open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popup.open]);

  if (!popup.open || !popup.matches?.length) return null;

  return (
    <div
      ref={ref}
      className="mention-popup"
      style={{ top: popup.y, left: popup.x }}
    >
      {popup.matches.map((m, i) => (
        <div
          key={m.id || m.name}
          className={'mention-popup-item' + (i === popup.focused ? ' focused' : '')}
          onMouseDown={e => { e.preventDefault(); onSelect(m.name); }}
        >
          <div className="mention-popup-av" style={{ background: m.color }}>{initials(m.name)}</div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>{m.name}</div>
            {m.role && <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{m.role}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
