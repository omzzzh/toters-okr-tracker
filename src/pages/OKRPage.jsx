import React, { useState, useEffect, useRef, useCallback } from 'react';
import useStore from '../store/index';
import { VMETA, VORDER, STATUS_META, PHASES, TEAM, STATUSES } from '../data/constants';
import MultiSelect from '../components/ui/MultiSelect';
import { OwnerChips } from '../components/ui/OwnerChip';
import OwnerPicker from '../components/ui/OwnerPicker';
import MentionPopup from '../components/ui/MentionPopup';
import { tago, initials } from '../utils/helpers';
import { emailProjectOwners, emailMentioned } from '../utils/email';
import { useMention, getMentionedMembers } from '../hooks/useMention';
import { useToastCtx } from '../App';

// ── helpers ──────────────────────────────────────
function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function sbadge(s) {
  const m = { 'On Track': 'b-green', Launched: 'b-purple', 'PRD Complete': 'b-blue', Delayed: 'b-red', Blocked: 'b-red', 'Not started': 'b-gray', Paused: 'b-amber', Deprioritized: 'b-gray' };
  return <span className={`badge ${m[s] || 'b-gray'}`}>{s}</span>;
}


function renderMentionsHtml(text) {
  return { __html: esc(text).replace(/@([\w.@totersapp.com]+)/g, '<span class="mention-tag">@$1</span>') };
}

function autogrow(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.max(88, el.scrollHeight) + 'px';
}

// ── Status pill ──────────────────────────────────
function StatusPill({ pid, status, onStatusChange }) {
  const meta = STATUS_META[status] || STATUS_META['Not started'];
  return (
    <div className={`status-pill ${meta.pill}`}>
      <span className="status-pill-dot" />
      <span style={{ flex: 1 }}>{status}</span>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: .5, flexShrink: 0 }}>
        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        value={status}
        onChange={e => onStatusChange(e.target.value)}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', fontSize: 13 }}
      >
        {STATUSES.map(s => <option key={s}>{s}</option>)}
      </select>
    </div>
  );
}

