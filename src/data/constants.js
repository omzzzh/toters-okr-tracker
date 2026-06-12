export const VMETA = {
  shopping:  { label: 'Shopping',    color: '#a855f7' },
  delivery:  { label: 'Delivery',    color: '#3b82f6' },
  merchant:  { label: 'Merchant',    color: '#22c55e' },
  ads:       { label: 'Ads',         color: '#f59e0b' },
  fresh:     { label: 'Fresh',       color: '#10b981' },
  platform:  { label: 'Platform',    color: '#6366f1' },
  fintech:   { label: 'Fintech',     color: '#ec4899' },
  ecommerce: { label: 'E-commerce',  color: '#f97316' },
};

export const VORDER = ['shopping','delivery','merchant','ads','fresh','platform','fintech','ecommerce'];

export const PHASES = ['','Discovery','Alignment','PRD Development','ENG Handover','Development'];

export const STATUSES = ['Not started','On Track','Delayed','Blocked','PRD Complete','Launched','Paused','Deprioritized'];

export const STATUS_COLORS = {
  'On Track':      '#1a7a4a',
  'Launched':      '#6b3fa0',
  'PRD Complete':  '#1a5fa8',
  'Delayed':       '#c0392b',
  'Blocked':       '#c0392b',
  'Not started':   '#b0b6bf',
  'Paused':        '#9a6200',
  'Deprioritized': '#b0b6bf',
  'Stopped':       '#b0b6bf',
};

export const STATUS_META = {
  'On Track':      { pill: 'sp-green',  row: 'row-green'  },
  'Launched':      { pill: 'sp-purple', row: 'row-purple' },
  'PRD Complete':  { pill: 'sp-blue',   row: 'row-blue'   },
  'Delayed':       { pill: 'sp-red',    row: 'row-red'    },
  'Blocked':       { pill: 'sp-red',    row: 'row-red'    },
  'Not started':   { pill: 'sp-gray',   row: 'row-gray'   },
  'Paused':        { pill: 'sp-amber',  row: 'row-amber'  },
  'Deprioritized': { pill: 'sp-gray',   row: 'row-gray'   },
};

export const PHASE_COLORS = {
  Discovery:         '#a855f7',
  Alignment:         '#3b82f6',
  'PRD Development': '#f59e0b',
  'ENG Handover':    '#10b981',
  Development:       '#e8500a',
  '':                '#d0ccc4',
};

export const SCORE_COLORS = {
  0: '#b0b6bf', 0.1: '#e05252', 0.2: '#e07052', 0.3: '#e09052',
  0.4: '#e8b020', 0.5: '#e8c820', 0.6: '#a8d020', 0.7: '#5ac840',
  0.8: '#22b060', 0.9: '#1a8848', 1.0: '#1a6a38',
};

export const TEAM = [
  { name: 'Marwa Stouhi',       email: 'marwa.stouhi@totersapp.com',    color: '#a855f7' },
  { name: 'John Homsy',         email: 'john.homsy@totersapp.com',      color: '#3b82f6' },
  { name: 'Clara Salim',        email: 'clara.salim@totersapp.com',     color: '#22c55e' },
  { name: 'Nour Eid',           email: 'nour.eid@totersapp.com',        color: '#f59e0b' },
  { name: 'Thierry Bosnoyan',   email: 'thierry.bosnoyan@totersapp.com',color: '#10b981' },
  { name: 'Mireille Naim',      email: 'mireille.naim@totersapp.com',   color: '#6366f1' },
  { name: 'Ahmad Louay Soussi', email: 'ahmad.lahham@totersapp.com',    color: '#ec4899' },
  { name: 'Therese Kairouz',    email: 'therese.k@totersapp.com',       color: '#f97316' },
  { name: 'Sara Nasser',        email: 'sara.nasser@totersapp.com',     color: '#a855f7' },
  { name: 'Jana Kabrit',        email: 'jana.kabrit@totersapp.com',     color: '#3b82f6' },
  { name: 'Raghid Farhat',      email: 'raghid.farhat@totersapp.com',   color: '#22c55e' },
  { name: 'Charbel Safi',       email: 'charbel.sassine@totersapp.com', color: '#f59e0b' },
  { name: 'Naldo Bejjani',      email: 'naldo.bejjani@totersapp.com',   color: '#10b981' },
  { name: 'Ali Ezzedine',       email: 'ali.ezzedine@totersapp.com',    color: '#6366f1' },
  { name: 'Ahmad Alame',        email: 'ahmad.ataya@totersapp.com',     color: '#ec4899' },
  { name: 'Julian Touma',       email: 'julian.touma@totersapp.com',    color: '#f97316' },
  { name: 'Adnan Dimashki',     email: 'adnan.diab@totersapp.com',      color: '#a855f7' },
  { name: 'Charles Serhal',     email: 'charles.serhal@totersapp.com',  color: '#3b82f6' },
  { name: 'Ahmad Haidar',       email: 'ahmad.hamdan@totersapp.com',    color: '#22c55e' },
  { name: 'Elie Nouneh',        email: 'elie.nouneh@totersapp.com',     color: '#f59e0b' },
  { name: 'Nancy Haddad',       email: 'nancy.haddad@totersapp.com',    color: '#10b981' },
  { name: 'Omar Hmayssi',       email: 'omar.hmayssi@totersapp.com',    color: '#e8500a' },
  { name: 'Toufic Khoury',     email: 'toufic.khoury@totersapp.com',   color: '#6366f1' },
  { name: 'Ibrahim Chawa',     email: 'ibrahim.chawa@totersapp.com',   color: '#ec4899' },
  { name: 'Soraya Haroun',     email: 'soraya.haroun@totersapp.com',   color: '#f97316' },
  { name: 'Rabeeh Adwan',      email: 'rabeeh.adwan@totersapp.com',    color: '#14b8a6' },
];

export const COL_DEFS = [
  { key: 'v',        label: 'Vertical',            type: 'select', opts: () => VORDER.map(v => VMETA[v].label), canFilter: true,  weekField: false },
  { key: 'obj',      label: 'Objective',            type: 'text',                                                canFilter: false, weekField: false },
  { key: 'name',     label: 'Project',              type: 'text',                                                canFilter: false, weekField: false },
  { key: 'owner',    label: 'Owner',                type: 'text',                                                canFilter: true,  weekField: false },
  { key: 'prdDate',  label: 'Original PRD Date',    type: 'text',                                                canFilter: false, weekField: false },
  { key: 'due',      label: 'Due Date',             type: 'text',                                                canFilter: false, weekField: false },
  { key: 'phase',    label: 'Phase',                type: 'select', opts: () => PHASES.filter(Boolean),          canFilter: true,  weekField: false },
  { key: 'status',   label: 'Status',               type: 'select', opts: () => STATUSES,                       canFilter: true,  weekField: false },
  { key: 'progress', label: 'Progress this week',   type: 'text',                                                canFilter: false, weekField: true  },
  { key: 'plan',     label: 'Plan for next week',   type: 'text',                                                canFilter: false, weekField: true  },
  { key: 'engNotes', label: 'Eng Notes',            type: 'text',                                                canFilter: false, weekField: true  },
];

export const DEFAULT_COL_WIDTHS = {
  v: 6, obj: 10, name: 12, owner: 9, prdDate: 7, due: 7,
  phase: 9, status: 11, progress: 17, plan: 17, engNotes: 11,
};

export const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const LONG_MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
