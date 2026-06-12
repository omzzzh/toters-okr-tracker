import React from 'react';
import useStore from '../../store/index';
import { VMETA, VORDER } from '../../data/constants';

export default function SubNav() {
  const filters = useStore(s => s.filters);
  const setFilter = useStore(s => s.setFilter);

  const tabs = [
    { v: 'all', label: 'All Product Areas', dot: null },
    ...VORDER.map(v => ({ v, label: VMETA[v].label, dot: VMETA[v].color })),
  ];

  const isAllActive = filters.vertical.length === 0;

  const handleTabClick = (v) => {
    if (v === 'all') {
      setFilter('vertical', []);
    } else {
      const cur = filters.vertical;
      const next = cur.includes(v)
        ? cur.filter(x => x !== v)
        : [...cur, v];
      setFilter('vertical', next);
    }
  };

  return (
    <nav className="subnav">
      <div className="subnav-inner">
        {tabs.map(t => {
          const active = t.v === 'all' ? isAllActive : filters.vertical.includes(t.v);
          return (
            <div
              key={t.v}
              className={'vnav' + (active ? ' active' : '')}
              onClick={() => handleTabClick(t.v)}
            >
              {t.dot && <span className="vdot" style={{ background: t.dot }} />}
              {t.label}
            </div>
          );
        })}
        <div className="subnav-right">
          <input
            type="text"
            placeholder="🔍 Search…"
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
          />
        </div>
      </div>
    </nav>
  );
}
