import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Sparkles, 
  DollarSign, 
  BedDouble, 
  Layers, 
  Phone, 
  User, 
  Mail, 
  FileText 
} from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n';

export default function GroupBookingModal({ isOpen, onClose, onSuccess, initialFloor = null }) {
  const { t } = useLanguage();
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [eventName, setEventName] = useState('Wedding / Family Stay');
  const [notes, setNotes] = useState('');

  // Dates: default tomorrow to day after tomorrow
  const getTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const getDayAfter = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  };

  const [checkInDate, setCheckInDate] = useState(getTomorrow());
  const [checkOutDate, setCheckOutDate] = useState(getDayAfter());

  // Floors selection: [1], [2], [3]
  const [selectedFloors, setSelectedFloors] = useState(() => initialFloor ? [initialFloor] : [1]);

  // Payment
  const [isConfirmed, setIsConfirmed] = useState(true);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  // Preview state
  const [allBeds, setAllBeds] = useState([]);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdGroup, setCreatedGroup] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchBedsAvailability();
      setCreatedGroup(null);
      setErrorMsg('');
    }
  }, [isOpen, checkInDate, checkOutDate]);

  const fetchBedsAvailability = async () => {
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) return;
    setLoadingBeds(true);
    try {
      const res = await api.beds.list({ check_in: checkInDate, check_out: checkOutDate });
      setAllBeds(res || []);
    } catch (err) {
      console.error('Failed to load beds for dates:', err);
    } finally {
      setLoadingBeds(false);
    }
  };

  if (!isOpen) return null;

  const toggleFloor = (fl) => {
    if (selectedFloors.includes(fl)) {
      if (selectedFloors.length === 1) return; // Keep at least one
      setSelectedFloors(selectedFloors.filter((f) => f !== fl));
    } else {
      setSelectedFloors([...selectedFloors, fl].sort());
    }
  };

  const selectEntireProperty = () => {
    setSelectedFloors([1, 2, 3]);
  };

  // Calculate available & unavailable beds on selected floors
  const bedsOnSelectedFloors = allBeds.filter((b) => selectedFloors.includes(b.floor_number));
  const availableBeds = bedsOnSelectedFloors.filter((b) => b.is_available_for_dates === true);
  const unavailableBeds = bedsOnSelectedFloors.filter((b) => b.is_available_for_dates === false);

  const nights = (checkInDate && checkOutDate && checkOutDate > checkInDate)
    ? Math.max(Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)), 1)
    : 1;

  const totalCalculatedAmount = availableBeds.reduce(
    (sum, b) => sum + (b.base_price_inr * nights),
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) {
      setErrorMsg('Please enter guest or family coordinator name.');
      return;
    }
    if (!guestPhone.trim()) {
      setErrorMsg('Please enter a contact phone number.');
      return;
    }
    if (availableBeds.length === 0) {
      setErrorMsg('No beds are currently available on the selected floor(s) for these dates.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim(),
        guest_email: guestEmail.trim() || null,
        event_name: eventName.trim() || 'Group / Wedding Stay',
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        floors: selectedFloors,
        notes: notes.trim() || null,
        is_confirmed: isConfirmed,
        paid_amount: paidAmount ? parseFloat(paidAmount) : (isConfirmed ? totalCalculatedAmount : 0.0),
        payment_method: paymentMethod
      };

      const groupRes = await api.bookings.createGroup(payload);
      setCreatedGroup(groupRes);
      if (onSuccess) onSuccess(groupRes);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create group booking. Please check dates and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window modal-wide animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="title-with-icon">
            <div className="icon-badge">
              <Users size={22} color="#C25E40" />
            </div>
            <div>
              <h3>{t('group_booking_title', 'Bulk Floor / Group / Wedding Booking')}</h3>
              <p className="modal-subtitle">
                {t('group_booking_subtitle', 'Reserve entire floors or the entire 16-bed property in one action with automatic available bed allocation.')}
              </p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {createdGroup ? (
          /* Success Screen */
          <div className="group-success-card">
            <div className="success-icon-wrap">
              <CheckCircle2 size={54} color="#2D6A4F" />
            </div>
            <h3>{t('group_confirmed_title', 'Group Booking Confirmed Successfully!')}</h3>
            <p className="success-desc">
              All <strong>{createdGroup.total_beds_assigned} {t('nav_beds', 'Beds')}</strong> {t('group_confirmed_sub', 'beds on selected floor(s) have been reserved under master code:')}
            </p>
            <div className="master-code-badge">{createdGroup.group_code}</div>

            <div className="success-grid">
              <div>
                <span>{t('event_name_label', 'Event / Group')}:</span>
                <strong>{createdGroup.event_name}</strong>
              </div>
              <div>
                <span>{t('full_name_label', 'Primary Guest')}:</span>
                <strong>{createdGroup.guest_name} ({createdGroup.guest_phone})</strong>
              </div>
              <div>
                <span>{t('dates_label', 'Stay Dates')}:</span>
                <strong>{createdGroup.check_in_date} to {createdGroup.check_out_date} ({createdGroup.nights} {createdGroup.nights === 1 ? t('night_singular', 'Night') : t('night_plural', 'Nights')})</strong>
              </div>
              <div>
                <span>{t('total_amount_label', 'Total Fare')}:</span>
                <strong className="text-primary">₹{createdGroup.total_amount}</strong>
              </div>
            </div>

            <div className="assigned-beds-list">
              <h4>{t('assigned_beds_label', 'Assigned Beds')} ({createdGroup.assigned_beds.length}):</h4>
              <div className="bed-tags-row">
                {createdGroup.assigned_beds.map((b) => (
                  <span key={b.booking_id} className="bed-tag">
                    {t('bed_label', 'Bed')} {b.bed_number} ({t('floor_label', 'Floor')} {b.floor_number}) • ₹{b.total_amount}
                  </span>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                }}
              >
                {t('close_view_bookings', 'Close & View Bookings')}
              </button>
            </div>
          </div>
        ) : (
          /* Booking Form */
          <form onSubmit={handleSubmit} className="group-booking-form">
            {errorMsg && (
              <div className="error-banner">
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Floor & Date Selector */}
            <div className="form-section-box">
              <h4 className="section-title">
                <Layers size={17} color="#C25E40" />
                {t('step_1_floors_dates', '1. Select Floors & Stay Dates')}
              </h4>

              <div className="floor-quick-selectors">
                <button
                  type="button"
                  className={`floor-select-btn ${selectedFloors.includes(1) ? 'active' : ''}`}
                  onClick={() => toggleFloor(1)}
                >
                  {t('floor_1_label', 'Floor 1 (5 Beds)')}
                </button>
                <button
                  type="button"
                  className={`floor-select-btn ${selectedFloors.includes(2) ? 'active' : ''}`}
                  onClick={() => toggleFloor(2)}
                >
                  {t('floor_2_label', 'Floor 2 (6 Beds)')}
                </button>
                <button
                  type="button"
                  className={`floor-select-btn ${selectedFloors.includes(3) ? 'active' : ''}`}
                  onClick={() => toggleFloor(3)}
                >
                  {t('floor_3_label', 'Floor 3 (5 Beds)')}
                </button>
                <button
                  type="button"
                  className={`floor-select-btn property-btn ${selectedFloors.length === 3 ? 'active' : ''}`}
                  onClick={selectEntireProperty}
                >
                  <Sparkles size={14} /> {t('entire_property_label', 'Entire Property (All 16 Beds)')}
                </button>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label className="form-label">{t('check_in_date_label', 'Check-In Date')}</label>
                  <input
                    type="date"
                    className="form-input"
                    value={checkInDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">{t('check_out_date_label', 'Check-Out Date')}</label>
                  <input
                    type="date"
                    className="form-input"
                    value={checkOutDate}
                    min={checkInDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Automatic bed allocation summary preview */}
              <div className="allocation-preview-strip">
                <div className="alloc-stat">
                  <span>{t('selected_floors_stat', 'Selected Floors')}:</span>
                  <strong>{t('floor_label', 'Floor')} {selectedFloors.join(', ')}</strong>
                </div>
                <div className="alloc-stat">
                  <span>{t('available_beds_stat', 'Available Beds')}:</span>
                  <strong className="text-success">{availableBeds.length} / {bedsOnSelectedFloors.length} {t('nav_beds', 'Beds')}</strong>
                </div>
                <div className="alloc-stat">
                  <span>{t('duration_label', 'Duration')}:</span>
                  <strong>{nights} {nights === 1 ? t('night_singular', 'Night') : t('night_plural', 'Nights')}</strong>
                </div>
                <div className="alloc-stat total-stat">
                  <span>{t('estimated_total_stat', 'Estimated Total')}:</span>
                  <strong className="text-primary">₹{totalCalculatedAmount}</strong>
                </div>
              </div>

              {unavailableBeds.length > 0 && (
                <div className="unavailable-warning">
                  <AlertCircle size={15} color="#D97706" />
                  <span>
                    Note: {unavailableBeds.length} bed(s) on selected floor(s) are already reserved for these dates: {' '}
                    {unavailableBeds.map((b) => b.bed_number).join(', ')}. Only available beds will be assigned.
                  </span>
                </div>
              )}
            </div>

            {/* 2. Group / Guest Details */}
            <div className="form-section-box">
              <h4 className="section-title">
                <User size={17} color="#C25E40" />
                {t('step_2_guest_details', '2. Event & Primary Guest Details')}
              </h4>

              <div className="form-row-2">
                <div className="form-field">
                  <label className="form-label">{t('event_name_label', 'Event / Group Name')}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Sharma Family Wedding, Trekking Club"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">{t('full_name_label', 'Coordinator / Guest Name')} *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rajesh Sharma"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label className="form-label">{t('phone_label', 'Phone Number (WhatsApp)')} *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">{t('email_label', 'Email Address')}</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="guest@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">{t('special_requests_label', 'Special Requests / Notes')}</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="e.g. Late check-in after wedding reception, luggage storage required"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* 3. Payment & Confirmation */}
            <div className="form-section-box">
              <h4 className="section-title">
                <CreditCard size={17} color="#C25E40" />
                {t('step_3_payment', '3. Payment & Confirmation')}
              </h4>

              <div className="form-row-3">
                <div className="form-field">
                  <label className="form-label">{t('booking_status_label', 'Booking Status')}</label>
                  <select
                    className="form-select"
                    value={isConfirmed ? 'CONFIRMED' : 'PENDING'}
                    onChange={(e) => setIsConfirmed(e.target.value === 'CONFIRMED')}
                  >
                    <option value="CONFIRMED">{t('confirmed_res', 'Confirmed Reservation')}</option>
                    <option value="PENDING">{t('pending_hold', 'Hold / Pending Advance')}</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">{t('advance_paid_label', 'Advance Paid Amount (₹)')}</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder={`e.g. ${totalCalculatedAmount}`}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">{t('payment_mode_label', 'Payment Mode')}</label>
                  <select
                    className="form-select"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">{t('cash_settlement', 'Cash at Reception')}</option>
                    <option value="UPI">{t('upi_id_label', 'UPI')} Transfer</option>
                    <option value="CARD">{t('card_method', 'Credit/Debit Card')}</option>
                    <option value="NETBANKING">NetBanking Transfer</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="modal-footer-strip">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                {t('cancel_btn', 'Cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || availableBeds.length === 0}
              >
                {submitting ? t('submitting', 'Allocating Beds & Reserving...') : `${t('confirm_bulk_btn', 'Confirm Bulk Group Reservation')} (${availableBeds.length} ${t('nav_beds', 'Beds')} • ₹${totalCalculatedAmount})`}
              </button>
            </div>
          </form>
        )}

        <style>{`
          .modal-wide {
            max-width: 780px;
            width: 95%;
          }
          .title-with-icon {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .icon-badge {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            background: rgba(194, 94, 64, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .modal-subtitle {
            margin: 2px 0 0 0;
            font-size: 0.85rem;
            color: var(--text-secondary);
          }
          .group-booking-form {
            display: flex;
            flex-direction: column;
            gap: 18px;
            margin-top: 14px;
          }
          .form-section-box {
            background: #FFFFFF;
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            padding: 16px 18px;
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .section-title {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 600;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .floor-quick-selectors {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .floor-select-btn {
            background: var(--bg-primary);
            border: 1px solid var(--border-subtle);
            padding: 8px 14px;
            border-radius: var(--radius-md);
            font-size: 0.88rem;
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition);
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .floor-select-btn:hover {
            border-color: var(--primary);
            color: var(--primary);
          }
          .floor-select-btn.active {
            background: #C25E40;
            color: #FFFFFF;
            border-color: #C25E40;
            font-weight: 600;
          }
          .floor-select-btn.property-btn.active {
            background: #2D6A4F;
            border-color: #2D6A4F;
          }
          .allocation-preview-strip {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
            background: #FAF8F5;
            border: 1px solid #EFEAE1;
            border-radius: var(--radius-sm);
            padding: 12px 14px;
          }
          .alloc-stat {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .alloc-stat span {
            font-size: 0.76rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .alloc-stat strong {
            font-size: 0.95rem;
          }
          .unavailable-warning {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #FEF3C7;
            border: 1px solid #FDE68A;
            border-radius: var(--radius-sm);
            padding: 8px 12px;
            font-size: 0.82rem;
            color: #92400E;
          }
          .form-row-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }
          .form-row-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 14px;
          }
          @media (max-width: 640px) {
            .form-row-2, .form-row-3 {
              grid-template-columns: 1fr;
            }
          }
          .modal-footer-strip {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding-top: 10px;
            border-top: 1px solid var(--border-subtle);
          }
          .group-success-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 24px 16px;
            gap: 14px;
          }
          .master-code-badge {
            background: #FAF4EF;
            border: 1px solid #F0D5C7;
            color: #C25E40;
            font-family: monospace;
            font-size: 1.25rem;
            font-weight: 700;
            padding: 6px 18px;
            border-radius: 8px;
            letter-spacing: 0.05em;
          }
          .success-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background: var(--bg-primary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            padding: 16px;
            width: 100%;
            text-align: left;
            margin-top: 6px;
          }
          .assigned-beds-list {
            width: 100%;
            text-align: left;
          }
          .assigned-beds-list h4 {
            margin: 0 0 8px 0;
            font-size: 0.9rem;
            color: var(--text-secondary);
          }
          .bed-tags-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .bed-tag {
            background: #FFFFFF;
            border: 1px solid var(--border-subtle);
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.8rem;
            color: var(--text-primary);
          }
        `}</style>
      </div>
    </div>
  );
}
