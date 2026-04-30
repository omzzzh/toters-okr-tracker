# Toters OKR Tracker

A React + Vite single-page app for tracking weekly OKR project status across Toters product verticals.

## Dev server

```bash
# Requires nvm / Node 24+
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
cd toters-okr && npm run dev   # → http://localhost:5173
```

The `.claude/launch.json` in the repo root (`/Users/omar/.claude/launch.json`) registers the dev server so `preview_start "toters-okr"` works.

## Tech stack

- **React 19** + **Vite 8** (JSX, no TypeScript)
- **Zustand 5** — single store in `src/store/index.js`, persisted to localStorage under `tok_*` keys
- **EmailJS** — optional email notifications loaded via CDN in `index.html`
- No routing library — view switching is a string in the store (`activeView`)

## Project structure

```
src/
  data/
    constants.js   # VMETA, VORDER, STATUSES, STATUS_META, PHASES, TEAM, COL_DEFS
    seed.js        # SEED_PROJECTS, SEED_WEEKS, SEED_WEEK_DATA (pre-loaded on first run)
  store/
    index.js       # Zustand store — all state + actions
  hooks/
    useToast.js    # simple toast hook
    useMention.js  # @-mention autocomplete in comment textareas
  utils/
    helpers.js     # tago, initials, ownerList, renderMentions, scoreColor, …
    email.js       # emailMentioned, emailProjectOwners via EmailJS
  components/layout/
    Topbar.jsx      # fixed header: brand, week picker button, Add Project, New Week, username
    Sidebar.jsx     # left nav: OKR Tracker / Exec Summary / Project Grid / Analytics / Scoring / Settings
    SubNav.jsx      # filter bar shown only on OKR view (search, vertical, status, owner, sort)
    WeekModal.jsx   # create/rename/delete weeks
    ProjectModal.jsx# add/edit/delete projects
    WeekDropdown.jsx# floating week list (opens from topbar week button)
  pages/
    OKRPage.jsx     # main table: vertical → objective → project rows, inline expand to edit
    ExecPage.jsx    # executive summary cards per vertical + at-risk list
    GridPage.jsx    # project cards grid, filterable by quarter + vertical
    AnalyticsPage.jsx # status bars, vertical breakdown, change log
    ScoringPage.jsx # 0.0–1.0 slider scoring per project per quarter
    SettingsPage.jsx # column config, Google Sheets sync, EmailJS config
  App.jsx          # shell: Topbar + Sidebar + page router + modals + toast
  index.css        # full design system (CSS variables, layout, all component styles)
```

## Data model

**Projects** (`tok_projects`): `{id, v, obj, name, owner, prdDate, due, phase}`
- `v` — vertical key: `shopping | delivery | merchant | ads | fresh | platform | fintech | ecommerce`

**Weeks** (`tok_weeks`): `{id, label, quarter}` — e.g. `{id:'w1', label:'Apr 20 – 24, 2026', quarter:'Q2 2026'}`

**Week data** (`tok_weekdata`): `weekData[weekId][projectId]` → `{status, progress, plan, engNotes, updated_at, comments[]}`

**Statuses**: `Not started | On Track | Delayed | Blocked | PRD Complete | Launched | Paused | Deprioritized`

**Phases**: `Discovery | Alignment | PRD Development | ENG Handover | Development`

## Key store actions

| Action | What it does |
|--------|-------------|
| `saveUpdate(pid, {progress, plan, status, engNotes})` | Saves week data + logs status changes |
| `saveProjectField(pid, field, value)` | Edits project metadata, logs phase changes |
| `addComment(weekId, pid, author, text)` | Appends a comment to week data |
| `addWeek(label, quarter, copyFromId)` | Creates a new week, optionally copying statuses |
| `saveScore(quarter, pid, score, note)` | Saves 0.0–1.0 OKR score |
| `saveColConfig(newConfig)` | Saves column visibility/label/width config |
| `saveSettings(patch)` | Saves Google Sheets + EmailJS settings |
| `openWeekModal(id?)` / `openProjectModal(id?)` | Opens create/edit modals |

## Google Sheets sync

When `settings.sheetId` and `settings.apiKey` are set, every `persist()` call fires `syncSheets()` which writes three tabs:
- `OKR_Data` — flat table of all week × project updates
- `Change_Log` — status/phase change history
- `OKR_Scores` — scoring records

## Column configuration

`COL_DEFS` in `constants.js` defines the canonical column list. `colCfg` (persisted) controls per-column: `showInTable`, `showInGrid`, `showAsFilter`, `labelOverride`, `widthPct`. Managed in SettingsPage and read via `getTableCols()` / `getGridCols()` / `getFilterCols()` store selectors.

## Common tasks

**Add a new vertical**: Add to `VMETA` and `VORDER` in `constants.js`.

**Add a new status**: Add to `STATUSES`, `STATUS_COLORS`, and `STATUS_META` in `constants.js`.

**Reset all data**: Clear `tok_*` keys from localStorage in DevTools → Application.

**Seed a new week**: Use the "New Week" button in the topbar; optionally copy statuses from an existing week.
