import React, { useState } from 'react';
import useStore from '../store/index';
import { COL_DEFS } from '../data/constants';
import { useToastCtx } from '../App';

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
  const settings = useStore(s => s.settings);
  const saveSettings = useStore(s => s.saveSettings);
  const colCfg = useStore(s => s.colCfg);
  const saveColConfig = useStore(s => s.saveColConfig);
  const resetColConfig = useStore(s => s.resetColConfig);
  const showToast = useToastCtx();

  const [form, setForm] = useState({ ...settings });
  const [cols, setCols] = useState([...colCfg]);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveConn = () => {
    saveSettings(form);
    showToast('Settings saved');
  };

  const saveCols = () => {
    saveColConfig(cols);
    showToast('Column config saved');
  };

  const updateCol = (key, newCfg) => {
    setCols(cs => cs.map(c => c.key === key ? newCfg : c));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Settings</div>
      </div>

      {/* Google Sheets */}
      <div className="settings-section">
        <div className="settings-section-header">Google Sheets Sync</div>
        <div className="settings-section-body">
          <div className="settings-field">
            <label>Spreadsheet ID</label>
            <input type="text" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" value={form.sheetId} onChange={e => setF('sheetId', e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Sheet Tab (OKR data)</label>
            <input type="text" placeholder="OKR_Data" value={form.sheetTab} onChange={e => setF('sheetTab', e.target.value)} />
          </div>
          <div className="settings-field">
            <label>API Key (OAuth token)</label>
            <input type="password" placeholder="ya29.…" value={form.apiKey} onChange={e => setF('apiKey', e.target.value)} />
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={saveConn}>Save Connection</button>
          </div>
        </div>
      </div>

      {/* EmailJS */}
      <div className="settings-section">
        <div className="settings-section-header">Email Notifications (EmailJS)</div>
        <div className="settings-section-body">
          <div className="settings-field">
            <label>Public Key</label>
            <input type="text" placeholder="EmailJS public key" value={form.ejsPK} onChange={e => setF('ejsPK', e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Service ID</label>
            <input type="text" placeholder="service_xxxxx" value={form.ejsSID} onChange={e => setF('ejsSID', e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Template ID</label>
            <input type="text" placeholder="template_xxxxx" value={form.ejsTID} onChange={e => setF('ejsTID', e.target.value)} />
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={saveConn}>Save Email Config</button>
          </div>
        </div>
      </div>

      {/* Column config */}
      <div className="settings-section">
        <div className="settings-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Column Configuration</span>
          <button className="btn" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => { resetColConfig(); setCols([...colCfg]); showToast('Reset to defaults'); }}>
            Reset to defaults
          </button>
        </div>
        <div className="settings-section-body" style={{ padding: 0 }}>
          <div className="col-cfg-row" style={{ background: 'var(--surface2)', fontWeight: 600, color: 'var(--text4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div>Column</div>
            <div>Label override</div>
            <div>Table</div>
            <div>Grid</div>
            <div>Filter</div>
            <div>Width %</div>
          </div>
          {cols.map(c => (
            <ColRow key={c.key} cfg={c} onChange={newCfg => updateCol(c.key, newCfg)} />
          ))}
        </div>
        <div style={{ padding: 14 }}>
          <button className="btn primary" onClick={saveCols}>Save Column Config</button>
        </div>
      </div>
    </div>
  );
}
