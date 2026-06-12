import { create } from 'zustand';
import { COL_DEFS, DEFAULT_COL_WIDTHS, TEAM as SEED_TEAM } from '../data/constants';
import { SEED_PROJECTS, SEED_WEEKS, SEED_WEEK_DATA } from '../data/seed';
import { pushToScript, pullFromScript } from '../utils/sheetsSync';
import { SCRIPT_URL as CONFIG_SCRIPT_URL } from '../config';
import { runMigrations } from '../migrations';

// Central config URL wins over per-user localStorage setting
const getScriptUrl = (settingsScriptUrl) =>
  CONFIG_SCRIPT_URL || settingsScriptUrl || '';

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
  // Read raw stored values
  const raw = {
    projects:  lsGet('tok_projects'),
    weeks:     lsGet('tok_weeks'),
    weekData:  lsGet('tok_weekdata'),
    changeLog: lsGet('tok_changelog'),
    okrScores: lsGet('tok_okrscores'),
    aiCache:   lsGet('tok_ai_cache'),
    colCfg:    lsGet('tok_col_cfg'),
    settings:  lsGet('tok_settings'),
    team:      lsGet('tok_team'),
  };

  // Run any pending migrations before we use the data
  const { state: migrated, migrated: didMigrate } = runMigrations(raw);
  if (didMigrate) {
    // Persist migrated values back to localStorage immediately
    if (migrated.projects  != null) lsSet('tok_projects',  migrated.projects);
    if (migrated.weeks     != null) lsSet('tok_weeks',     migrated.weeks);
    if (migrated.weekData  != null) lsSet('tok_weekdata',  migrated.weekData);
    if (migrated.changeLog != null) lsSet('tok_changelog', migrated.changeLog);
    if (migrated.okrScores != null) lsSet('tok_okrscores', migrated.okrScores);
    if (migrated.aiCache   != null) lsSet('tok_ai_cache',  migrated.aiCache);
    if (migrated.colCfg    != null) lsSet('tok_col_cfg',   migrated.colCfg);
    if (migrated.settings  != null) lsSet('tok_settings',  migrated.settings);
    if (migrated.team      != null) lsSet('tok_team',      migrated.team);
  }

  // Apply defaults for any keys that were never stored (fresh install)
  const projects   = migrated.projects  || JSON.parse(JSON.stringify(SEED_PROJECTS));
  const weeks      = migrated.weeks     || JSON.parse(JSON.stringify(SEED_WEEKS));
  const weekData   = migrated.weekData  || {};
  const changeLog  = migrated.changeLog || [];
  const okrScores  = migrated.okrScores || {};
  const aiCache    = migrated.aiCache   || {};
  const colCfg     = mergeColConfig(migrated.colCfg);
  const settings   = migrated.settings  || { scriptUrl: '', ejsPK: '', ejsSID: '', ejsTID: '' };
  const team       = migrated.team      || JSON.parse(JSON.stringify(SEED_TEAM));

  // Seed w1 data if not present
  if (!weekData['w1']) {
    weekData['w1'] = {};
    Object.entries(SEED_WEEK_DATA.w1).forEach(([pid, u]) => {
      weekData['w1'][pid] = { ...u, updated_at: Date.now() - 86400000 };
    });
  }

  return { projects, weeks, weekData, changeLog, okrScores, aiCache, colCfg, settings, team };
};

// ── Debounced push to Sheets ──────────────────────
let _pushTimer = null;
function schedulePush(state) {
  clearTimeout(_pushTimer);
  _pushTimer = setTimeout(async () => {
    const s = useStore.getState();
    const url = getScriptUrl(s.settings?.scriptUrl);
    if (!url) return;
    useStore.setState({ syncStatus: 'syncing' });
    try {
      await pushToScript(url, s);
      useStore.setState({ syncStatus: 'synced', lastSynced: Date.now(), syncError: null });
    } catch (e) {
      useStore.setState({ syncStatus: 'error', syncError: e.message });
    }
  }, 2000);
}

function localSave(s) {
  lsSet('tok_projects',  s.projects);
  lsSet('tok_weeks',     s.weeks);
  lsSet('tok_weekdata',  s.weekData);
  lsSet('tok_changelog', s.changeLog);
  lsSet('tok_okrscores', s.okrScores);
  lsSet('tok_ai_cache',  s.aiCache);
  lsSet('tok_col_cfg',   s.colCfg);
  lsSet('tok_settings',  s.settings);
  lsSet('tok_team',      s.team);
}

