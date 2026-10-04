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
  Calendar, 
  CheckCircle2, 
  Clock, 
  Sparkle,
  Users
} from 'lucide-react';
import { useLanguage } from '../i18n.jsx';

export default function BookingsTable({ 
  bookings, 
  loading, 
  user, 
  onCheckIn, 
  onCheckOut, 
  onCancel, 
  onPay, 
  onSelectBooking,
  onOpenPhoneBooking,
  onOpenGroupBooking,
  onOpenGroupDetails,
  onRefresh
}) {
  const { t } = useLanguage();
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const isStaffOrOwner = user?.role === 'OWNER_ADMIN' || user?.role === 'STAFF_EMPLOYEE';

  const filteredBookings = bookings.filter(b => {
    if (filterStatus !== 'ALL' && b.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const codeMatch = b.booking_code?.toLowerCase().includes(q);
      const nameMatch = b.guest_name?.toLowerCase().includes(q);
      const phoneMatch = b.guest_phone?.toLowerCase().includes(q);
      const bedMatch = b.bed_number?.toLowerCase().includes(q);
      return codeMatch || nameMatch || phoneMatch || bedMatch;
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="badge badge-confirmed"><CheckCircle2 size={12} /> {t('status_confirmed', 'Confirmed')}</span>;
      case 'PENDING_PAYMENT':
        return <span className="badge badge-pending"><Clock size={12} /> {t('status_pending_payment', 'Pending Pay')}</span>;
      case 'CHECKED_IN':
        return <span className="badge badge-occupied"><UserCheck size={12} /> {t('status_checked_in', 'Checked In')}</span>;
      case 'CHECKED_OUT':
        return <span className="badge badge-cleaning"><Sparkle size={12} /> {t('status_checked_out', 'Checked Out')}</span>;
      case 'CANCELLED':
        return <span className="badge badge-cancelled"><XCircle size={12} /> {t('status_cancelled', 'Cancelled')}</span>;
      case 'EXPIRED':
        return <span className="badge badge-expired"><Clock size={12} /> {t('status_expired', 'Expired Hold')}</span>;
      default:
        return <span className="badge">{t(status, status)}</span>;
    }
  };

  return (
    <div className="bookings-module animate-fade-in">
      {/* Header */}
      <div className="card bookings-header-card">
        <div className="title-area">
          <span className="badge badge-accent">{t('ledger_badge', 'Reservations Ledger')}</span>
          <h2>{t('ledger_title', 'Guest Bookings & Stay Records')}</h2>
          <p className="subtitle">{t('ledger_sub', 'Persistent server-verified bookings, identity records, and stay settlements')}</p>
        </div>

        <div className="header-actions">
          {isStaffOrOwner && (
            <>
              <button className="btn btn-outline-primary btn-sm" onClick={onOpenGroupBooking}>
                <Users size={14} /> {t('group_booking_tile', 'Bulk / Group Booking')}
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

      {/* Search & Filter Toolbar */}
      <div className="card toolbar-card">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder={t('search_placeholder', 'Search by code, guest name, phone, or bed number...')} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Filter Pills */}
        <div className="status-chips-row">
          {['ALL', 'CONFIRMED', 'PENDING_PAYMENT', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].map((st) => (
            <button
              key={st}
              className={`chip-btn ${filterStatus === st ? 'active' : ''}`}
              onClick={() => setFilterStatus(st)}
            >
              {st === 'ALL' ? t('filter_all', 'All Statuses') : t('status_' + st.toLowerCase(), st.replace('_', ' '))}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table / Card List */}
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
            <table className="hospitality-table">
              <thead>
                <tr>
                  <th>{t('col_booking', 'Booking Code')}</th>
                  <th>{t('col_guest', 'Guest Name')}</th>
                  <th>{t('col_bed_floor', 'Bed / Floor')}</th>
                  <th>{t('col_dates', 'Stay Dates')}</th>
                  <th>{t('col_status', 'Status')}</th>
                  <th>{t('col_payment', 'Payment')}</th>
                  <th style={{ textAlign: 'right' }}>{t('col_actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="booking-row">
                    <td>
                      <div className="code-cell">
                        <span className="booking-code">{b.booking_code}</span>
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
                    <td>
                      <div className="guest-cell">
                        <span className="guest-name">{b.guest_name}</span>
                        <span className="guest-phone">{b.guest_phone || 'No phone'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="bed-cell">
                        <span className="bed-num">{t('bed', 'Bed')} {b.bed?.bed_number || b.bed_number || 'Unassigned'}</span>
                        <span className="floor-sub">{t('floor', 'Floor')} {b.bed?.floor_number || b.floor_number || 1}</span>
                      </div>
                    </td>
                    <td>
                      <div className="date-cell">
                        <span>{b.check_in_date}</span>
                        <span className="date-separator">→</span>
                        <span>{b.check_out_date}</span>
                      </div>
                    </td>
                    <td>{getStatusBadge(b.status)}</td>
                    <td>
                      <div className="payment-cell">
                        <span className="amt-total">₹{b.total_amount_inr}</span>
                        <span className={b.payment_status === 'PAID' ? 'text-success' : 'text-warning'}>
                          {t(b.payment_status, b.payment_status)}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-buttons-group">
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => onSelectBooking(b)}
                          title={t('btn_view_details', 'View Details')}
                        >
                          <Eye size={15} />
                        </button>

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

                        {b.status === 'PENDING_PAYMENT' && (
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => onPay(b)}
                            title={t('btn_pay', 'Process Payment')}
                          >
                            <CreditCard size={14} />
                            <span className="hide-on-mobile">{t('btn_pay', 'Pay')}</span>
                          </button>
                        )}

                        {isStaffOrOwner && (b.status === 'CONFIRMED' || b.status === 'PENDING_PAYMENT') && (
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

      <style>{`
        .bookings-module {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .bookings-header-card {
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .title-area h2 {
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
        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Toolbar */
        .toolbar-card {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg-secondary);
          padding: 8px 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          flex: 1;
          min-width: 260px;
          max-width: 450px;
        }
        .search-icon {
          color: var(--text-muted);
        }
        .search-input {
          border: none;
          background: transparent;
          font-size: 0.88rem;
          color: var(--text-main);
          outline: none;
          width: 100%;
        }
        .status-chips-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .chip-btn {
          font-size: 0.78rem;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: var(--radius-full);
          color: var(--text-muted);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          transition: var(--transition);
        }
        .chip-btn:hover {
          color: var(--text-main);
        }
        .chip-btn.active {
          color: #FFFFFF;
          background: var(--primary);
          border-color: var(--primary);
        }

        /* Table */
        .table-container-card {
          padding: 0;
          overflow: hidden;
        }
        .table-responsive {
          overflow-x: auto;
        }
        .hospitality-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .hospitality-table th {
          padding: 14px 18px;
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-subtle);
          letter-spacing: 0.04em;
        }
        .hospitality-table td {
          padding: 14px 18px;
          font-size: 0.86rem;
          border-bottom: 1px solid var(--border-subtle);
          color: var(--text-body);
        }
        .booking-row:hover td {
          background: #FAF8F5;
        }
        .booking-code {
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--primary);
        }
        .code-sub-tags {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 2px;
        }
        .type-tag {
          font-size: 0.68rem;
          color: var(--text-dim);
          font-weight: 600;
        }
        .group-tag {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          background: #FAF4EF;
          border: 1px solid #F0D5C7;
          color: #C25E40;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 0.68rem;
          font-weight: 600;
          cursor: pointer;
        }
        .group-tag:hover {
          background: #C25E40;
          color: #FFFFFF;
        }
        .guest-name {
          font-weight: 700;
          color: var(--text-main);
        }
        .guest-phone {
          font-size: 0.76rem;
          color: var(--text-muted);
        }
        .bed-num {
          font-weight: 700;
          color: var(--text-main);
        }
        .floor-sub {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .date-cell {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          white-space: nowrap;
        }
        .date-separator {
          color: var(--text-dim);
        }
        .amt-total {
          font-weight: 700;
          color: var(--text-main);
        }
        .text-success { color: var(--success); font-size: 0.74rem; font-weight: 700; }
        .text-warning { color: var(--warning); font-size: 0.74rem; font-weight: 700; }
        .action-buttons-group {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
        }
        .empty-state {
          padding: 60px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--text-muted);
        }
        @media (max-width: 768px) {
          .hide-on-mobile { display: none; }
        }
      `}</style>
    </div>
  );
}
