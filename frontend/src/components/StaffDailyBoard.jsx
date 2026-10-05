import React, { useState } from 'react';
import { 
  PhoneCall, 
  UserCheck, 
  LogOut, 
  Sparkle, 
  Clock, 
  ArrowRight, 
  BedDouble, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Check,
  X,
  CreditCard,
  Eye,
  FileText,
  Calendar as CalendarIcon
} from 'lucide-react';
import GroupBookingModal from './GroupBookingModal';
import GroupBookingDetailsModal from './GroupBookingDetailsModal';
import { api } from '../api';
import { useLanguage } from '../i18n.jsx';

export default function StaffDailyBoard({ 
  stats, 
  beds = [], 
  todayBookings = [], 
  bookings = [],
  onOpenPhoneBooking, 
  onOpenGroupBooking,
  onOpenGroupDetails,
  onCheckIn, 
  onCheckOut, 
  onSelectBooking,
  setActiveTab,
  onRefresh
}) {
  const { t } = useLanguage();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupDetails, setGroupDetails] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [rejectingBooking, setRejectingBooking] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState('');

  // Use current system date strictly for today's calculations (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];

  // Pool all bookings provided (fallback to todayBookings if bookings not passed)
  const allBookings = bookings && bookings.length > 0 ? bookings : todayBookings;

  // Real-time Bed Stats from actual database beds
  const availableBeds = beds.filter(b => b.status === 'AVAILABLE');
  const occupiedBeds = beds.filter(b => b.status === 'OCCUPIED');
  const cleaningBeds = beds.filter(b => b.status === 'CLEANING_REQUIRED' || b.status === 'CLEANING_IN_PROGRESS');

  // Real Current-Date Arrivals: arriving today and eligible for check-in
  const todayArrivals = allBookings.filter(b => 
    b.check_in_date === todayStr && 
    ['CONFIRMED', 'APPROVED_PAYMENT_PENDING', 'PENDING_PAYMENT'].includes(b.status)
  );

  // Real Current-Date Departures: leaving today and currently checked in
  const todayDepartures = allBookings.filter(b => 
    b.check_out_date === todayStr && 
    b.status === 'CHECKED_IN'
  );

  // Real Pending Approval Requests
  const pendingApprovals = allBookings.filter(b => b.status === 'PENDING_APPROVAL');

  // Real Pending Payments
  const pendingPayments = allBookings.filter(b => 
    b.status === 'APPROVED_PAYMENT_PENDING' || 
    (b.status === 'PENDING_PAYMENT' && b.status !== 'CANCELLED')
  );

  const handleApprove = async (booking) => {
    setProcessingId(booking.id);
    setActionError('');
    try {
      if (booking.group_code) {
        await api.bookings.approveGroup(booking.group_code);
      } else {
        await api.bookings.approve(booking.id);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to approve booking:', err);
      setActionError(err.message || 'Failed to approve booking.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingBooking) return;
    setProcessingId(rejectingBooking.id);
    setActionError('');
    try {
      if (rejectingBooking.group_code) {
        await api.bookings.rejectGroup(rejectingBooking.group_code, { rejection_reason: rejectionReason });
      } else {
        await api.bookings.reject(rejectingBooking.id, { rejection_reason: rejectionReason });
      }
      setRejectingBooking(null);
      setRejectionReason('');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to reject booking:', err);
      setActionError(err.message || 'Failed to reject booking.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkBedReady = async (bedId) => {
    setProcessingId(bedId);
    setActionError('');
    try {
      await api.beds.updateStatus(bedId, 'AVAILABLE');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to update bed status:', err);
      setActionError(err.message || 'Failed to update bed status.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="staff-duty-workspace animate-fade-in">
      {/* Front Desk Duty Station Header & Real-Date Compact Summary */}
      <div className="card duty-header-card">
        <div className="duty-header-info">
          <div className="duty-badge-row">
            <span className="badge badge-accent">{t('front_desk_workspace', 'Front Desk Duty Station')}</span>
            <span className="duty-date-stamp">
              <Clock size={13} />
              <span>Today: {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </span>
          </div>
          <h2>{t('front_desk_duty_station', 'Front Desk Operations')}</h2>
          <p className="duty-subtitle">
            {t('daily_ops_subtitle', 'Live arrival processing, check-outs, booking approvals & quick reservations.')}
          </p>
        </div>

        {/* Compact Summary KPIs */}
        <div className="duty-kpi-row">
          <div className="kpi-box ready-box">
            <span className="kpi-value text-success">{availableBeds.length}</span>
            <span className="kpi-label">{t('ready_beds', 'Ready Beds')}</span>
          </div>
          <div className="kpi-box occupied-box">
            <span className="kpi-value text-occupied">{occupiedBeds.length}</span>
            <span className="kpi-label">{t('occupied_beds_kpi', 'Occupied')}</span>
          </div>
          <div className="kpi-box checkins-box">
            <span className="kpi-value text-primary">{todayArrivals.length}</span>
            <span className="kpi-label">{t('today_checkins', "Today's In")}</span>
          </div>
          <div className="kpi-box checkouts-box">
            <span className="kpi-value text-warning">{todayDepartures.length}</span>
            <span className="kpi-label">{t('today_checkouts', "Today's Out")}</span>
          </div>
          <div className="kpi-box pending-box">
            <span className="kpi-value text-danger">{pendingApprovals.length}</span>
            <span className="kpi-label">{t('pending_requests', 'Pending')}</span>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* QUICK ACTIONS BAR (Front Desk Tools only — no duplicate tab switching) */}
      <div className="duty-quick-actions-bar">
        <button 
          className="quick-action-btn primary-action" 
          onClick={onOpenPhoneBooking}
        >
          <PhoneCall size={18} />
          <div className="qa-text">
            <strong>{t('new_phone_res', 'New Phone Booking')}</strong>
            <small>{t('direct_walkin_caller', 'Walk-in or caller reservation')}</small>
          </div>
        </button>

        <button 
          className="quick-action-btn group-action" 
          onClick={() => {
            if (onOpenGroupBooking) onOpenGroupBooking();
            else setShowGroupModal(true);
          }}
        >
          <Users size={18} />
          <div className="qa-text">
            <strong>{t('group_wedding_booking', 'Group / Wedding Booking')}</strong>
            <small>{t('bulk_floor_reservation', 'Bulk floor & multi-bed allocation')}</small>
          </div>
        </button>

        <button 
          className="quick-action-btn calendar-action" 
          onClick={() => setActiveTab('calendar')}
          title="Open Monthly / Weekly Booking Calendar"
        >
          <CalendarIcon size={18} />
          <div className="qa-text">
            <strong>{t('booking_calendar', 'Booking Calendar')}</strong>
            <small>{t('calendar_monthly_weekly', 'Monthly & weekly room reservations')}</small>
          </div>
        </button>

        <button 
          className="quick-action-btn refresh-action" 
          onClick={onRefresh}
          title="Reload today's operations data"
        >
          <Sparkle size={18} />
          <div className="qa-text">
            <strong>{t('refresh_duty_board', 'Refresh Board')}</strong>
            <small>{t('sync_db_telemetry', 'Sync live database telemetry')}</small>
          </div>
        </button>
      </div>

      {/* Turnaround Cleaning Alert Ribbon with INLINE Mark Ready (no jumping to other tabs) */}
      {cleaningBeds.length > 0 && (
        <div className="card cleaning-duty-card">
          <div className="cleaning-header-row">
            <div className="cleaning-title">
              <Sparkle size={18} color="#D97706" />
              <strong>{t('turnaround_cleaning_beds', 'Beds Requiring Turnaround Cleaning')} ({cleaningBeds.length})</strong>
            </div>
            <span className="cleaning-note">Turnover beds ready for cleaning</span>
          </div>
          <div className="cleaning-pills-row">
            {cleaningBeds.map(bed => (
              <div key={bed.id} className="clean-pill-item">
                <span className="bed-tag">Bed {bed.bed_number} (Floor {bed.floor_number})</span>
                <button 
                  className="btn btn-primary btn-sm btn-inline-ready"
                  onClick={() => handleMarkBedReady(bed.id)}
                  disabled={processingId === bed.id}
                  title="Mark bed turnaround cleaning complete and available"
                >
                  <Sparkle size={12} />
                  <span>{processingId === bed.id ? 'Saving...' : 'Mark Ready'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 1 & 2: TODAY'S ARRIVALS & TODAY'S DEPARTURES */}
      <div className="duty-arrivals-departures-grid">
        {/* 1. TODAY'S CHECK-INS */}
        <div className="card duty-list-card">
          <div className="duty-card-header">
            <div className="card-title-wrap">
              <span className="badge badge-available">{t('arrivals', 'Arrivals')}</span>
              <h3>{t('today_checkins', "Today's Check-ins")} ({todayArrivals.length})</h3>
            </div>
            <span className="header-hint">{t('scheduled_today', 'Scheduled for arrival today')}</span>
          </div>

          <div className="duty-items-list">
            {todayArrivals.length === 0 ? (
              <div className="empty-duty-msg">
                <CheckCircle2 size={24} color="#059669" />
                <p>{t('no_pending_checkins', 'No pending check-ins scheduled for today.')}</p>
              </div>
            ) : (
              todayArrivals.map(b => (
                <div key={b.id} className="duty-item">
                  <div className="duty-item-left">
                    <div className="guest-primary-info">
                      <strong className="guest-name">{b.guest_name}</strong>
                      <span className="guest-phone-sub">{b.guest_phone || '—'}</span>
                    </div>
                    <div className="duty-item-meta">
                      <span className="meta-badge floor-badge">
                        Floor {b.bed?.floor_number || b.floor_number || 1} • Bed {b.bed?.bed_number || b.bed_id}
                      </span>
                      <span className="meta-badge code-badge">#{b.booking_code}</span>
                      {b.group_code && (
                        <span 
                          className="group-pill-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenGroupDetails) onOpenGroupDetails(b.group_code);
                            else {
                              api.bookings.getGroup(b.group_code).then(setGroupDetails).catch(console.error);
                            }
                          }}
                        >
                          <Users size={11} /> {b.event_name || 'Group'}
                        </span>
                      )}
                      <span className={`status-pill status-${(b.status || '').toLowerCase()}`}>
                        {b.status}
                      </span>
                      <span className={`payment-pill ${b.paid_amount >= b.total_amount ? 'paid' : 'pending'}`}>
                        {b.paid_amount >= b.total_amount ? 'Paid' : `Due ₹${b.total_amount - (b.paid_amount || 0)}`}
                      </span>
                    </div>
                  </div>

                  <div className="duty-item-actions">
                    {onSelectBooking && (
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => onSelectBooking(b)}
                        title="View Full Booking Details"
                      >
                        <Eye size={15} />
                      </button>
                    )}
                    <button 
                      className="btn btn-primary btn-sm btn-checkin"
                      onClick={() => onCheckIn(b)}
                    >
                      <UserCheck size={14} />
                      <span>{t('check_in_btn', 'Check In')}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. TODAY'S CHECK-OUTS */}
        <div className="card duty-list-card">
          <div className="duty-card-header">
            <div className="card-title-wrap">
              <span className="badge badge-occupied">{t('departures', 'Departures')}</span>
              <h3>{t('today_checkouts', "Today's Check-outs")} ({todayDepartures.length})</h3>
            </div>
            <span className="header-hint">{t('due_out_today', 'Due for departure today (11:00 AM)')}</span>
          </div>

          <div className="duty-items-list">
            {todayDepartures.length === 0 ? (
              <div className="empty-duty-msg">
                <CheckCircle2 size={24} color="#059669" />
                <p>{t('no_pending_checkouts', 'No guests currently checked-in due for departure today.')}</p>
              </div>
            ) : (
              todayDepartures.map(b => (
                <div key={b.id} className="duty-item">
                  <div className="duty-item-left">
                    <div className="guest-primary-info">
                      <strong className="guest-name">{b.guest_name}</strong>
                      <span className="guest-phone-sub">{b.guest_phone || '—'}</span>
                    </div>
                    <div className="duty-item-meta">
                      <span className="meta-badge floor-badge">
                        Floor {b.bed?.floor_number || b.floor_number || 1} • Bed {b.bed?.bed_number || b.bed_id}
                      </span>
                      <span className="meta-badge code-badge">#{b.booking_code}</span>
                      {b.group_code && (
                        <span 
                          className="group-pill-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenGroupDetails) onOpenGroupDetails(b.group_code);
                            else {
                              api.bookings.getGroup(b.group_code).then(setGroupDetails).catch(console.error);
                            }
                          }}
                        >
                          <Users size={11} /> {b.event_name || 'Group'}
                        </span>
                      )}
                      <span className="status-pill status-checked_in">Checked In</span>
                    </div>
                  </div>

                  <div className="duty-item-actions">
                    {onSelectBooking && (
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => onSelectBooking(b)}
                        title="View Full Booking Details"
                      >
                        <Eye size={15} />
                      </button>
                    )}
                    <button 
                      className="btn btn-secondary btn-sm btn-checkout"
                      onClick={() => onCheckOut(b)}
                    >
                      <LogOut size={14} />
                      <span>{t('check_out_btn', 'Check Out')}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: PENDING APPROVAL REQUESTS (Front Desk Attention Required) */}
      <div className="card duty-pending-card">
        <div className="duty-card-header">
          <div className="card-title-wrap">
            <span className="badge badge-warning">{t('requires_staff_attention', 'Action Required')}</span>
            <h3>{t('pending_booking_requests', 'Pending Booking Requests Awaiting Approval')} ({pendingApprovals.length})</h3>
          </div>
          <span className="header-hint">{t('review_approval_hint', 'Verify dates and approve to enable guest payment hold')}</span>
        </div>

        <div className="duty-items-list">
          {pendingApprovals.length === 0 ? (
            <div className="empty-pending-clean">
              <CheckCircle2 size={20} color="#059669" />
              <span>{t('no_pending_actions', 'No pending booking requests requiring approval. All clear!')}</span>
            </div>
          ) : (
            pendingApprovals.map(b => (
              <div key={b.id} className="pending-request-row">
                <div className="pending-guest-col">
                  <strong>{b.guest_name}</strong>
                  <span className="contact-secondary">{b.guest_phone || b.guest_email || 'No contact'}</span>
                </div>

                <div className="pending-stay-col">
                  <span className="stay-dates">{b.check_in_date} → {b.check_out_date}</span>
                  <span className="stay-meta">
                    Floor {b.bed?.floor_number || b.floor_number || 1} • Bed {b.bed?.bed_number || b.bed_id}
                    {b.group_code ? ` • ${b.event_name || 'Group Booking'}` : ''}
                  </span>
                </div>

                <div className="pending-amount-col">
                  <strong>₹{b.total_amount}</strong>
                  <span className="hold-note">Payment disabled until approval</span>
                </div>

                <div className="pending-actions-col">
                  <button 
                    className="btn btn-primary btn-sm btn-approve"
                    onClick={() => handleApprove(b)}
                    disabled={processingId === b.id}
                  >
                    <Check size={14} />
                    <span>{processingId === b.id ? 'Approving...' : t('approve_booking', 'Approve')}</span>
                  </button>

                  <button 
                    className="btn btn-danger btn-sm btn-reject"
                    onClick={() => setRejectingBooking(b)}
                    disabled={processingId === b.id}
                  >
                    <X size={14} />
                    <span>{t('reject_booking', 'Reject')}</span>
                  </button>

                  {onSelectBooking && (
                    <button 
                      className="btn btn-ghost btn-sm"
                      onClick={() => onSelectBooking(b)}
                      title="Inspect Details"
                    >
                      <Eye size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Rejection Modal Dialog */}
      {rejectingBooking && (
        <div className="modal-overlay animate-fade-in" onClick={() => setRejectingBooking(null)}>
          <div className="modal-container reject-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <AlertCircle size={20} color="#DC2626" />
                <span>{t('reject_booking_title', 'Reject Booking Request')}</span>
              </div>
              <button className="btn-ghost" onClick={() => setRejectingBooking(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="reject-modal-body">
              <p>
                Are you sure you want to decline reservation <strong>#{rejectingBooking.booking_code}</strong> for <strong>{rejectingBooking.guest_name}</strong>?
              </p>
              <div className="form-group">
                <label>{t('rejection_reason_label', 'Reason for rejection (communicated to guest):')}</label>
                <textarea 
                  className="input-textarea"
                  rows="3"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="e.g. Bed unavailable for requested duration, maintenance underway, or fully booked."
                />
              </div>
            </div>
            <div className="modal-actions-right">
              <button className="btn btn-secondary" onClick={() => setRejectingBooking(null)}>
                {t('cancel', 'Cancel')}
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleConfirmReject}
                disabled={processingId === rejectingBooking.id}
              >
                {processingId === rejectingBooking.id ? 'Rejecting...' : t('confirm_reject', 'Confirm Rejection')}
              </button>
            </div>
          </div>
        </div>
      )}

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
        .staff-duty-workspace {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .duty-header-card {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
        }
        .duty-header-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .duty-badge-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .duty-date-stamp {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.78rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .duty-header-info h2 {
          font-family: var(--font-serif);
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 4px 0 2px 0;
        }
        .duty-subtitle {
          font-size: 0.84rem;
          color: var(--text-muted);
        }
        .duty-kpi-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .kpi-box {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 80px;
        }
        .kpi-value {
          font-size: 1.35rem;
          font-weight: 800;
          line-height: 1.1;
        }
        .kpi-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-top: 2px;
        }
        .text-success { color: #059669; }
        .text-occupied { color: #C25E40; }
        .text-primary { color: var(--primary); }
        .text-warning { color: #D97706; }
        .text-danger { color: #DC2626; }

        /* Quick Actions Bar */
        .duty-quick-actions-bar {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        @media (max-width: 768px) {
          .duty-quick-actions-bar {
            grid-template-columns: 1fr;
          }
        }
        .quick-action-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          background: #FFFFFF;
          cursor: pointer;
          transition: var(--transition);
          text-align: left;
        }
        .quick-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          border-color: var(--primary);
        }
        .quick-action-btn.primary-action {
          border-left: 4px solid var(--primary);
        }
        .quick-action-btn.primary-action svg {
          color: var(--primary);
        }
        .quick-action-btn.group-action {
          border-left: 4px solid #C25E40;
        }
        .quick-action-btn.group-action svg {
          color: #C25E40;
        }
        .quick-action-btn.beds-action {
          border-left: 4px solid #059669;
        }
        .quick-action-btn.beds-action svg {
          color: #059669;
        }
        .qa-text {
          display: flex;
          flex-direction: column;
        }
        .qa-text strong {
          font-size: 0.92rem;
          color: var(--text-main);
        }
        .qa-text small {
          font-size: 0.74rem;
          color: var(--text-muted);
        }

        /* Turnaround Cleaning Card */
        .cleaning-duty-card {
          padding: 16px 20px;
          border-left: 4px solid #D97706;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #FFFDF9;
        }
        .cleaning-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .cleaning-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.92rem;
          color: #92400E;
        }
        .cleaning-pills-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .clean-pill-item {
          background: #FFFFFF;
          border: 1px solid #FDE68A;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 0.76rem;
          color: #92400E;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .bed-tag {
          font-weight: 700;
        }
        .btn-inline-ready {
          padding: 2px 7px;
          font-size: 0.70rem;
          border-radius: 3px;
        }
        .cleaning-note {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        /* Arrivals & Departures Grid */
        .duty-arrivals-departures-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }
        @media (max-width: 860px) {
          .duty-arrivals-departures-grid {
            grid-template-columns: 1fr;
          }
        }
        .duty-list-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
        }
        .duty-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 12px;
        }
        .card-title-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .card-title-wrap h3 {
          font-family: var(--font-serif);
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }
        .header-hint {
          font-size: 0.74rem;
          color: var(--text-muted);
        }
        .duty-items-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .empty-duty-msg {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          gap: 8px;
          color: var(--text-muted);
          font-size: 0.84rem;
          text-align: center;
        }
        .duty-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          gap: 12px;
        }
        .duty-item-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .guest-primary-info {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .guest-name {
          font-size: 0.92rem;
          color: var(--text-main);
          font-weight: 700;
        }
        .guest-phone-sub {
          font-size: 0.74rem;
          color: var(--text-muted);
        }
        .duty-item-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          font-size: 0.74rem;
        }
        .meta-badge {
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }
        .floor-badge {
          background: #EAE6DF;
          color: #2D2A26;
        }
        .code-badge {
          background: #F4EFEA;
          color: #C25E40;
          font-weight: 700;
        }
        .group-pill-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #FAF4EF;
          border: 1px solid #F0D5C7;
          color: #C25E40;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
        }
        .status-pill {
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .status-pill.status-confirmed,
        .status-pill.status-checked_in {
          background: #ECFDF5;
          color: #065F46;
        }
        .payment-pill {
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .payment-pill.paid {
          background: #E6F4EA;
          color: #137333;
        }
        .payment-pill.pending {
          background: #FEF3C7;
          color: #92400E;
        }
        .duty-item-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-checkin {
          background: #059669;
          color: #FFFFFF;
          border: none;
        }
        .btn-checkin:hover {
          background: #047857;
        }
        .btn-checkout {
          background: #C25E40;
          color: #FFFFFF;
          border: none;
        }
        .btn-checkout:hover {
          background: #A94E33;
        }

        /* Pending Requests Section */
        .duty-pending-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
        }
        .empty-pending-clean {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 18px;
          background: #F0FDF4;
          border: 1px solid #DCFCE7;
          border-radius: 6px;
          color: #166534;
          font-size: 0.84rem;
          font-weight: 600;
        }
        .pending-request-row {
          display: grid;
          grid-template-columns: 2fr 2fr 1.5fr 2fr;
          align-items: center;
          padding: 12px 16px;
          background: #FFFDF9;
          border: 1px solid #FDE68A;
          border-radius: 6px;
          gap: 12px;
        }
        @media (max-width: 768px) {
          .pending-request-row {
            grid-template-columns: 1fr;
            gap: 8px;
          }
        }
        .pending-guest-col {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .contact-secondary {
          font-size: 0.74rem;
          color: var(--text-muted);
        }
        .pending-stay-col {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .stay-dates {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-main);
        }
        .stay-meta {
          font-size: 0.74rem;
          color: var(--text-muted);
        }
        .pending-amount-col {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .hold-note {
          font-size: 0.7rem;
          color: #92400E;
        }
        .pending-actions-col {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
        }
        .btn-approve {
          background: #059669;
          color: #FFFFFF;
          border: none;
        }
        .btn-approve:hover {
          background: #047857;
        }
        .btn-reject {
          background: #DC2626;
          color: #FFFFFF;
          border: none;
        }
        .btn-reject:hover {
          background: #B91C1C;
        }
        .reject-modal {
          max-width: 480px;
        }
        .reject-modal-body {
          padding: 16px 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 0.86rem;
        }
        .input-textarea {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xs);
          font-size: 0.84rem;
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}
