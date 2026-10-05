import React, { useState } from 'react';
import { 
  ClipboardList, 
  Search, 
  UserCheck, 
  LogOut, 
  XCircle, 
  CreditCard, 
  Eye, 
  PhoneCall, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  Sparkle,
  Users,
  Receipt,
  Check,
  X,
  AlertCircle,
  Table as TableIcon
} from 'lucide-react';
import { useLanguage } from '../i18n.jsx';
import BookingCalendar from './BookingCalendar';
import { api } from '../api';

export default function BookingsTable({ 
  bookings = [], 
  loading, 
  user, 
  beds = [],
  initialView = 'TABLE',
  onCheckIn, 
  onCheckOut, 
  onCancel, 
  onPay, 
  onSelectBooking,
  onOpenPhoneBooking,
  onOpenGroupBooking,
  onOpenGroupDetails,
  onOpenReceipt,
  onRefresh
}) {
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState(initialView); // 'TABLE' or 'CALENDAR'

  React.useEffect(() => {
    if (initialView) {
      setCurrentView(initialView);
    }
  }, [initialView]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [rejectingBooking, setRejectingBooking] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [tableError, setTableError] = useState('');

  const isStaffOrOwner = user?.role === 'OWNER_ADMIN' || user?.role === 'STAFF_EMPLOYEE';

  const filteredBookings = bookings.filter(b => {
    if (filterStatus !== 'ALL' && b.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const codeMatch = b.booking_code?.toLowerCase().includes(q);
      const nameMatch = b.guest_name?.toLowerCase().includes(q);
      const phoneMatch = b.guest_phone?.toLowerCase().includes(q);
      const emailMatch = b.guest_email?.toLowerCase().includes(q);
      const floorMatch = `floor ${b.bed?.floor_number || b.floor_number}`.includes(q);
      return codeMatch || nameMatch || phoneMatch || emailMatch || floorMatch;
    }
    return true;
  });

  const handleApprove = async (booking) => {
    setProcessingId(booking.id);
    setTableError('');
    try {
      if (booking.group_code) {
        await api.bookings.approveGroup(booking.group_code);
      } else {
        await api.bookings.approve(booking.id);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to approve booking:', err);
      setTableError(err.message || 'Failed to approve booking.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingBooking) return;
    setProcessingId(rejectingBooking.id);
    setTableError('');
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
      setTableError(err.message || 'Failed to reject booking.');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <span className="badge badge-pending-approval"><Clock size={12} /> {t('status_pending_approval', 'Pending Approval')}</span>;
      case 'APPROVED_PAYMENT_PENDING':
        return <span className="badge badge-approved"><CreditCard size={12} /> {t('status_approved_payment_pending', 'Payment Due')}</span>;
      case 'CONFIRMED':
        return <span className="badge badge-confirmed"><CheckCircle2 size={12} /> {t('status_confirmed', 'Confirmed')}</span>;
      case 'PENDING_PAYMENT':
        return <span className="badge badge-pending"><Clock size={12} /> {t('status_pending_payment', 'Pending Pay')}</span>;
      case 'CHECKED_IN':
        return <span className="badge badge-occupied"><UserCheck size={12} /> {t('status_checked_in', 'Checked In')}</span>;
      case 'CHECKED_OUT':
        return <span className="badge badge-cleaning"><Sparkle size={12} /> {t('status_checked_out', 'Checked Out')}</span>;
      case 'REJECTED':
        return <span className="badge badge-rejected"><XCircle size={12} /> {t('status_rejected', 'Rejected')}</span>;
      case 'CANCELLED':
        return <span className="badge badge-cancelled"><XCircle size={12} /> {t('status_cancelled', 'Cancelled')}</span>;
      case 'EXPIRED':
        return <span className="badge badge-expired"><Clock size={12} /> {t('status_expired', 'Expired Hold')}</span>;
      default:
        return <span className="badge">{t(status, status)}</span>;
    }
  };

  // Helper to format Floor display according to PDF:
  // "REMOVE the word/label 'Bed' from this entire column. The column should simply be: Floor. Examples: Floor 1, Floor 2, Floor 3, Floor 1 + 2"
  const getFloorDisplay = (booking) => {
    if (booking.group_code) {
      // Find all bookings in group if available in pool
      const grp = bookings.filter(b => b.group_code === booking.group_code);
      if (grp.length > 0) {
        const fls = Array.from(new Set(grp.map(b => b.bed?.floor_number || b.floor_number || 1))).sort();
        return `Floor ${fls.join(' + ')}`;
      }
    }
    const fl = booking.bed?.floor_number || booking.floor_number || 1;
    return `Floor ${fl}`;
  };

  return (
    <div className="bookings-module animate-fade-in">
      {/* Header */}
      <div className="card bookings-header-card">
        <div className="title-area">
          <span className="badge badge-accent">{t('ledger_badge', 'Reservations Ledger')}</span>
          <h2>{t('ledger_title', 'Guest Bookings & Stay Records')}</h2>
          <p className="subtitle">{t('ledger_sub', 'Server-verified bookings, floor allocations, payment status, and official receipts')}</p>
        </div>

        <div className="header-actions">
          {/* View Toggle: Table vs Calendar */}
          <div className="view-toggle-group">
            <button 
              className={`btn-toggle ${currentView === 'TABLE' ? 'active' : ''}`}
              onClick={() => setCurrentView('TABLE')}
              title="Table View"
            >
              <TableIcon size={15} />
              <span>{t('table_view', 'Table View')}</span>
            </button>
            <button 
              className={`btn-toggle ${currentView === 'CALENDAR' ? 'active' : ''}`}
              onClick={() => setCurrentView('CALENDAR')}
              title="Monthly / Weekly Calendar View"
            >
              <CalendarIcon size={15} />
              <span>{t('calendar_view', 'Calendar View')}</span>
            </button>
          </div>

          {isStaffOrOwner && (
            <>
              <button className="btn btn-outline-primary btn-sm" onClick={onOpenGroupBooking}>
                <Users size={14} /> {t('group_booking_tile', 'Group / Wedding Booking')}
              </button>
              <button className="btn btn-primary btn-sm" onClick={onOpenPhoneBooking}>
                <PhoneCall size={14} /> {t('new_phone_res', 'New Phone Booking')}
              </button>
            </>
          )}
          <button className="btn btn-secondary btn-sm" onClick={onRefresh}>
            {t('refresh_btn', 'Refresh')}
          </button>
        </div>
      </div>

      {tableError && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          <span>{tableError}</span>
        </div>
      )}

      {/* VIEW 1: BOOKING CALENDAR */}
      {currentView === 'CALENDAR' ? (
        <BookingCalendar 
          bookings={bookings} 
          beds={beds}
          onSelectBooking={onSelectBooking} 
        />
      ) : (
        /* VIEW 2: POLISHED BOOKINGS TABLE */
        <>
          {/* Search & Filter Toolbar */}
          <div className="card toolbar-card">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                placeholder={t('search_placeholder', 'Search by code, guest name, phone, email, or floor...')} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Filter Pills */}
            <div className="status-chips-row">
              {[
                { key: 'ALL', label: t('filter_all', 'All Bookings') },
                { key: 'PENDING_APPROVAL', label: t('status_pending_approval', 'Pending Approval') },
                { key: 'APPROVED_PAYMENT_PENDING', label: t('status_approved_payment_pending', 'Payment Due') },
                { key: 'CONFIRMED', label: t('status_confirmed', 'Confirmed') },
                { key: 'CHECKED_IN', label: t('status_checked_in', 'Checked In') },
                { key: 'CHECKED_OUT', label: t('status_checked_out', 'Checked Out') },
                { key: 'REJECTED', label: t('status_rejected', 'Rejected') },
                { key: 'CANCELLED', label: t('status_cancelled', 'Cancelled') }
              ].map((item) => (
                <button
                  key={item.key}
                  className={`chip-btn ${filterStatus === item.key ? 'active' : ''}`}
                  onClick={() => setFilterStatus(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bookings Table */}
          <div className="card table-container-card">
            {loading ? (
              <div className="empty-state">{t('loading', 'Loading reservations from persistent database...')}</div>
            ) : filteredBookings.length === 0 ? (
              <div className="empty-state">
                <ClipboardList size={36} color="#A8A29E" />
                <p>{t('no_bookings_matched', 'No bookings found matching current filters.')}</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="hospitality-table polished-bookings-table">
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>{t('col_booking', 'Booking Code')}</th>
                      <th style={{ minWidth: '180px' }}>{t('col_guest_contact', 'Guest & Contact')}</th>
                      <th style={{ width: '130px' }}>{t('col_floor', 'Floor')}</th>
                      <th style={{ width: '160px' }}>{t('col_dates', 'Stay Dates')}</th>
                      <th style={{ width: '150px' }}>{t('col_status', 'Status')}</th>
                      <th style={{ width: '120px' }}>{t('col_payment', 'Payment')}</th>
                      <th style={{ textAlign: 'right', minWidth: '160px' }}>{t('col_actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="booking-row">
                        {/* Booking Code & Stay Type */}
                        <td>
                          <div className="code-cell">
                            <span className="booking-code font-mono">#{b.booking_code}</span>
                            <div className="code-sub-tags">
                              <span className="type-tag">{t(b.booking_type, b.booking_type)}</span>
                              {b.group_code && (
                                <span 
                                  className="group-tag"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpenGroupDetails) onOpenGroupDetails(b.group_code);
                                  }}
                                  title="Click to view Group Booking"
                                >
                                  <Users size={10} /> {b.event_name || 'Group'}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Guest & Contact Visual Hierarchy (Page 31: Name bold on top, Phone smaller beneath, visually separated) */}
                        <td>
                          <div className="guest-contact-cell">
                            <div className="guest-block">
                              <span className="cell-micro-label">Guest</span>
                              <strong className="guest-name-text">{b.guest_name}</strong>
                            </div>
                            <div className="contact-block">
                              <span className="cell-micro-label">Contact</span>
                              <span className="guest-phone-sub">{b.guest_phone || '—'}</span>
                              {b.guest_email && <span className="guest-email-sub">{b.guest_email}</span>}
                            </div>
                          </div>
                        </td>

                        {/* Floor Column (Page 31-32: NO "Bed" label, strictly Floor info) */}
                        <td>
                          <div className="floor-only-cell">
                            <span className="floor-badge-text">{getFloorDisplay(b)}</span>
                          </div>
                        </td>

                        {/* Stay Dates */}
                        <td>
                          <div className="date-cell">
                            <span className="checkin-date">{b.check_in_date}</span>
                            <span className="date-separator">→</span>
                            <span className="checkout-date">{b.check_out_date}</span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td>{getStatusBadge(b.status)}</td>

                        {/* Payment */}
                        <td>
                          <div className="payment-cell">
                            <strong className="amt-total">₹{Number(b.total_amount_inr || b.total_amount || 0).toFixed(0)}</strong>
                            <span className={`payment-sub-status ${b.paid_amount >= b.total_amount ? 'text-success' : 'text-muted'}`}>
                              {b.paid_amount >= b.total_amount ? 'Paid' : `Due ₹${(b.total_amount - (b.paid_amount || 0)).toFixed(0)}`}
                            </span>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td style={{ textAlign: 'right' }}>
                          <div className="action-buttons-group">
                            {/* Inspect Details */}
                            <button 
                              className="btn btn-ghost btn-sm"
                              onClick={() => onSelectBooking(b)}
                              title={t('btn_view_details', 'View Reservation Details')}
                            >
                              <Eye size={15} />
                            </button>

                            {/* View Receipt for confirmed/checked in/out */}
                            {['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(b.status) && onOpenReceipt && (
                              <button 
                                className="btn btn-ghost btn-sm btn-receipt-icon"
                                onClick={() => onOpenReceipt(b)}
                                title={t('btn_view_receipt', 'View / Print Invoice Receipt')}
                              >
                                <Receipt size={15} color="#C25E40" />
                              </button>
                            )}

                            {/* Approval CTAs for PENDING_APPROVAL */}
                            {isStaffOrOwner && b.status === 'PENDING_APPROVAL' && (
                              <>
                                <button 
                                  className="btn btn-primary btn-sm btn-action-approve"
                                  onClick={() => handleApprove(b)}
                                  disabled={processingId === b.id}
                                  title="Approve Booking Request"
                                >
                                  <Check size={14} />
                                  <span className="hide-on-mobile">{t('approve_btn', 'Approve')}</span>
                                </button>
                                <button 
                                  className="btn btn-danger btn-sm btn-action-reject"
                                  onClick={() => setRejectingBooking(b)}
                                  disabled={processingId === b.id}
                                  title="Reject Booking Request"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            )}

                            {/* Check In */}
                            {isStaffOrOwner && b.status === 'CONFIRMED' && (
                              <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => onCheckIn(b)}
                                title={t('check_in_btn', 'Check In Guest')}
                              >
                                <UserCheck size={14} />
                                <span className="hide-on-mobile">{t('check_in_btn', 'Check In')}</span>
                              </button>
                            )}

                            {/* Check Out */}
                            {isStaffOrOwner && b.status === 'CHECKED_IN' && (
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => onCheckOut(b)}
                                title={t('check_out_btn', 'Check Out Guest')}
                              >
                                <LogOut size={14} />
                                <span className="hide-on-mobile">{t('check_out_btn', 'Check Out')}</span>
                              </button>
                            )}

                            {/* Pay Now for Approved bookings */}
                            {(b.status === 'APPROVED_PAYMENT_PENDING' || b.status === 'PENDING_PAYMENT') && (
                              <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => onPay(b)}
                                title={t('btn_pay', 'Process Payment')}
                              >
                                <CreditCard size={14} />
                                <span className="hide-on-mobile">{t('btn_pay', 'Pay')}</span>
                              </button>
                            )}

                            {/* Cancel */}
                            {isStaffOrOwner && ['CONFIRMED', 'PENDING_PAYMENT', 'APPROVED_PAYMENT_PENDING'].includes(b.status) && (
                              <button 
                                className="btn btn-ghost btn-sm text-danger"
                                onClick={() => onCancel(b)}
                                title={t('btn_cancel', 'Cancel Reservation')}
                              >
                                <XCircle size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Reject Modal */}
      {rejectingBooking && (
        <div className="modal-overlay animate-fade-in" onClick={() => setRejectingBooking(null)}>
          <div className="modal-container reject-dialog-card" onClick={e => e.stopPropagation()}>
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
                Decline reservation <strong>#{rejectingBooking.booking_code}</strong> for <strong>{rejectingBooking.guest_name}</strong>?
              </p>
              <div className="form-group">
                <label>{t('rejection_reason_label', 'Rejection reason:')}</label>
                <textarea 
                  className="input-textarea"
                  rows="3"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="e.g. Bed unavailable for selected dates, property full."
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

      <style>{`
        .bookings-module {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .bookings-header-card {
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .title-area h2 {
          font-family: var(--font-serif);
          font-size: 1.45rem;
          font-weight: 700;
          color: var(--text-main);
          margin-top: 4px;
        }
        .subtitle {
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .view-toggle-group {
          display: flex;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 3px;
          gap: 4px;
        }
        .btn-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-muted);
          border: none;
          background: transparent;
          border-radius: 4px;
          cursor: pointer;
          transition: var(--transition);
        }
        .btn-toggle.active {
          background: #FFFFFF;
          color: #C25E40;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .toolbar-card {
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .search-box {
          position: relative;
          width: 100%;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .search-input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xs);
          font-size: 0.84rem;
          background: var(--bg-primary);
        }
        .status-chips-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .chip-btn {
          padding: 4px 12px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-subtle);
          background: var(--bg-primary);
          font-size: 0.76rem;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
        }
        .chip-btn.active {
          background: #C25E40;
          color: #FFFFFF;
          border-color: #C25E40;
        }
        .table-container-card {
          padding: 0;
          overflow: hidden;
        }
        .table-responsive {
          overflow-x: auto;
        }
        .polished-bookings-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.83rem;
        }
        .polished-bookings-table th {
          background: var(--bg-secondary);
          color: var(--text-muted);
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-subtle);
          text-align: left;
        }
        .polished-bookings-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-subtle);
          vertical-align: middle;
        }
        .booking-row:hover {
          background: #FDFCF9;
        }
        .code-cell {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .booking-code {
          font-weight: 700;
          color: #C25E40;
          font-size: 0.82rem;
        }
        .code-sub-tags {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .type-tag {
          font-size: 0.68rem;
          color: var(--text-muted);
          background: var(--bg-secondary);
          padding: 1px 5px;
          border-radius: 3px;
        }
        .group-tag {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          background: #FAF4EF;
          border: 1px solid #F0D5C7;
          color: #C25E40;
          padding: 1px 5px;
          border-radius: 3px;
          font-size: 0.68rem;
          font-weight: 600;
          cursor: pointer;
        }

        /* Guest & Contact hierarchy (Clean 2-block structure) */
        .guest-contact-cell {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .guest-block, .contact-block {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .cell-micro-label {
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-dim);
          letter-spacing: 0.4px;
        }
        .guest-name-text {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .guest-phone-sub {
          font-size: 0.74rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .guest-email-sub {
          font-size: 0.70rem;
          color: var(--text-muted);
        }

        /* Floor Only */
        .floor-only-cell {
          display: flex;
          align-items: center;
        }
        .floor-badge-text {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-body);
          background: #F4EFEA;
          padding: 3px 8px;
          border-radius: 4px;
        }

        /* Dates */
        .date-cell {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.78rem;
          color: var(--text-body);
        }
        .date-separator {
          color: var(--text-muted);
        }

        /* Payment */
        .payment-cell {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .amt-total {
          font-size: 0.84rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .payment-sub-status {
          font-size: 0.7rem;
        }

        /* Status Badges */
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
        .badge-rejected {
          background: #FEE2E2;
          color: #991B1B;
          border: 1px solid #FECACA;
        }

        /* Action Buttons */
        .action-buttons-group {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
        }
        .btn-action-approve {
          background: #059669;
          color: #FFFFFF;
          border: none;
        }
        .btn-action-approve:hover {
          background: #047857;
        }
        .btn-action-reject {
          background: #DC2626;
          color: #FFFFFF;
          border: none;
        }
        .btn-action-reject:hover {
          background: #B91C1C;
        }
        .reject-dialog-card {
          max-width: 460px;
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
        @media (max-width: 768px) {
          .hide-on-mobile {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
