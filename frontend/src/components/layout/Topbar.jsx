function syncLabel(lastSynced) {
  if (!lastSynced) return 'Sync pending';
  const mins = Math.max(0, Math.round((Date.now() - lastSynced.getTime()) / 60000));
  return mins < 1 ? 'Synced now' : `Synced ${mins}m ago`;
}

export default function Topbar({ lastSynced, onRefresh, onToggleTheme, isDark }) {
  return (
    <header className="topbar">
      <div>
        <div className="breadcrumb">Swif ops / Trainer Allotment / Dashboard</div>
        <h1>Trainer Allotment Dashboard</h1>
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
