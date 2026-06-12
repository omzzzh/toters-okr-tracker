import React, { useState } from 'react';
import useStore from '../store/index';
import { COL_DEFS } from '../data/constants';
import { useToastCtx } from '../App';
import { APPS_SCRIPT_CODE } from '../utils/sheetsSync';
import { SCRIPT_URL as CONFIG_SCRIPT_URL } from '../config';
import { getSchemaVersion, CURRENT_SCHEMA_VERSION } from '../migrations';

function ColRow({ cfg, onChange }) {
  const def = COL_DEFS.find(d => d.key === cfg.key);
  return (
    <div className="col-cfg-row">
      <div style={{ fontWeight: 500 }}>{def?.label || cfg.key}</div>
      <input
        type="text"
        placeholder="Label override…"
        value={cfg.labelOverride}
        onChange={e => onChange({ ...cfg, labelOverride: e.target.value })}
      />
      <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11 }}>
        <input type="checkbox" className="toggle" checked={cfg.showInTable} onChange={e => onChange({ ...cfg, showInTable: e.target.checked })} />
        Table
      </label>
      <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11 }}>
        <input type="checkbox" className="toggle" checked={cfg.showInGrid} onChange={e => onChange({ ...cfg, showInGrid: e.target.checked })} />
        Grid
      </label>
      {def?.canFilter && (
        <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11 }}>
          <input type="checkbox" className="toggle" checked={cfg.showAsFilter} onChange={e => onChange({ ...cfg, showAsFilter: e.target.checked })} />
          Filter
        </label>
      )}
      {!def?.canFilter && <div />}
      <input
        type="number"
        min={3} max={40}
        value={cfg.widthPct || 10}
        onChange={e => onChange({ ...cfg, widthPct: Number(e.target.value) })}
        title="Column width %"
      />
    </div>
  );
}

