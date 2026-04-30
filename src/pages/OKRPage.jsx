import React, { useState, useCallback } from 'react';
import useStore from '../store/index';
import { VMETA, VORDER, STATUSES, STATUS_META, PHASES, PHASE_COLORS, TEAM } from '../data/constants';
import { tago, initials, ownerList, renderMentions } from '../utils/helpers';
import { useMention } from '../hooks/useMention';
import { emailMentioned, emailProjectOwners, getMentionedEmails } from '../utils/email';
import { useToastCtx } from '../App';

// ── Owner avatars ──────────────────────────────
function OwnerAvatars({ ownerStr }) {
  const owners = ownerList(ownerStr).slice(0, 3);
  return (
    <div className="owner-avatars">
      {owners.map((name, i) => {
        const member = TEAM.find(t => t.name.toLowerCase().startsWith(name.split(' ')[0].toLowerCase()));
        const color = member?.color || '#9ca3af';
        return (
          <div key={i} className="owner-avatar" style={{ background: color }} title={name}>
            {initials(name)}
          </div>
        );
      })}
    </div>
  );
}

// ── Phase badge ────────────────────────────────
function PhaseBadge({ phase }) {
  if (!phase) return null;
  return (
    <span className="phase-badge" style={{ background: PHASE_COLORS[phase] || '#d0ccc4' }}>
      {phase}
    </span>
  );
}

