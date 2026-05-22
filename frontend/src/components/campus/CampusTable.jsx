export default function CampusTable({ campuses = [] }) {
  return (
    <table className="data-table">
      <thead><tr><th>Campus</th><th>Deliveries</th><th>Utilization</th></tr></thead>
      <tbody>
        {campuses.slice(0, 8).map((row) => {
          const tone = row.utilization_pct > 80 ? 'success' : row.utilization_pct >= 60 ? 'warning' : 'danger';
          return (
            <tr key={row.campus}>
              <td>{row.campus}</td>
              <td className="mono">{row.total_deliveries}</td>
              <td><div className="util-cell"><span>{row.utilization_pct}%</span><div className="util-track"><i className={tone} style={{ width: `${row.utilization_pct}%` }} /></div></div></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
