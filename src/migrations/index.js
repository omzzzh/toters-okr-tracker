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

  // ── Add future migrations here ────────────────────────────────────────────
  // {
  //   version: 4,
  //   description: 'Example: add tags array to projects',
  //   up: (state) => ({
  //     projects: (state.projects || []).map(p =>
  //       Array.isArray(p.tags) ? p : { ...p, tags: [] }
  //     ),
  //   }),
  // },
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
