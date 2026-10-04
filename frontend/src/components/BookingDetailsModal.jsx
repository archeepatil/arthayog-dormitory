import React from 'react';
import { ClipboardList, X, BedDouble, Calendar, User, IndianRupee, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function BookingDetailsModal({ isOpen, onClose, booking }) {
  if (!isOpen || !booking) return null;

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-container details-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <ClipboardList size={20} color="#C25E40" />
            Reservation #{booking.booking_code}
          </div>
          <button className="btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="details-body">
          <div className="details-card-block">
            <div className="det-row">
              <span className="det-lbl">Current Status</span>
              <span className={`badge badge-${booking.status.toLowerCase()}`}>{booking.status}</span>
            </div>

            <div className="det-row">
              <span className="det-lbl">Guest Name</span>
              <strong>{booking.guest_name}</strong>
            </div>

            <div className="det-row">
              <span className="det-lbl">Contact Phone</span>
              <span>{booking.guest_phone || 'None provided'}</span>
            </div>

            <div className="det-row">
              <span className="det-lbl">Assigned Bed</span>
              <span>Bed {booking.bed?.bed_number || booking.bed_number} (Floor {booking.bed?.floor_number || booking.floor_number})</span>
            </div>

            <div className="det-row">
              <span className="det-lbl">Stay Duration</span>
              <span>{booking.check_in_date} → {booking.check_out_date}</span>
            </div>

            {booking.guest_id_proof_type && (
              <div className="det-row">
                <span className="det-lbl">ID Document</span>
                <span>{booking.guest_id_proof_type}: {booking.guest_id_proof_number}</span>
              </div>
            )}

            <div className="det-row">
              <span className="det-lbl">Financials</span>
              <span>
                Total: <strong>₹{booking.total_amount_inr || booking.total_amount}</strong> | Paid: <strong>₹{booking.paid_amount || 0}</strong>
              </span>
            </div>

            {booking.notes && (
              <div className="det-notes-box">
                <span className="det-lbl">Reservation Notes</span>
                <p className="notes-content">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Payment Receipts */}
          {booking.payments && booking.payments.length > 0 && (
            <div className="payments-receipt-section">
              <h4>Verified Payment Transactions ({booking.payments.length})</h4>
              <div className="receipt-items-list">
                {booking.payments.map((p) => (
                  <div key={p.id} className="receipt-item">
                    <div>
                      <strong>₹{p.amount}</strong> via <span className="p-method">{p.method}</span>
                      <div className="p-date">{new Date(p.created_at).toLocaleString()}</div>
                    </div>
                    <span className="badge badge-confirmed">{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions-right">
            <button className="btn btn-secondary btn-block" onClick={onClose}>
              Close Details
            </button>
          </div>
        </div>

        <style>{`
          .details-modal-card {
            max-width: 520px;
          }
          .details-body {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .details-card-block {
            background: var(--bg-secondary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-sm);
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .det-row {
            display: flex;
            justify-content: space-between;
            font-size: 0.84rem;
            color: var(--text-body);
          }
          .det-lbl {
            font-size: 0.76rem;
            color: var(--text-muted);
            font-weight: 600;
          }
          .det-notes-box {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding-top: 8px;
            border-top: 1px dashed var(--border-subtle);
          }
          .notes-content {
            font-size: 0.8rem;
            color: var(--text-body);
            white-space: pre-line;
          }
          .payments-receipt-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .payments-receipt-section h4 {
            font-size: 0.86rem;
            font-weight: 700;
            color: var(--text-main);
          }
          .receipt-items-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .receipt-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-xs);
            font-size: 0.8rem;
          }
          .p-method {
            font-weight: 700;
            color: var(--primary);
          }
          .p-date {
            font-size: 0.72rem;
            color: var(--text-muted);
          }
        `}</style>
      </div>
    </div>
  );
}
