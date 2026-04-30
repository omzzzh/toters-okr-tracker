import React from 'react';
import useStore from '../../store/index';
import { STATUSES, VMETA, VORDER } from '../../data/constants';

export default function SubNav() {
  const filters = useStore(s => s.filters);
  const setFilter = useStore(s => s.setFilter);
  const clearFilters = useStore(s => s.clearFilters);
  const projects = useStore(s => s.projects);
  const weekData = useStore(s => s.weekData);
  const activeWeek = useStore(s => s.activeWeek);

  const hasFilters = filters.search || filters.status || filters.owner || filters.vertical !== 'all';

  const visibleCount = projects.filter(p => {
    if (filters.vertical !== 'all' && p.v !== filters.vertical) return false;
    if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase()) && !p.owner.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status) {
      const wd = weekData[activeWeek]?.[p.id];
      if ((wd?.status || 'Not started') !== filters.status) return false;
    }
    if (filters.owner && !p.owner.toLowerCase().includes(filters.owner.toLowerCase())) return false;
    return true;
  }).length;

  const owners = [...new Set(projects.map(p => p.owner.split(/\/|,/).map(s => s.trim())).flat())].filter(Boolean).sort();

  return (
    <div className="subnav">
      <div className="subnav-search">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Search projects…"
          value={filters.search}
          onChange={e => setFilter('search', e.target.value)}
        />
      </div>

      <select value={filters.vertical} onChange={e => setFilter('vertical', e.target.value)}>
        <option value="all">All Verticals</option>
        {VORDER.map(v => <option key={v} value={v}>{VMETA[v].label}</option>)}
      </select>

      <select value={filters.status} onChange={e => setFilter('status', e.target.value)}>
        <option value="">All Statuses</option>
        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <select value={filters.owner} onChange={e => setFilter('owner', e.target.value)}>
        <option value="">All Owners</option>
        {owners.map(o => <option key={o} value={o}>{o}</option>)}
      </select>

      <select value={filters.sort} onChange={e => setFilter('sort', e.target.value)}>
        <option value="default">Default Order</option>
        <option value="status">By Status</option>
        <option value="owner">By Owner</option>
        <option value="name">By Name</option>
      </select>

      {hasFilters && (
        <button className="subnav-clear" onClick={clearFilters}>
          Clear filters ✕
        </button>
      )}

      <div className="subnav-spacer" />
      <span className="subnav-count">{visibleCount} project{visibleCount !== 1 ? 's' : ''}</span>
    </div>
  );
}
