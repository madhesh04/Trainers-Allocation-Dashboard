function syncLabel(lastSynced) {
  if (!lastSynced) return 'Sync pending';
  const mins = Math.max(0, Math.round((Date.now() - lastSynced.getTime()) / 60000));
  return mins < 1 ? 'Synced now' : `Synced ${mins}m ago`;
}

const TAB_META = {
  'dashboard': { path: 'Overview / Dashboard', title: 'Operations Overview' },
  'availability': { path: 'Operations / Availability', title: 'Trainer Availability Board' },
  'pipeline': { path: 'Operations / Pipeline', title: 'Active Deliveries Pipeline' },
  'conflicts': { path: 'Operations / Conflicts', title: 'Conflict Resolution Center' },
  'campus-stats': { path: 'Analytics / Campus Stats', title: 'Campus Utilization Statistics' },
  'workload': { path: 'Analytics / Workload', title: 'Trainer Workload & Capacity' }
};

export default function Topbar({ activeTab = 'dashboard', lastSynced, onRefresh, onToggleTheme, isDark }) {
  const meta = TAB_META[activeTab] || TAB_META['dashboard'];

  return (
    <header className="topbar">
      <div>
        <div className="breadcrumb">Swif ops / {meta.path}</div>
        <h1>{meta.title}</h1>
      </div>
      <div className="topbar-actions">
        <div className="range-pill"><span>7D</span><span className="active">1M</span><span>3M</span><span>YTD</span></div>
        <button className="ghost-button" onClick={onRefresh}>Refresh</button>
        <button className="icon-button" onClick={onToggleTheme} aria-label="Toggle theme">{isDark ? '☾' : '☀'}</button>
        <div className="sync-text">{syncLabel(lastSynced)}</div>
        <div className="avatar">MP</div>
      </div>
    </header>
  );
}
