import React from 'react';
import useStore from '../../store/index';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function memberColor(name, team) {
  const nm = (name || '').trim().toLowerCase();
  const found = team.find(m =>
    m.name.toLowerCase() === nm ||
    m.name.toLowerCase().startsWith(nm.split(' ')[0])
  );
  return found?.color || '#9ca3af';
}

/** Renders a single name as a chip. */
export function OwnerChip({ name, size = 'md' }) {
  const team = useStore(s => s.team);
  const color = memberColor(name, team);
  const ini = initials(name);
  const sm = size === 'sm';
  return (
    <span className={'owner-chip' + (sm ? ' owner-chip-sm' : '')}>
      <span className="owner-chip-av" style={{ background: color }}>{ini}</span>
      <span className="owner-chip-name">{name}</span>
    </span>
  );
}

/** Splits an owner string by / or , and renders each as a chip. Legacy support. */
export function OwnerChips({ ownerStr, size = 'md' }) {
  if (!ownerStr) return null;
  const names = ownerStr.split(/\/|,/).map(n => n.trim()).filter(Boolean);
  return (
    <div className="owner-chips-wrap">
      {names.map((n, i) => <OwnerChip key={i} name={n} size={size} />)}
    </div>
  );
}

/** Renders chips by resolving an array of owner IDs against the team list. */
export function OwnerChipsByIds({ ownerIds, team, size = 'md' }) {
  if (!ownerIds?.length) return null;
  const sm = size === 'sm';
  return (
    <div className="owner-chips-wrap">
      {ownerIds.map(id => {
        const m = team.find(t => t.id === id);
        if (!m) return null;
        return (
          <span key={id} className={'owner-chip' + (sm ? ' owner-chip-sm' : '')}>
            <span className="owner-chip-av" style={{ background: m.color }}>{initials(m.name)}</span>
            <span className="owner-chip-name">{m.name}</span>
          </span>
        );
      })}
    </div>
  );
}
