import React, { useState, useRef, useEffect } from 'react';

/**
 * MultiSelect — searchable, multi-option filter dropdown.
 *
 * Props:
 *   options      — array of strings or { value, label, color? }
 *   selected     — string[] of selected values (empty = all)
 *   onChange     — (string[]) => void
 *   placeholder  — text shown when nothing selected (default "All")
 *   allLabel     — label when nothing is selected (default "All")
 *   width        — optional CSS width string (default "160px")
 */
export default function MultiSelect({ options, selected = [], onChange, placeholder, allLabel = 'All', width }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const searchRef = useRef(null);

  const normalized = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  const filtered = search
    ? normalized.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : normalized;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const toggle = (val) => {
    const next = selected.includes(val)
      ? selected.filter(v => v !== val)
      : [...selected, val];
    onChange(next);
  };

  const selectAll = () => { onChange([]); };
  const clearAll = () => { onChange([]); };

  const label = selected.length === 0
    ? (placeholder || allLabel)
    : selected.length === 1
      ? (normalized.find(o => o.value === selected[0])?.label || selected[0])
      : `${selected.length} selected`;

  const hasSelection = selected.length > 0;

  return (
    <div className={'ms-wrap' + (hasSelection ? ' has-selection' : '')} style={width ? { width } : {}} ref={ref}>
      <button
        className="ms-trigger"
        onClick={() => setOpen(v => !v)}
        type="button"
      >
        <span className="ms-trigger-label">{label}</span>
        <svg className="ms-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="ms-dropdown">
          <div className="ms-search-row">
            <input
              ref={searchRef}
              className="ms-search"
              type="text"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setOpen(false)}
            />
          </div>

          <div className="ms-options">
            {filtered.length === 0 && (
              <div className="ms-empty">No results</div>
            )}
            {filtered.map(o => {
              const checked = selected.includes(o.value);
              return (
                <label key={o.value} className={'ms-option' + (checked ? ' checked' : '')}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(o.value)}
                    tabIndex={-1}
                  />
                  {o.color && (
                    <span className="ms-dot" style={{ background: o.color }} />
                  )}
                  <span className="ms-opt-label">{o.label}</span>
                </label>
              );
            })}
          </div>

          {(selected.length > 0 || filtered.length < normalized.length) && (
            <div className="ms-footer">
              {selected.length > 0 && (
                <button className="ms-clear" onClick={clearAll} type="button">Clear all</button>
              )}
              {selected.length < normalized.length && selected.length > 0 && (
                <span className="ms-footer-sep" />
              )}
              {selected.length > 0 && selected.length < normalized.length && (
                <button className="ms-select-all" onClick={selectAll} type="button">Show all</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