// ── Comments section ────────────────────────────
function Comments({ project, weekId, weekData }) {
  const addComment = useStore(s => s.addComment);
  const userName = useStore(s => s.userName);
  const weeks = useStore(s => s.weeks);
  const settings = useStore(s => s.settings);
  const team = useStore(s => s.team);
  const showToast = useToastCtx();
  const { popup: mentionPopup, onInput: onMentionInput, onKeyDown: onMentionKeyDown, insertMention, close: closeMention } = useMention(team);

  const [name, setName] = useState(userName || '');
  const [text, setText] = useState('');
  const d = weekData[weekId]?.[project.id] || {};
  const comments = d.comments || [];

  useEffect(() => { setName(userName || ''); }, [userName]);

  const post = () => {
    const author = name.trim() || 'Anonymous';
    const t = text.trim();
    if (!t) return;
    addComment(weekId, project.id, author, t);
    setText('');
    showToast('💬 Comment posted');

    const wk = weeks.find(w => w.id === weekId);
    if (settings.ejsPK) {
      emailProjectOwners(settings, project, author, t, wk?.label || '', team);
      getMentionedMembers(t, team).forEach(m => {
        if (m.name !== author) emailMentioned(settings, m, author, project.name, t);
      });
    }
  };

  return (
    <div>
      <div className="c-lbl">Comments{comments.length ? ` (${comments.length})` : ''}</div>
      <div className="c-thread">
        {comments.map((c, i) => {
          const ini = (c.author || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={i} className="c-item">
              <div className="c-av">{ini}</div>
              <div className="c-bub">
                <div className="c-meta">
                  <span className="c-auth">{c.author}</span>
                  <span className="c-time">{tago(c.ts)}</span>
                </div>
                <div className="c-txt" dangerouslySetInnerHTML={renderMentionsHtml(c.text)} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="c-compose">
        <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
        <textarea
          placeholder="Add a comment… use @ to tag someone"
          value={text}
          onChange={e => setText(e.target.value)}
          onInput={onMentionInput}
          rows={1}
          onKeyDown={e => { onMentionKeyDown(e); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) post(); }}
        />
        <MentionPopup popup={mentionPopup} onSelect={insertMention} onClose={closeMention} />
        <button className="btn btn-ghost btn-sm" onClick={post}>Post</button>
      </div>
    </div>
  );
}

// ── Project row (has own draft state) ──────────
function ProjectRow({ project, weekId, weekData, tableCols, ncols, saveProjectField, saveUpdate, saveEngNotes }) {
  const d = weekData[weekId]?.[project.id] || {};
  const team = useStore(s => s.team);
  const [progress, setProgress] = useState(d.progress || '');
  const [plan, setPlan] = useState(d.plan || '');
  const [engNotes, setEngNotes] = useState(d.engNotes || '');
  const [status, setStatus] = useState(d.status || 'Not started');
  const [savedAt, setSavedAt] = useState(d.updated_at || null);
  const [showComments, setShowComments] = useState(false);
  const showToast = useToastCtx();
  const { popup: mentionPopup, onInput: onMentionInput, onKeyDown: onMentionKeyDown, insertMention, close: closeMention } = useMention(team);

  const progressRef = useRef(null);
  const planRef = useRef(null);
  const engRef = useRef(null);

  useEffect(() => {
    setProgress(d.progress || '');
    setPlan(d.plan || '');
    setEngNotes(d.engNotes || '');
    setStatus(d.status || 'Not started');
    setSavedAt(d.updated_at || null);
  }, [weekId, project.id]);

  useEffect(() => { autogrow(progressRef.current); }, [progress]);
  useEffect(() => { autogrow(planRef.current); }, [plan]);
  useEffect(() => { autogrow(engRef.current); }, [engNotes]);

  const isStale = !d.updated_at;
  const meta = STATUS_META[status] || STATUS_META['Not started'];
  const rowCls = `${meta.row}${isStale ? ' row-stale' : ''}`;

  const handleSave = () => {
    saveUpdate(project.id, { progress, plan, status, engNotes });
    setSavedAt(Date.now());
    showToast('✓ Update saved');
  };

  const renderCell = (c) => {
    switch (c.key) {
      case 'name':
        return (
          <td key="name" className="td-proj">
            <textarea
              className="editable-ta td-name"
              defaultValue={project.name}
              ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              onBlur={e => saveProjectField(project.id, 'name', e.target.value)}
            />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 10.5, padding: '2px 8px', color: showComments ? 'var(--accent)' : 'var(--ink3)', borderColor: showComments ? 'var(--accent)' : 'var(--rule2)' }}
                onClick={() => setShowComments(v => !v)}
              >
                💬 {d.comments?.length > 0 ? `${d.comments.length} comment${d.comments.length > 1 ? 's' : ''}` : 'Add comment'}
              </button>
            </div>
            {isStale && <div className="stale-badge">⏳ not updated yet</div>}
          </td>
        );
      case 'owner':
        return (
          <td key="owner" className="td-owner">
            <OwnerPicker
              value={project.owner}
              onChange={v => saveProjectField(project.id, 'owner', v)}
              team={team}
              compact
            />
          </td>
        );
      case 'progress':
        return (
          <td key="progress" className="td-ta">
            <textarea
              ref={progressRef}
              placeholder={c.label + '…'}
              value={progress}
              onChange={e => setProgress(e.target.value)}
              onInput={e => { autogrow(e.target); onMentionInput(e); }}
              onKeyDown={onMentionKeyDown}
            />
            <MentionPopup popup={mentionPopup} onSelect={insertMention} onClose={closeMention} />
          </td>
        );
      case 'plan':
        return (
          <td key="plan" className="td-ta">
            <textarea
              ref={planRef}
              placeholder={c.label + '…'}
              value={plan}
              onChange={e => setPlan(e.target.value)}
              onInput={e => { autogrow(e.target); onMentionInput(e); }}
              onKeyDown={onMentionKeyDown}
            />
            <MentionPopup popup={mentionPopup} onSelect={insertMention} onClose={closeMention} />
          </td>
        );
      case 'engNotes':
        return (
          <td key="engNotes" className="td-ta">
            <textarea
              ref={engRef}
              placeholder={c.label + '…'}
              value={engNotes}
              onChange={e => setEngNotes(e.target.value)}
              onInput={e => { autogrow(e.target); onMentionInput(e); }}
              onKeyDown={onMentionKeyDown}
              onBlur={e => saveEngNotes(project.id, e.target.value)}
            />
            <MentionPopup popup={mentionPopup} onSelect={insertMention} onClose={closeMention} />
          </td>
        );
      case 'prdDate':
        return (
          <td key="prdDate" className="td-due">
            <textarea
              className="editable-ta"
              defaultValue={project.prdDate || ''}
              ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              onBlur={e => saveProjectField(project.id, 'prdDate', e.target.value)}
            />
          </td>
        );
      case 'due':
        return (
          <td key="due" className="td-due">
            <textarea
              className="editable-ta"
              defaultValue={project.due || ''}
              ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              onBlur={e => saveProjectField(project.id, 'due', e.target.value)}
            />
          </td>
        );
      case 'phase':
        return (
          <td key="phase" className="td-phase">
            <select
              className="phase-sel"
              value={project.phase || ''}
              onChange={e => saveProjectField(project.id, 'phase', e.target.value)}
            >
              {PHASES.map(ph => <option key={ph} value={ph}>{ph || '— select —'}</option>)}
            </select>
          </td>
        );
      case 'status':
        return (
          <td key="status" className="td-status">
            <StatusPill pid={project.id} status={status} onStatusChange={setStatus} />
            <div className="td-save">
              <button className="btn btn-save btn-sm" onClick={handleSave}>Save</button>
              {savedAt && <span className="save-ts">✓ {tago(savedAt)}</span>}
            </div>
          </td>
        );
      case 'v': {
        const m = VMETA[project.v] || {};
        return (
          <td key="v" className="td-due" style={{ fontSize: 11, color: m.color, fontWeight: 600 }}>{m.label}</td>
        );
      }
      default: {
        const val = c.weekField ? (d[c.key] || '') : (project[c.key] || '');
        return (
          <td key={c.key} className="td-due">
            <textarea
              className="editable-ta"
              defaultValue={val}
              ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              onBlur={e => saveProjectField(project.id, c.key, e.target.value)}
            />
          </td>
        );
      }
    }
  };

  return (
    <>
      <tr className={rowCls} data-id={project.id}>
        {tableCols.map(renderCell)}
      </tr>
      {showComments && (
        <tr className="td-comments-row">
          <td colSpan={ncols}>
            <div className="td-comments-inner">
              <Comments project={project} weekId={weekId} weekData={weekData} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Export helpers ───────────────────────────────
function exportWeekPDF(wk, projects, weekData, tableCols) {
  if (!wk) return;
  const filtProjects = projects;
  const byV = {};
  filtProjects.forEach(p => { if (!byV[p.v]) byV[p.v] = {}; if (!byV[p.v][p.obj]) byV[p.v][p.obj] = []; byV[p.v][p.obj].push(p); });
  const STATUS_BG = { 'On Track': '#eaf5ee', Launched: '#f4eefb', 'PRD Complete': '#edf4fd', Delayed: '#fdf0ef', Blocked: '#fdf0ef', 'Not started': '#f5f4f0', Paused: '#fdf6e3', Deprioritized: '#f5f4f0' };
  const STATUS_CLR = { 'On Track': '#1a7a4a', Launched: '#6b3fa0', 'PRD Complete': '#1a5fa8', Delayed: '#c0392b', Blocked: '#c0392b', 'Not started': '#7a8190', Paused: '#9a6200', Deprioritized: '#7a8190' };
  let body = `<h1 style="font-family:sans-serif;font-size:22px;font-weight:700;margin:0 0 4px">Toters Product — Weekly OKR Update</h1><p style="font-family:monospace;font-size:13px;color:#7a8190;margin:0 0 24px">Week of ${wk.label}</p>`;
  VORDER.forEach(v => {
    if (!byV[v]) return;
    const m = VMETA[v];
    body += `<h2 style="font-family:sans-serif;font-size:14px;font-weight:700;text-transform:uppercase;color:${m.color};margin:28px 0 10px;border-bottom:2px solid ${m.color};padding-bottom:6px">${m.label}</h2>`;
    Object.entries(byV[v]).forEach(([obj, projs]) => {
      body += `<p style="font-family:monospace;font-size:11px;color:#636b78;margin:8px 0 4px">${obj}</p>`;
      body += `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:12px;margin-bottom:12px"><thead><tr style="background:#eceae4">${tableCols.map(c => `<th style="padding:6px 8px;text-align:left;border:1px solid #d8d5cc;font-size:10px;text-transform:uppercase">${c.label}</th>`).join('')}</tr></thead><tbody>`;
      projs.forEach(p => {
        const d = weekData[wk.id]?.[p.id] || {};
        const status = d.status || 'Not started';
        body += `<tr>${tableCols.map(c => {
          let val = '';
          if (c.key === 'name') val = `<strong>${p.name}</strong><br/><span style="font-size:10px;color:#636b78">${p.obj}</span>`;
          else if (c.key === 'owner') val = p.owner;
          else if (c.key === 'progress') val = d.progress || '';
          else if (c.key === 'plan') val = d.plan || '';
          else if (c.key === 'engNotes') val = d.engNotes || '';
          else if (c.key === 'prdDate') val = p.prdDate || '';
          else if (c.key === 'due') val = p.due || '';
          else if (c.key === 'phase') val = p.phase || '';
          else if (c.key === 'v') val = `<span style="color:${m.color};font-weight:600">${m.label}</span>`;
          else if (c.key === 'status') val = `<span style="background:${STATUS_BG[status]||'#f5f4f0'};color:${STATUS_CLR[status]||'#7a8190'};padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600">${status}</span>`;
          return `<td style="padding:7px 8px;border:1px solid #d8d5cc;vertical-align:top;line-height:1.5">${val}</td>`;
        }).join('')}</tr>`;
      });
      body += `</tbody></table>`;
    });
  });
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>OKR Update — ${wk.label}</title><style>body{margin:24px;color:#111}@media print{body{margin:0}}</style></head><body>${body}</body></html>`;
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

function exportGoogleDoc(wk, projects, weekData) {
  if (!wk) return;
  let content = `Toters Product — Weekly OKR Update\nWeek of ${wk.label}\n\n`;
  const byV = {};
  projects.forEach(p => { if (!byV[p.v]) byV[p.v] = {}; if (!byV[p.v][p.obj]) byV[p.v][p.obj] = []; byV[p.v][p.obj].push(p); });
  VORDER.forEach(v => {
    if (!byV[v]) return;
    content += `${VMETA[v].label.toUpperCase()}\n${'─'.repeat(40)}\n\n`;
    Object.entries(byV[v]).forEach(([obj, projs]) => {
      content += `Objective: ${obj}\n\n`;
      projs.forEach(p => {
        const d = weekData[wk.id]?.[p.id] || {};
        content += `  • ${p.name} (${p.owner})\n    Status: ${d.status || 'Not started'} | Phase: ${p.phase || '—'} | Due: ${p.due || '—'}\n`;
        if (d.progress) content += `    Progress: ${d.progress}\n`;
        if (d.plan) content += `    Next week: ${d.plan}\n`;
        content += '\n';
      });
    });
  });
  navigator.clipboard.writeText(content).then(() => {}).catch(() => {
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `okr-update-${(wk.label || '').replace(/[^a-z0-9]/gi, '-')}.txt`;
    a.click();
  });
  setTimeout(() => window.open('https://docs.google.com/document/create', '_blank'), 300);
}

// ── Main OKRPage ─────────────────────────────────
export default function OKRPage() {
  const projects = useStore(s => s.projects);
  const weekData = useStore(s => s.weekData);
  const activeWeek = useStore(s => s.activeWeek);
  const weeks = useStore(s => s.weeks);
  const filters = useStore(s => s.filters);
  const setFilter = useStore(s => s.setFilter);
  const clearFilters = useStore(s => s.clearFilters);
  const getTableCols = useStore(s => s.getTableCols);
  const saveUpdate = useStore(s => s.saveUpdate);
  const saveProjectField = useStore(s => s.saveProjectField);
  const saveEngNotes = useStore(s => s.saveEngNotes);
  const showToast = useToastCtx();

  const wk = weeks.find(w => w.id === activeWeek);
  const tableCols = getTableCols();

  if (!wk) {
    return <div className="page"><div className="empty">No week selected.</div></div>;
  }

  // Apply filters
  let filt = projects.filter(p => {
    const mv = filters.vertical.length === 0 || filters.vertical.includes(p.v);
    const pStatus = weekData[activeWeek]?.[p.id]?.status || 'Not started';
    const ms = filters.status.length === 0 || filters.status.includes(pStatus);
    const ownerParts = p.owner.split(/\/|,/).map(s => s.trim().toLowerCase());
    const mo = filters.owner.length === 0 || filters.owner.some(o => ownerParts.some(op => op.includes(o.toLowerCase())));
    const mq = !filters.search || p.name.toLowerCase().includes(filters.search.toLowerCase()) || p.owner.toLowerCase().includes(filters.search.toLowerCase()) || p.obj.toLowerCase().includes(filters.search.toLowerCase());
    return mv && ms && mo && mq;
  });

  // Sort
  if (filters.sort === 'name') filt = [...filt].sort((a, b) => a.name.localeCompare(b.name));
  else if (filters.sort === 'status') {
    const ORDER = ['Blocked', 'Delayed', 'Paused', 'Not started', 'PRD Complete', 'On Track', 'Launched', 'Deprioritized'];
    filt = [...filt].sort((a, b) => ORDER.indexOf(weekData[activeWeek]?.[a.id]?.status || 'Not started') - ORDER.indexOf(weekData[activeWeek]?.[b.id]?.status || 'Not started'));
  } else if (filters.sort === 'due') filt = [...filt].sort((a, b) => (a.due || '').localeCompare(b.due || ''));
  else if (filters.sort === 'updated') filt = [...filt].sort((a, b) => (weekData[activeWeek]?.[b.id]?.updated_at || 0) - (weekData[activeWeek]?.[a.id]?.updated_at || 0));

  const total = filt.length;
  const upd = filt.filter(p => weekData[activeWeek]?.[p.id]?.updated_at).length;
  const onT = filt.filter(p => { const s = weekData[activeWeek]?.[p.id]?.status; return s === 'On Track' || s === 'Launched'; }).length;
  const atR = filt.filter(p => { const s = weekData[activeWeek]?.[p.id]?.status; return s === 'Delayed' || s === 'Blocked'; }).length;
  const hasFilters = filters.status.length > 0 || filters.owner.length > 0 || filters.vertical.length > 0 || filters.search || filters.sort !== 'default';

  const allOwners = [...new Set(projects.flatMap(p => p.owner.split(/\/|,/).map(s => s.trim()).filter(Boolean)))].sort();

  const byV = {};
  filt.forEach(p => { if (!byV[p.v]) byV[p.v] = {}; if (!byV[p.v][p.obj]) byV[p.v][p.obj] = []; byV[p.v][p.obj].push(p); });

  const ncols = tableCols.length;

  return (
    <div className="page">
      {/* Week header */}
      <div className="week-header">
        <div className="week-title">Week of <span>{wk.label}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => exportWeekPDF(wk, projects, weekData, tableCols)}>⬇ PDF</button>
            <button className="btn btn-ghost btn-sm" onClick={() => exportGoogleDoc(wk, projects, weekData)}>⬆ Google Doc</button>
          </div>
          <div className="week-stats">
            <div className="wstat"><div className="wstat-val" style={{ color: 'var(--green)' }}>{upd}</div><div className="wstat-label">updated</div></div>
            <div className="wstat"><div className="wstat-val" style={{ color: 'var(--accent)' }}>{onT}</div><div className="wstat-label">on track</div></div>
            <div className="wstat"><div className="wstat-val" style={{ color: 'var(--red)' }}>{atR}</div><div className="wstat-label">at risk</div></div>
            <div className="wstat"><div className="wstat-val">{total}</div><div className="wstat-label">projects</div></div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <input type="text" placeholder="🔍 Search projects…" value={filters.search} onChange={e => setFilter('search', e.target.value)} />
        <div className="filter-sep" />
        <MultiSelect
          options={STATUSES}
          selected={filters.status}
          onChange={v => setFilter('status', v)}
          placeholder="All statuses"
        />
        <MultiSelect
          options={allOwners}
          selected={filters.owner}
          onChange={v => setFilter('owner', v)}
          placeholder="All owners"
        />
        <div className="filter-sep" />
        <select value={filters.sort} onChange={e => setFilter('sort', e.target.value)}>
          <option value="default">Default order</option>
          <option value="status">Sort by status</option>
          <option value="name">Sort by name</option>
          <option value="due">Sort by due date</option>
          <option value="updated">Sort by last updated</option>
        </select>
        {hasFilters && <span className="filter-clear" onClick={clearFilters}>✕ Clear filters</span>}
        <span className="filter-count">{total} project{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Vertical summary cards (when no filter active) */}
      {filters.vertical.length === 0 && filters.status.length === 0 && filters.owner.length === 0 && !filters.search && (
        <div className="summary-grid">
          {VORDER.map(k => {
            const m = VMETA[k];
            const vp = projects.filter(p => p.v === k);
            const vOn = vp.filter(p => { const s = weekData[activeWeek]?.[p.id]?.status; return s === 'On Track' || s === 'Launched'; }).length;
            const pct = vp.length ? Math.round(vOn / vp.length * 100) : 0;
            return (
              <div key={k} className="sg-card" onClick={() => setFilter('vertical', k)}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: m.color }} />
                <div className="sg-label">{m.label}</div>
                <div className="sg-count">{vp.length}</div>
                <div className="sg-sub">{vOn} on track</div>
                <div className="sg-bar"><div className="sg-fill" style={{ width: pct + '%', background: m.color }} /></div>
              </div>
            );
          })}
        </div>
      )}

      {/* Per-vertical sections */}
      {VORDER.filter(v => byV[v]).map(v => {
        const m = VMETA[v];
        const vTotal = Object.values(byV[v]).flat().length;
        return (
          <div key={v} className="section">
            <div className="sec-head">
              <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: m.color }} />
              <span className="sec-label">{m.label}</span>
              <span className="sec-count">{vTotal} projects</span>
            </div>
            <table className="proj-table">
              <thead>
                <tr>
                  {tableCols.map(c => (
                    <th key={c.key} style={{ width: (c.widthPct || 10) + '%' }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(byV[v]).map(([obj, projs]) => (
                  <React.Fragment key={obj}>
                    <tr>
                      <td
                        colSpan={ncols}
                        style={{ background: m.color + '22', padding: '5px 10px', fontSize: 11, fontWeight: 600, color: m.color, fontFamily: 'var(--display)', letterSpacing: '.04em', border: '1px solid var(--rule)' }}
                      >
                        {obj}
                      </td>
                    </tr>
                    {projs.map(p => (
                      <ProjectRow
                        key={p.id}
                        project={p}
                        weekId={activeWeek}
                        weekData={weekData}
                        tableCols={tableCols}
                        ncols={ncols}
                        saveProjectField={saveProjectField}
                        saveUpdate={saveUpdate}
                        saveEngNotes={saveEngNotes}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {!filt.length && <div className="empty">No projects match your filters.</div>}
    </div>
  );
}