// ── The store ─────────────────────────────────────
const useStore = create((set, get) => {
  const initial = loadInitialState();

  const persist = (patch) => {
    set(patch);
    const s = get();
    localSave(s);
    if (getScriptUrl(s.settings?.scriptUrl)) schedulePush(s);
  };

  return {
    // ── State ──
    ...initial,
    activeWeek: initial.weeks[0]?.id || null,
    activeView: 'okr',
    userName: '',
    collapsedQuarters: new Set(),
    syncStatus: 'idle',   // 'idle' | 'syncing' | 'synced' | 'error'
    syncError: null,
    lastSynced: null,

    // Modals
    weekModalOpen: false,
    weekModalEditId: null,
    projectModalOpen: false,
    projectModalEditId: null,
    weekDropdownOpen: false,

    // Filters
    filters: { status: [], owner: [], vertical: [], search: '', sort: 'default' },
    analyticsFilters: { vertical: 'all', status: '', phase: '', owner: '', search: '', sort: 'name' },
    scoringFilters: { vertical: 'all', owner: '', search: '', band: 'all', sort: 'name' },
    scoringQuarter: initial.weeks[0]?.quarter || 'Q2 2026',
    gridQuarter: 'all',
    gridVertical: 'all',
    gridSearch: '',

    // ── Modal actions ──
    openWeekModal: (id = null) => set({ weekModalOpen: true, weekModalEditId: id, weekDropdownOpen: false }),
    closeWeekModal: () => set({ weekModalOpen: false, weekModalEditId: null }),
    openProjectModal: (id = null) => set({ projectModalOpen: true, projectModalEditId: id }),
    closeProjectModal: () => set({ projectModalOpen: false, projectModalEditId: null }),
    setWeekDropdownOpen: (v) => set({ weekDropdownOpen: v }),

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
    clearFilters: () => set({ filters: { status: [], owner: [], vertical: [], search: '', sort: 'default' } }),
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

    // ── Save a single week-data field directly (used by grid) ──
    saveWeekFieldDirect: (weekId, projectId, field, value) => {
      const s = get();
      const prev = s.weekData[weekId]?.[projectId] || { status: 'Not started', progress: '', plan: '', engNotes: '', updated_at: null, comments: [] };
      let log = [...s.changeLog];
      if (field === 'status' && prev.status !== value) {
        log = [...log, { pid: projectId, ts: Date.now(), weekId, field: 'status', from: prev.status || '', to: value, by: s.userName || 'unknown' }];
      }
      persist({
        weekData: { ...s.weekData, [weekId]: { ...(s.weekData[weekId] || {}), [projectId]: { ...prev, [field]: value } } },
        changeLog: log,
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

    // ── Team management ──
    addMember: (member) => {
      const s = get();
      persist({ team: [...s.team, { ...member, id: 't' + Date.now() }] });
    },
    updateMember: (id, patch) => {
      const s = get();
      persist({ team: s.team.map(m => m.id === id ? { ...m, ...patch } : m) });
    },
    deleteMember: (id) => {
      const s = get();
      persist({ team: s.team.filter(m => m.id !== id) });
    },

    // ── Settings ──
    saveSettings: (patch) => {
      const s = get();
      persist({ settings: { ...s.settings, ...patch } });
    },

    // ── Sheets: pull latest data from Apps Script on startup ──
    loadFromSheets: async () => {
      const s = get();
      const url = getScriptUrl(s.settings?.scriptUrl);
      if (!url) return;
      set({ syncStatus: 'syncing', syncError: null });
      try {
        const pulled = await pullFromScript(url);
        // Only replace state if Sheets has real data (not empty)
        if (pulled && (pulled.projects?.length > 0 || pulled.weeks?.length > 0)) {
          set({ ...pulled, syncStatus: 'synced', lastSynced: Date.now() });
          // Also update localStorage cache
          const now = get();
          localSave(now);
        } else {
            // Sheets is empty — push current local state up to initialise it
          set({ syncStatus: 'syncing' });
          await pushToScript(url, get());
          set({ syncStatus: 'synced', lastSynced: Date.now() });
        }
      } catch (e) {
        console.warn('Sheets pull failed:', e);
        set({ syncStatus: 'error', syncError: e.message });
      }
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

export default useStore;
