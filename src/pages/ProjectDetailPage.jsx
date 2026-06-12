import React, { useState, useMemo, useRef, useEffect } from 'react';
import useStore from '../store/index';
import { VMETA, PHASE_COLORS, STATUS_COLORS } from '../data/constants';
import { tago } from '../utils/helpers';
import { OwnerChips } from '../components/ui/OwnerChip';
import { useToastCtx } from '../App';
import { useMention, getMentionedMembers } from '../hooks/useMention';
import { emailProjectOwners, emailMentioned } from '../utils/email';
import MentionPopup from '../components/ui/MentionPopup';

const STATUS_BADGE = {
  'On Track': 'b-green', Launched: 'b-purple', 'PRD Complete': 'b-blue',
  Delayed: 'b-red', Blocked: 'b-red', 'Not started': 'b-gray',
  Paused: 'b-amber', Deprioritized: 'b-gray',
};

export default function ProjectDetailPage() {
  const projects = useStore(s => s.projects);
  const weekData = useStore(s => s.weekData);
  const weeks = useStore(s => s.weeks);
  const changeLog = useStore(s => s.changeLog);
  const activeWeek = useStore(s => s.activeWeek);
  const userName = useStore(s => s.userName);
  const openProjectModal = useStore(s => s.openProjectModal);
  const addComment = useStore(s => s.addComment);
  const settings = useStore(s => s.settings);
  const team = useStore(s => s.team);
  const showToast = useToastCtx();

  const [selectedId, setSelectedId] = useState(projects[0]?.id || null);
  const [listSearch, setListSearch] = useState('');
  const [commentText, setCommentText] = useState('');
  const { popup: mentionPopup, onInput: onMentionInput, onKeyDown: onMentionKeyDown, insertMention, close: closeMention } = useMention(team);

  const project = projects.find(p => p.id === selectedId);

  const getLatestStatus = (pid) => {
    for (let i = weeks.length - 1; i >= 0; i--) {
      const d = weekData[weeks[i].id]?.[pid];
      if (d?.updated_at) return d.status || 'Not started';
    }
    return weekData[weeks[0]?.id]?.[pid]?.status || 'Not started';
  };

  const filteredList = useMemo(() =>
    projects.filter(p =>
      !listSearch ||
      p.name.toLowerCase().includes(listSearch.toLowerCase()) ||
      p.owner.toLowerCase().includes(listSearch.toLowerCase()) ||
      p.obj.toLowerCase().includes(listSearch.toLowerCase())
    ),
    [projects, listSearch]
  );

  // All weekly updates for selected project (most recent first)
  const weekUpdates = useMemo(() => {
    if (!selectedId) return [];
    return weeks
      .map(w => ({ week: w, data: weekData[w.id]?.[selectedId] }))
      .filter(x => x.data?.updated_at || x.data?.progress || x.data?.plan || x.data?.engNotes)
      .reverse();
  }, [selectedId, weekData, weeks]);

  // All comments across all weeks (chronological)
  const allComments = useMemo(() => {
    if (!selectedId) return [];
    const out = [];
    weeks.forEach(w => {
      const d = weekData[w.id]?.[selectedId];
      (d?.comments || []).forEach(c => out.push({ ...c, weekLabel: w.label, weekId: w.id }));
    });
    return out.sort((a, b) => a.ts - b.ts);
  }, [selectedId, weekData, weeks]);

  // Change history for selected project (chronological)
  const history = useMemo(() => {
    if (!selectedId) return [];
    return changeLog.filter(e => e.pid === selectedId).sort((a, b) => a.ts - b.ts);
  }, [selectedId, changeLog]);

  const handleComment = () => {
    const t = commentText.trim();
    if (!t || !selectedId || !project) return;
    const author = userName || 'Anonymous';
    addComment(activeWeek, selectedId, author, t);
    setCommentText('');
    showToast('✓ Comment added');

    const wk = weeks.find(w => w.id === activeWeek);
    if (settings.ejsPK) {
      emailProjectOwners(settings, project, author, t, wk?.label || '', team);
      getMentionedMembers(t, team).forEach(m => {
        if (m.name !== author) emailMentioned(settings, m, author, project.name, t);
      });
    }
  };

  const activeWeekLabel = weeks.find(w => w.id === activeWeek)?.label || 'current week';

  return (
    <div className="pd-page">
      {/* Left panel: project list */}
      <div className="pd-list">
        <div className="pd-search">
          <input
            type="text"
            placeholder="Search projects…"
            value={listSearch}
            onChange={e => setListSearch(e.target.value)}
          />
        </div>
        {filteredList.map(p => {
          const s = getLatestStatus(p.id);
          const active = p.id === selectedId;
          return (
            <div
              key={p.id}
              className={'pd-list-item' + (active ? ' active' : '')}
              onClick={() => { setSelectedId(p.id); setCommentText(''); }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: VMETA[p.v]?.color, flexShrink: 0, marginTop: 3 }} />
                <div className="pd-list-name">{p.name}</div>
              </div>
              <div className="pd-list-meta">
                <span>{p.owner || '—'}</span>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLORS[s] || '#d0ccc4', flexShrink: 0 }} />
              </div>
            </div>
          );
        })}
        {filteredList.length === 0 && (
          <div style={{ padding: '16px', fontSize: 12, color: 'var(--ink3)' }}>No matches.</div>
        )}
      </div>

      {/* Right panel: project detail */}
      {!project ? (
        <div className="pd-detail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--ink3)', fontSize: 13 }}>Select a project from the list.</div>
        </div>
      ) : (
        <div className="pd-detail">
          {/* Header */}
          <div className="pd-detail-header">
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: VMETA[project.v]?.color }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: VMETA[project.v]?.color, textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'var(--display)' }}>
                  {VMETA[project.v]?.label}
                </span>
                <span className={`badge ${STATUS_BADGE[getLatestStatus(project.id)] || 'b-gray'}`}>
                  {getLatestStatus(project.id)}
                </span>
                {project.phase && (
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: PHASE_COLORS[project.phase],
                    background: PHASE_COLORS[project.phase] + '22',
                    padding: '2px 8px', borderRadius: 10,
                  }}>
                    {project.phase}
                  </span>
                )}
              </div>
              <div className="pd-detail-title">{project.name}</div>
              {project.obj && <div className="pd-detail-obj">{project.obj}</div>}
              <div className="pd-detail-meta-row">
                {project.owner && <OwnerChips ownerStr={project.owner} />}
                {project.due && <span>📅 Due: {project.due}</span>}
                {project.prdDate && <span>📄 Original PRD: {project.prdDate}</span>}
              </div>
              {project.description && (
                <div style={{ marginTop: 10, fontSize: 13, color: 'var(--ink2)', lineHeight: 1.6, maxWidth: 680 }}>
                  {project.description}
                </div>
              )}
              {(project.prdLink || project.designLink || project.briefLink || project.otherLinks) && (
                <div className="pd-links">
                  {project.prdLink && <a href={project.prdLink} target="_blank" rel="noreferrer" className="pd-link">📄 PRD</a>}
                  {project.designLink && <a href={project.designLink} target="_blank" rel="noreferrer" className="pd-link">🎨 Design</a>}
                  {project.briefLink && <a href={project.briefLink} target="_blank" rel="noreferrer" className="pd-link">📋 Product Brief</a>}
                  {project.otherLinks && <a href={project.otherLinks} target="_blank" rel="noreferrer" className="pd-link">🔗 Other links</a>}
                </div>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => openProjectModal(project.id)}>
              Edit project
            </button>
          </div>

          {/* Change history */}
          <div className="pd-section">
            <div className="pd-section-title">
              Change History — {history.length} event{history.length !== 1 ? 's' : ''}
            </div>
            {history.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                No recorded changes yet. Status and phase changes will appear here.
              </div>
            ) : (
              <div className="pd-timeline">
                {history.map((e, i) => {
                  const dotColor = e.field === 'phase'
                    ? (PHASE_COLORS[e.to] || '#d0ccc4')
                    : (STATUS_COLORS[e.to] || '#d0ccc4');
                  const week = weeks.find(w => w.id === e.weekId);
                  return (
                    <div key={i} className="pd-timeline-item">
                      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: 10, flexShrink: 0 }}>
                        <div className="pd-tl-dot" style={{ background: dotColor }} />
                        {i < history.length - 1 && <div className="pd-tl-line" />}
                      </div>
                      <div className="pd-tl-content">
                        <div className="pd-tl-label">
                          <span style={{ fontSize: 9.5, fontFamily: 'var(--mono)', textTransform: 'uppercase', color: 'var(--ink4)', background: 'var(--paper2)', padding: '1px 5px', borderRadius: 3, marginRight: 4 }}>
                            {e.field}
                          </span>
                          <span style={{ color: 'var(--ink3)', fontSize: 12 }}>{e.from || '—'}</span>
                          <span style={{ color: 'var(--ink4)', fontSize: 12, margin: '0 5px' }}>→</span>
                          <span style={{ fontWeight: 600, fontSize: 12, color: dotColor }}>{e.to}</span>
                        </div>
                        <div className="pd-tl-meta">
                          {e.by && <span>{e.by}</span>}
                          {week && <span>· {week.label}</span>}
                          <span>· {tago(e.ts)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Weekly updates */}
          <div className="pd-section">
            <div className="pd-section-title">
              Weekly Updates — {weekUpdates.length} week{weekUpdates.length !== 1 ? 's' : ''} with data
            </div>
            {weekUpdates.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>No weekly updates recorded yet.</div>
            ) : (
              weekUpdates.map(({ week, data }) => {
                if (!data) return null;
                const s = data.status || 'Not started';
                return (
                  <div key={week.id} className="pd-week-card">
                    <div className="pd-week-header">
                      <span className="pd-week-label">{week.label}</span>
                      <span className={`badge ${STATUS_BADGE[s] || 'b-gray'}`} style={{ fontSize: 10 }}>{s}</span>
                      {data.updated_at && (
                        <span className="pd-week-ts">{tago(data.updated_at)}</span>
                      )}
                    </div>
                    {data.progress && (
                      <div className="pd-week-field">
                        <div className="pd-week-field-label">Progress this week</div>
                        <div className="pd-week-field-val">{data.progress}</div>
                      </div>
                    )}
                    {data.plan && (
                      <div className="pd-week-field">
                        <div className="pd-week-field-label">Plan for next week</div>
                        <div className="pd-week-field-val">{data.plan}</div>
                      </div>
                    )}
                    {data.engNotes && (
                      <div className="pd-week-field">
                        <div className="pd-week-field-label">Eng notes</div>
                        <div className="pd-week-field-val">{data.engNotes}</div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Comments */}
          <div className="pd-section">
            <div className="pd-section-title">
              Comments — {allComments.length} total across all weeks
            </div>
            {allComments.map((c, i) => (
              <div key={i} className="pd-comment">
                <div className="pd-comment-header">
                  <span className="pd-comment-author">{c.author}</span>
                  <span className="pd-comment-week">{c.weekLabel}</span>
                  <span className="pd-comment-ts">{tago(c.ts)}</span>
                </div>
                <div className="pd-comment-text">{c.text}</div>
              </div>
            ))}
            {allComments.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 14 }}>
                No comments yet across any week.
              </div>
            )}
            <div className="pd-compose">
              <textarea
                className="pd-compose-input"
                rows={2}
                placeholder={`Add a comment for ${activeWeekLabel}… use @ to tag someone (Ctrl+Enter to post)`}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onInput={onMentionInput}
                onKeyDown={e => { onMentionKeyDown(e); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleComment(); }}
              />
              <MentionPopup popup={mentionPopup} onSelect={insertMention} onClose={closeMention} />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-accent btn-sm" onClick={handleComment}>Post comment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
