export default function KpiCard({ label, value, delta, deltaType = 'neutral', icon, iconColor = 'accent', sparklineColor = 'var(--accent)', delay = 1 }) {
  return (
    <div className={`kpi-card animate-fade-in-up delay-${delay}`}>
      <div className="kpi-card-top">
        <div className="kpi-label">{label}</div>
        <div className={`kpi-icon-wrap icon-${iconColor}`}>{icon}</div>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-footer">
        <span className={`delta ${deltaType}`}>{delta}</span>
        <span className="kpi-footer-text">live workbook</span>
      </div>
      <svg className="kpi-sparkline" viewBox="0 0 90 44" preserveAspectRatio="none">
        <polyline points="0,38 12,30 24,34 36,22 48,26 60,12 72,18 82,8 90,12" fill="none" stroke={sparklineColor} strokeWidth="2.5" />
      </svg>
    </div>
  );
}
