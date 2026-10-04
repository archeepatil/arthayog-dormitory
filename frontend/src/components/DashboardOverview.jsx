import React from 'react';
import { 
  BedDouble, 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle, 
  RefreshCw,
  Clock, 
  Package, 
  ShieldCheck, 
  ChevronRight, 
  TrendingUp, 
  PhoneCall, 
  CalendarCheck,
  Settings,
  ClipboardList,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { useLanguage } from '../i18n.jsx';

export default function DashboardOverview({ 
  stats, 
  analytics, 
  recentBookings = [],
  loading, 
  onRefresh, 
  onTriggerExpiry, 
  setActiveTab,
  onOpenPhoneBooking,
  onSelectBooking 
}) {
  const { t } = useLanguage();

  if (loading && !stats) {
    return (
      <div className="card loading-panel">
        <p>{t('loading', 'Loading real-time operations telemetry from persistent database...')}</p>
      </div>
    );
  }

  const s = stats || {
    total_beds: 16,
    available_beds: 16,
    reserved_beds: 0,
    occupied_beds: 0,
    today_checkins_count: 0,
    today_checkouts_count: 0,
    pending_payments_count: 0,
    pending_payments_amount: 0.0,
    total_revenue_inr: 0.0,
    low_stock_items_count: 0
  };

  const occupancyRate = s.total_beds > 0 
    ? Math.round(((s.occupied_beds + s.reserved_beds) / s.total_beds) * 100) 
    : 0;

  return (
    <div className="today-operations-dashboard animate-fade-in">
      {/* 1. Command Header Bar */}
      <div className="card ops-hero-card">
        <div className="ops-hero-left">
          <span className="badge badge-accent">{t('owner_command_badge', 'Owner & Property Command')}</span>
          <h2>{t('ops_dashboard_title', 'Dormitory Operations Dashboard')}</h2>
          <p className="subtitle">
            {t('ops_dashboard_sub', '16-Bed Real Database Telemetry • Live Occupancy & Financial Overview')}
          </p>
        </div>

        <div className="ops-hero-actions">
          <button 
            className="btn btn-primary btn-sm"
            onClick={onOpenPhoneBooking}
            title="Record direct phone or walk-in reservation"
          >
            <PhoneCall size={14} /> {t('btn_new_phone_booking', '+ New Phone Booking')}
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab('settings')}
            title="Configure Property Info, Prices & Staff"
          >
            <Settings size={14} /> {t('btn_settings_pricing', 'Settings & Pricing')}
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={onTriggerExpiry}
            title="Scan and release provisional holds older than timeout"
          >
            <Clock size={14} /> {t('btn_sweep_expired', 'Sweep Expired')}
          </button>
          <button 
            className="btn btn-ghost btn-sm"
            onClick={onRefresh}
            title="Reload live backend telemetry"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 2. Urgent Focus Strip */}
      <div className="urgent-ops-grid">
        {/* Arrivals Today */}
        <div className="card urgent-card" onClick={() => setActiveTab('bookings')}>
          <div className="urgent-icon-box arrivals">
            <ArrowDownLeft size={20} />
          </div>
          <div className="urgent-data">
            <span className="urgent-label">{t('expected_arrivals', 'Expected Arrivals')}</span>
            <div className="urgent-number">{s.today_checkins_count}</div>
            <span className="urgent-meta">{t('scheduled_checkins_today', 'Scheduled check-ins today')}</span>
          </div>
          <ChevronRight size={16} className="urgent-arrow" />
        </div>

        {/* Departures Today */}
        <div className="card urgent-card" onClick={() => setActiveTab('bookings')}>
          <div className="urgent-icon-box departures">
            <ArrowUpRight size={20} />
          </div>
          <div className="urgent-data">
            <span className="urgent-label">{t('today_checkouts', "Today's Check-outs")}</span>
            <div className="urgent-number">{s.today_checkouts_count}</div>
            <span className="urgent-meta">{t('scheduled_checkouts_today', 'Turnarounds pending')}</span>
          </div>
          <ChevronRight size={16} className="urgent-arrow" />
        </div>

        {/* Ready Beds */}
        <div className="card urgent-card" onClick={() => setActiveTab('beds')}>
          <div className="urgent-icon-box ready">
            <BedDouble size={20} />
          </div>
          <div className="urgent-data">
            <span className="urgent-label">{t('ready_beds', 'Available Beds')}</span>
            <div className="urgent-number text-success">{s.available_beds}</div>
            <span className="urgent-meta">{t('of_total_beds', 'of')} {s.total_beds} {t('beds_ready', 'beds ready')}</span>
          </div>
          <ChevronRight size={16} className="urgent-arrow" />
        </div>

        {/* Low Stock Supplies */}
        <div className="card urgent-card" onClick={() => setActiveTab('inventory')}>
          <div className={`urgent-icon-box ${s.low_stock_items_count > 0 ? 'stock-alert' : 'stock-ok'}`}>
            <Package size={20} />
          </div>
          <div className="urgent-data">
            <span className="urgent-label">{t('low_stock_alerts', 'Supply Alerts')}</span>
            <div className="urgent-number">{s.low_stock_items_count}</div>
            <span className="urgent-meta">
              {s.low_stock_items_count > 0 ? t('items_need_reorder', 'Supplies below reorder point') : t('all_stock_ok', 'All stock levels healthy')}
            </span>
          </div>
          <ChevronRight size={16} className="urgent-arrow" />
        </div>
      </div>

      {/* 3. Central Feature: 16 Beds Live Status & Floor Breakdown */}
      <div className="card floor-overview-card">
        <div className="card-header-row">
          <div>
            <span className="badge badge-accent">{t('total_capacity', '16-Bed Capacity Visualization')}</span>
            <h3 className="section-title">{t('live_beds_tile', 'Floor Readiness & Bed Telemetry')}</h3>
            <p className="subtitle">
              {t('today_occupancy_rate', 'Current occupancy')}: {occupancyRate}% ({s.occupied_beds} {t('status_occupied', 'occupied')}, {s.reserved_beds} {t('status_reserved', 'reserved')}, {s.available_beds} {t('status_available', 'available')})
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('beds')}>
            {t('open_blueprint_map', 'Open 16-Bed Blueprint Map →')}
          </button>
        </div>

        <div className="floors-mini-grid">
          {analytics?.floor_occupancy?.map((fl) => (
            <div key={fl.floor} className="floor-card-summary">
              <div className="floor-sum-top">
                <span className="floor-tag">{t('floor', 'Floor')} {fl.floor}</span>
                <span className="floor-occ-rate">{fl.occupancy_rate_percent}% {t('status_occupied', 'Occupied')}</span>
              </div>

              <div className="floor-bar-track">
                <div 
                  className="floor-bar-fill" 
                  style={{ width: `${fl.occupancy_rate_percent}%` }}
                ></div>
              </div>

              <div className="floor-sum-details">
                <span className="pill pill-occupied">{fl.occupied} {t('status_occupied', 'Occupied')}</span>
                <span className="pill pill-available">{fl.available} {t('status_available', 'Ready')}</span>
                {fl.reserved > 0 && <span className="pill pill-reserved">{fl.reserved} {t('status_reserved', 'Reserved')}</span>}
              </div>
            </div>
          )) || (
            <div className="floors-fallback-grid">
              <div className="floor-card-summary">
                <div className="floor-sum-top">
                  <span className="floor-tag">{t('floor1_tag', 'Floor 1 (5 Beds: B101–B105)')}</span>
                  <span className="floor-occ-rate">{t('floor', 'Floor')} 1</span>
                </div>
                <div className="floor-sum-details">
                  <span className="pill pill-available">5 {t('all_beds', 'Total Beds')}</span>
                </div>
              </div>
              <div className="floor-card-summary">
                <div className="floor-sum-top">
                  <span className="floor-tag">{t('floor2_tag', 'Floor 2 (6 Beds: B201–B206)')}</span>
                  <span className="floor-occ-rate">{t('floor', 'Floor')} 2</span>
                </div>
                <div className="floor-sum-details">
                  <span className="pill pill-available">6 {t('all_beds', 'Total Beds')}</span>
                </div>
              </div>
              <div className="floor-card-summary">
                <div className="floor-sum-top">
                  <span className="floor-tag">{t('floor3_tag', 'Floor 3 (5 Beds: B301–B305)')}</span>
                  <span className="floor-occ-rate">{t('floor', 'Floor')} 3</span>
                </div>
                <div className="floor-sum-details">
                  <span className="pill pill-available">5 {t('all_beds', 'Total Beds')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Split Financials & Quick Management Navigation */}
      <div className="dashboard-two-col-grid">
        {/* Revenue & Ledger Card */}
        <div className="card revenue-panel-card">
          <div className="card-header-row">
            <div>
              <span className="badge badge-accent">{t('fin_overview', 'Financial Overview')}</span>
              <h3 className="section-title">{t('total_revenue', 'Revenue & Settlements')}</h3>
            </div>
          </div>

          <div className="rev-hero-block">
            <div className="rev-item">
              <span className="rev-label">{t('total_revenue', 'Total Realized Revenue')}</span>
              <div className="rev-val text-primary">₹{s.total_revenue_inr.toLocaleString('en-IN')}</div>
              <span className="rev-sub">{t('all_time_earnings', 'Server-verified payments')}</span>
            </div>

            <div className="rev-divider"></div>

            <div className="rev-item">
              <span className="rev-label">{t('pending_payments', 'Pending Payments')}</span>
              <div className="rev-val text-warning">₹{s.pending_payments_amount.toLocaleString('en-IN')}</div>
              <span className="rev-sub">{s.pending_payments_count} {t('awaiting_settlement', 'provisional reservations')}</span>
            </div>
          </div>

          <div className="payment-channels-section">
            <h4>{t('revenue_by_channel', 'Revenue Breakdown by Channel')}</h4>
            {analytics?.revenue_by_method?.length > 0 ? (
              <div className="channels-list">
                {analytics.revenue_by_method.map((m) => (
                  <div key={m.method} className="channel-item">
                    <div className="channel-name-box">
                      <strong>{m.method}</strong>
                      <span>{m.transactions} confirmed txn{m.transactions > 1 ? 's' : ''}</span>
                    </div>
                    <div className="channel-amt">₹{m.revenue.toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-channels-text">
                Payments verified via Razorpay UPI, Cards or counter cash appear here in real time.
              </p>
            )}
          </div>
        </div>

        {/* Management Quick Navigation */}
        <div className="card tasks-shortcuts-card">
          <div className="card-header-row">
            <div>
              <span className="badge badge-accent">{t('quick_ops', 'Quick Operations')}</span>
              <h3 className="section-title">{t('mgmt_shortcuts', 'Management Shortcuts')}</h3>
            </div>
          </div>

          <div className="management-shortcuts-list">
            <div className="shortcuts-grid">
              <button className="shortcut-btn" onClick={() => setActiveTab('settings')}>
                <Settings size={18} color="#C25E40" />
                <div>
                  <strong>{t('btn_settings_pricing', 'Owner Settings & Pricing')}</strong>
                  <small>{t('settings_sub', 'Update room rates & property info')}</small>
                </div>
              </button>

              <button className="shortcut-btn" onClick={() => setActiveTab('beds')}>
                <BedDouble size={18} color="#2D6A4F" />
                <div>
                  <strong>{t('live_beds_tile', 'Live 16-Bed Blueprint')}</strong>
                  <small>{t('live_beds_tile_sub', 'Floor maps & readiness')}</small>
                </div>
              </button>

              <button className="shortcut-btn" onClick={() => setActiveTab('bookings')}>
                <CalendarCheck size={18} color="#2563EB" />
                <div>
                  <strong>{t('bookings_ledger_tile', 'All Reservations')}</strong>
                  <small>{t('bookings_ledger_sub', 'Check-in, check-out & payments')}</small>
                </div>
              </button>

              <button className="shortcut-btn" onClick={() => setActiveTab('inventory')}>
                <Package size={18} color="#D97706" />
                <div>
                  <strong>{t('supplies_inv_tile', 'Supplies Inventory')}</strong>
                  <small>{t('supplies_inv_sub', 'Stock levels & staff usage')}</small>
                </div>
              </button>

              <button className="shortcut-btn" onClick={() => setActiveTab('audit')}>
                <ShieldCheck size={18} color="#4B5563" />
                <div>
                  <strong>{t('audit_title', 'Immutable Audit Logs')}</strong>
                  <small>{t('audit_sub', 'Security & operations audit trail')}</small>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Recent Bookings from Real Database */}
      <div className="card recent-bookings-card">
        <div className="card-header-row">
          <div>
            <span className="badge badge-accent">{t('realtime_bookings', 'Real-Time Bookings')}</span>
            <h3 className="section-title">{t('recent_bookings', 'Recent Reservations')}</h3>
            <p className="subtitle">{t('recent_bookings_sub', 'Latest confirmed and pending guest bookings from database')}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('bookings')}>
            {t('view_all_bookings', 'View All Bookings →')}
          </button>
        </div>

        {recentBookings.length === 0 ? (
          <div className="empty-bookings-box">
            <ClipboardList size={32} color="#A8A29E" />
            <p>{t('no_recent_bookings', 'No bookings in database yet.')}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="hospitality-table">
              <thead>
                <tr>
                  <th>{t('col_booking', 'Booking Code')}</th>
                  <th>{t('col_guest', 'Guest')}</th>
                  <th>{t('col_bed_floor', 'Bed Number')}</th>
                  <th>{t('col_dates', 'Dates')}</th>
                  <th>{t('amount_label', 'Total Amount')}</th>
                  <th>{t('col_status', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.slice(0, 6).map((b) => (
                  <tr 
                    key={b.id} 
                    className="clickable-row"
                    onClick={() => onSelectBooking && onSelectBooking(b)}
                  >
                    <td><strong>{b.booking_code}</strong></td>
                    <td>{b.guest_name}</td>
                    <td>{t('bed', 'Bed')} {b.bed?.bed_number || b.bed_number || b.bed_id} ({t('floor', 'Floor')} {b.floor_number || b.bed?.floor_number || 1})</td>
                    <td>{b.check_in_date} → {b.check_out_date}</td>
                    <td><strong>₹{b.total_amount}</strong></td>
                    <td>
                      <span className={`badge badge-${b.status.toLowerCase()}`}>
                        {t(b.status, b.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .today-operations-dashboard {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .ops-hero-card {
          padding: 24px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          flex-wrap: wrap;
          gap: 16px;
        }
        .ops-hero-left h2 {
          font-family: var(--font-serif);
          font-size: 1.55rem;
          color: var(--text-main);
          margin-top: 4px;
        }
        .subtitle {
          font-size: 0.84rem;
          color: var(--text-muted);
        }
        .ops-hero-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .urgent-ops-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }
        .urgent-card {
          padding: 18px 20px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: var(--transition);
        }
        .urgent-card:hover {
          border-color: var(--primary);
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }
        .urgent-icon-box {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .urgent-icon-box.arrivals {
          background: #EFF6FF;
          color: #2563EB;
        }
        .urgent-icon-box.departures {
          background: #FFF7ED;
          color: #EA580C;
        }
        .urgent-icon-box.ready {
          background: #ECFDF5;
          color: #059669;
        }
        .urgent-icon-box.stock-alert {
          background: #FEF2F2;
          color: #DC2626;
        }
        .urgent-icon-box.stock-ok {
          background: var(--bg-secondary);
          color: var(--text-muted);
        }
        .urgent-data {
          flex: 1;
        }
        .urgent-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--text-muted);
        }
        .urgent-number {
          font-size: 1.55rem;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1.2;
        }
        .urgent-meta {
          font-size: 0.72rem;
          color: var(--text-dim);
        }
        .urgent-arrow {
          color: var(--text-dim);
        }
        .floor-overview-card {
          padding: 24px 28px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .card-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .section-title {
          font-family: var(--font-serif);
          font-size: 1.3rem;
          color: var(--text-main);
          margin-top: 4px;
        }
        .floors-mini-grid, .floors-fallback-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 14px;
        }
        .floor-card-summary {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .floor-sum-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .floor-tag {
          font-weight: 700;
          font-size: 0.88rem;
          color: var(--text-main);
        }
        .floor-occ-rate {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--primary);
        }
        .floor-bar-track {
          height: 6px;
          background: #E5E7EB;
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .floor-bar-fill {
          height: 100%;
          background: var(--primary);
          border-radius: var(--radius-full);
          transition: width 0.3s ease;
        }
        .floor-sum-details {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .pill {
          font-size: 0.72rem;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-weight: 600;
        }
        .pill-occupied {
          background: #F1F5F9;
          color: #334155;
        }
        .pill-available {
          background: #ECFDF5;
          color: #065F46;
        }
        .pill-reserved {
          background: #FEF3C7;
          color: #92400E;
        }
        .dashboard-two-col-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 900px) {
          .dashboard-two-col-grid {
            grid-template-columns: 1fr;
          }
        }
        .revenue-panel-card, .tasks-shortcuts-card, .recent-bookings-card {
          padding: 24px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .rev-hero-block {
          display: flex;
          align-items: center;
          gap: 20px;
          background: var(--bg-secondary);
          padding: 16px 20px;
          border-radius: var(--radius-sm);
        }
        .rev-divider {
          width: 1px;
          height: 48px;
          background: var(--border-subtle);
        }
        .rev-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .rev-val {
          font-size: 1.6rem;
          font-weight: 800;
          line-height: 1.2;
        }
        .rev-sub {
          font-size: 0.7rem;
          color: var(--text-dim);
        }
        .payment-channels-section h4 {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 8px;
        }
        .channels-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .channel-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--bg-primary);
          border-radius: var(--radius-xs);
          font-size: 0.84rem;
        }
        .channel-name-box {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .channel-name-box span {
          font-size: 0.75rem;
          color: var(--text-dim);
        }
        .channel-amt {
          font-weight: 700;
          color: var(--text-main);
        }
        .no-channels-text {
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .shortcuts-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .shortcut-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          text-align: left;
          transition: var(--transition);
        }
        .shortcut-btn:hover {
          background: #FFFFFF;
          border-color: var(--primary);
          transform: translateX(3px);
        }
        .shortcut-btn div {
          display: flex;
          flex-direction: column;
        }
        .shortcut-btn strong {
          font-size: 0.86rem;
          color: var(--text-main);
        }
        .shortcut-btn small {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .clickable-row {
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .clickable-row:hover {
          background: var(--bg-secondary);
        }
        .empty-bookings-box {
          padding: 32px 16px;
          text-align: center;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}
