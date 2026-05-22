export function chartColors(isDark) {
  return {
    success: isDark ? '#34d399' : '#10b981',
    warning: isDark ? '#fbbf24' : '#f59e0b',
    danger: isDark ? '#f87171' : '#ef4444',
    info: isDark ? '#22d3ee' : '#06b6d4',
    accent: '#0325BD',
    grid: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    textMuted: isDark ? '#475569' : '#94a3b8',
    textPrimary: isDark ? '#f8fafc' : '#1e293b',
    surface: isDark ? '#1a1d27' : '#ffffff',
    border: isDark ? '#252836' : '#e2e8f0',
  };
}

export const tooltipConfig = (colors) => ({
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderWidth: 1,
  padding: 10,
  titleColor: colors.textPrimary,
  bodyColor: colors.textMuted,
  titleFont: { family: "'Inter', sans-serif", weight: '600', size: 12 },
  bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
});
