import React, { useState } from 'react';
import { 
  PhoneCall, 
  UserCheck, 
  LogOut, 
  Sparkle, 
  Package, 
  Wrench, 
  CheckSquare, 
  Clock, 
  ArrowRight, 
  BedDouble, 
  CheckCircle2, 
  ChevronRight,
  ShieldCheck,
  Users
} from 'lucide-react';
import GroupBookingModal from './GroupBookingModal';
import GroupBookingDetailsModal from './GroupBookingDetailsModal';
import { api } from '../api';
import { useLanguage } from '../i18n.jsx';

export default function StaffDailyBoard({ 
  stats, 
  beds, 
  todayBookings, 
  onOpenPhoneBooking, 
  onCheckIn, 
  onCheckOut, 
  setActiveTab,
  onOpenSupplyModal,
  onOpenMaintenanceModal,
  onRefresh
}) {
  const { t } = useLanguage();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupDetails, setGroupDetails] = useState(null);
  const [loadingGroup, setLoadingGroup] = useState(false);

  const handleOpenGroupDetails = async (groupCode) => {
    if (!groupCode) return;
    setLoadingGroup(true);
    try {
      const grp = await api.bookings.getGroup(groupCode);
      setGroupDetails(grp);
    } catch (err) {
      console.error('Failed to load group details:', err);
    } finally {
      setLoadingGroup(false);
    }
  };
  const cleaningBeds = beds.filter(b => b.status === 'CLEANING_REQUIRED' || b.status === 'CLEANING_IN_PROGRESS');
  const availableCount = beds.filter(b => b.status === 'AVAILABLE').length;
  const occupiedCount = beds.filter(b => b.status === 'OCCUPIED').length;

  const pendingArrivals = todayBookings?.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING_PAYMENT') || [];
  const pendingDepartures = todayBookings?.filter(b => b.status === 'CHECKED_IN') || [];

  return (
    <div className="staff-board animate-fade-in">
      {/* Front Desk Command Hero */}
      <div className="card staff-hero-card">
        <div className="staff-hero-left">
          <span className="badge badge-accent">{t('staff_board_badge', 'Staff Daily Operations Board')}</span>
          <h2>{t('staff_duty_station', 'Front Desk Duty Station')}</h2>
          <p className="subtitle">
            {t('staff_duty_sub', 'Fast touch operations for arrivals, departures, phone reservations & housekeeping')}
          </p>
        </div>

        {/* Readiness Snapshot */}
        <div className="staff-kpi-strip">
          <div className="mini-stat-card">
            <span className="stat-num text-success">{availableCount}</span>
            <span className="stat-lbl">{t('ready_beds', 'Ready Beds')}</span>
          </div>
          <div className="mini-stat-card">
            <span className="stat-num text-occupied">{occupiedCount}</span>
            <span className="stat-lbl">{t('occupied_beds_kpi', 'Occupied Beds')}</span>
          </div>
          <div className="mini-stat-card">
            <span className="stat-num text-primary">{pendingArrivals.length}</span>
            <span className="stat-lbl">{t('today_checkins', "Today's Check-ins")}</span>
          </div>
          <div className="mini-stat-card">
            <span className="stat-num text-warning">{pendingDepartures.length}</span>
            <span className="stat-lbl">{t('today_checkouts', "Today's Check-outs")}</span>
          </div>
        </div>
      </div>

      {/* Primary Touch Actions Grid */}
      <div className="staff-actions-tiles">
        {/* Phone Booking Action */}
        <div className="card action-tile tile-primary" onClick={onOpenPhoneBooking}>
          <div className="tile-icon-box">
            <PhoneCall size={22} />
          </div>
          <div className="tile-info">
            <h3>{t('new_phone_res', 'New Phone Reservation')}</h3>
            <p>{t('new_phone_sub', 'Direct caller or walk-in guest booking')}</p>
          </div>
          <ArrowRight size={18} className="tile-arrow" />
        </div>

        {/* Group / Wedding Bulk Booking Action (Requirement 7) */}
        <div className="card action-tile tile-group" onClick={() => setShowGroupModal(true)}>
          <div className="tile-icon-box">
            <Users size={22} color="#C25E40" />
          </div>
          <div className="tile-info">
            <h3>{t('group_booking_tile', 'Group / Wedding Booking')}</h3>
            <p>{t('group_booking_tile_sub', 'Bulk floor reservation with auto bed allocation')}</p>
          </div>
          <ArrowRight size={18} className="tile-arrow" />
        </div>

        {/* Live Beds Blueprint */}
        <div className="card action-tile" onClick={() => setActiveTab('beds')}>
          <div className="tile-icon-box">
            <BedDouble size={22} />
          </div>
          <div className="tile-info">
            <h3>{t('live_beds_tile', 'Live Beds (16 Beds)')}</h3>
            <p>{t('live_beds_tile_sub', 'View 3-floor map & update readiness')}</p>
          </div>
          <ArrowRight size={18} className="tile-arrow" />
        </div>

        {/* Bookings Ledger */}
        <div className="card action-tile" onClick={() => setActiveTab('bookings')}>
          <div className="tile-icon-box">
            <UserCheck size={22} />
          </div>
          <div className="tile-info">
            <h3>{t('bookings_ledger_tile', 'Bookings Ledger')}</h3>
            <p>{t('bookings_ledger_sub', 'Search guests, verification & payments')}</p>
          </div>
          <ArrowRight size={18} className="tile-arrow" />
        </div>

        {/* Supplies Inventory */}
        <div className="card action-tile tile-supplies" onClick={() => setActiveTab('inventory')}>
          <div className="tile-icon-box">
            <Package size={22} />
          </div>
          <div className="tile-info">
            <h3>{t('supplies_inv_tile', 'Supplies Inventory')}</h3>
            <p>{t('supplies_inv_sub', 'Deduct towels, soap, linen & restock')}</p>
          </div>
          <ArrowRight size={18} className="tile-arrow" />
        </div>
      </div>

      {/* Turnaround Readiness Ribbon if any */}
      {cleaningBeds.length > 0 && (
        <div className="card cleaning-alert-card">
          <div className="alert-top-row">
            <div className="alert-title-box">
              <Sparkle size={18} color="#D97706" />
              <h3>{t('turnaround_cleaning_beds', 'Beds Requiring Turnaround Cleaning')} ({cleaningBeds.length})</h3>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('beds')}>
              {t('view_16_beds', 'View 16 Beds →')}
            </button>
          </div>

          <div className="cleaning-beds-pills">
            {cleaningBeds.map(bed => (
              <div key={bed.id} className="clean-pill" onClick={() => setActiveTab('beds')}>
                <strong>{t('bed', 'Bed')} {bed.bed_number}</strong>
                <span>{t('floor', 'Floor')} {bed.floor_number}</span>
                <span className="dot dot-cleaning"></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Expected Arrivals & Departures */}
      <div className="staff-arrivals-departures-grid">
        {/* Arrivals Column */}
        <div className="card shift-list-card">
          <div className="shift-card-header">
            <div>
              <span className="badge badge-available">{t('arrivals', 'Arrivals')}</span>
              <h3>{t('today_checkins', "Today's Check-ins")} ({pendingArrivals.length})</h3>
            </div>
          </div>

          <div className="shift-items-list">
            {pendingArrivals.length === 0 ? (
              <p className="empty-shift-msg">{t('no_pending_checkins', 'No pending check-ins scheduled for today.')}</p>
            ) : (
              pendingArrivals.map(b => (
                <div key={b.id} className="shift-item">
                  <div className="shift-item-info">
                    <strong>{b.guest_name}</strong>
                    <div className="shift-meta">
                      <span>{t('bed', 'Bed')} {b.bed?.bed_number || b.bed_id}</span>
                      <span>•</span>
                      <span>{t('booking_code_label', 'Code')}: {b.booking_code}</span>
                      {b.group_code && (
                        <span 
                          className="group-pill-badge" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGroupDetails(b.group_code);
                          }}
                          title="View group details"
                        >
                          <Users size={11} /> {b.event_name || 'Group'}
                        </span>
                      )}
                      <span>•</span>
                      <span className="status-tag">{t(b.status, b.status)}</span>
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => onCheckIn(b)}
                  >
                    <UserCheck size={14} /> {t('check_in_btn', 'Check In')}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Departures Column */}
        <div className="card shift-list-card">
          <div className="shift-card-header">
            <div>
              <span className="badge badge-occupied">{t('departures', 'Departures')}</span>
              <h3>{t('today_checkouts', "Today's Check-outs")} ({pendingDepartures.length})</h3>
            </div>
          </div>

          <div className="shift-items-list">
            {pendingDepartures.length === 0 ? (
              <p className="empty-shift-msg">{t('no_pending_checkouts', 'No guests currently checked-in due for departure.')}</p>
            ) : (
              pendingDepartures.map(b => (
                <div key={b.id} className="shift-item">
                  <div className="shift-item-info">
                    <strong>{b.guest_name}</strong>
                    <div className="shift-meta">
                      <span>{t('bed', 'Bed')} {b.bed?.bed_number || b.bed_id}</span>
                      <span>•</span>
                      <span>{t('check_out_time_label', 'Out')}: {b.check_out_date}</span>
                      {b.group_code && (
                        <span 
                          className="group-pill-badge" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGroupDetails(b.group_code);
                          }}
                          title="View group details"
                        >
                          <Users size={11} /> {b.event_name || 'Group'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => onCheckOut(b)}
                  >
                    <LogOut size={14} /> {t('check_out_btn', 'Check Out')}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Group Booking Modal */}
      <GroupBookingModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* Group Booking Details Modal */}
      <GroupBookingDetailsModal
        group={groupDetails}
        isOpen={Boolean(groupDetails)}
        onClose={() => setGroupDetails(null)}
        onRefresh={() => {
          if (onRefresh) onRefresh();
        }}
      />

      <style>{`
        .staff-board {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .staff-hero-card {
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }
        .staff-hero-left h2 {
          font-family: var(--font-serif);
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--text-main);
          margin-top: 4px;
        }
        .subtitle {
          font-size: 0.88rem;
          color: var(--text-muted);
        }
        .staff-kpi-strip {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .mini-stat-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 10px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 90px;
        }
        .stat-num {
          font-size: 1.45rem;
          font-weight: 800;
          line-height: 1.1;
        }
        .stat-lbl {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .text-success { color: var(--success); }
        .text-occupied { color: var(--occupied); }
        .text-warning { color: var(--warning); }
        .text-primary { color: var(--primary); }

        /* Action Tiles */
        .staff-actions-tiles {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .action-tile {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: var(--transition);
        }
        .action-tile:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .tile-icon-box {
          width: 46px;
          height: 46px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tile-primary .tile-icon-box { background: var(--primary-light); color: var(--primary); }
        .tile-group .tile-icon-box { background: #FAF4EF; color: #C25E40; border: 1px solid #F0D5C7; }
        .tile-cleaning .tile-icon-box { background: var(--cleaning-light); color: var(--cleaning); }
        .tile-supplies .tile-icon-box { background: #EFF6FF; color: #2563EB; }
        .tile-maintenance .tile-icon-box { background: var(--danger-light); color: var(--danger); }

        .group-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #FAF4EF;
          border: 1px solid #F0D5C7;
          color: #C25E40;
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
        }
        .group-pill-badge:hover {
          background: #C25E40;
          color: #FFFFFF;
        }
        .tile-info {
          flex: 1;
        }
        .tile-info h3 {
          font-size: 0.96rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .tile-info p {
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .tile-arrow {
          color: var(--border-strong);
        }

        /* Cleaning Alert Card */
        .cleaning-alert-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          border-left: 4px solid var(--cleaning);
        }
        .alert-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }
        .alert-title-box {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .alert-title-box h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .cleaning-beds-pills {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .clean-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-full);
          font-size: 0.82rem;
          color: var(--text-body);
        }

        /* Arrivals Departures Grid */
        .staff-arrivals-departures-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        @media (max-width: 860px) {
          .staff-arrivals-departures-grid {
            grid-template-columns: 1fr;
          }
        }
        .shift-list-card {
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .shift-card-header h3 {
          font-family: var(--font-serif);
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-main);
          margin-top: 4px;
        }
        .shift-items-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .shift-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          gap: 12px;
        }
        .shift-item-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .shift-item-info strong {
          font-size: 0.9rem;
          color: var(--text-main);
        }
        .shift-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.76rem;
          color: var(--text-muted);
        }
        .status-tag {
          font-weight: 700;
          color: var(--primary);
        }
        .empty-shift-msg {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-style: italic;
          padding: 12px 0;
        }
      `}</style>
    </div>
  );
}
