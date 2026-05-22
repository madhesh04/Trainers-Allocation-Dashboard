export default function AvailabilityHeatmap({ availability = {} }) {
  const days = availability.days || [];
  const rows = availability.grid || [];
  return (
    <div className="heatmap-wrap">
      <div className="heatmap-days">{days.map((day) => <div className="hm-day-label" key={day.date}>{day.label}</div>)}</div>
      {rows.map((row) => (
        <div className="hm-row" key={row.trainer}>
          <div className="hm-name">{row.trainer}</div>
          {row.cells.map((cell) => <div className={`hm-cell ${cell.state}`} title={`${row.trainer} · ${cell.date} · ${cell.state} · ${cell.delivery_ids.join(', ')}`} key={cell.date} />)}
        </div>
      ))}
    </div>
  );
}