// ── Comment section ────────────────────────────
function Comments({ weekId, projectId }) {
  const getWD = useStore(s => s.getWD);
  const addComment = useStore(s => s.addComment);
  const userName = useStore(s => s.userName);
  const settings = useStore(s => s.settings);
  const projects = useStore(s => s.projects);
  const weeks = useStore(s => s.weeks);
  const showToast = useToastCtx();
  const { popup, onInput, onKeyDown, insertMention, close } = useMention();

  const [text, setText] = useState('');
  const wd = getWD(weekId, projectId);
  const comments = wd.comments || [];

  const submit = () => {
    const t = text.trim();
    if (!t || !userName) { if (!userName) showToast('Set your name in the top-right first'); return; }
    const comment = addComment(weekId, projectId, userName, t);
    const project = projects.find(p => p.id === projectId);
    const week = weeks.find(w => w.id === weekId);

    // Email mentions
    const mentioned = getMentionedEmails(t);
    mentioned.forEach(email => {
      const member = TEAM.find(m => m.email === email);
      if (member) emailMentioned(settings, email, member.name, userName, project?.name || '', t);
    });
    // Email project owner
    if (project) emailProjectOwners(settings, project, userName, t, week?.label || '');

    setText('');
    showToast('Comment added');
  };

  return (
    <div className="comments-section">
      <h4>Comments ({comments.length})</h4>
      {comments.map((c, i) => {
        const member = TEAM.find(t => t.name === c.author);
        const color = member?.color || '#9ca3af';
        return (
          <div key={i} className="comment-item">
            <div className="comment-avatar" style={{ background: color }}>{initials(c.author)}</div>
            <div className="comment-body">
              <div className="comment-meta">{c.author} · {tago(c.ts)}</div>
              <div className="comment-text" dangerouslySetInnerHTML={{ __html: renderMentions(c.text) }} />
            </div>
          </div>
        );
      })}
      <div className="comment-input-row">
        <textarea
          rows={2}
          placeholder={userName ? 'Add a comment… (@ to mention)' : 'Set your name above to comment'}
          value={text}
          onChange={e => { setText(e.target.value); onInput(e); }}
          onKeyDown={e => { onKeyDown(e); if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
          disabled={!userName}
        />
        <button className="btn primary" onClick={submit} disabled={!text.trim() || !userName}>
          Post
        </button>
      </div>
      {popup.open && (
        <div className="mention-popup" style={{ left: popup.x, top: popup.y }}>
          {(popup.matches || []).map((m, i) => (
            <div
              key={m.email}
              className={'mention-option' + (i === popup.focused ? ' focused' : '')}
              onMouseDown={() => insertMention(m.email)}
            >
              {m.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Project row ────────────────────────────────
function ProjectRow({ project, cols }) {
  const [expanded, setExpanded] = useState(false);
  const getWD = useStore(s => s.getWD);
  const saveUpdate = useStore(s => s.saveUpdate);
  const saveProjectField = useStore(s => s.saveProjectField);
  const openProjectModal = useStore(s => s.openProjectModal);
  const activeWeek = useStore(s => s.activeWeek);
  const showToast = useToastCtx();

  const wd = getWD(activeWeek, project.id);

  const [form, setForm] = useState(null);

  const open = () => {
    setForm({ status: wd.status || 'Not started', progress: wd.progress || '', plan: wd.plan || '', engNotes: wd.engNotes || '' });
    setExpanded(true);
  };
  const close = () => setExpanded(false);

  const save = () => {
    saveUpdate(project.id, form);
    showToast('Saved');
    setExpanded(false);
  };

  const statusMeta = STATUS_META[wd.status || 'Not started'] || STATUS_META['Not started'];
  const colCount = cols.filter(c => !['progress', 'plan', 'engNotes'].includes(c.key)).length;

  const gridCols = cols.filter(c => !['progress', 'plan', 'engNotes'].includes(c.key))
    .map(c => `${c.widthPct || 10}%`)
    .join(' ');

  return (
    <>
      <div
        className={`proj-row ${statusMeta.row} ${expanded ? 'expanded' : ''}`}
        style={{ gridTemplateColumns: gridCols }}
        onClick={() => expanded ? close() : open()}
      >
        {cols.filter(c => !['progress', 'plan', 'engNotes'].includes(c.key)).map(col => {
          if (col.key === 'name') return (
            <div key="name" className="cell cell-name" title={project.name}>
              {project.name}
            </div>
          );
          if (col.key === 'owner') return (
            <div key="owner" className="cell" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <OwnerAvatars ownerStr={project.owner} />
              <span className="cell-dim" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {project.owner}
              </span>
            </div>
          );
          if (col.key === 'status') return (
            <div key="status" className="cell">
              <span className={`status-pill ${statusMeta.pill}`}>{wd.status || 'Not started'}</span>
            </div>
          );
          if (col.key === 'phase') return (
            <div key="phase" className="cell">
              <PhaseBadge phase={project.phase} />
            </div>
          );
          if (col.key === 'v') return (
            <div key="v" className="cell">
              <span style={{ color: VMETA[project.v]?.color, fontWeight: 600, fontSize: 11 }}>
                {VMETA[project.v]?.label}
              </span>
            </div>
          );
          return (
            <div key={col.key} className="cell cell-dim" title={project[col.key] || ''}>
              {project[col.key] || '—'}
            </div>
          );
        })}
      </div>

      {expanded && form && (
        <>
          <div className="detail-status-row" style={{ paddingTop: 12, paddingBottom: 8 }}>
            <label>Status</label>
            <select
              className="filter-select"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              onClick={e => e.stopPropagation()}
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <label style={{ marginLeft: 12 }}>Phase</label>
            <select
              className="filter-select"
              value={project.phase || ''}
              onChange={e => saveProjectField(project.id, 'phase', e.target.value)}
              onClick={e => e.stopPropagation()}
            >
              <option value="">— none —</option>
              {PHASES.filter(Boolean).map(ph => <option key={ph} value={ph}>{ph}</option>)}
            </select>
            <span className="updated-tag">{wd.updated_at ? `Updated ${tago(wd.updated_at)}` : ''}</span>
            <button
              className="btn"
              style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 9px' }}
              onClick={e => { e.stopPropagation(); openProjectModal(project.id); }}
            >
              Edit project
            </button>
          </div>

          <div className="proj-detail" onClick={e => e.stopPropagation()}>
            <div className="detail-field">
              <label>Progress this week</label>
              <textarea
                value={form.progress}
                onChange={e => setForm(f => ({ ...f, progress: e.target.value }))}
                placeholder="What happened this week?"
              />
            </div>
            <div className="detail-field">
              <label>Plan for next week</label>
              <textarea
                value={form.plan}
                onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                placeholder="What's the plan?"
              />
            </div>
            <div className="detail-field">
              <label>Eng Notes</label>
              <textarea
                value={form.engNotes}
                onChange={e => setForm(f => ({ ...f, engNotes: e.target.value }))}
                placeholder="Engineering notes / blockers"
              />
            </div>
          </div>

          <div className="detail-actions" onClick={e => e.stopPropagation()}>
            <button className="btn primary" onClick={save}>Save</button>
            <button className="btn" onClick={close}>Cancel</button>
          </div>

          <Comments weekId={activeWeek} projectId={project.id} />
        </>
      )}
    </>
  );
}

// ── OKR Page ───────────────────────────────────
export default function OKRPage() {
  const projects = useStore(s => s.projects);
  const filters = useStore(s => s.filters);
  const weekData = useStore(s => s.weekData);
  const activeWeek = useStore(s => s.activeWeek);
  const getTableCols = useStore(s => s.getTableCols);
  const [collapsed, setCollapsed] = useState({});

  const cols = getTableCols();

  const filtered = projects.filter(p => {
    if (filters.vertical !== 'all' && p.v !== filters.vertical) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.owner.toLowerCase().includes(q) && !p.obj.toLowerCase().includes(q)) return false;
    }
    if (filters.status) {
      const status = weekData[activeWeek]?.[p.id]?.status || 'Not started';
      if (status !== filters.status) return false;
    }
    if (filters.owner && !p.owner.toLowerCase().includes(filters.owner.toLowerCase())) return false;
    return true;
  });

  const sortProjects = (ps) => {
    if (filters.sort === 'status') return [...ps].sort((a, b) => {
      const sa = weekData[activeWeek]?.[a.id]?.status || 'Not started';
      const sb = weekData[activeWeek]?.[b.id]?.status || 'Not started';
      return STATUSES.indexOf(sa) - STATUSES.indexOf(sb);
    });
    if (filters.sort === 'owner') return [...ps].sort((a, b) => a.owner.localeCompare(b.owner));
    if (filters.sort === 'name') return [...ps].sort((a, b) => a.name.localeCompare(b.name));
    return ps;
  };

  const toggleV = (v) => setCollapsed(c => ({ ...c, [v]: !c[v] }));

  if (!activeWeek) return (
    <div className="page"><div className="empty">No weeks yet. Click "New Week" to get started.</div></div>
  );

  return (
    <div className="page">
      <div className="okr-table">
        {VORDER.map(v => {
          const vProjects = sortProjects(filtered.filter(p => p.v === v));
          if (!vProjects.length) return null;

          // Group by objective
          const byObj = {};
          vProjects.forEach(p => {
            if (!byObj[p.obj]) byObj[p.obj] = [];
            byObj[p.obj].push(p);
          });

          const isCollapsed = collapsed[v];

          return (
            <div key={v} className="v-group">
              <div className="v-header" onClick={() => toggleV(v)}>
                <div className="v-dot" style={{ background: VMETA[v].color }} />
                {VMETA[v].label}
                <span className="v-header-count">{vProjects.length} project{vProjects.length !== 1 ? 's' : ''}</span>
                <svg
                  className={'v-chevron' + (isCollapsed ? '' : ' open')}
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                >
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>

              {!isCollapsed && Object.entries(byObj).map(([obj, objProjects]) => (
                <div key={obj} className="obj-group">
                  <div className="obj-header">{obj || 'No objective'}</div>
                  {objProjects.map(p => (
                    <ProjectRow key={p.id} project={p} cols={cols} />
                  ))}
                </div>
              ))}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="empty">No projects match your filters.</div>
        )}
      </div>
    </div>
  );
}
