import React, { useState, useCallback, useEffect, useRef } from 'react';
import useStore from '../store/index';
import { VMETA, VORDER, STATUSES, PHASES, STATUS_META } from '../data/constants';
import MultiSelect from '../components/ui/MultiSelect';
import { useToastCtx } from '../App';

const STATUS_COLORS = {
  'On Track': '#1a7a4a', Launched: '#6b3fa0', 'PRD Complete': '#1a5fa8',
  Delayed: '#c0392b', Blocked: '#c0392b', 'Not started': '#b0b6bf',
  Paused: '#9a6200', Deprioritized: '#b0b6bf',
};

// Map column key to CSS class for column width
const COL_W = {
  v: 'gc-v', obj: 'gc-obj', name: 'gc-name', owner: 'gc-owner',
  prdDate: 'gc-prd', due: 'gc-due', phase: 'gc-phase', status: 'gc-status',
  progress: 'gc-prog', plan: 'gc-plan', engNotes: 'gc-eng',
};

export default function GridPage() {
  const projects = useStore(s => s.projects);
  const weekData = useStore(s => s.weekData);
  const weeks = useStore(s => s.weeks);
  const activeWeek = useStore(s => s.activeWeek);
  const getGridCols = useStore(s => s.getGridCols);
  const latestWeekIdForProject = useStore(s => s.latestWeekIdForProject);
  const saveWeekFieldDirect = useStore(s => s.saveWeekFieldDirect);
  const saveProjectField = useStore(s => s.saveProjectField);
  const addProject = useStore(s => s.addProject);
  const deleteProjects = useStore(s => s.deleteProjects);
  const showToast = useToastCtx();

  const [quarter, setQuarter] = useState('all');
  const [vertical, setVertical] = useState([]);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [clipboard, setClipboard] = useState([]);
  const [lastClick, setLastClick] = useState(-1);
  const wrapRef = useRef(null);

  const allQuarters = ['all', ...[...new Set(weeks.map(w => w.quarter || 'Q2 2026'))].sort().reverse()];
  const activeCols = getGridCols();

  const getWid = useCallback((pid) => latestWeekIdForProject(pid, quarter), [quarter, latestWeekIdForProject, weekData]);

  const getRows = useCallback(() => {
    let rows = projects
      .filter(p =>
        (vertical.length === 0 || vertical.includes(p.v)) &&
        (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.owner.toLowerCase().includes(search.toLowerCase()) || p.obj.toLowerCase().includes(search.toLowerCase()))
      )
      .map((p, i) => {
        const wid = getWid(p.id);
        const d = weekData[wid]?.[p.id] || {};
        const row = { _idx: i, _id: p.id, _wid: wid };
        activeCols.forEach(c => {
          if (c.weekField) row[c.key] = d[c.key] || '';
          else if (c.key === 'v') row[c.key] = VMETA[p.v]?.label || p.v;
          else row[c.key] = p[c.key] || '';
        });
        row.status = d.status || 'Not started';
        return row;
      });

    if (sortCol !== null) {
      const k = activeCols[sortCol]?.key;
      if (k) rows = [...rows].sort((a, b) => (a[k] || '').localeCompare(b[k] || '') * sortDir);
    }
    return rows;
  }, [projects, weekData, vertical, search, sortCol, sortDir, activeCols, getWid]);

  const rows = getRows();

  const handleSort = (ci) => {
    if (sortCol === ci) setSortDir(d => d * -1);
    else { setSortCol(ci); setSortDir(1); }
    setSelected(new Set());
  };

  const handleRowClick = (e, ri) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.shiftKey && lastClick >= 0) {
      const lo = Math.min(ri, lastClick), hi = Math.max(ri, lastClick);
      const s = new Set(selected);
      for (let i = lo; i <= hi; i++) s.add(i);
      setSelected(s);
    } else if (e.ctrlKey || e.metaKey) {
      const s = new Set(selected);
      s.has(ri) ? s.delete(ri) : s.add(ri);
      setSelected(s);
    } else {
      setSelected(new Set([ri]));
    }
    setLastClick(ri);
  };

  const handleCellChange = (ri, ci, val) => {
    const row = rows[ri]; if (!row) return;
    const col = activeCols[ci]; if (!col) return;
    const p = projects.find(x => x.id === row._id); if (!p) return;

    if (col.weekField) {
      const wid = row._wid || activeWeek;
      saveWeekFieldDirect(wid, p.id, col.key, val);
    } else {
      if (col.key === 'v') {
        const entry = Object.entries(VMETA).find(([, m]) => m.label === val);
        if (entry) saveProjectField(p.id, 'v', entry[0]);
      } else {
        saveProjectField(p.id, col.key, val);
      }
    }
  };

  const handleCellKey = (e, ri, ci) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextCi = e.shiftKey ? ci - 1 : ci + 1;
      if (nextCi >= 0 && nextCi < activeCols.length) focusCell(ri, nextCi);
      else if (!e.shiftKey && ri + 1 < rows.length) focusCell(ri + 1, 0);
      else if (e.shiftKey && ri > 0) focusCell(ri - 1, activeCols.length - 1);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (ri + 1 < rows.length) focusCell(ri + 1, ci);
    }
  };

  const focusCell = (ri, ci) => {
    if (!wrapRef.current) return;
    const row = wrapRef.current.querySelector(`tr[data-ri="${ri}"]`);
    if (!row) return;
    const cell = row.querySelector(`[data-ci="${ci}"]`);
    if (cell) { cell.focus(); cell.select?.(); }
  };

  const handleKeyDown = (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); copySelected(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); pasteRows(); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected.size > 0) { e.preventDefault(); deleteSelected(); }
  };

  const copySelected = () => {
    if (!selected.size) { showToast('Select rows first'); return; }
    const cb = Array.from(selected).sort((a, b) => a - b).map(ri => ({ ...rows[ri] }));
    setClipboard(cb);
    showToast(`✓ Copied ${cb.length} row${cb.length > 1 ? 's' : ''}`);
  };

  const pasteRows = () => {
    if (!clipboard.length) { showToast('Nothing to paste — copy rows first'); return; }
    clipboard.forEach(row => {
      const vEntry = Object.entries(VMETA).find(([, m]) => m.label === row.v);
      const newP = {
        id: 'u' + Date.now() + Math.random().toString(36).slice(2, 6),
        v: vEntry ? vEntry[0] : 'shopping',
        obj: row.obj || 'Other', name: (row.name || 'Project') + ' (copy)',
        owner: row.owner || '', prdDate: row.prdDate || '', due: row.due || '', phase: row.phase || '',
      };
      addProject(newP);
      const wid = activeWeek;
      saveWeekFieldDirect(wid, newP.id, 'status', row.status || 'Not started');
      if (row.progress) saveWeekFieldDirect(wid, newP.id, 'progress', row.progress);
      if (row.plan) saveWeekFieldDirect(wid, newP.id, 'plan', row.plan);
      if (row.engNotes) saveWeekFieldDirect(wid, newP.id, 'engNotes', row.engNotes);
    });
    showToast(`✓ Pasted ${clipboard.length} row${clipboard.length > 1 ? 's' : ''}`);
  };

  const deleteSelected = () => {
    if (!selected.size) return;
    const ids = Array.from(selected).map(ri => rows[ri]?._id).filter(Boolean);
    if (!window.confirm(`Delete ${ids.length} project${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    deleteProjects(ids);
    setSelected(new Set());
    showToast(`✓ Deleted ${ids.length} row${ids.length > 1 ? 's' : ''}`);
  };

  const addRow = () => {
    const newP = {
      id: 'u' + Date.now(),
      v: vertical.length === 1 ? vertical[0] : 'shopping',
      obj: 'New objective', name: 'New project', owner: '', prdDate: '', due: '', phase: '',
    };
    addProject(newP);
    showToast('✓ Row added');
    setTimeout(() => {
      if (!wrapRef.current) return;
      const trs = wrapRef.current.querySelectorAll('tbody tr');
      const last = trs[trs.length - 1];
      if (last) { const nc = last.querySelector('[data-ci="2"]'); if (nc) { nc.focus(); nc.select?.(); } }
    }, 80);
  };

  return (
    <div className="grid-page" onKeyDown={handleKeyDown} tabIndex={-1}>
      {/* Toolbar */}
      <div className="grid-toolbar">
        <span className="grid-toolbar-title">⊞ Project Grid</span>
        <select
          style={{ background: 'var(--white)', border: '1px solid var(--rule2)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontFamily: 'var(--display)', fontWeight: 600, color: 'var(--ink)', outline: 'none', cursor: 'pointer', height: 28 }}
          value={quarter}
          onChange={e => { setQuarter(e.target.value); setSelected(new Set()); }}
        >
          {allQuarters.map(q => <option key={q} value={q}>{q === 'all' ? 'All quarters' : q}</option>)}
        </select>
        <MultiSelect
          options={VORDER.map(v => ({ value: v, label: VMETA[v].label, color: VMETA[v].color }))}
          selected={vertical}
          onChange={v => { setVertical(v); setSelected(new Set()); }}
          placeholder="All product areas"
        />
        <input
          type="text"
          placeholder="🔍 Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: 'var(--white)', border: '1px solid var(--rule2)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'var(--ink)', outline: 'none', width: 150, height: 28 }}
        />
        <div className="filter-sep" />
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={addRow}>+ Row</button>
          <button className="btn btn-ghost btn-sm" onClick={copySelected}>Copy</button>
          <button className="btn btn-ghost btn-sm" onClick={pasteRows}>Paste</button>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={deleteSelected}>Delete</button>
        </div>
        <span className="grid-copy-hint">{rows.length} projects · Click to select · Shift+click range · Ctrl+C/V · Tab/Enter to navigate</span>
      </div>

      {/* Table */}
      <div className="grid-wrap" ref={wrapRef}>
        <table className="grid-table">
          <thead>
            <tr>
              <th style={{ width: 32, position: 'sticky', left: 0, zIndex: 11, background: 'var(--paper2)' }}>#</th>
              {activeCols.map((c, ci) => (
                <th
                  key={c.key}
                  className={[COL_W[c.key] || 'gc-name', sortCol === ci ? (sortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''].join(' ')}
                  onClick={() => handleSort(ci)}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const sel = selected.has(ri);
              const statusColor = STATUS_COLORS[row.status] || '#d0ccc4';
              return (
                <tr
                  key={row._id}
                  data-ri={ri}
                  className={sel ? 'g-selected' : ''}
                  style={{ borderLeft: `3px solid ${statusColor}` }}
                  onClick={e => handleRowClick(e, ri)}
                >
                  <td className="grid-row-num">{ri + 1}</td>
                  {activeCols.map((c, ci) => {
                    const val = row[c.key] || '';
                    if (c.type === 'select') {
                      const opts = c.opts ? c.opts() : [];
                      return (
                        <td key={c.key} className={COL_W[c.key] || 'gc-name'}>
                          <select
                            className="grid-cell"
                            data-ri={ri}
                            data-ci={ci}
                            value={val}
                            onChange={e => { e.stopPropagation(); handleCellChange(ri, ci, e.target.value); }}
                            onClick={e => e.stopPropagation()}
                          >
                            {opts.map(o => <option key={o}>{o}</option>)}
                            {!opts.includes(val) && val && <option>{val}</option>}
                          </select>
                        </td>
                      );
                    }
                    return (
                      <td key={c.key} className={COL_W[c.key] || 'gc-name'}>
                        <textarea
                          className="grid-cell"
                          rows={1}
                          data-ri={ri}
                          data-ci={ci}
                          defaultValue={val}
                          onBlur={e => handleCellChange(ri, ci, e.target.value)}
                          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                          onKeyDown={e => handleCellKey(e, ri, ci)}
                          onMouseDown={e => e.stopPropagation()}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
