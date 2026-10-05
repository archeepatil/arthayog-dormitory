import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  ShieldCheck, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n.jsx';

export default function ReceiptModal({ isOpen, onClose, bookingId, initialData }) {
  const { t } = useLanguage();
  const [receipt, setReceipt] = useState(initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && bookingId) {
      loadReceipt();
    }
  }, [isOpen, bookingId]);

  const loadReceipt = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.bookings.getReceipt(bookingId);
      setReceipt(data);
    } catch (err) {
      console.error('Failed to load receipt:', err);
      setError(err.message || 'Failed to load booking receipt.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div 
        className="modal-container receipt-modal-container" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Actions - Hidden during print */}
        <div className="modal-header receipt-actions-header no-print">
          <div className="modal-title">
            <Receipt size={20} color="#C25E40" />
            <span>{t('booking_receipt', 'Booking Invoice / Receipt')}</span>
          </div>
          <div className="receipt-top-actions">
            <button 
              className="btn btn-primary btn-sm btn-print-receipt" 
              onClick={handlePrint}
              disabled={loading || !receipt}
              title="Print or Save as PDF"
            >
              <Printer size={15} />
              <span>{t('print_or_download_receipt', 'Print / Download PDF')}</span>
            </button>
            <button className="btn-ghost" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="receipt-scroll-body">
          {loading && (
            <div className="receipt-loading-box">
              <div className="spinner"></div>
              <p>{t('generating_receipt', 'Generating booking receipt...')}</p>
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!loading && receipt && (
            <div className="receipt-paper" id="printable-receipt">
              {/* Receipt Header Banner */}
              <div className="receipt-banner">
                <div className="property-identity">
                  {receipt.property?.logo_url ? (
                    <img src={receipt.property.logo_url} alt="Logo" className="property-logo" />
                  ) : (
                    <div className="dorm-logo-fallback">AY</div>
                  )}
                  <div className="prop-names">
                    <h2 className="prop-title">{receipt.property?.name || 'Arthayog Dormitory'}</h2>
                    <p className="prop-subtitle">Clean • Safe • Peaceful Hospitality</p>
                    <div className="prop-contact-row">
                      <span className="prop-detail"><MapPin size={12} /> {receipt.property?.address}</span>
                      <span className="prop-detail"><Mail size={12} /> {receipt.property?.email}</span>
                      {receipt.property?.contact_phones?.map((ph, idx) => (
                        <span key={idx} className="prop-detail"><Phone size={12} /> {ph}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="receipt-meta-box">
                  <div className="receipt-number-badge">{receipt.receipt_number}</div>
                  <div className="receipt-date-stamp">
                    <Calendar size={12} />
                    <span>Date: {new Date(receipt.generated_at).toLocaleDateString()}</span>
                  </div>
                  <div className={`receipt-status-pill status-${(receipt.status || '').toLowerCase()}`}>
                    {receipt.status}
                  </div>
                </div>
              </div>

              <div className="receipt-divider"></div>

              {/* Guest & Reservation Info Grid */}
              <div className="receipt-info-grid">
                <div className="receipt-section-block">
                  <h4 className="receipt-block-title">{t('customer_info', 'Customer Information')}</h4>
                  <div className="receipt-data-row">
                    <span className="r-label">{t('guest_name', 'Guest Name')}:</span>
                    <strong className="r-val">{receipt.customer?.name}</strong>
                  </div>
                  <div className="receipt-data-row">
                    <span className="r-label">{t('phone_number', 'Phone')}:</span>
                    <span className="r-val">{receipt.customer?.phone || '—'}</span>
                  </div>
                  <div className="receipt-data-row">
                    <span className="r-label">{t('email_address', 'Email')}:</span>
                    <span className="r-val">{receipt.customer?.email || '—'}</span>
                  </div>
                </div>

                <div className="receipt-section-block">
                  <h4 className="receipt-block-title">{t('reservation_details', 'Reservation Details')}</h4>
                  <div className="receipt-data-row">
                    <span className="r-label">{t('booking_code_label', 'Booking Code')}:</span>
                    <strong className="r-val code-val">#{receipt.booking?.booking_code}</strong>
                  </div>
                  <div className="receipt-data-row">
                    <span className="r-label">{t('booking_type', 'Stay Type')}:</span>
                    <span className="r-val">{receipt.booking?.booking_type}</span>
                  </div>
                  <div className="receipt-data-row">
                    <span className="r-label">{t('stay_period', 'Stay Dates')}:</span>
                    <span className="r-val">{receipt.booking?.check_in_date} → {receipt.booking?.check_out_date}</span>
                  </div>
                  <div className="receipt-data-row">
                    <span className="r-label">{t('timings', 'Timings')}:</span>
                    <span className="r-val">In: {receipt.booking?.check_in_time} | Out: {receipt.booking?.check_out_time}</span>
                  </div>
                </div>
              </div>

              {/* Accommodations Table */}
              <div className="receipt-accommodations-box">
                <h4 className="receipt-block-title">{t('allocated_accommodations', 'Allocated Accommodations')}</h4>
                <div className="accomm-summary-card">
                  <div className="accomm-main-info">
                    <div className="accomm-floor">
                      <span className="accomm-badge">{receipt.booking?.floors}</span>
                      {receipt.booking?.is_group && (
                        <span className="event-tag">{receipt.booking?.event_name || 'Group Booking'}</span>
                      )}
                    </div>
                    <div className="accomm-beds-count">
                      <strong>{receipt.booking?.total_beds}</strong> {receipt.booking?.total_beds === 1 ? 'Bed' : 'Beds'} Assigned
                    </div>
                  </div>
                  <div className="beds-assigned-list">
                    {receipt.booking?.assigned_beds?.map((bed, idx) => (
                      <span key={idx} className="bed-chip">{bed}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment & Charges Breakdown */}
              <div className="receipt-financial-box">
                <h4 className="receipt-block-title">{t('payment_and_billing', 'Payment & Billing Information')}</h4>
                <table className="receipt-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th className="text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>Dormitory Bed Accommodation</strong>
                        <div className="tbl-subtext">
                          {receipt.booking?.floors} • {receipt.booking?.check_in_date} to {receipt.booking?.check_out_date}
                        </div>
                      </td>
                      <td>{receipt.booking?.total_beds} {receipt.booking?.total_beds === 1 ? 'bed' : 'beds'}</td>
                      <td className="text-right">₹{Number(receipt.payment?.total_amount).toFixed(2)}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="tfoot-row total-row">
                      <td colSpan="2"><strong>Total Confirmed Amount:</strong></td>
                      <td className="text-right"><strong>₹{Number(receipt.payment?.total_amount).toFixed(2)}</strong></td>
                    </tr>
                    <tr className="tfoot-row paid-row">
                      <td colSpan="2">
                        <span>Amount Paid</span>
                        {receipt.payment?.is_verified && (
                          <span className="verified-pill"><ShieldCheck size={12} /> Verified</span>
                        )}
                      </td>
                      <td className="text-right text-success">
                        <strong>₹{Number(receipt.payment?.paid_amount).toFixed(2)}</strong>
                      </td>
                    </tr>
                    {receipt.payment?.total_amount > receipt.payment?.paid_amount && (
                      <tr className="tfoot-row balance-row">
                        <td colSpan="2">Balance Due at Check-in:</td>
                        <td className="text-right text-warning">
                          ₹{Number(receipt.payment?.total_amount - receipt.payment?.paid_amount).toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>

                {/* Verified Payment Transaction Meta */}
                <div className="payment-txn-meta">
                  <div className="txn-col">
                    <span className="txn-lbl">Payment Status:</span>
                    <span className={`txn-status status-${(receipt.payment?.payment_status || '').toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                      {receipt.payment?.payment_status}
                    </span>
                  </div>
                  <div className="txn-col">
                    <span className="txn-lbl">Payment Method:</span>
                    <span>{receipt.payment?.payment_method}</span>
                  </div>
                  <div className="txn-col">
                    <span className="txn-lbl">Transaction Reference:</span>
                    <span className="font-mono">{receipt.payment?.transaction_reference}</span>
                  </div>
                  <div className="txn-col">
                    <span className="txn-lbl">Payment Timestamp:</span>
                    <span>{receipt.payment?.payment_date}</span>
                  </div>
                </div>
              </div>

              {/* Terms and Instructions */}
              <div className="receipt-footer-terms">
                <h5>Guest Check-in Instructions:</h5>
                <p>{receipt.property?.rules || 'Valid Government Photo ID (Aadhaar / Voter ID / Passport) is strictly required for all guests at check-in. Standard check-in time is 12:00 PM and check-out is 11:00 AM.'}</p>
                <div className="stamp-watermark">
                  <span>OFFICIAL BOOKING RECEIPT</span>
                  <small>Generated securely by Arthayog Dormitory Management System</small>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="modal-actions-right no-print">
          <button className="btn btn-secondary" onClick={onClose}>
            {t('close', 'Close')}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handlePrint}
            disabled={loading || !receipt}
          >
            <Printer size={16} />
            {t('print_or_download_receipt', 'Print / Download PDF')}
          </button>
        </div>

        <style>{`
          .receipt-modal-container {
            max-width: 720px;
            width: 100%;
            padding: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            max-height: 90vh;
            background: var(--bg-primary);
          }
          .receipt-actions-header {
            padding: 16px 24px;
            border-bottom: 1px solid var(--border-subtle);
            background: var(--bg-surface);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .receipt-top-actions {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .receipt-scroll-body {
            overflow-y: auto;
            padding: 24px;
            background: #F7F5F0;
          }
          .receipt-paper {
            background: #FFFFFF;
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            padding: 32px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
            display: flex;
            flex-direction: column;
            gap: 20px;
            color: #2D2A26;
            font-family: inherit;
          }
          .receipt-banner {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 16px;
          }
          .property-identity {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .property-logo {
            max-height: 56px;
            object-fit: contain;
          }
          .dorm-logo-fallback {
            width: 52px;
            height: 52px;
            border-radius: 8px;
            background: #C25E40;
            color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.4rem;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .prop-title {
            font-family: var(--font-serif);
            font-size: 1.35rem;
            font-weight: 700;
            color: #2D2A26;
            margin: 0;
          }
          .prop-subtitle {
            font-size: 0.78rem;
            color: #716B64;
            margin: 2px 0 6px 0;
          }
          .prop-contact-row {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .prop-detail {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 0.76rem;
            color: #716B64;
          }
          .receipt-meta-box {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 6px;
          }
          .receipt-number-badge {
            background: #FAF4EF;
            border: 1px solid #F0D5C7;
            color: #C25E40;
            font-weight: 700;
            font-size: 0.85rem;
            padding: 4px 10px;
            border-radius: 4px;
            letter-spacing: 0.5px;
          }
          .receipt-date-stamp {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 0.76rem;
            color: #716B64;
          }
          .receipt-status-pill {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
          }
          .receipt-status-pill.status-confirmed,
          .receipt-status-pill.status-checked_in,
          .receipt-status-pill.status-checked_out {
            background: #ECFDF5;
            color: #065F46;
            border: 1px solid #A7F3D0;
          }
          .receipt-status-pill.status-pending_approval,
          .receipt-status-pill.status-approved_payment_pending {
            background: #FFFBEB;
            color: #92400E;
            border: 1px solid #FDE68A;
          }
          .receipt-divider {
            height: 1px;
            background: #EAE6DF;
            margin: 4px 0;
          }
          .receipt-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          @media (max-width: 600px) {
            .receipt-info-grid {
              grid-template-columns: 1fr;
            }
          }
          .receipt-section-block {
            background: #FBF9F6;
            border: 1px solid #EAE6DF;
            border-radius: 6px;
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .receipt-block-title {
            font-size: 0.82rem;
            font-weight: 700;
            color: #C25E40;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
          }
          .receipt-data-row {
            display: flex;
            justify-content: space-between;
            font-size: 0.82rem;
            line-height: 1.4;
          }
          .r-label {
            color: #716B64;
          }
          .r-val {
            color: #2D2A26;
            font-weight: 500;
          }
          .code-val {
            color: #C25E40;
          }
          .receipt-accommodations-box {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .accomm-summary-card {
            background: #FBF9F6;
            border: 1px solid #EAE6DF;
            border-radius: 6px;
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .accomm-main-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .accomm-badge {
            font-weight: 700;
            font-size: 0.88rem;
            color: #2D2A26;
          }
          .event-tag {
            margin-left: 8px;
            font-size: 0.74rem;
            background: #FAF4EF;
            color: #C25E40;
            border: 1px solid #F0D5C7;
            padding: 2px 6px;
            border-radius: 4px;
          }
          .accomm-beds-count {
            font-size: 0.84rem;
            color: #716B64;
          }
          .beds-assigned-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          .bed-chip {
            background: #FFFFFF;
            border: 1px solid #D5CFC7;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.74rem;
            font-weight: 600;
            color: #2D2A26;
          }
          .receipt-financial-box {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .receipt-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.82rem;
          }
          .receipt-table th {
            background: #F1ECE4;
            color: #2D2A26;
            text-align: left;
            padding: 8px 12px;
            font-size: 0.76rem;
            font-weight: 700;
            text-transform: uppercase;
            border-top: 1px solid #EAE6DF;
            border-bottom: 1px solid #EAE6DF;
          }
          .receipt-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #F0EDE8;
          }
          .tbl-subtext {
            font-size: 0.72rem;
            color: #716B64;
            margin-top: 2px;
          }
          .text-right {
            text-align: right;
          }
          .tfoot-row td {
            padding: 8px 12px;
            border-bottom: 1px solid #F0EDE8;
          }
          .total-row {
            background: #FBF9F6;
            font-size: 0.86rem;
          }
          .paid-row {
            background: #FFFFFF;
          }
          .verified-pill {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #ECFDF5;
            color: #065F46;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.68rem;
            font-weight: 700;
            margin-left: 8px;
          }
          .payment-txn-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 12px;
            background: #FBF9F6;
            border: 1px dashed #D5CFC7;
            border-radius: 6px;
            padding: 12px;
            margin-top: 8px;
            font-size: 0.76rem;
          }
          .txn-col {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .txn-lbl {
            font-size: 0.7rem;
            color: #716B64;
            font-weight: 600;
            text-transform: uppercase;
          }
          .receipt-footer-terms {
            border-top: 1px solid #EAE6DF;
            padding-top: 16px;
            font-size: 0.74rem;
            color: #716B64;
            line-height: 1.4;
          }
          .receipt-footer-terms h5 {
            font-size: 0.78rem;
            font-weight: 700;
            color: #2D2A26;
            margin: 0 0 4px 0;
          }
          .stamp-watermark {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px dashed #EAE6DF;
            color: #A39D93;
            font-weight: 700;
            font-size: 0.74rem;
            letter-spacing: 1px;
          }
          .stamp-watermark small {
            font-size: 0.68rem;
            font-weight: 400;
            letter-spacing: normal;
          }

          /* Print Stylesheet */
          @media print {
            body * {
              visibility: hidden;
            }
            .receipt-modal-container,
            .receipt-modal-container * {
              visibility: visible;
            }
            .modal-overlay {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: #FFFFFF !important;
              padding: 0 !important;
            }
            .receipt-modal-container {
              box-shadow: none !important;
              border: none !important;
              max-width: 100% !important;
              width: 100% !important;
              max-height: none !important;
              background: #FFFFFF !important;
            }
            .receipt-scroll-body {
              padding: 0 !important;
              background: #FFFFFF !important;
              overflow: visible !important;
            }
            .receipt-paper {
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
