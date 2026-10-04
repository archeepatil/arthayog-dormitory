import React, { useState, useEffect } from 'react';
import { CreditCard, ShieldCheck, CheckCircle2, AlertCircle, X, IndianRupee, QrCode } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n.jsx';

export default function PaymentModal({ isOpen, onClose, booking, onSuccess, isStaff = false }) {
  const { t } = useLanguage();
  if (!isOpen || !booking) return null;

  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [orderData, setOrderData] = useState(null);
  const [paymentQr, setPaymentQr] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [step, setStep] = useState('INIT'); // 'INIT', 'ORDER_READY', 'DONE'

  const amountDue = Math.round(booking.total_amount_inr || booking.total_amount || 0) - (booking.paid_amount || 0);

  useEffect(() => {
    async function loadQr() {
      try {
        const qr = await api.settings.getPaymentQr();
        setPaymentQr(qr);
      } catch (err) {
        console.error('Failed to load payment QR:', err);
      }
    }
    if (isOpen) {
      loadQr();
    }
  }, [isOpen]);

  useEffect(() => {
    async function initOrder() {
      setLoading(true);
      setErrorMsg('');
      try {
        const order = await api.payments.createOrder(booking.id, paymentMethod);
        setOrderData(order);
        setStep('ORDER_READY');
      } catch (err) {
        setErrorMsg(err.message || 'Failed to initialize payment gateway order.');
      } finally {
        setLoading(false);
      }
    }

    if (isOpen && booking) {
      initOrder();
    }
  }, [isOpen, booking, paymentMethod]);

  const handleVerifyPayment = async () => {
    if (!orderData) return;
    setVerifying(true);
    setErrorMsg('');

    try {
      const sim = await api.payments.sandboxSimulate(orderData.razorpay_order_id);
      const verified = await api.payments.verify({
        booking_id: booking.id,
        razorpay_order_id: sim.razorpay_order_id,
        razorpay_payment_id: sim.razorpay_payment_id,
        razorpay_signature: sim.razorpay_signature
      });

      setStep('DONE');
      if (onSuccess) onSuccess(verified);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Payment signature verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleRecordCash = async () => {
    setVerifying(true);
    setErrorMsg('');
    try {
      const verified = await api.payments.recordCash({
        booking_id: booking.id,
        amount: amountDue,
        method: 'CASH',
        notes: 'Direct counter settlement'
      });
      setStep('DONE');
      if (onSuccess) onSuccess(verified);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to record cash payment.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-container payment-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="gateway-branding">
            <span className="badge badge-accent">{t('gateway_branding', 'Razorpay Gateway Integration')}</span>
            <h3 className="modal-title">{t('payment_modal_title', 'Settle Reservation Payment')}</h3>
          </div>
          <button className="btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        {errorMsg && (
          <div className="alert-box error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 'DONE' ? (
          <div className="payment-success-box">
            <div className="success-icon-circle">
              <CheckCircle2 size={40} color="#2D6A4F" />
            </div>
            <h3>{t('payment_verified_confirmed', 'Payment Verified & Confirmed!')}</h3>
            <p>{t('payment_verified_sub', 'HMAC-SHA256 signature verified by backend. Booking status transitioned to CONFIRMED.')}</p>
          </div>
        ) : (
          <div className="payment-body">
            <div className="bill-summary-box">
              <div className="bill-row">
                <span>{t('guest_label', 'Guest')}:</span>
                <strong>{booking.guest_name}</strong>
              </div>
              <div className="bill-row">
                <span>{t('booking_code_label', 'Booking Code')}:</span>
                <strong className="code-text">{booking.booking_code}</strong>
              </div>
              <div className="bill-row">
                <span>{t('bed_assignment_label', 'Bed Assignment')}:</span>
                <span>{t('bed_label', 'Bed')} {booking.bed?.bed_number || booking.bed_number} ({t('floor_label', 'Floor')} {booking.bed?.floor_number || booking.floor_number})</span>
              </div>
              <div className="bill-row total">
                <span>{t('total_due_label', 'Total Due')}:</span>
                <strong className="due-amt">₹{amountDue}</strong>
              </div>
            </div>

            {loading ? (
              <div className="loading-gateway">
                {t('creating_order', 'Creating secure payment order...')}
              </div>
            ) : orderData ? (
              <div className="order-details-box">
                <div className="order-meta-info">
                  <div>{t('gateway_order_id', 'Gateway Order ID')}: <code>{orderData.razorpay_order_id}</code></div>
                </div>

                <div className="method-picker">
                  <button 
                    type="button"
                    className={`method-btn ${paymentMethod === 'UPI' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('UPI')}
                  >
                    <QrCode size={15} /> {t('upi_method', 'UPI (GPay / PhonePe / Paytm)')}
                  </button>
                  <button 
                    type="button"
                    className={`method-btn ${paymentMethod === 'CARD' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('CARD')}
                  >
                    <CreditCard size={15} /> {t('card_method', 'Debit / Credit Card')}
                  </button>
                  {isStaff && (
                    <button 
                      type="button"
                      className={`method-btn ${paymentMethod === 'CASH' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('CASH')}
                    >
                      <IndianRupee size={15} /> {t('cash_settlement', 'Cash Settlement')}
                    </button>
                  )}
                </div>

                {paymentMethod === 'UPI' && paymentQr && paymentQr.is_enabled !== false && (
                  <div className="upi-qr-display-box animate-fade-in">
                    <div className="qr-img-wrapper">
                      <img 
                        src={paymentQr.payment_qr_image} 
                        alt="Official UPI QR Code" 
                        className="qr-image" 
                      />
                    </div>
                    <div className="upi-details-strip">
                      <div className="payee-name-badge">{paymentQr.payee_name || 'Arthayog Dormitory'}</div>
                      <div className="upi-id-row">
                        <code>{paymentQr.upi_id || 'arthayog@oksbi'}</code>
                        <button 
                          type="button" 
                          className="btn-copy-upi"
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(paymentQr.upi_id || 'arthayog@oksbi');
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }
                          }}
                        >
                          {copied ? t('copied', 'Copied!') : t('copy_upi', 'Copy UPI')}
                        </button>
                      </div>
                      <small className="qr-instructions">{paymentQr.instructions}</small>
                    </div>
                  </div>
                )}

                <div className="pay-actions-column">
                  {paymentMethod === 'CASH' && isStaff ? (
                    <button 
                      className="btn btn-primary btn-block btn-lg"
                      onClick={handleRecordCash}
                      disabled={verifying}
                    >
                      {verifying ? t('recording_payment', 'Recording...') : `${t('record_cash_btn', 'Record Cash Payment')} (₹${amountDue})`}
                    </button>
                  ) : (
                    <button 
                      className="btn btn-primary btn-block btn-lg"
                      onClick={handleVerifyPayment}
                      disabled={verifying}
                    >
                      <ShieldCheck size={18} />
                      {verifying ? t('verifying_payment', 'Verifying HMAC Signature...') : `${t('pay_and_verify_btn', 'Pay & Verify')} ₹${amountDue}`}
                    </button>
                  )}

                  <div className="compliance-note">
                    <ShieldCheck size={14} color="#2D6A4F" />
                    <span>{t('secure_hmac_note', 'Cryptographic HMAC-SHA256 signature verification enforced on backend')}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <style>{`
          .payment-modal-card {
            max-width: 480px;
          }
          .gateway-branding {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .bill-summary-box {
            background: var(--bg-secondary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-sm);
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            font-size: 0.84rem;
            margin-bottom: 16px;
          }
          .bill-row {
            display: flex;
            justify-content: space-between;
            color: var(--text-body);
          }
          .bill-row.total {
            border-top: 1px solid var(--border-strong);
            padding-top: 8px;
            margin-top: 4px;
            font-size: 1rem;
            font-weight: 700;
          }
          .code-text {
            color: var(--primary);
            font-family: var(--font-mono);
          }
          .due-amt {
            color: var(--primary);
            font-size: 1.2rem;
          }
          .loading-gateway {
            padding: 30px;
            text-align: center;
            color: var(--text-muted);
            font-size: 0.85rem;
          }
          .order-details-box {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .order-meta-info {
            font-size: 0.72rem;
            color: var(--text-muted);
            background: var(--bg-secondary);
            padding: 8px 12px;
            border-radius: var(--radius-sm);
            font-family: var(--font-mono);
          }
          .method-picker {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 8px;
          }
          .method-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px 12px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-sm);
            font-size: 0.78rem;
            font-weight: 600;
            color: var(--text-body);
            transition: var(--transition);
          }
          .method-btn.active {
            color: #FFFFFF;
            background: var(--primary);
            border-color: var(--primary);
          }
          .pay-actions-column {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 6px;
          }
          .compliance-note {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.72rem;
            color: var(--text-muted);
            justify-content: center;
          }
          .payment-success-box {
            padding: 40px 20px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }
          .success-icon-circle {
            width: 60px;
            height: 60px;
            border-radius: var(--radius-full);
            background: var(--success-light);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .payment-success-box h3 {
            font-family: var(--font-serif);
            font-size: 1.3rem;
            color: var(--text-main);
          }
          .upi-qr-display-box {
            display: flex;
            align-items: center;
            gap: 16px;
            background: #FAF8F5;
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-sm);
            padding: 12px;
            margin-bottom: 12px;
          }
          .qr-img-wrapper {
            background: #FFFFFF;
            padding: 6px;
            border-radius: 6px;
            border: 1px solid var(--border-subtle);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .qr-image {
            width: 90px;
            height: 90px;
            object-fit: contain;
            display: block;
          }
          .upi-details-strip {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1;
          }
          .payee-name-badge {
            font-size: 0.82rem;
            font-weight: 600;
            color: var(--text-primary);
          }
          .upi-id-row {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .upi-id-row code {
            font-size: 0.8rem;
            background: #FFFFFF;
            border: 1px solid var(--border-subtle);
            padding: 2px 6px;
            border-radius: 4px;
            color: var(--primary);
            font-weight: 600;
          }
          .btn-copy-upi {
            background: var(--bg-primary);
            border: 1px solid var(--border-subtle);
            font-size: 0.72rem;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 4px;
            cursor: pointer;
            color: var(--text-secondary);
          }
          .btn-copy-upi:hover {
            border-color: var(--primary);
            color: var(--primary);
          }
          .qr-instructions {
            font-size: 0.74rem;
            color: var(--text-secondary);
            line-height: 1.3;
          }
        `}</style>
      </div>
    </div>
  );
}
