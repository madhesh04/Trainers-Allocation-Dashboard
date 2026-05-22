import { Doughnut } from 'react-chartjs-2';
import { chartColors, tooltipConfig } from '../../charts/chartConfig';

export default function BillingDonut({ billing = {}, isDark }) {
  const colors = chartColors(isDark);
  const rows = [
    ['Billable', billing.billable || 0, billing.billable_pct || 0, colors.success],
    ['Non-Billable', billing.non_billable || 0, billing.non_billable_pct || 0, colors.warning],
    ['NA', billing.na || 0, billing.na_pct || 0, colors.textMuted],
  ];
  return (
    <div className="donut-block">
      <div className="donut-wrap">
        <Doughnut key={isDark ? 'dark' : 'light'} data={{ labels: rows.map((r) => r[0]), datasets: [{ data: rows.map((r) => r[1]), backgroundColor: rows.map((r) => r[3]), borderWidth: 0 }] }} options={{ cutout: '72%', plugins: { tooltip: tooltipConfig(colors), legend: { display: false } } }} />
      </div>
      <div className="billing-stats">{rows.map((row) => <div className="billing-row" key={row[0]}><span><i style={{ background: row[3] }} />{row[0]}</span><strong>{row[2]}%</strong></div>)}</div>
    </div>
  );
}
