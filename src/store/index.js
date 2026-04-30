import { create } from 'zustand';
import { COL_DEFS, DEFAULT_COL_WIDTHS } from '../data/constants';
import { SEED_PROJECTS, SEED_WEEKS, SEED_WEEK_DATA } from '../data/seed';

// ── localStorage helpers ──────────────────────────
const lsGet = (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ── Column config helpers ─────────────────────────
const DEFAULT_COL_CONFIG = () =>
  COL_DEFS.map((c, i) => ({
    key: c.key, labelOverride: '', showInTable: true, showInGrid: true,
    showAsFilter: c.canFilter, order: i, widthPct: DEFAULT_COL_WIDTHS[c.key] || 10,
  }));

const mergeColConfig = (saved) => {
  const defaultWidths = DEFAULT_COL_WIDTHS;
  const merged = saved || DEFAULT_COL_CONFIG();
  COL_DEFS.forEach((c, i) => {
    if (!merged.find(x => x.key === c.key)) {
      merged.push({ key: c.key, labelOverride: '', showInTable: true, showInGrid: true, showAsFilter: c.canFilter, order: merged.length + i, widthPct: defaultWidths[c.key] || 10 });
    }
    const ex = merged.find(x => x.key === c.key);
    if (ex && ex.widthPct == null) ex.widthPct = defaultWidths[c.key] || 10;
  });
  return merged;
};

// ── Initial state loader ──────────────────────────
const loadInitialState = () => {
  const projects   = lsGet('tok_projects')    || JSON.parse(JSON.stringify(SEED_PROJECTS));
  const weeks      = lsGet('tok_weeks')       || JSON.parse(JSON.stringify(SEED_WEEKS));
  const weekData   = lsGet('tok_weekdata')    || {};
  const changeLog  = lsGet('tok_changelog')   || [];
  const okrScores  = lsGet('tok_okrscores')   || {};
  const aiCache    = lsGet('tok_ai_cache')    || {};
  const colCfg     = mergeColConfig(lsGet('tok_col_cfg'));
  const settings   = lsGet('tok_settings')    || { sheetId: '', sheetTab: 'OKR_Data', apiKey: '', ejsPK: '', ejsSID: '', ejsTID: '' };

  // Seed w1 data if not present
  if (!weekData['w1']) {
    weekData['w1'] = {};
    Object.entries(SEED_WEEK_DATA.w1).forEach(([pid, u]) => {
      weekData['w1'][pid] = { ...u, updated_at: Date.now() - 86400000 };
    });
  }

  return { projects, weeks, weekData, changeLog, okrScores, aiCache, colCfg, settings };
};

// ── The store ─────────────────────────────────────
const useStore = create((set, get) => {
  const initial = loadInitialState();

  const persist = (patch) => {
    set(patch);
    const s = get();
    lsSet('tok_projects',  s.projects);
    lsSet('tok_weeks',     s.weeks);
    lsSet('tok_weekdata',  s.weekData);
    lsSet('tok_changelog', s.changeLog);
    lsSet('tok_okrscores', s.okrScores);
    lsSet('tok_ai_cache',  s.aiCache);
    lsSet('tok_col_cfg',   s.colCfg);
    lsSet('tok_settings',  s.settings);
    // Trigger sheets sync if configured
    const { settings: cfg } = s;
    if (cfg.sheetId && cfg.apiKey) syncSheets(s);
  };

  return {
    // ── State ──
    ...initial,
    activeWeek: initial.weeks[0]?.id || null,
    activeView: 'okr',
    userName: '',
    collapsedQuarters: new Set(),

    // Filters
    filters: { status: '', owner: '', vertical: 'all', search: '', sort: 'default' },
    analyticsFilters: { vertical: 'all', status: '', phase: '', owner: '', search: '', sort: 'name' },
    scoringFilters: { vertical: 'all', owner: '', search: '', band: 'all', sort: 'name' },
    scoringQuarter: initial.weeks[0]?.quarter || 'Q2 2026',
    gridQuarter: 'all',
    gridVertical: 'all',
    gridSearch: '',

    // ── Navigation ──
    setActiveView: (v) => set({ activeView: v }),
    setActiveWeek: (id) => set({ activeWeek: id }),
    setUserName: (n) => set({ userName: n }),
    toggleQuarter: (q) => set(s => {
      const c = new Set(s.collapsedQuarters);
      c.has(q) ? c.delete(q) : c.add(q);
      return { collapsedQuarters: c };
    }),

    // ── Filters ──
    setFilter: (key, val) => set(s => ({ filters: { ...s.filters, [key]: val } })),
    clearFilters: () => set({ filters: { status: '', owner: '', vertical: 'all', search: '', sort: 'default' } }),
    setAnalyticsFilter: (key, val) => set(s => ({ analyticsFilters: { ...s.analyticsFilters, [key]: val } })),
    setScoringFilter: (key, val) => set(s => ({ scoringFilters: { ...s.scoringFilters, [key]: val } })),
    setScoringQuarter: (q) => set({ scoringQuarter: q }),
    setGridQuarter: (q) => set({ gridQuarter: q }),
    setGridVertical: (v) => set({ gridVertical: v }),
    setGridSearch: (q) => set({ gridSearch: q }),

    // ── Week data accessor ──
    getWD: (weekId, projectId) => {
      const s = get();
      if (!s.weekData[weekId]) return { status: 'Not started', progress: '', plan: '', engNotes: '', updated_at: null, comments: [] };
      if (!s.weekData[weekId][projectId]) return { status: 'Not started', progress: '', plan: '', engNotes: '', updated_at: null, comments: [] };
      return s.weekData[weekId][projectId];
    },

    // ── Save update ──
    saveUpdate: (projectId, { progress, plan, status, engNotes }) => {
      const s = get();
      const prev = s.getWD(s.activeWeek, projectId);
      const newWD = {
        ...prev, progress, plan, engNotes,
        status, updated_at: Date.now(),
      };
      // Log status change
      let log = [...s.changeLog];
      if (prev.status !== status) {
        log = [...log, { pid: projectId, ts: Date.now(), weekId: s.activeWeek, field: 'status', from: prev.status || '', to: status, by: s.userName || 'unknown' }];
      }
      persist({
        weekData: { ...s.weekData, [s.activeWeek]: { ...s.weekData[s.activeWeek], [projectId]: newWD } },
        changeLog: log,
      });
    },

    // ── Save eng notes ──
    saveEngNotes: (projectId, notes) => {
      const s = get();
      const prev = s.getWD(s.activeWeek, projectId);
      persist({
        weekData: { ...s.weekData, [s.activeWeek]: { ...s.weekData[s.activeWeek], [projectId]: { ...prev, engNotes: notes } } },
      });
    },

    // ── Save field (project meta) ──
    saveProjectField: (projectId, field, value) => {
      const s = get();
      const project = s.projects.find(p => p.id === projectId);
      if (!project || project[field] === value) return;
      let log = [...s.changeLog];
      if (field === 'phase' && project.phase !== value) {
        log = [...log, { pid: projectId, ts: Date.now(), weekId: s.activeWeek, field: 'phase', from: project.phase || '', to: value, by: s.userName || 'unknown' }];
      }
      persist({
        projects: s.projects.map(p => p.id === projectId ? { ...p, [field]: value } : p),
        changeLog: log,
      });
    },

    // ── Add comment ──
    addComment: (weekId, projectId, author, text) => {
      const s = get();
      const prev = s.getWD(weekId, projectId);
      const comment = { author, text, ts: Date.now() };
      const updated = { ...prev, comments: [...(prev.comments || []), comment] };
      persist({
        weekData: { ...s.weekData, [weekId]: { ...s.weekData[weekId], [projectId]: updated } },
      });
      return comment;
    },

    // ── Week management ──
    addWeek: (label, quarter, copyFromId) => {
      const s = get();
      const id = 'w' + Date.now();
      let newWD = {};
      if (copyFromId && s.weekData[copyFromId]) {
        Object.entries(s.weekData[copyFromId]).forEach(([pid, src]) => {
          newWD[pid] = { status: src.status || 'Not started', progress: src.progress || '', plan: src.plan || '', engNotes: src.engNotes || '', updated_at: null, comments: [] };
        });
      }
      persist({
        weeks: [{ id, label, quarter }, ...s.weeks],
        weekData: { ...s.weekData, [id]: newWD },
        activeWeek: id,
      });
      return id;
    },

    renameWeek: (id, label) => {
      const s = get();
      persist({ weeks: s.weeks.map(w => w.id === id ? { ...w, label } : w) });
    },

    deleteWeek: (id) => {
      const s = get();
      const newWeeks = s.weeks.filter(w => w.id !== id);
      const newWD = { ...s.weekData };
      delete newWD[id];
      persist({
        weeks: newWeeks,
        weekData: newWD,
        activeWeek: s.activeWeek === id ? (newWeeks[0]?.id || null) : s.activeWeek,
      });
    },

    // ── Project management ──
    addProject: (project) => {
      const s = get();
      persist({ projects: [...s.projects, project] });
    },

    updateProject: (id, patch) => {
      const s = get();
      persist({ projects: s.projects.map(p => p.id === id ? { ...p, ...patch } : p) });
    },

    deleteProjects: (ids) => {
      const s = get();
      persist({ projects: s.projects.filter(p => !ids.includes(p.id)) });
    },

    // ── OKR Scoring ──
    saveScore: (quarter, projectId, score, note) => {
      const s = get();
      persist({
        okrScores: {
          ...s.okrScores,
          [quarter]: { ...(s.okrScores[quarter] || {}), [projectId]: { score, note, scoredBy: s.userName || 'unknown', scoredAt: Date.now() } },
        },
      });
    },

    // ── AI cache ──
    setAICache: (weekId, text) => {
      const s = get();
      persist({ aiCache: { ...s.aiCache, [weekId]: { text, ts: Date.now() } } });
    },

    // ── Column config ──
    saveColConfig: (newConfig) => persist({ colCfg: newConfig }),
    resetColConfig: () => persist({ colCfg: DEFAULT_COL_CONFIG() }),

    // ── Settings ──
    saveSettings: (patch) => {
      const s = get();
      persist({ settings: { ...s.settings, ...patch } });
    },

    // ── Derived: getTableCols, getGridCols, getFilterCols ──
    getTableCols: () => {
      const { colCfg } = get();
      return [...colCfg]
        .filter(c => c.showInTable)
        .sort((a, b) => a.order - b.order)
        .map(c => ({ ...COL_DEFS.find(d => d.key === c.key), ...c, label: c.labelOverride || COL_DEFS.find(d => d.key === c.key)?.label || c.key, widthPct: c.widthPct || 10 }))
        .filter(Boolean);
    },

    getGridCols: () => {
      const { colCfg } = get();
      return [...colCfg]
        .filter(c => c.showInGrid)
        .sort((a, b) => a.order - b.order)
        .map(c => ({ ...COL_DEFS.find(d => d.key === c.key), ...c, label: c.labelOverride || COL_DEFS.find(d => d.key === c.key)?.label || c.key }))
        .filter(Boolean);
    },

    getFilterCols: () => {
      const { colCfg } = get();
      return [...colCfg]
        .filter(c => c.showAsFilter)
        .sort((a, b) => a.order - b.order)
        .map(c => ({ ...COL_DEFS.find(d => d.key === c.key), ...c, label: c.labelOverride || COL_DEFS.find(d => d.key === c.key)?.label || c.key }))
        .filter(c => c && (c.type === 'select' || c.canFilter));
    },

    // Grid: latest weekId for project in given quarter
    latestWeekIdForProject: (pid, quarter) => {
      const { weeks, weekData, activeWeek } = get();
      const relevant = quarter === 'all' ? weeks : weeks.filter(w => (w.quarter || 'Q2 2026') === quarter);
      const withData = relevant
        .filter(w => weekData[w.id]?.[pid]?.updated_at)
        .sort((a, b) => (weekData[b.id][pid]?.updated_at || 0) - (weekData[a.id][pid]?.updated_at || 0));
      if (withData.length) return withData[0].id;
      if (relevant.length) return relevant[0].id;
      return activeWeek;
    },
  };
});

// ── Google Sheets sync (fire-and-forget) ─────────
async function syncSheets(state) {
  const { settings, projects, weeks, weekData, changeLog, okrScores } = state;
  const { sheetId, sheetTab, apiKey } = settings;
  if (!sheetId || !apiKey) return;
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };

  try {
    // Tab 1: OKR weekly data
    const rows = [['weekId','weekLabel','projectId','vertical','objective','name','owner','prdDate','due','phase','status','progress','plan','engNotes','updated_at','comments_count']];
    weeks.forEach(w => {
      projects.forEach(p => {
        const d = weekData[w.id]?.[p.id]; if (!d) return;
        rows.push([w.id, w.label, p.id, p.v, p.obj, p.name, p.owner, p.prdDate||'', p.due, p.phase||'', d.status||'', d.progress||'', d.plan||'', d.engNotes||'', d.updated_at||'', d.comments?.length||0]);
      });
    });
    await fetch(`${base}/values/${sheetTab}!A1?valueInputOption=USER_ENTERED`, { method: 'PUT', headers, body: JSON.stringify({ values: rows }) });

    // Tab 2: Change log
    const logRows = [['timestamp','date','projectId','projectName','vertical','weekId','weekLabel','field','from','to','changedBy']];
    changeLog.forEach(e => {
      const p = projects.find(x => x.id === e.pid);
      const w = weeks.find(x => x.id === e.weekId);
      logRows.push([e.ts, new Date(e.ts).toISOString().slice(0,16).replace('T',' '), e.pid, p?.name||'', p?.v||'', e.weekId||'', w?.label||'', e.field, e.from||'', e.to||'', e.by||'']);
    });
    await fetch(`${base}/values/Change_Log!A1?valueInputOption=USER_ENTERED`, { method: 'PUT', headers, body: JSON.stringify({ values: logRows }) });

    // Tab 3: OKR Scores
    const scoreRows = [['quarter','projectId','projectName','vertical','objective','score','note','scoredBy','scoredAt']];
    Object.entries(okrScores).forEach(([quarter, scores]) => {
      Object.entries(scores).forEach(([pid, s]) => {
        const p = projects.find(x => x.id === pid);
        scoreRows.push([quarter, pid, p?.name||'', p?.v||'', p?.obj||'', s.score??'', s.note||'', s.scoredBy||'', s.scoredAt ? new Date(s.scoredAt).toISOString().slice(0,10) : '']);
      });
    });
    await fetch(`${base}/values/OKR_Scores!A1?valueInputOption=USER_ENTERED`, { method: 'PUT', headers, body: JSON.stringify({ values: scoreRows }) });
  } catch (e) { console.warn('Sheets sync failed:', e); }
}

export default useStore;
