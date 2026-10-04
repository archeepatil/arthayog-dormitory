import React, { useState } from 'react';
import { LogOut, Sparkle, X } from 'lucide-react';
import { useLanguage } from '../i18n.jsx';

export default function CheckOutModal({ isOpen, onClose, booking, onSubmit }) {
  const { t } = useLanguage();
  if (!isOpen || !booking) return null;

  const [inspectionNotes, setInspectionNotes] = useState('Locker key returned. Bed in satisfactory order.');
  const [additionalCharges, setAdditionalCharges] = useState('0');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(booking.id, {
        inspection_notes: inspectionNotes,
        additional_charges: parseFloat(additionalCharges || 0)
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-container checkout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <LogOut size={20} color="#C25E40" />
            {t('check_out_title', 'Guest Check-Out')}: {booking.guest_name}
          </h3>
          <button className="btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="form-layout">
          <div className="checkout-summary-strip">
            <div>{t('booking_code_label', 'Booking Code')}: <strong className="text-code">{booking.booking_code}</strong></div>
            <div>{t('bed_to_release', 'Bed to Release')}: <strong>{t('bed_label', 'Bed')} {booking.bed?.bed_number || booking.bed_number} ({t('floor_label', 'Floor')} {booking.bed?.floor_number || booking.floor_number})</strong></div>
            <div className="turnaround-notice">
              <Sparkle size={13} color="#D97706" />
              <span>{t('turnaround_notice', 'Checking out will automatically queue this bed for turnaround cleaning.')}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('inspection_notes_label', 'Inspection & Handover Notes')}</label>
            <textarea 
              rows="2" 
              className="form-textarea"
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
            ></textarea>
          </div>

          <div className="form-group">
            <label className="form-label">{t('extra_charges_label', 'Extra Incidentals / Additional Charges (₹)')}</label>
            <input 
              type="number" 
              step="1" 
              className="form-input"
              value={additionalCharges}
              onChange={(e) => setAdditionalCharges(e.target.value)}
            />
          </div>

          <div className="modal-actions-grid">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('cancel_btn', 'Cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('submitting', 'Processing...') : t('complete_checkout_btn', 'Complete Check-Out & Move Bed to Cleaning')}
            </button>
          </div>
        </form>

        <style>{`
          .checkout-modal {
            max-width: 480px;
          }
          .checkout-summary-strip {
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
          .turnaround-notice {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.78rem;
            color: var(--cleaning);
            font-weight: 600;
            margin-top: 4px;
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
