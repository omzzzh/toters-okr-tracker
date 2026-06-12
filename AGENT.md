# Toters OKR Tracker — Agent Reference

A React 19 + Vite 8 single-page app for tracking weekly OKR project status across Toters product verticals. No TypeScript, no routing library, no backend server. All state lives in Zustand + localStorage, with Google Sheets as the shared database via an Apps Script Web App.

---

## Quick start

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
cd toters-okr
npm install
npm run dev          # → http://localhost:5173
npm run build        # production build → dist/
```

---

## Repository layout

```
toters-okr/
├── index.html                   # CDN: EmailJS loaded here
├── vite.config.js
├── src/
│   ├── main.jsx                 # React root mount
│   ├── App.jsx                  # Shell: Topbar + Sidebar + page router + modals + toast
│   ├── config.js                # ← ONLY file an admin needs to edit for team setup
│   ├── index.css                # Entire design system — CSS vars, layout, all components
│   │
│   ├── data/
│   │   ├── constants.js         # VMETA, VORDER, STATUSES, STATUS_META, PHASES, TEAM, COL_DEFS
│   │   └── seed.js              # SEED_PROJECTS, SEED_WEEKS, SEED_WEEK_DATA (first-run defaults)
│   │
│   ├── store/
│   │   └── index.js             # Single Zustand store — all state + every action
│   │
│   ├── migrations/
│   │   └── index.js             # Schema versioning + migration runner (tok_schema_version)
│   │
│   ├── hooks/
│   │   ├── useToast.js          # showToast(msg) — ephemeral notification
│   │   └── useMention.js        # @-mention autocomplete for textareas
│   │
│   ├── utils/
│   │   ├── helpers.js           # Pure helpers: tago, initials, ownerList, renderMentions, …
│   │   ├── email.js             # emailProjectOwners, emailMentioned via EmailJS CDN
│   │   └── sheetsSync.js        # stateToPayload, payloadToState, pushToScript, pullFromScript
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Topbar.jsx       # Brand, week selector, sync indicator, username chip, + Project
│   │   │   ├── Sidebar.jsx      # Left nav: views + week list grouped by quarter
│   │   │   ├── SubNav.jsx       # Filter bar (search, vertical, status, owner, sort) — OKR view only
│   │   │   ├── ProjectModal.jsx # Add / edit / delete projects; OwnerPicker multi-select inside
│   │   │   ├── WeekModal.jsx    # Create / rename / delete weeks
│   │   │   └── WeekDropdown.jsx # Floating week list from topbar
│   │   └── ui/
│   │       ├── OwnerChip.jsx    # Coloured avatar chip for owner names
│   │       ├── MentionPopup.jsx # @-mention dropdown popup
│   │       └── MultiSelect.jsx  # Generic multi-select dropdown
│   │
│   └── pages/
│       ├── OKRPage.jsx          # Main table: vertical → objective → project rows
│       ├── ExecPage.jsx         # Executive summary cards + at-risk list
│       ├── GridPage.jsx         # Project cards grid
│       ├── KanbanPage.jsx       # Kanban board by status
│       ├── AnalyticsPage.jsx    # Status bars, vertical breakdown, change log
│       ├── ScoringPage.jsx      # 0.0–1.0 OKR scoring sliders per quarter
│       ├── TeamPage.jsx         # Spreadsheet-style team member table
│       ├── ProjectDetailPage.jsx# Full project detail with weekly update history
│       └── SettingsPage.jsx     # Column config, Sheets connection, EmailJS, schema version
```

---

## Data model

### Projects — `tok_projects` → `state.projects[]`
```js
{
  id:      string,   // 'p' + Date.now()
  v:       string,   // vertical key — see VORDER
  obj:     string,   // objective label
  name:    string,   // project name
  owner:   string,   // "Name1 / Name2" (slash-separated)
  prdDate: string,   // free text date
  due:     string,   // free text date
  phase:   string,   // one of PHASES
}
```

### Weeks — `tok_weeks` → `state.weeks[]`
```js
{ id: string, label: string, quarter: string }
// e.g. { id: 'w1', label: 'Apr 20 – 24, 2026', quarter: 'Q2 2026' }
// Ordered newest-first; weeks[0] is the current week
```

### Week data — `tok_weekdata` → `state.weekData`
```js
weekData[weekId][projectId] = {
  status:     string,   // one of STATUSES
  progress:   string,   // free text, supports @mentions
  plan:       string,   // free text, supports @mentions
  engNotes:   string,   // free text, supports @mentions
  updated_at: number,   // Date.now() timestamp
  comments:   [{ author: string, text: string, ts: number }],
}
```

### Team — `tok_team` → `state.team[]`
```js
{
  id:    string,   // 't' + Date.now()
  name:  string,
  role:  string,
  email: string,
  color: string,   // hex, used for avatar background
}
```

### OKR Scores — `tok_okrscores` → `state.okrScores`
```js
okrScores[quarter][projectId] = {
  score:    number | null,   // 0.0 – 1.0
  note:     string,
  scoredBy: string,
  scoredAt: number,          // timestamp
}
```

### Change log — `tok_changelog` → `state.changeLog[]`
```js
{ pid, ts, weekId, field: 'status'|'phase', from, to, by }
```

### Column config — `tok_col_cfg` → `state.colCfg[]`
```js
{ key, labelOverride, showInTable, showInGrid, showAsFilter, order, widthPct }
// key matches COL_DEFS[].key
```

### Settings — `tok_settings` → `state.settings`
```js
{ scriptUrl: '', ejsPK: '', ejsSID: '', ejsTID: '' }
// scriptUrl is overridden by config.js SCRIPT_URL (config.js wins)
```

---

## State management

**Single Zustand store** at `src/store/index.js`. Every mutation goes through `persist(patch)`:

```js
const persist = (patch) => {
  set(patch);                                    // update Zustand state
  localSave(get());                              // write all tok_* keys to localStorage
  if (scriptUrl) schedulePush(get());            // debounced 2s push to Google Sheets
};
```

**Reading state in components:**
```jsx
const projects = useStore(s => s.projects);
const saveUpdate = useStore(s => s.saveUpdate);
```

**Key actions:**

| Action | Signature | Notes |
|--------|-----------|-------|
| `saveUpdate` | `(pid, {progress, plan, status, engNotes})` | Saves week data, logs status changes |
| `saveProjectField` | `(pid, field, value)` | Edits project metadata, logs phase changes |
| `addComment` | `(weekId, pid, author, text)` | Returns the new comment object |
| `saveWeekFieldDirect` | `(weekId, pid, field, value)` | Used by grid/kanban for direct edits |
| `addWeek` | `(label, quarter, copyFromId?)` | Creates week, optionally copies statuses |
| `saveScore` | `(quarter, pid, score, note)` | Saves OKR score |
| `addMember` / `updateMember` / `deleteMember` | team CRUD | |
| `addProject` / `updateProject` / `deleteProjects` | project CRUD | `deleteProjects` takes `ids[]` |
| `saveSettings` | `(patch)` | Shallow-merges into settings |
| `loadFromSheets` | `async ()` | Pull from Sheets on startup; pushes local state up if Sheets is empty |
| `getWD` | `(weekId, pid)` | Returns weekData entry with safe defaults |
| `getTableCols` / `getGridCols` / `getFilterCols` | `()` | Returns filtered+sorted COL_DEFS merged with colCfg |

---

## Google Sheets sync

### Architecture
- **No OAuth.** Uses a Google Apps Script Web App deployed as "Anyone can access".
- The script URL is baked into `src/config.js` (one-time admin setup). All team members connect automatically — zero per-user config.
- Every `persist()` schedules a debounced 2-second push. On startup, `App.jsx` calls `loadFromSheets()`.

### CORS / redirect fix
Apps Script `/exec` returns a 302 redirect. Browsers convert POST→GET on 302, stripping the body. Fix in `sheetsSync.js`: `pullFromScript` (GET) captures `response.url` after the redirect (the real `script.googleusercontent.com` URL) and caches it. `pushToScript` posts directly to that URL, bypassing the redirect.

### Sheets tabs
| Tab | Content |
|-----|---------|
| `projects` | Flat project rows |
| `team` | Team members |
| `weeks` | Week definitions |
| `weekdata` | Flat weekId × projectId rows (status, progress, plan, engNotes) |
| `comments` | Flat weekId × projectId × comment rows |
| `changelog` | Status/phase change log |
| `okrscores` | Quarter × project scoring |

### Sync state
`state.syncStatus`: `'idle' | 'syncing' | 'synced' | 'error'`
Shown in the Topbar as a coloured dot indicator.

---

## Migrations

Schema version tracked in `localStorage['tok_schema_version']`. On every startup, `loadInitialState` in the store passes raw localStorage data through `runMigrations()` before use.

**To add a migration** — append to the array in `src/migrations/index.js`:
```js
{
  version: 4,                          // must be MAX + 1
  description: 'Add tags to projects',
  up: (state) => ({                    // return only the keys you changed
    projects: (state.projects || []).map(p =>
      Array.isArray(p.tags) ? p : { ...p, tags: [] }
    ),
  }),
}
```
Rules: never edit existing migrations; migrations are pure functions; a thrown error logs and continues (won't crash the app).

Current migrations: v1 baseline · v2 team `role` field · v3 settings `sheetId→scriptUrl`.

---

## Styling

**Single CSS file:** `src/index.css` — no CSS modules, no Tailwind.

**Design tokens (CSS variables in `:root`):**
```css
--ink / --ink2 / --ink3 / --ink4     /* text shades */
--paper / --paper2 / --paper3        /* background shades */
--white
--rule / --rule2                     /* border colors */
--accent: #e8500a                    /* Toters orange */
--green / --red / --amber / --blue / --purple   /* semantic colors */
--sans    /* 'Product Sans', 'Google Sans', Nunito, sans-serif */
--display /* same as --sans */
--mono    /* 'Product Sans', ... DM Mono, monospace */
--r: 6px  /* border-radius */
--r2: 10px
```

**Conventions:**
- All component styles live in `index.css`, scoped by BEM-ish class names (e.g. `.proj-table`, `.td-ta`, `.status-pill`).
- No inline styles except for dynamic values (colours, widths from data).
- Status row highlighting: `.row-green`, `.row-red`, `.row-amber`, `.row-blue`, `.row-purple`, `.row-gray` on `<tr>`.
- Status pills: `.status-pill.sp-green`, `.sp-red`, `.sp-amber`, `.sp-blue`, `.sp-purple`, `.sp-gray`.

---

## Key constants (`src/data/constants.js`)

```js
VORDER   // ['shopping','delivery','merchant','ads','fresh','platform','fintech','ecommerce']
VMETA    // { [key]: { label, color } }
STATUSES // ['Not started','On Track','Delayed','Blocked','PRD Complete','Launched','Paused','Deprioritized']
PHASES   // ['','Discovery','Alignment','PRD Development','ENG Handover','Development']
COL_DEFS // canonical column definitions — key, label, type, canFilter, weekField
TEAM     // seed team members array (used only on first run — live data is in tok_team)
```

---

## Utilities (`src/utils/helpers.js`)

| Function | What it does |
|----------|-------------|
| `tago(ts)` | Timestamp → "3h ago" |
| `initials(name)` | "Omar Barakat" → "OB" |
| `ownerList(str)` | "Name1 / Name2" → `['Name1', 'Name2']` |
| `renderMentions(text)` | Wraps `@mentions` in `<span class="mention-tag">` |
| `formatWeekLabel(monday)` | Date → "Apr 20 – 24, 2026" |
| `parseWeekLabel(label)` | Inverse of above |
| `quarterFromMonday(monday)` | Date → "Q2 2026" |
| `scoreColor(score)` | 0.0–1.0 → hex colour |
| `calcAvgDays(projects, toStatus, changeLog)` | Average days to reach a status |

---

## @mention system

**Hook:** `useMention(team)` in `src/hooks/useMention.js`
- Attach to any `<textarea>` via `{ value, onChange: handleChange, onKeyDown }` spread
- Returns `{ popup, handleChange, handleKeyDown, handleSelect }` + a ref
- Detects `@query` pattern, filters team by name
- On select: inserts `@Full Name` into the textarea

**Extracting mentioned members:**
```js
import { getMentionedMembers } from '../hooks/useMention';
const mentioned = getMentionedMembers(text, team);
// → team member objects whose first name appears after @ in text
```

**Rendering:**
```jsx
import MentionPopup from '../components/ui/MentionPopup';
<MentionPopup popup={popup} onSelect={handleSelect} onClose={() => {}} />
```

---

## Email notifications (`src/utils/email.js`)

Requires EmailJS configured in Settings (public key, service ID, template ID).

```js
emailProjectOwners(settings, project, commenterName, commentText, weekLabel, team)
// Sends to all owners listed in project.owner

