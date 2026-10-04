import React, { useState } from 'react';
import { UserCheck, ShieldCheck, X } from 'lucide-react';
import { useLanguage } from '../i18n.jsx';

export default function CheckInModal({ isOpen, onClose, booking, onSubmit }) {
  const { t } = useLanguage();
  if (!isOpen || !booking) return null;

  const [idType, setIdType] = useState('AADHAAR');
  const [idNumber, setIdNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(booking.id, {
        guest_id_proof_type: idType,
        guest_id_proof_number: idNumber,
        notes: notes || undefined
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-container checkin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <UserCheck size={20} color="#2D6A4F" />
            {t('check_in_title', 'Guest Check-In')}: {booking.guest_name}
          </h3>
          <button className="btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="form-layout">
          <div className="booking-summary-strip">
            <div>{t('booking_code_label', 'Booking Code')}: <strong className="text-code">{booking.booking_code}</strong></div>
            <div>{t('assigned_bed_label', 'Assigned Bed')}: <strong>{t('bed_label', 'Bed')} {booking.bed?.bed_number || booking.bed_number} ({t('floor_label', 'Floor')} {booking.bed?.floor_number || booking.floor_number})</strong></div>
            <div>{t('dates_label', 'Dates')}: <strong>{booking.check_in_date} to {booking.check_out_date}</strong></div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('id_proof_type_label', 'Government ID Proof Type')} *</label>
            <select 
              className="form-select" 
              value={idType} 
              onChange={(e) => setIdType(e.target.value)}
              required
            >
              <option value="AADHAAR">Aadhaar Card (UIDAI)</option>
              <option value="PAN">PAN Card</option>
              <option value="DRIVING_LICENSE">Driving License</option>
              <option value="PASSPORT">Passport</option>
              <option value="VOTER_ID">Voter ID</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('id_proof_number_label', 'ID Document Number')} *</label>
            <input 
              type="text" 
              required 
              className="form-input" 
              placeholder="e.g. 1234-5678-9012"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('verification_notes_label', 'Verification Notes')}</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder={t('verification_notes_ph', 'ID verified physically with original copy')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="modal-actions-grid">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('cancel_btn', 'Cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('submitting', 'Processing...') : t('complete_checkin_btn', 'Complete Check-In & Mark Bed Occupied')}
            </button>
          </div>
        </form>

        <style>{`
          .checkin-modal {
            max-width: 480px;
          }
          .booking-summary-strip {
            background: var(--bg-secondary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-sm);
            padding: 12px 14px;
            font-size: 0.84rem;
            color: var(--text-body);
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-bottom: 14px;
          }
          .text-code {
            color: var(--primary);
            font-family: var(--font-mono);
          }
          .form-layout {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .modal-actions-grid {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 10px;
            margin-top: 14px;
          }
        `}</style>
      </div>
    </div>
  );
}
