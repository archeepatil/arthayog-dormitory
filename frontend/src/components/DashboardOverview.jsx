import React from 'react';
import { 
  BedDouble, 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  Package, 
  PhoneCall, 
  ClipboardList, 
  CheckCircle2, 
  Eye, 
  RefreshCw,
  Users
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

  // Format Floor strictly without "Bed" label
  const getFloorDisplay = (b) => {
    if (b.group_code) {
      return `Floor ${b.bed?.floor_number || b.floor_number || 1}`;
    }
    const fl = b.bed?.floor_number || b.floor_number || 1;
    return `Floor ${fl}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <span className="status-badge badge-pending-approval">{t('status_pending_approval', 'Pending Approval')}</span>;
      case 'APPROVED_PAYMENT_PENDING':
        return <span className="status-badge badge-approved">{t('status_approved_payment_pending', 'Payment Due')}</span>;
      case 'CONFIRMED':
        return <span className="status-badge badge-confirmed">{t('status_confirmed', 'Confirmed')}</span>;
      case 'PENDING_PAYMENT':
        return <span className="status-badge badge-pending">{t('status_pending_payment', 'Pending Pay')}</span>;
      case 'CHECKED_IN':
        return <span className="status-badge badge-occupied">{t('status_checked_in', 'Checked In')}</span>;
      case 'CHECKED_OUT':
        return <span className="status-badge badge-cleaning">{t('status_checked_out', 'Checked Out')}</span>;
      case 'REJECTED':
        return <span className="status-badge badge-rejected">{t('status_rejected', 'Rejected')}</span>;
      case 'CANCELLED':
        return <span className="status-badge badge-cancelled">{t('status_cancelled', 'Cancelled')}</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="owner-executive-dashboard animate-fade-in">
      {/* 1. Command Header Bar */}
      <div className="card exec-hero-card">
        <div className="exec-hero-left">
          <div className="badge-row">
            <span className="badge badge-accent">{t('owner_command_badge', 'Owner Dashboard')}</span>
            <span className="date-stamp">
              <Clock size={12} />
              <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </span>
          </div>
          <h2>{t('ops_dashboard_title', 'Arthayog Dormitory Executive Overview')}</h2>
          <p className="subtitle">
            {t('ops_dashboard_sub', '16-Bed Real Database Telemetry • Live Occupancy & Financial Summary')}
          </p>
        </div>

        <div className="exec-hero-actions">
          <button 
            className="btn btn-primary btn-sm"
            onClick={onOpenPhoneBooking}
            title="Record direct phone or walk-in reservation"
          >
            <PhoneCall size={13} /> {t('btn_new_phone_booking', '+ Phone Booking')}
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={onTriggerExpiry}
            title="Scan and release provisional holds older than timeout"
          >
            <Clock size={13} /> {t('btn_sweep_expired', 'Sweep Expired')}
          </button>
          <button 
            className="btn btn-ghost btn-sm"
            onClick={onRefresh}
            title="Reload live backend telemetry"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* 2. Executive Summary Metric Cards (Clean Summary without duplicating other tabs) */}
      <div className="exec-summary-grid">
        {/* Arrivals Today */}
        <div className="card summary-kpi-card">
          <div className="kpi-icon-box arrivals">
            <ArrowDownLeft size={18} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">{t('expected_arrivals', "Today's Check-ins")}</span>
            <div className="kpi-number text-primary">{s.today_checkins_count}</div>
            <span className="kpi-meta">{t('scheduled_checkins_today', 'Arrivals scheduled today')}</span>
          </div>
        </div>

        {/* Departures Today */}
        <div className="card summary-kpi-card">
          <div className="kpi-icon-box departures">
            <ArrowUpRight size={18} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">{t('today_checkouts', "Today's Check-outs")}</span>
            <div className="kpi-number text-warning">{s.today_checkouts_count}</div>
            <span className="kpi-meta">{t('scheduled_checkouts_today', 'Departures scheduled today')}</span>
          </div>
        </div>

        {/* Ready Beds & Occupancy */}
        <div className="card summary-kpi-card">
          <div className="kpi-icon-box ready">
            <BedDouble size={18} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">{t('ready_beds', 'Ready Beds')}</span>
            <div className="kpi-number text-success">{s.available_beds} <span className="kpi-sub-total">/ {s.total_beds}</span></div>
            <span className="kpi-meta">{occupancyRate}% {t('today_occupancy_rate', 'current occupancy')}</span>
          </div>
        </div>

        {/* Low Stock Supply Alerts */}
        <div className="card summary-kpi-card">
          <div className={`kpi-icon-box ${s.low_stock_items_count > 0 ? 'alert' : 'ok'}`}>
            <Package size={18} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">{t('low_stock_alerts', 'Supply Alerts')}</span>
            <div className={`kpi-number ${s.low_stock_items_count > 0 ? 'text-danger' : 'text-muted'}`}>{s.low_stock_items_count}</div>
            <span className="kpi-meta">
              {s.low_stock_items_count > 0 ? t('items_need_reorder', 'Items below threshold') : t('all_stock_ok', 'Supplies healthy')}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Financial Summary Card (Compact, executive layout) */}
      <div className="card exec-financial-card">
        <div className="card-header-row">
          <div>
            <span className="badge badge-accent">{t('fin_overview', 'Financial Overview')}</span>
            <h3 className="section-title">{t('total_revenue', 'Revenue & Collections Summary')}</h3>
          </div>
          <span className="live-ledger-note">Real-Time Database Settlements</span>
        </div>

        <div className="fin-metrics-row">
          <div className="fin-box">
            <span className="fin-label">{t('total_revenue', 'Total Realized Revenue')}</span>
            <div className="fin-value text-primary">₹{s.total_revenue_inr.toLocaleString('en-IN')}</div>
            <span className="fin-sub">{t('all_time_earnings', 'Server-verified confirmed payments')}</span>
          </div>

          <div className="fin-divider"></div>

          <div className="fin-box">
            <span className="fin-label">{t('pending_payments', 'Pending Collections')}</span>
            <div className="fin-value text-warning">₹{s.pending_payments_amount.toLocaleString('en-IN')}</div>
            <span className="fin-sub">{s.pending_payments_count} {t('awaiting_settlement', 'reservations awaiting payment')}</span>
          </div>

          <div className="fin-divider"></div>

          <div className="fin-box">
            <span className="fin-label">Payment Channels</span>
            <div className="channels-pill-list">
              {analytics?.revenue_by_method?.length > 0 ? (
                analytics.revenue_by_method.map((m) => (
                  <span key={m.method} className="channel-pill">
                    <strong>{m.method}</strong>: ₹{m.revenue.toLocaleString('en-IN')}
                  </span>
                ))
              ) : (
                <span className="text-muted" style={{ fontSize: '0.78rem' }}>UPI, QR, Cards, Cash counter</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Real-Time Bookings (Compact Table with unified typography matching dashboard) */}
      <div className="card exec-table-card">
        <div className="card-header-row">
          <div>
            <span className="badge badge-accent">{t('realtime_bookings', 'Real-Time Bookings')}</span>
            <h3 className="section-title">{t('recent_bookings', 'Recent Reservations')}</h3>
            <p className="subtitle">{t('recent_bookings_sub', 'Latest confirmed and pending guest bookings from database')}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('bookings')}>
            {t('view_all_bookings', 'Open Full Bookings Ledger →')}
          </button>
        </div>

        {recentBookings.length === 0 ? (
          <div className="empty-bookings-box">
            <ClipboardList size={30} color="#A8A29E" />
            <p>{t('no_recent_bookings', 'No bookings in database yet.')}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="compact-exec-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>{t('col_booking', 'Booking Code')}</th>
                  <th style={{ minWidth: '180px' }}>{t('col_guest', 'Guest & Contact')}</th>
                  <th style={{ width: '120px' }}>{t('col_floor', 'Floor')}</th>
                  <th style={{ width: '160px' }}>{t('col_dates', 'Dates')}</th>
                  <th style={{ width: '110px' }}>{t('amount_label', 'Amount')}</th>
                  <th style={{ width: '140px' }}>{t('col_status', 'Status')}</th>
                  <th style={{ width: '70px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.slice(0, 6).map((b) => (
                  <tr 
                    key={b.id} 
                    className="compact-row"
                  >
                    <td>
                      <span className="booking-code-tag">#{b.booking_code}</span>
                      {b.group_code && (
                        <div className="group-micro-tag">
                          <Users size={9} /> Group
                        </div>
                      )}
                    </td>
                    <td>
                      {/* Guest & Contact Visual Hierarchy (Separated, not continuous) */}
                      <div className="guest-contact-block">
                        <strong className="guest-name-text">{b.guest_name}</strong>
                        <span className="guest-contact-text">{b.guest_phone || b.guest_email || '—'}</span>
                      </div>
                    </td>
                    <td>
                      {/* Floor strictly without "Bed" label */}
                      <span className="floor-badge-text">{getFloorDisplay(b)}</span>
                    </td>
                    <td>
                      <span className="dates-text">{b.check_in_date} → {b.check_out_date}</span>
                    </td>
                    <td>
                      <strong className="amt-text">₹{b.total_amount}</strong>
                    </td>
                    <td>
                      {getStatusBadge(b.status)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn-icon-sm"
                        onClick={() => onSelectBooking && onSelectBooking(b)}
                        title="View Full Booking Details"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .owner-executive-dashboard {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .exec-hero-card {
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          flex-wrap: wrap;
          gap: 14px;
        }
        .badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .date-stamp {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.76rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .exec-hero-left h2 {
          font-family: var(--font-serif);
          font-size: 1.4rem;
          color: var(--text-main);
          margin-top: 3px;
          margin-bottom: 2px;
          font-weight: 700;
        }
        .subtitle {
          font-size: 0.80rem;
          color: var(--text-muted);
        }
        .exec-hero-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .exec-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        @media (max-width: 900px) {
          .exec-summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 550px) {
          .exec-summary-grid {
            grid-template-columns: 1fr;
          }
        }
        .summary-kpi-card {
          padding: 16px 18px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .kpi-icon-box {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .kpi-icon-box.arrivals {
          background: #EFF6FF;
          color: #2563EB;
        }
        .kpi-icon-box.departures {
          background: #FFF7ED;
          color: #EA580C;
        }
        .kpi-icon-box.ready {
          background: #ECFDF5;
          color: #059669;
        }
        .kpi-icon-box.alert {
          background: #FEF2F2;
          color: #DC2626;
        }
        .kpi-icon-box.ok {
          background: var(--bg-secondary);
          color: var(--text-muted);
        }
        .kpi-details {
          flex: 1;
        }
        .kpi-label {
          font-size: 0.70rem;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.4px;
        }
        .kpi-number {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1.15;
          margin-top: 1px;
        }
        .kpi-sub-total {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-dim);
        }
        .kpi-meta {
          font-size: 0.70rem;
          color: var(--text-dim);
        }
        .text-success { color: #059669; }
        .text-warning { color: #D97706; }
        .text-primary { color: #C25E40; }
        .text-danger { color: #DC2626; }

        /* Financial Card */
        .exec-financial-card, .exec-table-card {
          padding: 20px 24px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .card-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }
        .section-title {
          font-family: var(--font-serif);
          font-size: 1.15rem;
          color: var(--text-main);
          margin-top: 2px;
          font-weight: 700;
        }
        .live-ledger-note {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 600;
          background: var(--bg-secondary);
          padding: 3px 8px;
          border-radius: 4px;
        }
        .fin-metrics-row {
          display: flex;
          align-items: center;
          gap: 20px;
          background: #FAF8F5;
          padding: 14px 18px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          flex-wrap: wrap;
        }
        .fin-box {
          flex: 1;
          min-width: 180px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .fin-divider {
          width: 1px;
          height: 42px;
          background: var(--border-subtle);
        }
        @media (max-width: 768px) {
          .fin-divider { display: none; }
        }
        .fin-label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
          letter-spacing: 0.4px;
        }
        .fin-value {
          font-size: 1.4rem;
          font-weight: 800;
          line-height: 1.15;
        }
        .fin-sub {
          font-size: 0.70rem;
          color: var(--text-dim);
        }
        .channels-pill-list {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 2px;
        }
        .channel-pill {
          font-size: 0.72rem;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          padding: 2px 7px;
          border-radius: 3px;
          color: var(--text-body);
        }

        /* Compact Real-Time Bookings Table (Scale unified to match dashboard) */
        .compact-exec-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.81rem;
        }
        .compact-exec-table th {
          background: var(--bg-secondary);
          color: var(--text-muted);
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          padding: 9px 12px;
          border-bottom: 1px solid var(--border-subtle);
          text-align: left;
        }
        .compact-exec-table td {
          padding: 9px 12px;
          border-bottom: 1px solid var(--border-subtle);
          vertical-align: middle;
        }
        .compact-row:hover {
          background: #FAF8F5;
        }
        .booking-code-tag {
          font-weight: 700;
          color: #C25E40;
          font-size: 0.78rem;
          font-family: var(--font-mono);
        }
        .group-micro-tag {
          font-size: 0.65rem;
          color: #C25E40;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          margin-left: 4px;
        }
        .guest-contact-block {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .guest-name-text {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .guest-contact-text {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .floor-badge-text {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-body);
          background: #F4EFEA;
          padding: 2px 7px;
          border-radius: 3px;
          display: inline-block;
        }
        .dates-text {
          font-size: 0.76rem;
          color: var(--text-body);
        }
        .amt-text {
          font-size: 0.81rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 3px;
          text-transform: capitalize;
        }
        .badge-pending-approval {
          background: #FEF3C7;
          color: #92400E;
          border: 1px solid #FDE68A;
        }
        .badge-approved {
          background: #EFF6FF;
          color: #1E40AF;
          border: 1px solid #BFDBFE;
        }
        .badge-confirmed {
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
        }
        .badge-pending {
          background: #FEF3C7;
          color: #92400E;
          border: 1px solid #FDE68A;
        }
        .badge-occupied {
          background: #FAF4EF;
          color: #C25E40;
          border: 1px solid #F0D5C7;
        }
        .badge-cleaning {
          background: #FFFBEB;
          color: #B45309;
          border: 1px solid #FDE68A;
        }
        .badge-rejected, .badge-cancelled {
          background: #F3F4F6;
          color: #4B5563;
          border: 1px solid #E5E7EB;
        }
        .btn-icon-sm {
          background: transparent;
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 4px 6px;
          cursor: pointer;
          color: var(--text-muted);
          transition: var(--transition);
        }
        .btn-icon-sm:hover {
          color: var(--primary);
          border-color: var(--primary);
          background: var(--bg-secondary);
        }
        .empty-bookings-box {
          padding: 28px 16px;
          text-align: center;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
      `}</style>
    </div>
  );
}