emailMentioned(settings, member, commenterName, projectName, commentText)
// Sends to a single team member object {name, email}
```

---

## Adding common things

### New vertical
1. Add to `VMETA` in `constants.js`: `myv: { label: 'My Vertical', color: '#hex' }`
2. Add key to `VORDER` array in preferred position

### New status
1. Add string to `STATUSES` array
2. Add colour to `STATUS_COLORS`
3. Add pill/row classes to `STATUS_META`
4. Add `.sp-*` and `.row-*` CSS rules to `index.css`

### New project field
1. Add entry to `COL_DEFS` in `constants.js`
2. Add `DEFAULT_COL_WIDTHS` entry
3. Add to project shape in `ProjectModal.jsx`
4. Render in `OKRPage.jsx` table and/or `ProjectDetailPage.jsx`
5. Add a migration in `src/migrations/index.js` to backfill existing projects

### New page / view
1. Create `src/pages/MyPage.jsx`
2. Add nav item in `Sidebar.jsx` with the view key string
3. Add `case 'myview': return <MyPage />;` in `App.jsx`

### New migration
See [Migrations](#migrations) section above.

---

## localStorage keys

| Key | Content |
|-----|---------|
| `tok_projects` | Projects array |
| `tok_weeks` | Weeks array |
| `tok_weekdata` | weekData nested object |
| `tok_changelog` | Change log array |
| `tok_okrscores` | OKR scores nested object |
| `tok_ai_cache` | AI summary cache |
| `tok_col_cfg` | Column config array |
| `tok_settings` | Settings object |
| `tok_team` | Team members array |
| `tok_schema_version` | Integer — current migration version |

**Reset everything:** DevTools → Application → Local Storage → delete all `tok_*` keys.

---

## Config (`src/config.js`)

```js
export const SCRIPT_URL = 'https://script.google.com/…/exec';
```

This is the **only file** that needs changing for a new deployment. Set it once; everyone who runs the app connects to the same Google Sheet automatically. Leave it empty (`''`) for local-only mode.
