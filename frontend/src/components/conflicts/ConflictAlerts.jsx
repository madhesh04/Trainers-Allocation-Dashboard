export default function ConflictAlerts({ conflicts = [] }) {
  if (!conflicts.length) return <div className="empty-state">No open conflicts detected.</div>;
  return (
    <div className="conflict-list">
      {conflicts.slice(0, 5).map((item, idx) => (
        <div className="conflict-card" key={`${item.type}-${item.date}-${idx}`}>
          <div className="conflict-icon">⚠</div>
          <div>
            <div className="conflict-title">{item.trainer || item.delivery_id || 'Allocation issue'}</div>
            <div className="conflict-sub">{item.message}</div>
          </div>
          <time>{item.date}</time>
        </div>
      ))}
    </div>
  );
}
