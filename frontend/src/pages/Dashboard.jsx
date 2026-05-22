import { useEffect } from 'react';
import BillingDonut from '../components/charts/BillingDonut';
import DeliveryBarChart from '../components/charts/DeliveryBarChart';
import StatusPie from '../components/charts/StatusPie';
import WorkloadLine from '../components/charts/WorkloadLine';
import CampusTable from '../components/campus/CampusTable';
import ConflictAlerts from '../components/conflicts/ConflictAlerts';
import AvailabilityHeatmap from '../components/heatmap/AvailabilityHeatmap';
import KpiCard from '../components/kpi/KpiCard';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import DeliveryPipeline from '../components/pipeline/DeliveryPipeline';
import { useDashboardStore } from '../store/dashboardStore';

function Card({ title, subtitle, chip, children }) {
  return (
    <section className="card">
      <div className="card-header">
        <div><div className="card-title">{title}</div><div className="card-subtitle">{subtitle}</div></div>
        {chip && <span className="chip">{chip}</span>}
      </div>
      {children}
    </section>
  );
}

export default function Dashboard({ isDark, onToggleTheme }) {
  const { kpis, availability, deliveries, conflicts, campusStats, health, lastSynced, isLoading, error, fetchAll, startPolling, stopPolling } = useDashboardStore();

  useEffect(() => {
    startPolling();
    return stopPolling;
  }, [startPolling, stopPolling]);

  const conflictCount = conflicts?.total_conflicts || 0;

  return (
    <div className="shell">
      <Sidebar conflicts={conflictCount} source={health?.source === 'local_csv' ? 'Local CSV fallback' : 'OneDrive / Graph'} />
      <main className="main">
        <Topbar lastSynced={lastSynced} onRefresh={fetchAll} onToggleTheme={onToggleTheme} isDark={isDark} />
        <div className="content">
          {error && <div className="toast">API error: {error}. Showing last available data.</div>}
          {isLoading && <div className="toast">Loading trainer allocation data...</div>}
          <div className="kpi-grid">
            <KpiCard label="Active Deliveries" value={kpis?.active_deliveries ?? '--'} delta="↑ live" deltaType="up" icon="📦" delay={1} />
            <KpiCard label="Trainers On Ground" value={kpis?.trainers_on_ground ?? '--'} delta="this week" deltaType="up" icon="👥" iconColor="success" sparklineColor="var(--color-success)" delay={2} />
            <KpiCard label="Open Conflicts" value={conflictCount} delta="! Attention" deltaType={conflictCount ? 'neutral' : 'up'} icon="⚠" iconColor="danger" sparklineColor="var(--color-danger)" delay={3} />
            <KpiCard label="Billable Rate" value={`${kpis?.billable_rate ?? '--'}%`} delta="utilization" deltaType="up" icon="₹" iconColor="info" sparklineColor="var(--color-info)" delay={4} />
          </div>

          <div className="two-col animate-fade-in-up delay-4">
            <Card title="Delivery Activity" subtitle="Monthly trainer assignment volume" chip="Stacked">
              <div className="chart-box"><DeliveryBarChart items={kpis?.monthly_activity || []} isDark={isDark} /></div>
            </Card>
            <Card title="Billing Breakdown" subtitle="Billable vs non-billable allocation" chip="Finance">
              <BillingDonut billing={kpis?.billing || {}} isDark={isDark} />
            </Card>
          </div>

          <div className="three-col animate-fade-in-up delay-5">
            <Card title="Campus Utilization" subtitle="Top campuses by delivery count"><CampusTable campuses={campusStats?.campuses || []} /></Card>
            <Card title="Delivery Pipeline" subtitle="Latest 12 active deliveries"><DeliveryPipeline deliveries={deliveries?.deliveries || []} /></Card>
            <Card title="Status Mix" subtitle="Delivery status breakdown"><div className="pie-wrap"><StatusPie status={kpis?.status_breakdown || {}} isDark={isDark} /></div><ConflictAlerts conflicts={conflicts?.conflicts || []} /></Card>
          </div>

          <div className="two-equal animate-fade-in-up delay-6">
            <Card title="Trainer Availability" subtitle="Daily allocation heatmap per trainer" chip="Heatmap"><AvailabilityHeatmap availability={availability || {}} /></Card>
            <Card title="Workload Trend" subtitle="Assigned sessions vs capacity"><div className="chart-box"><WorkloadLine workload={kpis?.workload || []} isDark={isDark} /></div></Card>
          </div>
        </div>
      </main>
    </div>
  );
}
