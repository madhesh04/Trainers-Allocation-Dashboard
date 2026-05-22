export default function Sidebar({ activeTab = 'dashboard', conflicts = 0, source = 'OneDrive' }) {
  const nav = [
    ['Overview', 'Dashboard', '📊'],
    ['Operations', 'Availability', '🗓️'],
    ['Operations', 'Pipeline', '📦'],
    ['Operations', 'Conflicts', '⚠️', conflicts],
    ['Analytics', 'Campus Stats', '🏛️'],
    ['Analytics', 'Workload', '📈'],
  ];

  let section = '';
  return (
    <aside className="sidebar">
      <div className="sidebar-logo-area">
        <div className="brand-icon">Q</div>
        <div className="brand-text">
          <div className="brand-name">Qlab&apos;s · Swif ops</div>
          <div className="brand-sub">TRAINER ALLOTMENT</div>
        </div>
      </div>
      <div className="live-badge"><span className="live-dot" /> LIVE EXCEL SYNC</div>
      <nav className="sidebar-nav">
        {nav.map(([group, label, icon, badge]) => {
          const tabId = label.toLowerCase().replaceAll(' ', '-');
          const isActive = tabId === activeTab;
          return (
            <div key={label}>
              {section !== group && ((section = group), <div className="nav-section">{group}</div>)}
              <a className={`nav-item ${isActive ? 'active' : ''}`} href={`#${tabId}`}>
                <span className="nav-icon">{icon}</span>
                {label}
                {!!badge && <span className="nav-badge">{badge}</span>}
              </a>
            </div>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <div>Refresh interval</div>
        <strong>Every 5 minutes</strong>
        <span>Source: {source}</span>
      </div>
    </aside>
  );
}
