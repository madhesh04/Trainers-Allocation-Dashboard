import { Bar } from 'react-chartjs-2';
import { chartColors, tooltipConfig } from '../../charts/chartConfig';

export default function DeliveryBarChart({ items = [], isDark }) {
  const colors = chartColors(isDark);
  const data = {
    labels: items.map((i) => i.month),
    datasets: [
      { label: 'Ongoing', data: items.map((i) => i.ongoing), backgroundColor: colors.success, borderRadius: 6 },
      { label: 'Upcoming', data: items.map((i) => i.upcoming), backgroundColor: colors.warning, borderRadius: 6 },
      { label: 'Completed', data: items.map((i) => i.completed), backgroundColor: colors.info, borderRadius: 6 },
    ],
  };
  return <Bar key={isDark ? 'dark' : 'light'} data={data} options={{ responsive: true, maintainAspectRatio: false, plugins: { tooltip: tooltipConfig(colors), legend: { labels: { boxWidth: 8, usePointStyle: true } } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: colors.grid }, ticks: { precision: 0 } } } }} />;
}
