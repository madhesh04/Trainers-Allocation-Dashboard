import { Line } from 'react-chartjs-2';
import { chartColors, tooltipConfig } from '../../charts/chartConfig';

export default function WorkloadLine({ workload = [], isDark }) {
  const colors = chartColors(isDark);
  return <Line key={isDark ? 'dark' : 'light'} data={{ labels: workload.map((i) => i.week), datasets: [{ label: 'Sessions assigned', data: workload.map((i) => i.assigned), borderColor: colors.accent, backgroundColor: 'rgba(3,37,189,0.14)', fill: true, tension: 0.4 }, { label: 'Capacity', data: workload.map((i) => i.capacity), borderColor: colors.textMuted, borderDash: [6, 6], pointRadius: 0, tension: 0.4 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { tooltip: tooltipConfig(colors), legend: { labels: { boxWidth: 8, usePointStyle: true } } }, scales: { x: { grid: { display: false } }, y: { grid: { color: colors.grid }, ticks: { precision: 0 } } } }} />;
}
