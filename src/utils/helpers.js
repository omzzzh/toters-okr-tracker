import { SHORT_MONTHS, LONG_MONTHS } from '../data/constants';

export const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

export const tago = (ts) => {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const formatWeekLabel = (monday) => {
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const mStart = SHORT_MONTHS[monday.getMonth()];
  const mEnd   = SHORT_MONTHS[friday.getMonth()];
  const yr     = friday.getFullYear();
  if (monday.getMonth() === friday.getMonth()) {
    return `${mStart} ${monday.getDate()} – ${friday.getDate()}, ${yr}`;
  }
  return `${mStart} ${monday.getDate()} – ${mEnd} ${friday.getDate()}, ${yr}`;
};

export const parseWeekLabel = (label) => {
  try {
    const m = /(\w+)\s+(\d+)\s*[–-]\s*(?:(\w+)\s+)?(\d+),\s*(\d{4})/.exec(label);
    if (!m) return null;
    const [, mon1, d1, , , yr] = m;
    const mi = SHORT_MONTHS.findIndex(x => x.toLowerCase() === mon1.slice(0,3).toLowerCase());
    if (mi < 0) return null;
    return new Date(parseInt(yr), mi, parseInt(d1));
  } catch { return null; }
};

export const quarterFromMonday = (monday) => {
  const m = monday.getMonth() + 1;
  const y = monday.getFullYear();
  return `Q${Math.ceil(m / 3)} ${y}`;
};

export const initials = (name) =>
  String(name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

export const ownerList = (ownerStr) =>
  String(ownerStr || '').split(/\/|,/).map(s => s.trim()).filter(Boolean);

export const resolveOwnerNames = (ownerIds, team) =>
  (ownerIds || []).map(id => team.find(m => m.id === id)?.name).filter(Boolean);

export const renderMentions = (text) =>
  String(text || '').replace(/@([\w.]+@[\w.]+)/g, '<span class="mention-tag">@$1</span>');

export const buildSegments = (logs, currentVal) => {
  if (!logs.length) return [];
  const segs = [];
  for (let i = 0; i < logs.length; i++) {
    const dur = logs[i + 1] ? logs[i + 1].ts - logs[i].ts : null;
    if (logs[i].from && dur) segs.push({ label: logs[i].from, dur });
  }
  const last = logs[logs.length - 1];
  if (last) segs.push({ label: last.to || currentVal, dur: Date.now() - last.ts });
  return segs.filter(s => s.dur > 0);
};

export const calcAvgDays = (projects, toStatus, changeLog) => {
  const times = projects.map(p => {
    const logs = changeLog.filter(e => e.pid === p.id && e.field === 'status').sort((a, b) => a.ts - b.ts);
    const first = logs[0]?.ts;
    const reached = logs.find(e => e.to === toStatus)?.ts;
    return first && reached ? (reached - first) / 86400000 : null;
  }).filter(Boolean);
  return times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
};

export const getLatestStatus = (pid, changeLog, weekData, activeWeek) => {
  const logs = changeLog.filter(e => e.pid === pid && e.field === 'status').sort((a, b) => b.ts - a.ts);
  if (logs.length) return logs[0].to;
  return weekData[activeWeek]?.[pid]?.status || 'Not started';
};

export const scoreColor = (score) => {
  const SCORE_COLORS = {
    0: '#b0b6bf', 0.1: '#e05252', 0.2: '#e07052', 0.3: '#e09052',
    0.4: '#e8b020', 0.5: '#e8c820', 0.6: '#a8d020', 0.7: '#5ac840',
    0.8: '#22b060', 0.9: '#1a8848', 1.0: '#1a6a38',
  };
  return SCORE_COLORS[Math.round(score * 10) / 10] || '#b0b6bf';
};
