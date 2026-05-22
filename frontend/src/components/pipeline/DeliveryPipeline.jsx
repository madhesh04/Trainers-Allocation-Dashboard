function statusClass(status = '') {
  const normalized = status.toLowerCase();
  if (normalized.includes('ongoing')) return 'pill-ongoing';
  if (normalized.includes('upcoming')) return 'pill-upcoming';
  if (normalized.includes('completed')) return 'pill-completed';
  return 'pill-muted';
}

export default function DeliveryPipeline({ deliveries = [] }) {
  return (
    <div className="pipeline-scroll">
      {deliveries.map((item) => (
        <div className="pipeline-row" key={item.delivery_id}>
          <div className="pipe-info">
            <div className="pipe-course">{item.course_name}</div>
            <div className="pipe-meta">{item.campus} · {item.start_date || 'TBD'} - {item.end_date || 'TBD'}</div>
          </div>
          <span className={`status-pill ${statusClass(item.status)}`}>{item.status}</span>
        </div>
      ))}
    </div>
  );
}
