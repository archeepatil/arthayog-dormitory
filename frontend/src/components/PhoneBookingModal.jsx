import React, { useState } from 'react';
import { PhoneCall, Calendar, BedDouble, User, CreditCard, X } from 'lucide-react';
import { useLanguage } from '../i18n.jsx';

export default function PhoneBookingModal({ isOpen, onClose, beds, onSubmit }) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [bedId, setBedId] = useState(beds[0]?.id || '');
  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState('499');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        bed_id: parseInt(bedId),
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        guest_name: guestName,
        guest_phone: guestPhone,
        guest_email: guestEmail || undefined,
        paid_amount: paidAmount ? parseFloat(paidAmount) : 0,
        payment_method: paymentMethod,
        is_confirmed: parseFloat(paidAmount || 0) > 0,
        notes: notes || undefined
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-container phone-booking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <PhoneCall size={20} color="#C25E40" />
            {t('phone_booking', 'Phone Booking')} / {t('call_frontdesk_btn', 'Front Desk Reservation')}
          </h3>
          <button className="btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="form-layout">
          <div className="form-group">
            <label className="form-label">{t('full_name_label', 'Guest Full Name')} *</label>
            <input 
              type="text" 
              required 
              className="form-input" 
              placeholder={t('name_placeholder', 'e.g. Ramesh Kumar')}
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">{t('phone_label', 'Phone Number')} *</label>
              <input 
                type="tel" 
                required 
                className="form-input" 
                placeholder={t('phone_placeholder', '+91 98765 43210')}
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('email_label', 'Email Address')}</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder={t('email_placeholder', 'name@example.com')}
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('select_bed_btn', 'Select Dormitory Bed')} *</label>
            <select 
              className="form-select" 
              value={bedId} 
              onChange={(e) => setBedId(e.target.value)}
            >
              {beds.map((b) => (
                <option key={b.id} value={b.id}>
                  {t('bed_label', 'Bed')} {b.bed_number} — {t('floor_label', 'Floor')} {b.floor_number} (₹{b.base_price_inr}{t('per_night_short', '/night')}) — [{t(`status_${b.status.toLowerCase()}`, b.status)}]
                </option>
              ))}
            </select>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">{t('check_in_date_label', 'Check-In Date')} *</label>
              <input 
                type="date" 
                required 
                className="form-input"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('check_out_date_label', 'Check-Out Date')} *</label>
              <input 
                type="date" 
                required 
                className="form-input"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">{t('payment_mode_label', 'Payment Channel')}</label>
              <select 
                className="form-select" 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="CASH">{t('cash_settlement', 'Cash at Front Desk')}</option>
                <option value="UPI">Direct UPI / QR Transfer</option>
                <option value="CARD">{t('card_method', 'Credit / Debit Card')}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('paid_label', 'Amount Collected')} (₹)</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('special_requests_label', 'Reservation Notes')}</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder={t('notes_placeholder', 'e.g. Wedding party, late arrival requested')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="modal-actions-grid">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('cancel_btn', 'Cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('submitting', 'Creating...') : t('proceed_to_payment', 'Record & Confirm Reservation')}
            </button>
          </div>
        </form>

        <style>{`
          .phone-booking-modal {
            max-width: 520px;
          }
          .form-layout {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .form-grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .modal-actions-grid {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 10px;
            margin-top: 10px;
          }
        `}</style>
      </div>
    </div>
  );
}
