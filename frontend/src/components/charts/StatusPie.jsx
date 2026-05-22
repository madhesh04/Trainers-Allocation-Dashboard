import { Pie } from 'react-chartjs-2';
import { chartColors, tooltipConfig } from '../../charts/chartConfig';

export default function StatusPie({ status = {}, isDark }) {
  const colors = chartColors(isDark);
  const labels = Object.keys(status);
  const palette = [colors.success, colors.warning, colors.info, colors.danger, colors.textMuted];
  return (
    <Pie
      key={isDark ? 'dark' : 'light'}
      data={{
        labels,
        datasets: [
          {
            data: labels.map((key) => status[key]),
            backgroundColor: labels.map((_, idx) => palette[idx % palette.length]),
            borderWidth: 0,
          },
        ],
      }}
      options={{
        plugins: {
          tooltip: tooltipConfig(colors),
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 8,
              usePointStyle: true,
              font: { family: "'JetBrains Mono', monospace", size: 10 },
              color: colors.textMuted,
            },
          },
        },
      }}
    />
  );

}
