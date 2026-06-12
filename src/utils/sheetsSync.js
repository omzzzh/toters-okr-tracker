// ── Serialise store state → flat row arrays for Sheets ───────────────────────

export function stateToPayload({ projects, team, weeks, weekData, changeLog, okrScores }) {
  const weekdataRows = [];
  const commentRows  = [];

  Object.entries(weekData).forEach(([weekId, byProject]) => {
    Object.entries(byProject).forEach(([projectId, d]) => {
      weekdataRows.push({
        weekId, projectId,
        status:     d.status     || '',
        progress:   d.progress   || '',
        plan:       d.plan       || '',
        engNotes:   d.engNotes   || '',
        updated_at: d.updated_at || '',
      });
      (d.comments || []).forEach(c =>
        commentRows.push({ weekId, projectId, author: c.author, text: c.text, ts: c.ts })
      );
    });
  });

  const okrscoreRows = [];
  Object.entries(okrScores).forEach(([quarter, scores]) =>
    Object.entries(scores).forEach(([pid, s]) =>
      okrscoreRows.push({ quarter, pid, score: s.score ?? '', note: s.note || '', scoredBy: s.scoredBy || '', scoredAt: s.scoredAt || '' })
    )
  );

  return {
    projects:  projects.map(p => ({ ...p })),
    team:      team.map(m => ({ ...m })),
    weeks:     weeks.map(w => ({ ...w })),
    weekdata:  weekdataRows,
    comments:  commentRows,
    changelog: changeLog.map(e => ({ ...e })),
    okrscores: okrscoreRows,
  };
}

// ── Deserialise flat row arrays → store state shape ───────────────────────────

export function payloadToState({ projects = [], team = [], weeks = [], weekdata = [], comments = [], changelog = [], okrscores = [] }) {
  // Rebuild weekData nested object
  const weekData = {};
  weekdata.forEach(row => {
    if (!row.weekId || !row.projectId) return;
    if (!weekData[row.weekId]) weekData[row.weekId] = {};
    weekData[row.weekId][row.projectId] = {
      status:     row.status     || 'Not started',
      progress:   row.progress   || '',
      plan:       row.plan       || '',
      engNotes:   row.engNotes   || '',
      updated_at: row.updated_at ? Number(row.updated_at) : null,
      comments:   [],
    };
  });

  comments.forEach(c => {
    if (!c.weekId || !c.projectId) return;
    if (!weekData[c.weekId]) weekData[c.weekId] = {};
    if (!weekData[c.weekId][c.projectId])
      weekData[c.weekId][c.projectId] = { status: 'Not started', progress: '', plan: '', engNotes: '', updated_at: null, comments: [] };
    weekData[c.weekId][c.projectId].comments.push({ author: c.author, text: c.text, ts: Number(c.ts) });
  });

  // Rebuild okrScores nested object
  const okrScores = {};
  okrscores.forEach(row => {
    if (!row.quarter || !row.pid) return;
    if (!okrScores[row.quarter]) okrScores[row.quarter] = {};
    okrScores[row.quarter][row.pid] = {
      score:    row.score !== '' && row.score != null ? Number(row.score) : null,
      note:     row.note     || '',
      scoredBy: row.scoredBy || '',
      scoredAt: row.scoredAt ? Number(row.scoredAt) : null,
    };
  });

  return {
    projects:  projects,
    team:      team,
    weeks:     weeks,
    weekData,
    changeLog: changelog.map(e => ({ ...e, ts: Number(e.ts) })),
    okrScores,
  };
}

// ── API calls ─────────────────────────────────────────────────────────────────
// Apps Script /exec returns a 302 redirect; browsers follow it but silently
// convert POST → GET (legacy browser behaviour), so doPost never fires and the
// body is lost.  Fix: the redirected URL (script.googleusercontent.com/…) is
// the real execution endpoint — no redirect there.  We cache it from the GET
// response and POST directly to it.

let _execUrl = null;
let _execUrlTs = 0;
const EXEC_URL_TTL = 30 * 60 * 1000; // 30 min

export async function pullFromScript(scriptUrl) {
  const res = await fetch(scriptUrl + '?action=read');
  // Cache the post-redirect URL for use in push
  if (res.url && res.url !== scriptUrl + '?action=read') {
    _execUrl = res.url.split('?')[0]; // strip query params
    _execUrlTs = Date.now();
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let json;
  try { json = await res.json(); }
  catch { throw new Error('Response is not JSON — check deployment: Execute as Me, Who has access: Anyone'); }
  if (!json.ok) throw new Error(json.error || 'Script returned error');
  return payloadToState(json.data);
}

export async function pushToScript(scriptUrl, state) {
  const payload = stateToPayload(state);
  // Use cached exec URL to bypass the 302 redirect that strips the POST body
  const url = (_execUrl && Date.now() - _execUrlTs < EXEC_URL_TTL)
    ? _execUrl
    : scriptUrl;
  const res = await fetch(url, {
    method: 'POST',
    // text/plain avoids CORS preflight; Apps Script reads e.postData.contents
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let json;
  try { json = await res.json(); }
  catch { throw new Error('Write failed — response is not JSON'); }
  if (!json.ok) throw new Error(json.error || 'Script returned error');
}

// ── The Apps Script code users paste into their Sheet ─────────────────────────
// Keep this in sync with pushToScript / pullFromScript above.

export const APPS_SCRIPT_CODE = `// Toters OKR Tracker — Apps Script database
// Paste this into Extensions → Apps Script, then Deploy → New deployment → Web App
// Execute as: Me  |  Who has access: Anyone

const SHEETS = ['projects','team','weeks','weekdata','comments','changelog','okrscores'];

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const data = {};
    SHEETS.forEach(name => { data[name] = readSheet(ss, name); });
    return json({ ok: true, data });
  } catch(err) {
    return json({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    SHEETS.forEach(name => {
      if (payload[name] !== undefined) writeSheet(ss, name, payload[name]);
    });
    return json({ ok: true });
  } catch(err) {
    return json({ ok: false, error: err.message });
  }
}

function readSheet(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0].map(String);
  return rows.slice(1)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
      return obj;
    })
    .filter(r => Object.values(r).some(v => v !== '' && v !== null));
}

function writeSheet(ss, name, rows) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  else sheet.clearContents();
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const values  = [headers, ...rows.map(r => headers.map(h => r[h] ?? ''))];
  sheet.getRange(1, 1, values.length, headers.length).setValues(values);
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`;