export default function SettingsPage() {
  const settings      = useStore(s => s.settings);
  const saveSettings  = useStore(s => s.saveSettings);
  const loadFromSheets = useStore(s => s.loadFromSheets);
  const syncStatus    = useStore(s => s.syncStatus);
  const syncError     = useStore(s => s.syncError);
  const colCfg        = useStore(s => s.colCfg);
  const saveColConfig = useStore(s => s.saveColConfig);
  const resetColConfig = useStore(s => s.resetColConfig);
  const showToast     = useToastCtx();

  const [form, setForm]   = useState({ ...settings });
  const [cols, setCols]   = useState([...colCfg]);
  const [copied, setCopied] = useState(false);
  const [showScript, setShowScript] = useState(false);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveAll = () => { saveSettings(form); showToast('Settings saved'); };

  const saveCols = () => { saveColConfig(cols); showToast('Column config saved'); };

  const updateCol = (key, newCfg) => setCols(cs => cs.map(c => c.key === key ? newCfg : c));

  const copyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testConnection = async () => {
    const urlToTest = CONFIG_SCRIPT_URL || form.scriptUrl;
    if (!urlToTest) return showToast('Enter the script URL first');
    showToast('Testing…');
    try {
      const res = await fetch(urlToTest + '?action=read');
      const json = await res.json();
      if (json.ok) showToast('✓ Connected to Google Sheets');
      else showToast('Error: ' + json.error);
    } catch (e) {
      showToast('Connection failed: ' + e.message);
    }
  };

  const forcePull = async () => {
    saveSettings(form);
    await loadFromSheets();
    showToast('✓ Data pulled from Sheets');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Settings</div>
      </div>

      {/* ── Google Sheets Database ── */}
      <div className="settings-section">
        <div className="settings-section-header">Google Sheets Database</div>
        <div className="settings-section-body">

          {CONFIG_SCRIPT_URL ? (
            /* ── Already configured centrally ── */
            <div>
              <div className="gs-connected-banner">
                <span className="sync-dot synced" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Connected</strong> — this app is using a shared Google Sheet configured by your admin.
                  No setup needed on your end.
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn btn-ghost" onClick={testConnection}>Test connection</button>
                <button className="btn btn-ghost" onClick={forcePull}>Pull latest from Sheets</button>
                {syncStatus === 'error' && (
                  <span style={{ fontSize: 12, color: 'var(--red)' }}>⚠ {syncError}</span>
                )}
              </div>
              <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--paper)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--ink3)', fontFamily: 'var(--mono)', wordBreak: 'break-all' }}>
                {CONFIG_SCRIPT_URL}
              </div>
            </div>
          ) : (
            /* ── Not yet configured ── */
            <div>
              <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 16, lineHeight: 1.6 }}>
                Connect to a shared Google Sheet so the whole team reads and writes the same data.
                You only do this once — after setting it up, paste the URL into{' '}
                <code style={{ fontFamily: 'var(--mono)', fontSize: 12, background: 'var(--paper)', padding: '1px 5px', borderRadius: 3 }}>src/config.js</code>
                {' '}and everyone connects automatically.
              </p>

              <div className="gs-setup-steps">
                <div className="gs-step">
                  <div className="gs-step-num">1</div>
                  <div>
                    <strong>Create a Google Sheet</strong> — open{' '}
                    <a href="https://sheets.new" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>sheets.new</a>
                    {' '}and name it (e.g. "Toters OKR Data").
                  </div>
                </div>
                <div className="gs-step">
                  <div className="gs-step-num">2</div>
                  <div>
                    <strong>Open Apps Script</strong> — click <em>Extensions → Apps Script</em>.
                    Delete the default code and paste the script below.
                  </div>
                </div>
                <div className="gs-step">
                  <div className="gs-step-num">3</div>
                  <div>
                    <strong>Deploy as Web App</strong> — <em>Deploy → New deployment</em>.
                    Set <em>Execute as: Me</em> and <em>Who has access: Anyone</em>. Copy the URL.
                  </div>
                </div>
                <div className="gs-step">
                  <div className="gs-step-num">4</div>
                  <div>
                    <strong>Paste the URL</strong> into{' '}
                    <code style={{ fontFamily: 'var(--mono)', fontSize: 12, background: 'var(--paper2)', padding: '1px 5px', borderRadius: 3 }}>src/config.js</code>
                    {' '}— one line:{' '}
                    <code style={{ fontFamily: 'var(--mono)', fontSize: 12, background: 'var(--paper2)', padding: '1px 5px', borderRadius: 3 }}>export const SCRIPT_URL = 'https://…';</code>
                    {' '}Then restart the dev server. Done — everyone connects automatically.
                  </div>
                </div>
              </div>

              <div style={{ margin: '14px 0' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowScript(s => !s)}
                  style={{ marginBottom: 8 }}
                >
                  {showScript ? '▾ Hide script' : '▸ Show Apps Script code to paste'}
                </button>
                {showScript && (
                  <div style={{ position: 'relative' }}>
                    <pre className="gs-script-pre">{APPS_SCRIPT_CODE}</pre>
                    <button className="btn btn-save btn-sm gs-copy-btn" onClick={copyScript}>
                      {copied ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>

              <div className="settings-field" style={{ marginTop: 8 }}>
                <label>Test with a URL (browser-only, not shared)</label>
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/…/exec"
                  value={form.scriptUrl || ''}
                  onChange={e => setF('scriptUrl', e.target.value)}
                />
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>
                  This only affects your browser. To share it with the team, add it to <code style={{ fontFamily: 'var(--mono)' }}>src/config.js</code>.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn primary" onClick={saveAll}>Save (browser only)</button>
                <button className="btn btn-ghost" onClick={testConnection}>Test connection</button>
                <button className="btn btn-ghost" onClick={forcePull}>Pull latest from Sheets</button>
                {syncStatus === 'error' && (
                  <span style={{ fontSize: 12, color: 'var(--red)' }}>⚠ {syncError}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── EmailJS ── */}
      <div className="settings-section">
        <div className="settings-section-header">Email Notifications (EmailJS)</div>
        <div className="settings-section-body">
          <div className="settings-field">
            <label>Public Key</label>
            <input type="text" placeholder="EmailJS public key" value={form.ejsPK || ''} onChange={e => setF('ejsPK', e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Service ID</label>
            <input type="text" placeholder="service_xxxxx" value={form.ejsSID || ''} onChange={e => setF('ejsSID', e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Template ID</label>
            <input type="text" placeholder="template_xxxxx" value={form.ejsTID || ''} onChange={e => setF('ejsTID', e.target.value)} />
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={saveAll}>Save Email Config</button>
          </div>
        </div>
      </div>

      {/* ── Column config ── */}
      <div className="settings-section">
        <div className="settings-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Column Configuration</span>
          <button className="btn" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => { resetColConfig(); setCols([...colCfg]); showToast('Reset to defaults'); }}>
            Reset to defaults
          </button>
        </div>
        <div className="settings-section-body" style={{ padding: 0 }}>
          <div className="col-cfg-row" style={{ background: 'var(--surface2)', fontWeight: 600, color: 'var(--text4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div>Column</div><div>Label override</div><div>Table</div><div>Grid</div><div>Filter</div><div>Width %</div>
          </div>
          {cols.map(c => (
            <ColRow key={c.key} cfg={c} onChange={newCfg => updateCol(c.key, newCfg)} />
          ))}
        </div>
        <div style={{ padding: 14 }}>
          <button className="btn primary" onClick={saveCols}>Save Column Config</button>
        </div>
      </div>

      {/* ── Schema version ── */}
      <div style={{ padding: '18px 0 4px', textAlign: 'right', fontSize: 11, color: 'var(--ink4)' }}>
        Schema v{getSchemaVersion()} / latest v{CURRENT_SCHEMA_VERSION}
      </div>
    </div>
  );
}
