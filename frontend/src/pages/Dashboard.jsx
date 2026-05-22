import { useEffect, useState } from 'react';
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
        <div>
          <div className="card-title">{title}</div>
          <div className="card-subtitle">{subtitle}</div>
        </div>
        {chip && <span className="chip">{chip}</span>}
      </div>
      {children}
    </section>
  );
}

export default function Dashboard({ isDark, onToggleTheme }) {
  const {
    kpis,
    availability,
    deliveries,
    conflicts,
    campusStats,
    health,
    lastSynced,
    isLoading,
    error,
    fetchAll,
    startPolling,
    stopPolling,
  } = useDashboardStore();

  // --- Router & Nav State ---
  const [activeTab, setActiveTab] = useState(() => {
    return window.location.hash.slice(1) || 'dashboard';
  });

  useEffect(() => {
    const handleHash = () => {
      setActiveTab(window.location.hash.slice(1) || 'dashboard');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    startPolling();
    return stopPolling;
  }, [startPolling, stopPolling]);

  // --- Sub-page States ---
  // Availability View States
  const [availSearch, setAvailSearch] = useState('');
  const [availFilter, setAvailFilter] = useState('all');

  // Pipeline View States
  const [pipeSearch, setPipeSearch] = useState('');
  const [pipeStatus, setPipeStatus] = useState('all');
  const [pipePage, setPipePage] = useState(1);
  const itemsPerPage = 8;

  // Conflicts View States
  const [resolvedConflicts, setResolvedConflicts] = useState([]);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [selectedAlternative, setSelectedAlternative] = useState('');

  // Campus Stats States
  const [campusSearch, setCampusSearch] = useState('');

  // Reset pagination/selection on tab change
  useEffect(() => {
    setPipePage(1);
    setSelectedConflict(null);
    setSelectedAlternative('');
  }, [activeTab]);

  // --- Dynamic Operations ---
  const allConflicts = conflicts?.conflicts || [];
  const activeConflicts = allConflicts.filter(c => !resolvedConflicts.includes(`${c.delivery_id}-${c.date}`));
  const conflictCount = activeConflicts.length;

  const isConflictResolved = (item) => resolvedConflicts.includes(`${item.delivery_id}-${item.date}`);

  // Reallocate Trainer action simulation
  const handleReallocate = () => {
    if (!selectedConflict || !selectedAlternative) return;
    const key = `${selectedConflict.delivery_id}-${selectedConflict.date}`;
    setResolvedConflicts(prev => [...prev, key]);
    setSelectedConflict(null);
    setSelectedAlternative('');
  };

  // --- Render Subpages ---
  const renderContent = () => {
    if (isLoading) {
      return <div className="toast animate-fade-in-up">Loading trainer allocation data...</div>;
    }

    switch (activeTab) {
      // ----------------------------------------------------
      // OVERVIEW / DASHBOARD VIEW
      // ----------------------------------------------------
      case 'dashboard': {
        const overviewDeliveries = (deliveries?.deliveries || []).slice(0, 12);

        return (
          <>
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
              <Card title="Delivery Pipeline" subtitle="Latest 12 active deliveries"><DeliveryPipeline deliveries={overviewDeliveries} /></Card>
              <Card title="Status Mix" subtitle="Delivery status breakdown"><div className="pie-wrap"><StatusPie status={kpis?.status_breakdown || {}} isDark={isDark} /></div><ConflictAlerts conflicts={activeConflicts} /></Card>
            </div>

            <div className="two-equal animate-fade-in-up delay-6">
              <Card title="Trainer Availability" subtitle="Daily allocation heatmap per trainer" chip="Heatmap"><AvailabilityHeatmap availability={availability || {}} /></Card>
              <Card title="Workload Trend" subtitle="Assigned sessions vs capacity"><div className="chart-box"><WorkloadLine workload={kpis?.workload || []} isDark={isDark} /></div></Card>
            </div>
          </>
        );
      }

      // ----------------------------------------------------
      // OPERATIONS - AVAILABILITY VIEW
      // ----------------------------------------------------
      case 'availability': {
        const gridRows = availability?.grid || [];
        let freeCount = 0;
        let assignedCount = 0;
        let overloadCount = 0;

        gridRows.forEach(row => {
          const states = row.cells.map(c => c.state);
          if (states.includes('overload')) overloadCount++;
          else if (states.includes('assigned')) assignedCount++;
          else freeCount++;
        });

        const filteredGrid = gridRows.filter(row => {
          const matchesSearch = row.trainer.toLowerCase().includes(availSearch.toLowerCase());
          const states = row.cells.map(c => c.state);
          let matchesFilter = true;

          if (availFilter === 'free') {
            matchesFilter = !states.includes('assigned') && !states.includes('overload');
          } else if (availFilter === 'assigned') {
            matchesFilter = states.includes('assigned') && !states.includes('overload');
          } else if (availFilter === 'overload') {
            matchesFilter = states.includes('overload');
          }
          return matchesSearch && matchesFilter;
        });

        const filteredAvailability = { ...availability, grid: filteredGrid };

        return (
          <div className="animate-fade-in-up delay-1" style={{ display: 'grid', gap: '1rem' }}>
            <div className="metric-row">
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>👤</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{gridRows.length}</span>
                  <span className="metric-tile-lbl">Monitored Trainers</span>
                </div>
              </div>
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>🟢</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{freeCount}</span>
                  <span className="metric-tile-lbl">Available</span>
                </div>
              </div>
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)' }}>🔵</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{assignedCount}</span>
                  <span className="metric-tile-lbl">Active</span>
                </div>
              </div>
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>⚠️</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{overloadCount}</span>
                  <span className="metric-tile-lbl">Overloaded</span>
                </div>
              </div>
            </div>

            <div className="subpage-controls">
              <div className="search-wrapper">
                <span className="search-icon-inside">🔍</span>
                <input
                  type="text"
                  placeholder="Search trainer by name..."
                  className="subpage-search"
                  value={availSearch}
                  onChange={(e) => setAvailSearch(e.target.value)}
                />
              </div>
              <div className="subpage-filters">
                {['all', 'free', 'assigned', 'overload'].map(f => (
                  <button
                    key={f}
                    className={`filter-tab ${availFilter === f ? 'active' : ''}`}
                    onClick={() => setAvailFilter(f)}
                  >
                    {f === 'all' ? 'All Schedules' : f === 'free' ? 'Available' : f === 'assigned' ? 'Occupied' : 'Overloaded'}
                  </button>
                ))}
              </div>
            </div>

            <Card title="Trainer Capacity Grid" subtitle="Dynamic allocation schedule per trainer across standard tracking dates" chip="Interactive Heatmap">
              {filteredGrid.length > 0 ? (
                <AvailabilityHeatmap availability={filteredAvailability} />
              ) : (
                <div className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>No trainers match your active filter or search query.</div>
              )}
            </Card>

            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Trainer Workload Directory</div>
                  <div className="card-subtitle">Active metrics and cell states extracted from excel tracking grid</div>
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Trainer</th>
                    <th>Available Days</th>
                    <th>Allocated Days</th>
                    <th>Overloaded Days</th>
                    <th>Roster Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGrid.map(row => {
                    const states = row.cells.map(c => c.state);
                    const free = states.filter(s => s === 'free').length;
                    const assigned = states.filter(s => s === 'assigned').length;
                    const overload = states.filter(s => s === 'overload').length;

                    let badgeClass = 'badge-success';
                    let statusText = 'Available';
                    if (overload > 0) {
                      badgeClass = 'badge-danger';
                      statusText = 'Overloaded';
                    } else if (assigned > 0) {
                      badgeClass = 'badge-info';
                      statusText = 'Occupied';
                    }

                    return (
                      <tr key={row.trainer}>
                        <td style={{ fontWeight: 600 }}>{row.trainer}</td>
                        <td className="mono" style={{ color: 'var(--color-success)' }}>{free} days</td>
                        <td className="mono" style={{ color: 'var(--text-accent)' }}>{assigned} days</td>
                        <td className="mono" style={{ color: 'var(--color-danger)' }}>{overload} days</td>
                        <td><span className={`badge ${badgeClass}`}>{statusText}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // ----------------------------------------------------
      // OPERATIONS - DELIVERY PIPELINE VIEW
      // ----------------------------------------------------
      case 'pipeline': {
        const allDeliveries = deliveries?.deliveries || [];
        const ongoingCount = allDeliveries.filter(d => d.status.toLowerCase().includes('ongoing')).length;
        const upcomingCount = allDeliveries.filter(d => d.status.toLowerCase().includes('upcoming')).length;
        const completedCount = allDeliveries.filter(d => d.status.toLowerCase().includes('completed')).length;

        const filteredDeliveries = allDeliveries.filter(item => {
          const matchesSearch =
            item.course_name.toLowerCase().includes(pipeSearch.toLowerCase()) ||
            item.campus.toLowerCase().includes(pipeSearch.toLowerCase()) ||
            (item.trainers && item.trainers.some(t => t.toLowerCase().includes(pipeSearch.toLowerCase()))) ||
            item.delivery_id.toLowerCase().includes(pipeSearch.toLowerCase());

          const matchesStatus = pipeStatus === 'all' || item.status.toLowerCase() === pipeStatus.toLowerCase();
          return matchesSearch && matchesStatus;
        });

        const totalItems = filteredDeliveries.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        const paginatedDeliveries = filteredDeliveries.slice((pipePage - 1) * itemsPerPage, pipePage * itemsPerPage);

        return (
          <div className="animate-fade-in-up delay-1" style={{ display: 'grid', gap: '1rem' }}>
            <div className="metric-row">
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>📦</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{allDeliveries.length}</span>
                  <span className="metric-tile-lbl">Total Deliveries</span>
                </div>
              </div>
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>⚡</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{ongoingCount}</span>
                  <span className="metric-tile-lbl">Ongoing</span>
                </div>
              </div>
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>⏳</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{upcomingCount}</span>
                  <span className="metric-tile-lbl">Upcoming</span>
                </div>
              </div>
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)' }}>✅</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{completedCount}</span>
                  <span className="metric-tile-lbl">Completed</span>
                </div>
              </div>
            </div>

            <div className="subpage-controls">
              <div className="search-wrapper">
                <span className="search-icon-inside">🔍</span>
                <input
                  type="text"
                  placeholder="Search course name, campus, trainer or ID..."
                  className="subpage-search"
                  value={pipeSearch}
                  onChange={(e) => {
                    setPipeSearch(e.target.value);
                    setPipePage(1);
                  }}
                />
              </div>
              <div className="subpage-filters">
                {['all', 'ongoing', 'upcoming', 'completed'].map(f => (
                  <button
                    key={f}
                    className={`filter-tab ${pipeStatus === f ? 'active' : ''}`}
                    onClick={() => {
                      setPipeStatus(f);
                      setPipePage(1);
                    }}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="pipeline-expanded-grid">
              {paginatedDeliveries.length > 0 ? (
                paginatedDeliveries.map(item => (
                  <div className="pipeline-card-detailed" key={item.delivery_id}>
                    <div className="pipe-header-row">
                      <div className="pipe-title-wrap">
                        <div className="pipe-title-text">{item.course_name}</div>
                        <div className="pipe-id-sub">Delivery ID: {item.delivery_id}</div>
                      </div>
                      <span className={`badge ${
                        item.status.toLowerCase().includes('ongoing') ? 'badge-success' :
                        item.status.toLowerCase().includes('upcoming') ? 'badge-warning' :
                        item.status.toLowerCase().includes('completed') ? 'badge-info' : 'badge-muted'
                      }`}>{item.status}</span>
                    </div>
                    <div className="pipe-details-row">
                      <div className="pipe-detail-item">
                        <span className="pipe-detail-lbl">Campus Location</span>
                        <span className="pipe-detail-val">🏛️ {item.campus}</span>
                      </div>
                      <div className="pipe-detail-item">
                        <span className="pipe-detail-lbl">Start Date</span>
                        <span className="pipe-detail-val">🗓️ {item.start_date || 'TBD'}</span>
                      </div>
                      <div className="pipe-detail-item">
                        <span className="pipe-detail-lbl">End Date</span>
                        <span className="pipe-detail-val">🗓️ {item.end_date || 'TBD'}</span>
                      </div>
                    </div>
                    <div className="pipe-trainers-list">
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Allocated:</span>
                      {item.trainers && item.trainers.length > 0 ? (
                        item.trainers.map(t => <span className="trainer-tag" key={t}>{t}</span>)
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No trainer allocated</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '0.5rem' }}>📦</div>
                  <div className="card-title" style={{ marginBottom: '0.25rem' }}>No Deliveries Found</div>
                  <div className="card-subtitle">Try adjusting your filters or search keywords.</div>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="pagination-bar">
                <span>Showing {(pipePage - 1) * itemsPerPage + 1} to {Math.min(pipePage * itemsPerPage, totalItems)} of {totalItems} entries</span>
                <div className="pagination-btns">
                  <button className="pagination-btn" onClick={() => setPipePage(p => Math.max(1, p - 1))} disabled={pipePage === 1}>Previous</button>
                  <span style={{ alignSelf: 'center', padding: '0 8px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>Page {pipePage} of {totalPages}</span>
                  <button className="pagination-btn" onClick={() => setPipePage(p => Math.min(totalPages, p + 1))} disabled={pipePage === totalPages}>Next</button>
                </div>
              </div>
            )}
          </div>
        );
      }

      // ----------------------------------------------------
      // OPERATIONS - CONFLICT RESOLUTION VIEW
      // ----------------------------------------------------
      case 'conflicts': {
        // dynamic matching: find alternate free trainers for the selected conflict
        const alternateTrainers = [];
        if (selectedConflict && availability?.grid) {
          const conflictDate = selectedConflict.date;
          availability.grid.forEach(row => {
            if (row.trainer !== selectedConflict.trainer) {
              const cell = row.cells.find(c => c.date === conflictDate);
              if (cell && cell.state === 'free') {
                alternateTrainers.push(row.trainer);
              }
            }
          });
        }

        return (
          <div className="animate-fade-in-up delay-1" style={{ display: 'grid', gap: '1rem' }}>
            <div className="metric-row">
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>⚠️</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{conflictCount}</span>
                  <span className="metric-tile-lbl">Active Conflicts</span>
                </div>
              </div>
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>🟢</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{resolvedConflicts.length}</span>
                  <span className="metric-tile-lbl">Resolved In Session</span>
                </div>
              </div>
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-accent)' }}>🛡️</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">AI Matching</span>
                  <span className="metric-tile-lbl">Smart Backup Active</span>
                </div>
              </div>
            </div>

            <div className="conflict-resolution-split">
              <div style={{ display: 'grid', gap: '1rem', alignContent: 'start' }}>
                <Card title="Detected Spreadsheet Conflicts" subtitle="Double bookings and capacity overruns parsed in real-time" chip="Double bookings">
                  {allConflicts.length > 0 ? (
                    <div style={{ display: 'grid', gap: '0.75rem', padding: '1rem 1.25rem 1.25rem' }}>
                      {allConflicts.map((item, idx) => {
                        const resolved = isConflictResolved(item);
                        return (
                          <div className={`conflict-card-detailed ${resolved ? 'resolved' : 'critical'}`} key={`${item.delivery_id}-${item.date}-${idx}`}>
                            <div className="icon-area">{resolved ? '✅' : '⚠️'}</div>
                            <div className="conflict-content-area">
                              <div className="conflict-header">
                                <span className="conflict-title-main">{item.trainer || item.delivery_id}</span>
                                <span className={`badge ${resolved ? 'badge-success' : 'badge-danger'}`}>
                                  {resolved ? 'Resolved' : 'Critical Double Booking'}
                                </span>
                              </div>
                              <div className="conflict-msg">{item.message}</div>
                              <div className="conflict-meta-info">
                                <span>📅 Date: {item.date}</span>
                                <span>🆔 Delivery: {item.delivery_id}</span>
                              </div>
                              {!resolved && (
                                <div style={{ marginTop: '0.5rem' }}>
                                  <button
                                    className="btn-mini-action primary-action"
                                    onClick={() => {
                                      setSelectedConflict(item);
                                      setSelectedAlternative('');
                                    }}
                                  >
                                    Reallocate Backup Trainer
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>No active double bookings detected in the Excel sheet. Great job!</div>
                  )}
                </Card>
              </div>

              <div>
                {selectedConflict ? (
                  <div className="resolution-sidebar-card">
                    <div className="res-step-title">
                      <span>⚙️</span>
                      <span>AI-Assisted Roster Reallocation</span>
                    </div>
                    <p className="res-step-desc">
                      Trainer <strong>{selectedConflict.trainer}</strong> is conflicted on <strong>{selectedConflict.date}</strong> for Delivery <strong>{selectedConflict.delivery_id}</strong>. Select a backup matching trainer from below.
                    </p>

                    <div className="res-info-table">
                      <div className="res-info-table-row">
                        <span>Active Course</span>
                        <strong>Excel Allotment</strong>
                      </div>
                      <div className="res-info-table-row">
                        <span>Target Date</span>
                        <strong>{selectedConflict.date}</strong>
                      </div>
                      <div className="res-info-table-row">
                        <span>Conflicted Trainer</span>
                        <strong>{selectedConflict.trainer}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Dynamically Found Available Backups:</span>
                      {alternateTrainers.length > 0 ? (
                        alternateTrainers.map(alt => (
                          <div
                            key={alt}
                            className={`trainer-alternative-item ${selectedAlternative === alt ? 'selected' : ''}`}
                            onClick={() => setSelectedAlternative(alt)}
                          >
                            <div className="trainer-alt-info">
                              <span className="trainer-alt-name">{alt}</span>
                              <span className="trainer-alt-score">🟢 Available on {selectedConflict.date}</span>
                            </div>
                            <input
                              type="radio"
                              name="backup"
                              checked={selectedAlternative === alt}
                              onChange={() => setSelectedAlternative(alt)}
                            />
                          </div>
                        ))
                      ) : (
                        <div className="empty-state" style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                          😞 No alternate trainers are free on this date. A supervisor override or vendor pool assignment is required.
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        className="btn-full btn-primary"
                        disabled={!selectedAlternative}
                        onClick={handleReallocate}
                      >
                        Execute Reallocation
                      </button>
                      <button
                        className="btn-full btn-ghost"
                        onClick={() => {
                          setSelectedConflict(null);
                          setSelectedAlternative('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="resolution-sidebar-card" style={{ borderStyle: 'dashed', backgroundColor: 'transparent' }}>
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '32px', marginBottom: '0.875rem' }}>🛡️</div>
                      <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem', fontSize: '13px' }}>AI Reallocation Console</h4>
                      <p style={{ fontSize: '11px', lineHeight: '1.4' }}>
                        Select any active conflict double-booking on the left to activate the AI Matching scheduler. Roster availability indices will be computed in real-time.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      // ----------------------------------------------------
      // ANALYTICS - CAMPUS STATISTICS VIEW
      // ----------------------------------------------------
      case 'campus-stats': {
        const campusRows = campusStats?.campuses || [];
        let topCampus = '--';
        let highestUtil = 0;
        campusRows.forEach(c => {
          if (c.utilization_pct > highestUtil) {
            highestUtil = c.utilization_pct;
            topCampus = c.campus;
          }
        });

        const totalDeliveriesCount = campusRows.reduce((acc, c) => acc + c.total_deliveries, 0);
        const avgUtilization = campusRows.length
          ? Math.round(campusRows.reduce((acc, c) => acc + c.utilization_pct, 0) / campusRows.length)
          : 0;

        const filteredCampuses = campusRows.filter(c =>
          c.campus.toLowerCase().includes(campusSearch.toLowerCase())
        );

        return (
          <div className="animate-fade-in-up delay-1" style={{ display: 'grid', gap: '1rem' }}>
            <div className="metric-row">
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>🏛️</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{campusRows.length}</span>
                  <span className="metric-tile-lbl">Monitored Campuses</span>
                </div>
              </div>
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>⭐</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val" style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{topCampus}</span>
                  <span className="metric-tile-lbl">Top Location ({highestUtil}%)</span>
                </div>
              </div>
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)' }}>📦</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{totalDeliveriesCount}</span>
                  <span className="metric-tile-lbl">Overall Delivery Run</span>
                </div>
              </div>
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>📈</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{avgUtilization}%</span>
                  <span className="metric-tile-lbl">Average Utilization</span>
                </div>
              </div>
            </div>

            <div className="subpage-controls">
              <div className="search-wrapper">
                <span className="search-icon-inside">🔍</span>
                <input
                  type="text"
                  placeholder="Search campus by name..."
                  className="subpage-search"
                  value={campusSearch}
                  onChange={(e) => setCampusSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="simple-card-grid">
              {filteredCampuses.length > 0 ? (
                filteredCampuses.map(item => (
                  <div className="expanded-campus-card" key={item.campus}>
                    <div className="campus-card-header">
                      <div className="campus-card-name">🏛️ {item.campus}</div>
                      <span className={`badge ${
                        item.utilization_pct > 80 ? 'badge-success' :
                        item.utilization_pct >= 60 ? 'badge-warning' : 'badge-danger'
                      }`}>{item.utilization_pct}% Utilized</span>
                    </div>

                    <div className="util-progress-bar-large">
                      <div className="util-large-track">
                        <div
                          className="util-large-fill"
                          style={{
                            width: `${item.utilization_pct}%`,
                            backgroundColor:
                              item.utilization_pct > 80 ? 'var(--color-success)' :
                              item.utilization_pct >= 60 ? 'var(--color-warning)' : 'var(--color-danger)'
                          }}
                        />
                      </div>
                    </div>

                    <div className="campus-stats-split">
                      <div>
                        <div className="campus-stat-val">{item.total_deliveries}</div>
                        <div className="campus-stat-lbl">Sessions</div>
                      </div>
                      <div>
                        <div className="campus-stat-val">{item.ongoing}</div>
                        <div className="campus-stat-lbl">Ongoing</div>
                      </div>
                      <div>
                        <div className="campus-stat-val">{item.unique_trainers}</div>
                        <div className="campus-stat-lbl">Trainers</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="card" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center' }}>
                  No campus matches your search filter.
                </div>
              )}
            </div>
          </div>
        );
      }

      // ----------------------------------------------------
      // ANALYTICS - TRAINER WORKLOAD VIEW
      // ----------------------------------------------------
      case 'workload': {
        const gridRows = availability?.grid || [];
        const overloadedTrainers = [];
        const benchTrainers = [];

        gridRows.forEach(row => {
          const freeDays = row.cells.filter(c => c.state === 'free').length;
          const overloadDays = row.cells.filter(c => c.state === 'overload').length;

          if (overloadDays > 0) {
            overloadedTrainers.push({ name: row.trainer, days: overloadDays });
          }
          if (freeDays > 5) {
            benchTrainers.push({ name: row.trainer, days: freeDays });
          }
        });

        // sort overloaded descending, bench descending
        overloadedTrainers.sort((a, b) => b.days - a.days);
        benchTrainers.sort((a, b) => b.days - a.days);

        return (
          <div className="animate-fade-in-up delay-1" style={{ display: 'grid', gap: '1rem' }}>
            <div className="metric-row">
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)' }}>⚡</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{kpis?.billable_rate ?? '--'}%</span>
                  <span className="metric-tile-lbl">Billable Roster rate</span>
                </div>
              </div>
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>🛡️</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{benchTrainers.length}</span>
                  <span className="metric-tile-lbl">Bench Reserve Capacity</span>
                </div>
              </div>
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>⚠️</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{overloadedTrainers.length}</span>
                  <span className="metric-tile-lbl">Overloaded Trainers</span>
                </div>
              </div>
              <div className="metric-tile">
                <div className="metric-tile-icon" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-accent)' }}>👥</div>
                <div className="metric-tile-data">
                  <span className="metric-tile-val">{kpis?.trainers_on_ground ?? '--'}</span>
                  <span className="metric-tile-lbl">Roster Size (Live)</span>
                </div>
              </div>
            </div>

            <div className="two-col">
              <Card title="Capacity Utilization Chart" subtitle="Daily assigned sessions versus maximum ideal roster caps" chip="Workload Line">
                <div className="chart-box">
                  <WorkloadLine workload={kpis?.workload || []} isDark={isDark} />
                </div>
              </Card>
              <Card title="Roster Financial Split" subtitle="Billable vs non-billable trainer workload allocations" chip="Utilization Breakdown">
                <BillingDonut billing={kpis?.billing || {}} isDark={isDark} />
              </Card>
            </div>

            <div className="two-equal">
              <Card title="Delivery Stack Trends" subtitle="Trainer monthly assignments count" chip="Monthly bar chart">
                <div className="chart-box">
                  <DeliveryBarChart items={kpis?.monthly_activity || []} isDark={isDark} />
                </div>
              </Card>
              <div className="workload-lists-split">
                <div className="workload-list-card">
                  <span className="workload-list-title" style={{ color: 'var(--color-danger)' }}>⚠️ Overloaded Trainers Alert</span>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {overloadedTrainers.length > 0 ? (
                      overloadedTrainers.slice(0, 5).map(t => (
                        <div className="workload-list-row" key={t.name}>
                          <span className="workload-row-name">{t.name}</span>
                          <span className="workload-row-val badge badge-danger">{t.days} overload days</span>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">No trainers are currently overloaded. Great!</div>
                    )}
                  </div>
                </div>

                <div className="workload-list-card">
                  <span className="workload-list-title" style={{ color: 'var(--color-success)' }}>🟢 Bench & Backup Capacity</span>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {benchTrainers.length > 0 ? (
                      benchTrainers.slice(0, 5).map(t => (
                        <div className="workload-list-row" key={t.name}>
                          <span className="workload-row-name">{t.name}</span>
                          <span className="workload-row-val badge badge-success">{t.days} free days</span>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">No idle trainers with &gt; 5 free days. Roster fully active!</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      default:
        return <div className="toast">Under construction.</div>;
    }
  };

  return (
    <div className="shell">
      <Sidebar
        activeTab={activeTab}
        conflicts={conflictCount}
        source={health?.source === 'local_csv' ? 'Local CSV fallback' : 'OneDrive / Graph'}
      />
      <main className="main">
        <Topbar
          activeTab={activeTab}
          lastSynced={lastSynced}
          onRefresh={fetchAll}
          onToggleTheme={onToggleTheme}
          isDark={isDark}
        />
        <div className="content">
          {error && <div className="toast">API error: {error}. Showing last available data.</div>}
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
