// ── Schema migrations ─────────────────────────────────────────────────────────
// Each migration has:
//   version     – integer, must be sequential and unique
//   description – human-readable summary (shown in console)
//   up(state)   – pure function: takes the full stored state, returns patched state
//
// Rules:
//   • Never edit an existing migration — add a new one instead.
//   • Every migration receives the FULL state object (all tok_* keys merged).
//   • Return only the keys you changed; the runner deep-merges the result.
//   • Migrations run once per browser (version tracked in tok_schema_version).
//   • When Sheets data is pulled it will be re-pushed with the migrated shape.

const MIGRATIONS = [
  {
    version: 1,
    description: 'Baseline — establish schema version tracking',
    up: (state) => state,
  },

  {
    version: 2,
    description: 'Add role field to team members',
    up: (state) => ({
      team: (state.team || []).map(m =>
        m.role !== undefined ? m : { ...m, role: '' }
      ),
    }),
  },

  {
    version: 3,
    description: 'Migrate settings: sheetId/sheetTab/apiKey → scriptUrl (Apps Script approach)',
    up: (state) => {
      const s = state.settings || {};
      // Already on new schema
      if ('scriptUrl' in s) return {};
      return {
        settings: {
          scriptUrl: '',
          ejsPK:  s.ejsPK  || '',
          ejsSID: s.ejsSID || '',
          ejsTID: s.ejsTID || '',
        },
      };
    },
  },

  {
    version: 4,
    description: 'Schema v2: quarters + objectives entities, ownerIds array, phase in weekData',
    up: (state) => {
      // Already on new schema if projects have ownerIds
      if (state.projects?.[0]?.ownerIds !== undefined) return {};

      // Old-name → current-name map
      const OLD_TO_NEW = {
        'Marwa Stephan':   'Marwa Stouhi',
        'Ahmad Lahham':    'Ahmad Louay Soussi',
        'Charbel Sassine': 'Charbel Safi',
        'Ahmad Ataya':     'Ahmad Alame',
        'Adnan Diab':      'Adnan Dimashki',
        'Ahmad Hamdan':    'Ahmad Haidar',
        'Omar Barakat':    null,
        'Therese Kairouz': 'Therese Kayrouz',
        'Ali Ezzedine':    'Ali Ezzeddine',
        'Elie Nouneh':     'Elie Noune',
        'Jana Kabrit':     null,
        'Omar Hmayssi':    null,
      };

      // Build name → ID lookup from current team (plus old-name aliases)
      const nameToId = {};
      (state.team || []).forEach(m => {
        if (m.id && m.name) nameToId[m.name] = m.id;
      });
      Object.entries(OLD_TO_NEW).forEach(([old, current]) => {
        if (current && nameToId[current]) nameToId[old] = nameToId[current];
      });

      // 1. Extract quarters from weeks
      const quarterLabels = [...new Set((state.weeks || []).map(w => w.quarter || 'Q2 2026'))].sort();
      const quarters = quarterLabels.map(label => ({
        id: label.toLowerCase().replace(/\s+/g, '-'),
        label,
      }));
      const qlToId = Object.fromEntries(quarters.map(q => [q.label, q.id]));
      if (!quarters.length) quarters.push({ id: 'q2-2026', label: 'Q2 2026' });
      const defaultQId = quarters[0].id;

      // 2. Update weeks: quarter string → quarterId
      const weeks = (state.weeks || []).map(w => {
        if (w.quarterId) return w;
        const { quarter, ...rest } = w;
        return { ...rest, quarterId: qlToId[quarter || 'Q2 2026'] || defaultQId };
      });

      // 3. Extract objectives from project obj strings (deduplicated)
      const objKeyToId = {};
      let seq = 0;
      (state.projects || []).forEach(p => {
        if (!p.obj || p.objectiveId) return;
        const key = `${p.v}::${p.obj}`;
        if (!objKeyToId[key]) objKeyToId[key] = `obj_${++seq}`;
      });
      const objectives = Object.entries(objKeyToId).map(([key, id]) => {
        const sep = key.indexOf('::');
        return { id, quarterId: defaultQId, v: key.slice(0, sep), label: key.slice(sep + 2) };
      });

      // 4. Migrate projects: owner string → ownerIds[], obj string → objectiveId
      const parseOwnerIds = (str) => {
        if (!str) return [];
        return str.split(/\/|,/).map(n => n.trim()).filter(Boolean)
          .map(name => nameToId[name] || null).filter(Boolean);
      };

      const projects = (state.projects || []).map(p => {
        if (p.ownerIds !== undefined) return p;
        const key = `${p.v}::${p.obj}`;
        const objectiveId = p.obj ? (objKeyToId[key] || null) : null;
        const ownerIds = parseOwnerIds(p.owner || '');
        const { owner, obj, phase, ...rest } = p;
        return { ...rest, quarterId: defaultQId, objectiveId, ownerIds };
      });

      // 5. Move project.phase into weekData (inject into latest week with data)
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

      return { quarters, objectives, weeks, projects, weekData };
    },
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────

const VERSION_KEY = 'tok_schema_version';
const MAX_VERSION = Math.max(...MIGRATIONS.map(m => m.version));

/**
 * Run any pending migrations against the given stored state object.
 * Returns { state, migrated } where `migrated` is true if anything changed.
 */
export function runMigrations(storedState) {
  const currentVersion = (() => {
    try {
      const raw = localStorage.getItem(VERSION_KEY);
      return raw !== null ? parseInt(raw, 10) : 0;
    } catch {
      return 0;
    }
  })();

  if (currentVersion >= MAX_VERSION) {
    return { state: storedState, migrated: false };
  }

  const pending = MIGRATIONS.filter(m => m.version > currentVersion);
  let state = { ...storedState };

  for (const migration of pending) {
    try {
      const patch = migration.up(state);
      state = { ...state, ...patch };
      console.info(`[migration] v${migration.version}: ${migration.description}`);
    } catch (err) {
      console.error(`[migration] v${migration.version} failed:`, err);
      // Continue — a failed migration should not crash the app
    }
  }

  try {
    localStorage.setItem(VERSION_KEY, String(MAX_VERSION));
  } catch {}

  return { state, migrated: true };
}

/**
 * Returns the current persisted schema version (0 if never set).
 */
export function getSchemaVersion() {
  try {
    const raw = localStorage.getItem(VERSION_KEY);
    return raw !== null ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export { MAX_VERSION as CURRENT_SCHEMA_VERSION };
