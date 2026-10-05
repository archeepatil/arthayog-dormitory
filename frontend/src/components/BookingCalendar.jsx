import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  BedDouble, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Filter
} from 'lucide-react';
import { useLanguage } from '../i18n.jsx';

export default function BookingCalendar({ bookings = [], onSelectBooking, beds = [] }) {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState('MONTH'); // 'MONTH' or 'WEEK'
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrev = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter bookings by status if needed
  const filteredBookings = useMemo(() => {
    if (statusFilter === 'ALL') return bookings;
    return bookings.filter(b => b.status === statusFilter);
  }, [bookings, statusFilter]);

  // Consolidate group bookings so they appear as one clean group item per group_code
  const consolidatedEvents = useMemo(() => {
    const list = [];
    const seenGroups = new Set();

    filteredBookings.forEach(b => {
      if (b.group_code) {
        if (!seenGroups.has(b.group_code)) {
          seenGroups.add(b.group_code);
          const groupMembers = filteredBookings.filter(m => m.group_code === b.group_code);
          const floors = Array.from(new Set(groupMembers.map(m => m.floor_number || (beds.find(bed => bed.id === m.bed_id)?.floor_number) || 1))).sort();
          list.push({
            isGroup: true,
            group_code: b.group_code,
            id: b.id,
            guest_name: b.event_name ? `${b.event_name} (${b.guest_name})` : b.guest_name,
            customer_name: b.guest_name,
            booking_code: b.booking_code,
            check_in_date: b.check_in_date,
            check_out_date: b.check_out_date,
            floors_display: floors.length > 0 ? `Floor ${floors.join(' + ')}` : `Floor ${b.floor_number || 1}`,
            beds_count: groupMembers.length,
            status: b.status,
            paid_amount: groupMembers.reduce((sum, m) => sum + (m.paid_amount || 0), 0),
            total_amount: groupMembers.reduce((sum, m) => sum + (m.total_amount || 0), 0),
            rawBooking: b,
            allGroupBookings: groupMembers
          });
        }
      } else {
        list.push({
          isGroup: false,
          id: b.id,
          guest_name: b.guest_name,
          customer_name: b.guest_name,
          booking_code: b.booking_code,
          check_in_date: b.check_in_date,
          check_out_date: b.check_out_date,
          floors_display: `Floor ${b.floor_number || (beds.find(bed => bed.id === b.bed_id)?.floor_number) || 1}`,
          beds_count: 1,
          bed_number: b.bed_number,
          status: b.status,
          paid_amount: b.paid_amount || 0,
          total_amount: b.total_amount || 0,
          rawBooking: b
        });
      }
    });

    return list;
  }, [filteredBookings, beds]);

  // Generate Month Grid Days
  const monthDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevLastDate = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month padding days
    for (let x = firstDayIndex; x > 0; x--) {
      const d = prevLastDate - x + 1;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= lastDate; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dayNumber: i, dateStr, isCurrentMonth: true });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remaining = 35 - days.length >= 0 ? 35 - days.length : 42 - days.length;
    for (let j = 1; j <= remaining; j++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
      days.push({ dayNumber: j, dateStr, isCurrentMonth: false });
    }

    return days;
  }, [year, month]);

  // Generate Week Grid Days
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0 = Sun
    const firstDayOfWeek = new Date(curr);
    firstDayOfWeek.setDate(curr.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(firstDayOfWeek);
      d.setDate(firstDayOfWeek.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dayNumber: d.getDate(),
        dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: dateStr === new Date().toISOString().split('T')[0]
      });
    }
    return days;
  }, [currentDate]);

  // Helper to check if event covers a day
  const getEventsForDay = (dateStr) => {
    return consolidatedEvents.filter(ev => {
      return ev.check_in_date <= dateStr && ev.check_out_date > dateStr;
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'CONFIRMED': return 'badge-confirmed';
      case 'CHECKED_IN': return 'badge-checked-in';
      case 'CHECKED_OUT': return 'badge-checked-out';
      case 'APPROVED_PAYMENT_PENDING': return 'badge-approved';
      case 'PENDING_APPROVAL': return 'badge-pending';
      case 'PENDING_PAYMENT': return 'badge-pending';
      case 'REJECTED': return 'badge-rejected';
      case 'CANCELLED': return 'badge-cancelled';
      default: return 'badge-neutral';
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="booking-calendar-wrapper animate-fade-in">
      {/* Calendar Top Controls Header */}
      <div className="calendar-controls-bar">
        <div className="cal-title-left">
          <div className="cal-icon-wrap">
            <CalendarIcon size={20} color="#C25E40" />
          </div>
          <div>
            <h3 className="cal-heading">
              {monthNames[month]} {year}
            </h3>
            <span className="cal-sub">
              {filteredBookings.length} {t('nav_bookings', 'Bookings')} • {consolidatedEvents.length} {t('cal_reservations', 'Active Events')}
            </span>
          </div>
        </div>

        {/* View toggles & Date Navigator */}
        <div className="cal-actions-right">
          <div className="btn-group view-switcher">
            <button 
              type="button" 
              className={`btn btn-sm ${viewMode === 'MONTH' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('MONTH')}
            >
              {t('cal_month', 'Month')}
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${viewMode === 'WEEK' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('WEEK')}
            >
              {t('cal_week', 'Week')}
            </button>
          </div>

          <div className="nav-buttons-group">
            <button type="button" className="btn btn-outline btn-sm" onClick={handlePrev} title="Previous">
              <ChevronLeft size={16} />
            </button>
            <button type="button" className="btn btn-outline btn-sm today-btn" onClick={handleToday}>
              {t('cal_today', 'Today')}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleNext} title="Next">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Status Filter */}
          <select 
            className="form-select cal-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">{t('all_statuses', 'All Statuses')}</option>
            <option value="CONFIRMED">{t('status_confirmed', 'Confirmed')}</option>
            <option value="CHECKED_IN">{t('status_checked_in', 'Checked In')}</option>
            <option value="PENDING_APPROVAL">{t('status_pending_approval', 'Awaiting Approval')}</option>
            <option value="APPROVED_PAYMENT_PENDING">{t('status_payment_pending', 'Payment Pending')}</option>
            <option value="CHECKED_OUT">{t('status_checked_out', 'Checked Out')}</option>
          </select>
        </div>
      </div>

      {/* Monthly View Grid */}
      {viewMode === 'MONTH' && (
        <div className="calendar-grid-container">
          <div className="calendar-day-headers">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="cal-day-header-cell">{d}</div>
            ))}
          </div>

          <div className="calendar-cells-grid">
            {monthDays.map((dayObj, idx) => {
              const dayEvents = getEventsForDay(dayObj.dateStr);
              const isToday = dayObj.dateStr === todayStr;

              return (
                <div 
                  key={idx} 
                  className={`calendar-cell ${!dayObj.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'cell-today' : ''}`}
                >
                  <div className="cell-date-badge">
                    <span className={isToday ? 'today-number' : ''}>{dayObj.dayNumber}</span>
                    {dayEvents.length > 0 && (
                      <span className="cell-count-pill">{dayEvents.length}</span>
                    )}
                  </div>

                  <div className="cell-events-list">
                    {dayEvents.slice(0, 3).map((ev, eIdx) => (
                      <div 
                        key={eIdx}
                        className={`cal-event-card ${ev.isGroup ? 'event-group' : 'event-single'} ${getStatusBadgeClass(ev.status)}`}
                        onClick={() => onSelectBooking && onSelectBooking(ev.rawBooking)}
                        title={`Click to view booking: ${ev.guest_name}`}
                      >
                        <div className="event-top-line">
                          {ev.isGroup ? <Users size={12} className="ev-icon" /> : <BedDouble size={12} className="ev-icon" />}
                          <strong className="ev-name">{ev.guest_name}</strong>
                        </div>
                        <div className="ev-meta-line">
                          <span>{ev.floors_display}</span>
                          <span>•</span>
                          <span>{ev.beds_count} {ev.beds_count === 1 ? 'Bed' : 'Beds'}</span>
                          <span>•</span>
                          <span className="ev-status-text">{ev.status}</span>
                        </div>
                      </div>
                    ))}

                    {dayEvents.length > 3 && (
                      <div className="cal-more-events">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly View Grid */}
      {viewMode === 'WEEK' && (
        <div className="calendar-week-container">
          <div className="calendar-week-grid">
            {weekDays.map((wDay, idx) => {
              const dayEvents = getEventsForDay(wDay.dateStr);
              return (
                <div key={idx} className={`week-column ${wDay.isToday ? 'week-col-today' : ''}`}>
                  <div className="week-header-cell">
                    <span className="week-day-name">{wDay.dayName}</span>
                    <span className={`week-day-num ${wDay.isToday ? 'today-pill' : ''}`}>{wDay.dayNumber}</span>
                  </div>

                  <div className="week-events-list">
                    {dayEvents.length === 0 ? (
                      <div className="week-no-events">{t('no_bookings_day', 'No bookings')}</div>
                    ) : (
                      dayEvents.map((ev, eIdx) => (
                        <div 
                          key={eIdx}
                          className={`week-event-card ${ev.isGroup ? 'event-group' : 'event-single'} ${getStatusBadgeClass(ev.status)}`}
                          onClick={() => onSelectBooking && onSelectBooking(ev.rawBooking)}
                        >
                          <div className="week-event-header">
                            <span className="week-event-type">
                              {ev.isGroup ? 'Wedding / Group' : 'Individual'}
                            </span>
                            <span className="week-event-status">{ev.status}</span>
                          </div>

                          <h4 className="week-guest-title">{ev.guest_name}</h4>

                          <div className="week-event-details">
                            <div><strong>{ev.floors_display}</strong></div>
                            <div>{ev.beds_count} {ev.beds_count === 1 ? 'Bed' : 'Beds'} {ev.bed_number ? `(${ev.bed_number})` : ''}</div>
                            <div className="week-dates-sub">
                              {ev.check_in_date} → {ev.check_out_date}
                            </div>
                            <div className="week-price-sub">₹{ev.total_amount}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .booking-calendar-wrapper {
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 20px;
          margin-bottom: 24px;
        }
        .calendar-controls-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 16px;
        }
        .cal-title-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .cal-icon-wrap {
          width: 38px;
          height: 38px;
          background: #FAF4EF;
          border: 1px solid #F0D5C7;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cal-heading {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }
        .cal-sub {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .cal-actions-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .nav-buttons-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .today-btn {
          font-weight: 600;
          padding: 4px 10px;
        }
        .cal-status-filter {
          width: auto;
          font-size: 0.82rem;
          padding: 5px 10px;
        }

        /* Monthly Grid */
        .calendar-grid-container {
          width: 100%;
          overflow-x: auto;
        }
        .calendar-day-headers {
          display: grid;
          grid-template-columns: repeat(7, minmax(130px, 1fr));
          background: #FAF9F7;
          border: 1px solid var(--border-subtle);
          border-bottom: none;
          border-radius: var(--radius-sm) var(--radius-sm) 0 0;
        }
        .cal-day-header-cell {
          padding: 10px 8px;
          text-align: center;
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .calendar-cells-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(130px, 1fr));
          border-top: 1px solid var(--border-subtle);
          border-left: 1px solid var(--border-subtle);
        }
        .calendar-cell {
          min-height: 110px;
          border-right: 1px solid var(--border-subtle);
          border-bottom: 1px solid var(--border-subtle);
          padding: 6px;
          background: #FFFFFF;
          display: flex;
          flex-direction: column;
          gap: 4px;
          transition: background 0.15s ease;
        }
        .calendar-cell.other-month {
          background: #FCFBFA;
          opacity: 0.65;
        }
        .calendar-cell.cell-today {
          background: #FFFDF9;
          box-shadow: inset 0 0 0 1.5px #C25E40;
        }
        .cell-date-badge {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-muted);
          padding-bottom: 2px;
        }
        .today-number {
          background: #C25E40;
          color: #FFFFFF;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .cell-count-pill {
          background: #F0EAE1;
          color: var(--text-main);
          font-size: 0.7rem;
          padding: 1px 5px;
          border-radius: 10px;
          font-weight: 700;
        }

        .cell-events-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .cal-event-card {
          padding: 4px 6px;
          border-radius: 4px;
          font-size: 0.72rem;
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
          display: flex;
          flex-direction: column;
          gap: 2px;
          line-height: 1.2;
        }
        .cal-event-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }
        .event-top-line {
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
          overflow: hidden;
        }
        .ev-name {
          text-overflow: ellipsis;
          overflow: hidden;
        }
        .ev-meta-line {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 0.68rem;
          opacity: 0.9;
        }
        .ev-status-text {
          font-size: 0.64rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        /* Status Colors */
        .badge-confirmed {
          background: #E8F5E9;
          border-left: 3px solid #2E7D32;
          color: #1B5E20;
        }
        .badge-checked-in {
          background: #E3F2FD;
          border-left: 3px solid #1976D2;
          color: #0D47A1;
        }
        .badge-checked-out {
          background: #F5F5F5;
          border-left: 3px solid #757575;
          color: #424242;
        }
        .badge-approved {
          background: #FFF8E1;
          border-left: 3px solid #F57F17;
          color: #E65100;
        }
        .badge-pending {
          background: #FFF3E0;
          border-left: 3px solid #FB8C00;
          color: #E65100;
        }
        .badge-rejected, .badge-cancelled {
          background: #FFEBEE;
          border-left: 3px solid #D32F2F;
          color: #B71C1C;
        }

        .cal-more-events {
          font-size: 0.68rem;
          font-weight: 600;
          color: #C25E40;
          text-align: center;
          padding: 2px 0;
        }

        /* Weekly Grid */
        .calendar-week-container {
          width: 100%;
          overflow-x: auto;
        }
        .calendar-week-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(160px, 1fr));
          gap: 12px;
        }
        .week-column {
          background: #FAF9F7;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          min-height: 400px;
        }
        .week-col-today {
          border-color: #C25E40;
          background: #FFFDF9;
        }
        .week-header-cell {
          padding: 10px;
          text-align: center;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .week-day-name {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .week-day-num {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .today-pill {
          background: #C25E40;
          color: #FFFFFF;
          padding: 0 8px;
          border-radius: 12px;
        }
        .week-events-list {
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }
        .week-no-events {
          font-size: 0.75rem;
          color: var(--text-dim);
          text-align: center;
          padding: 20px 0;
        }
        .week-event-card {
          padding: 10px;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(0,0,0,0.06);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .week-event-card:hover {
          transform: translateY(-2px);
        }
        .week-event-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.68rem;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .week-guest-title {
          font-size: 0.85rem;
          font-weight: 700;
          margin: 0 0 6px 0;
          color: var(--text-main);
        }
        .week-event-details {
          font-size: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .week-dates-sub {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .week-price-sub {
          font-weight: 700;
          color: #C25E40;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
