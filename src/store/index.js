import { create } from 'zustand';
import { COL_DEFS, DEFAULT_COL_WIDTHS, TEAM as SEED_TEAM } from '../data/constants';
import { SEED_PROJECTS, SEED_WEEKS, SEED_WEEK_DATA, SEED_QUARTERS, SEED_OBJECTIVES } from '../data/seed';
import { pushToFirestore, pullFromFirestore, listenToFirestore } from '../firestoreSync';
import { runMigrations } from '../migrations';

// ── localStorage helpers ──────────────────────────
const lsGet = (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ── Column config helpers ─────────────────────────
const TABLE_HIDDEN = new Set(['v', 'obj']);

const DEFAULT_COL_CONFIG = () =>
  COL_DEFS.map((c, i) => ({
    key: c.key, labelOverride: '',
    showInTable: !TABLE_HIDDEN.has(c.key), showInGrid: true,
    showAsFilter: c.canFilter, order: i, widthPct: DEFAULT_COL_WIDTHS[c.key] || 10,
  }));

const mergeColConfig = (saved) => {
  const merged = saved ? [...saved] : DEFAULT_COL_CONFIG();
  COL_DEFS.forEach((c, i) => {
    if (!merged.find(x => x.key === c.key)) {
      merged.push({ key: c.key, labelOverride: '', showInTable: !TABLE_HIDDEN.has(c.key), showInGrid: true, showAsFilter: c.canFilter, order: merged.length + i, widthPct: DEFAULT_COL_WIDTHS[c.key] || 10 });
    }
    const ex = merged.find(x => x.key === c.key);
    if (ex && ex.widthPct == null) ex.widthPct = DEFAULT_COL_WIDTHS[c.key] || 10;
    if (ex && TABLE_HIDDEN.has(c.key)) ex.showInTable = false;
  });
  return merged;
};

// ── Initial state loader ──────────────────────────
const loadInitialState = () => {
  const raw = {
    projects:   lsGet('tok_projects'),
    weeks:      lsGet('tok_weeks'),
    weekData:   lsGet('tok_weekdata'),
    changeLog:  lsGet('tok_changelog'),
    okrScores:  lsGet('tok_okrscores'),
    aiCache:    lsGet('tok_ai_cache'),
    colCfg:     lsGet('tok_col_cfg'),
    settings:   lsGet('tok_settings'),
    team:       lsGet('tok_team'),
    quarters:   lsGet('tok_quarters'),
    objectives: lsGet('tok_objectives'),
  };

  const { state: migrated, migrated: didMigrate } = runMigrations(raw);
  if (didMigrate) {
    if (migrated.projects    != null) lsSet('tok_projects',    migrated.projects);
    if (migrated.weeks       != null) lsSet('tok_weeks',       migrated.weeks);
    if (migrated.weekData    != null) lsSet('tok_weekdata',    migrated.weekData);
    if (migrated.changeLog   != null) lsSet('tok_changelog',   migrated.changeLog);
    if (migrated.okrScores   != null) lsSet('tok_okrscores',   migrated.okrScores);
    if (migrated.aiCache     != null) lsSet('tok_ai_cache',    migrated.aiCache);
    if (migrated.colCfg      != null) lsSet('tok_col_cfg',     migrated.colCfg);
    if (migrated.settings    != null) lsSet('tok_settings',    migrated.settings);
    if (migrated.team        != null) lsSet('tok_team',        migrated.team);
    if (migrated.quarters    != null) lsSet('tok_quarters',    migrated.quarters);
    if (migrated.objectives  != null) lsSet('tok_objectives',  migrated.objectives);
  }

  const projects   = migrated.projects   || JSON.parse(JSON.stringify(SEED_PROJECTS));
  const weeks      = migrated.weeks      || JSON.parse(JSON.stringify(SEED_WEEKS));
  const weekData   = migrated.weekData   || {};
  const changeLog  = migrated.changeLog  || [];
  const okrScores  = migrated.okrScores  || {};
  const aiCache    = migrated.aiCache    || {};
  const colCfg     = mergeColConfig(migrated.colCfg);
  const settings   = migrated.settings   || { scriptUrl: '', ejsPK: '', ejsSID: '', ejsTID: '' };
  const team       = migrated.team       || JSON.parse(JSON.stringify(SEED_TEAM));
  const quarters   = migrated.quarters   || JSON.parse(JSON.stringify(SEED_QUARTERS));
  const objectives = migrated.objectives || JSON.parse(JSON.stringify(SEED_OBJECTIVES));

  if (!weekData['w1']) {
    weekData['w1'] = {};
    Object.entries(SEED_WEEK_DATA.w1).forEach(([pid, u]) => {
      weekData['w1'][pid] = { ...u, updated_at: Date.now() - 86400000 };
    });
  }

  return { projects, weeks, weekData, changeLog, okrScores, aiCache, colCfg, settings, team, quarters, objectives };
};

// ── Team sync (canonical rebuild from SEED_TEAM) ──
const REMOVED_NAMES = new Set(['Jana Kabrit', 'Omar Hmayssi', 'Omar Barakat']);

function applyTeamSync(state) {
  const canonicalNames = new Set(SEED_TEAM.map(m => m.name));
  const existingById = {};
  (state.team || []).forEach(m => { existingById[m.name] = m; });

  const newTeam = SEED_TEAM.map(m => ({
    ...m,
    id: existingById[m.name]?.id || ('t' + m.name.replace(/\s+/g, '')),
  }));

  const extras = (state.team || []).filter(
    m => !canonicalNames.has(m.name) && !REMOVED_NAMES.has(m.name)
  );

  return { ...state, team: [...newTeam, ...extras] };
}

// ── Apply schema v2 migration to any pulled state ─
// (same logic as migrations/index.js v4, for Firestore pulls)
function applySchemaV2(state) {
  if (state.projects?.[0]?.ownerIds !== undefined) return state;

  const OLD_TO_NEW = {
    'Marwa Stephan': 'Marwa Stouhi', 'Ahmad Lahham': 'Ahmad Louay Soussi',
    'Charbel Sassine': 'Charbel Safi', 'Ahmad Ataya': 'Ahmad Alame',
    'Adnan Diab': 'Adnan Dimashki', 'Ahmad Hamdan': 'Ahmad Haidar',
    'Therese Kairouz': 'Therese Kayrouz', 'Ali Ezzedine': 'Ali Ezzeddine',
    'Elie Nouneh': 'Elie Noune',
  };
  const nameToId = {};
  (state.team || []).forEach(m => { if (m.id && m.name) nameToId[m.name] = m.id; });
  Object.entries(OLD_TO_NEW).forEach(([old, cur]) => { if (nameToId[cur]) nameToId[old] = nameToId[cur]; });

  const quarterLabels = [...new Set((state.weeks || []).map(w => w.quarter || 'Q2 2026'))].sort();
  const quarters = state.quarters?.length ? state.quarters
    : quarterLabels.map(label => ({ id: label.toLowerCase().replace(/\s+/g, '-'), label }));
  if (!quarters.length) quarters.push({ id: 'q2-2026', label: 'Q2 2026' });
  const qlToId = Object.fromEntries(quarters.map(q => [q.label, q.id]));
  const defaultQId = quarters[0].id;

  const weeks = (state.weeks || []).map(w => {
    if (w.quarterId) return w;
    const { quarter, ...rest } = w;
    return { ...rest, quarterId: qlToId[quarter || 'Q2 2026'] || defaultQId };
  });

  const objKeyToId = {};
  let seq = 0;
  (state.projects || []).forEach(p => {
    if (!p.obj || p.objectiveId) return;
    const key = `${p.v}::${p.obj}`;
    if (!objKeyToId[key]) objKeyToId[key] = `obj_${++seq}`;
  });
  const objectives = state.objectives?.length ? state.objectives
    : Object.entries(objKeyToId).map(([key, id]) => {
        const sep = key.indexOf('::');
        return { id, quarterId: defaultQId, v: key.slice(0, sep), label: key.slice(sep + 2) };
      });

  const parseOwnerIds = (str) =>
    (str || '').split(/\/|,/).map(n => n.trim()).filter(Boolean)
      .map(name => nameToId[name] || null).filter(Boolean);

  const projects = (state.projects || []).map(p => {
    if (p.ownerIds !== undefined) return p;
    const key = `${p.v}::${p.obj}`;
    const { owner, obj, phase, ...rest } = p;
    return { ...rest, quarterId: defaultQId, objectiveId: objKeyToId[key] || null, ownerIds: parseOwnerIds(owner || '') };
  });

  const oldPhases = {};
  (state.projects || []).forEach(p => { if (p.phase) oldPhases[p.id] = p.phase; });
  const weekIds = (state.weeks || []).map(w => w.id);
  const weekData = JSON.parse(JSON.stringify(state.weekData || {}));
  Object.entries(oldPhases).forEach(([pid, phase]) => {
    for (let i = weekIds.length - 1; i >= 0; i--) {
      const wid = weekIds[i];
      if (weekData[wid]?.[pid] && !weekData[wid][pid].phase) {
        weekData[wid][pid].phase = phase;
        break;
      }
    }
  });

  return { ...state, quarters, objectives, weeks, projects, weekData };
}

// ── Debounced Firestore push ──────────────────────
let _pushTimer = null;
let _unsubscribeFirestore = null;

function schedulePush() {
  clearTimeout(_pushTimer);
  _pushTimer = setTimeout(async () => {
    const s = useStore.getState();
    useStore.setState({ syncStatus: 'syncing' });
    try {
      await pushToFirestore(s);
      useStore.setState({ syncStatus: 'synced', lastSynced: Date.now(), syncError: null });
    } catch (e) {
      useStore.setState({ syncStatus: 'error', syncError: e.message });
    }
  }, 2000);
}

function localSave(s) {
  lsSet('tok_projects',    s.projects);
  lsSet('tok_weeks',       s.weeks);
  lsSet('tok_weekdata',    s.weekData);
  lsSet('tok_changelog',   s.changeLog);
  lsSet('tok_okrscores',   s.okrScores);
  lsSet('tok_ai_cache',    s.aiCache);
  lsSet('tok_col_cfg',     s.colCfg);
  lsSet('tok_settings',    s.settings);
  lsSet('tok_team',        s.team);
  lsSet('tok_quarters',    s.quarters);
  lsSet('tok_objectives',  s.objectives);
}

// ── The store ─────────────────────────────────────
const useStore = create((set, get) => {
  const initial = loadInitialState();

  const persist = (patch) => {
    set(patch);
    const s = get();
    localSave(s);
    schedulePush();
  };

  return {
    // ── State ──
    ...initial,
    activeWeek: initial.weeks[0]?.id || null,
    activeView: 'okr',
    userName: '',
    collapsedQuarters: new Set(),
    syncStatus: 'idle',
    syncError: null,
    lastSynced: null,

    weekModalOpen: false,
    weekModalEditId: null,
    projectModalOpen: false,
    projectModalEditId: null,
    weekDropdownOpen: false,

    filters: { status: [], owner: [], vertical: [], search: '', sort: 'default' },
    analyticsFilters: { vertical: 'all', status: '', phase: '', owner: '', search: '', sort: 'name' },
    scoringFilters: { vertical: 'all', owner: '', search: '', band: 'all', sort: 'name' },
    scoringQuarter: initial.weeks[0]?.quarterId || 'q2-2026',
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
      const wd = s.weekData[weekId]?.[projectId];
      if (!wd) return { status: 'Not started', phase: '', progress: '', plan: '', engNotes: '', updated_at: null, comments: [] };
      return { phase: '', ...wd };
    },

    // ── Save weekly update (status, phase, progress, plan, engNotes) ──
    saveUpdate: (projectId, { progress, plan, status, engNotes, phase }) => {
      const s = get();
      const prev = s.getWD(s.activeWeek, projectId);
      const newWD = { ...prev, progress, plan, engNotes, status, phase: phase ?? prev.phase, updated_at: Date.now() };

      let log = [...s.changeLog];
      if (prev.status !== status) {
        log = [...log, { pid: projectId, ts: Date.now(), weekId: s.activeWeek, field: 'status', from: prev.status || '', to: status, by: s.userName || 'unknown' }];
      }
      if (phase !== undefined && prev.phase !== phase) {
        log = [...log, { pid: projectId, ts: Date.now(), weekId: s.activeWeek, field: 'phase', from: prev.phase || '', to: phase, by: s.userName || 'unknown' }];
      }
      persist({
        weekData: { ...s.weekData, [s.activeWeek]: { ...s.weekData[s.activeWeek], [projectId]: newWD } },
        changeLog: log,
      });
    },

    saveEngNotes: (projectId, notes) => {
      const s = get();
      const prev = s.getWD(s.activeWeek, projectId);
      persist({ weekData: { ...s.weekData, [s.activeWeek]: { ...s.weekData[s.activeWeek], [projectId]: { ...prev, engNotes: notes } } } });
    },

    saveWeekFieldDirect: (weekId, projectId, field, value) => {
      const s = get();
      const prev = s.weekData[weekId]?.[projectId] || { status: 'Not started', phase: '', progress: '', plan: '', engNotes: '', updated_at: null, comments: [] };
      let log = [...s.changeLog];
      if (field === 'status' && prev.status !== value) {
        log = [...log, { pid: projectId, ts: Date.now(), weekId, field: 'status', from: prev.status || '', to: value, by: s.userName || 'unknown' }];
      }
      if (field === 'phase' && prev.phase !== value) {
        log = [...log, { pid: projectId, ts: Date.now(), weekId, field: 'phase', from: prev.phase || '', to: value, by: s.userName || 'unknown' }];
      }
      persist({
        weekData: { ...s.weekData, [weekId]: { ...(s.weekData[weekId] || {}), [projectId]: { ...prev, [field]: value } } },
        changeLog: log,
      });
    },

    // ── Save project field (metadata) ──
    saveProjectField: (projectId, field, value) => {
      const s = get();
      const project = s.projects.find(p => p.id === projectId);
      if (!project || project[field] === value) return;
      persist({ projects: s.projects.map(p => p.id === projectId ? { ...p, [field]: value } : p) });
    },

    // ── Comments ──
    addComment: (weekId, projectId, author, text) => {
      const s = get();
      const prev = s.getWD(weekId, projectId);
      const comment = { author, text, ts: Date.now() };
      const updated = { ...prev, comments: [...(prev.comments || []), comment] };
      persist({ weekData: { ...s.weekData, [weekId]: { ...s.weekData[weekId], [projectId]: updated } } });
      return comment;
    },

    // ── Week management ──
    addWeek: (label, quarterId, copyFromId) => {
      const s = get();
      const id = 'w' + Date.now();
      let newWD = {};
      if (copyFromId && s.weekData[copyFromId]) {
        Object.entries(s.weekData[copyFromId]).forEach(([pid, src]) => {
          newWD[pid] = { status: src.status || 'Not started', phase: src.phase || '', progress: '', plan: '', engNotes: '', updated_at: null, comments: [] };
        });
      }
      persist({ weeks: [{ id, label, quarterId }, ...s.weeks], weekData: { ...s.weekData, [id]: newWD }, activeWeek: id });
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
      persist({ weeks: newWeeks, weekData: newWD, activeWeek: s.activeWeek === id ? (newWeeks[0]?.id || null) : s.activeWeek });
    },

    // ── Quarter management ──
    addQuarter: (label) => {
      const s = get();
      const id = label.toLowerCase().replace(/\s+/g, '-');
      persist({ quarters: [...s.quarters, { id, label }] });
      return id;
    },
    updateQuarter: (id, patch) => {
      const s = get();
      persist({ quarters: s.quarters.map(q => q.id === id ? { ...q, ...patch } : q) });
    },
    deleteQuarter: (id) => {
      const s = get();
      persist({ quarters: s.quarters.filter(q => q.id !== id) });
    },

    // ── Objective management ──
    addObjective: (obj) => {
      const s = get();
      const id = 'obj_' + Date.now();
      persist({ objectives: [...s.objectives, { ...obj, id }] });
      return id;
    },
    updateObjective: (id, patch) => {
      const s = get();
      persist({ objectives: s.objectives.map(o => o.id === id ? { ...o, ...patch } : o) });
    },
    deleteObjective: (id) => {
      const s = get();
      persist({ objectives: s.objectives.filter(o => o.id !== id) });
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

    // ── Firestore: pull on startup + real-time listener ──
    loadFromSheets: async () => {
      set({ syncStatus: 'syncing', syncError: null });
      try {
        const pulled = await pullFromFirestore();
        if (pulled && (pulled.projects?.length > 0 || pulled.weeks?.length > 0)) {
          // Apply team sync then schema v2 migration to Firestore data
          const withTeam   = applyTeamSync(pulled);
          const patched    = applySchemaV2(withTeam);
          const teamChanged    = JSON.stringify(patched.team)      !== JSON.stringify(pulled.team);
          const schemaChanged  = JSON.stringify(patched.projects)  !== JSON.stringify(pulled.projects) ||
                                 JSON.stringify(patched.weeks)     !== JSON.stringify(pulled.weeks);
          set({ ...patched, syncStatus: 'synced', lastSynced: Date.now() });
          localSave(get());
          if (teamChanged || schemaChanged) await pushToFirestore(get());
        } else {
          await pushToFirestore(get());
          set({ syncStatus: 'synced', lastSynced: Date.now() });
        }
        if (_unsubscribeFirestore) _unsubscribeFirestore();
        _unsubscribeFirestore = listenToFirestore((newState) => {
          set({ ...newState, lastSynced: Date.now() });
          localSave(get());
        });
      } catch (e) {
        console.warn('Firestore sync failed:', e);
        set({ syncStatus: 'error', syncError: e.message });
      }
    },

    // ── Derived selectors ──
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

    // Latest week with data for a project in a given quarter
    latestWeekIdForProject: (pid, quarter) => {
      const { weeks, weekData, activeWeek } = get();
      const relevant = quarter === 'all' ? weeks : weeks.filter(w => (w.quarterId || 'q2-2026') === quarter);
      const withData = relevant
        .filter(w => weekData[w.id]?.[pid]?.updated_at)
        .sort((a, b) => (weekData[b.id][pid]?.updated_at || 0) - (weekData[a.id][pid]?.updated_at || 0));
      if (withData.length) return withData[0].id;
      if (relevant.length) return relevant[0].id;
      return activeWeek;
    },

    // Helper: resolve ownerIds → team members
    resolveOwners: (ownerIds) => {
      const { team } = get();
      return (ownerIds || []).map(id => team.find(m => m.id === id)).filter(Boolean);
    },

    // Helper: resolve objectiveId → objective
    resolveObjective: (objectiveId) => {
      const { objectives } = get();
      return objectives.find(o => o.id === objectiveId) || null;
    },
  };
});

export default useStore;
