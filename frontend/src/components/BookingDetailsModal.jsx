import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ClipboardList, 
  X, 
  BedDouble, 
  Calendar, 
  User, 
  IndianRupee, 
  ShieldCheck, 
  CheckCircle2,
  Camera,
  RefreshCw,
  AlertCircle,
  Receipt,
  Eye,
  Check,
  FileCheck,
  Upload,
  Trash2
} from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n.jsx';

export default function BookingDetailsModal({ isOpen, onClose, booking, onOpenReceipt }) {
  const { t } = useLanguage();
  const [photoData, setPhotoData] = useState(null);
  const [capturedAt, setCapturedAt] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedFrame, setCapturedFrame] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [aadhaarMsg, setAadhaarMsg] = useState('');
  const [verifyingAadhaar, setVerifyingAadhaar] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [identityRecord, setIdentityRecord] = useState(null);
  const [aadhaarInput, setAadhaarInput] = useState('');
  const [showVerifyForm, setShowVerifyForm] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Dynamic Callback ref ensures <video> receives stream the exact frame React renders it
  const setVideoRef = useCallback((node) => {
    videoRef.current = node;
    if (node && cameraStream) {
      node.srcObject = cameraStream;
      node.play().catch(err => console.log('Autoplay handled:', err));
    }
  }, [cameraStream]);

  // Secondary hook ensures video stream is re-attached if stream or state changes
  useEffect(() => {
    if (cameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(err => console.log('Video play handled:', err));
    }
  }, [cameraActive, cameraStream]);

  const handleFileCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedFrame(dataUrl);
        stopCamera();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (isOpen && booking) {
      loadGuestPhoto();
      loadIdentity();
      setAadhaarMsg('');
      setPhotoError('');
      setCapturedFrame(null);
      setAadhaarInput(booking.guest_id_proof_number || '');
      setShowVerifyForm(false);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, booking?.id]);

  const loadGuestPhoto = async () => {
    if (!booking?.id) return;
    try {
      const data = await api.bookings.getPhoto(booking.id);
      if (data && data.photo_data) {
        setPhotoData(data.photo_data);
        setCapturedAt(data.captured_at);
      } else {
        setPhotoData(null);
        setCapturedAt(null);
      }
    } catch (err) {
      setPhotoData(null);
      setCapturedAt(null);
    }
  };

  const loadIdentity = async () => {
    if (!booking?.id) return;
    try {
      const rec = await api.bookings.getIdentity(booking.id);
      if (rec && rec.status && rec.status !== 'NOT_VERIFIED') {
        setIdentityRecord(rec);
        if (rec.masked_id) setAadhaarInput(rec.masked_id);
      } else {
        setIdentityRecord(null);
      }
    } catch (err) {
      setIdentityRecord(null);
    }
  };

  const startCamera = async () => {
    setPhotoError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam mediaDevices API is not available on this browser. Please use the "Upload / Device Camera" button below.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      setCameraStream(stream);
      setCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPhotoError('Camera permission was denied in your browser. Please allow camera access in the browser address bar, or use the "Upload / Device Camera" button below.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPhotoError('No physical camera device was detected. Please use the "Upload / Device Camera" button to pick a photo or take one using your device camera.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setPhotoError('Camera is already open in another application or window. Please close other camera apps, or use the "Upload / Device Camera" button below.');
      } else {
        setPhotoError(`Camera notice: ${err.message || 'Check camera permissions'}. You can always use the "Upload / Device Camera" button below.`);
      }
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const snapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedFrame(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedFrame(null);
    startCamera();
  };

  const savePhoto = async () => {
    if (!capturedFrame || !booking?.id) return;
    setUploadingPhoto(true);
    setPhotoError('');
    try {
      await api.bookings.capturePhoto(booking.id, { photo_data: capturedFrame });
      setPhotoData(capturedFrame);
      setCapturedAt(new Date().toISOString());
      setCapturedFrame(null);
    } catch (err) {
      console.error('Failed to save guest photo:', err);
      setPhotoError(err.message || 'Failed to save photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!booking?.id) return;
    if (!window.confirm('Are you sure you want to securely delete this guest photo? This action cannot be undone.')) return;
    setPhotoError('');
    try {
      await api.bookings.deletePhoto(booking.id);
      setPhotoData(null);
      setCapturedAt(null);
    } catch (err) {
      console.error('Failed to delete photo:', err);
      setPhotoError(err.message || 'Failed to delete photo.');
    }
  };

  const handleVerifyAadhaar = async (method = 'OFFLINE_PHYSICAL') => {
    if (!booking?.id) return;
    setVerifyingAadhaar(true);
    setAadhaarMsg('');
    try {
      const numToSend = (aadhaarInput || booking.guest_id_proof_number || '').trim();
      const res = await api.bookings.verifyIdentity(booking.id, {
        aadhaar_number: numToSend,
        verification_method: method
      });
      if (res.status === 'SUCCESS' || res.status === 'VERIFIED') {
        const masked = res.masked_id || (numToSend.length >= 4 ? `XXXX-XXXX-${numToSend.slice(-4)}` : 'XXXX-XXXX-0000');
        setAadhaarMsg(`Identity verified successfully: ${masked} via ${res.verification_method || method}`);
        setIdentityRecord({
          status: 'VERIFIED',
          masked_id: masked,
          verification_method: res.verification_method || method,
          verified_at: res.verified_at || new Date().toISOString()
        });
        setShowVerifyForm(false);
      } else if (res.status === 'NOT_CONFIGURED') {
        setAadhaarMsg('Aadhaar online UIDAI service is not configured. Please use Front Desk Physical / QR Inspection below to verify.');
      } else {
        setAadhaarMsg(res.message || 'Identity verification could not be completed.');
      }
    } catch (err) {
      setAadhaarMsg(err.message || 'Identity verification service error.');
    } finally {
      setVerifyingAadhaar(false);
    }
  };

  if (!isOpen || !booking) return null;

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-container details-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <ClipboardList size={20} color="#C25E40" />
            <span>Reservation #{booking.booking_code}</span>
          </div>
          <button className="btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="details-body">
          {/* Main Booking Details Block */}
          <div className="details-card-block">
            <div className="det-row">
              <span className="det-lbl">Current Status</span>
              <span className={`badge badge-${(booking.status || '').toLowerCase()}`}>{booking.status}</span>
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
              <span className="det-lbl">Stay Duration</span>
              <span>{booking.check_in_date} → {booking.check_out_date}</span>
            </div>

            <div className="det-row">
              <span className="det-lbl">Floor & Accommodation</span>
              <span>
                Floor {booking.bed?.floor_number || booking.floor_number || 1} • Bed {booking.bed?.bed_number || booking.bed_number || booking.bed_id}
                {booking.group_code ? ` (Group: ${booking.event_name || 'Group Stay'})` : ''}
              </span>
            </div>

            {booking.guest_id_proof_type && (
              <div className="det-row">
                <span className="det-lbl">Submitted ID Proof</span>
                <span>{booking.guest_id_proof_type}: {booking.guest_id_proof_number}</span>
              </div>
            )}

            <div className="det-row">
              <span className="det-lbl">Financials</span>
              <span>
                Total: <strong>₹{booking.total_amount_inr || booking.total_amount}</strong> | Paid: <strong>₹{booking.paid_amount || 0}</strong>
              </span>
            </div>

            {booking.rejection_reason && (
              <div className="det-rejection-box">
                <span className="det-lbl text-danger">Rejection Reason</span>
                <p className="rejection-text">{booking.rejection_reason}</p>
              </div>
            )}

            {booking.notes && (
              <div className="det-notes-box">
                <span className="det-lbl">Reservation Notes</span>
                <p className="notes-content">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Official Invoice / Receipt CTA */}
          {['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(booking.status) && onOpenReceipt && (
            <div className="receipt-quick-banner">
              <div className="receipt-banner-info">
                <Receipt size={18} color="#C25E40" />
                <div>
                  <strong>Official Booking Receipt Available</strong>
                  <p>Includes property info, confirmed pricing & transaction verification.</p>
                </div>
              </div>
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={() => {
                  onClose();
                  onOpenReceipt(booking);
                }}
              >
                <Receipt size={14} />
                <span>View Receipt</span>
              </button>
            </div>
          )}

          {/* IDENTITY VERIFICATION & LIVE GUEST PHOTO SECTION (Pages 37-47) */}
          <div className="identity-verification-section">
            <h4>Identity Authentication & Live Guest Photo</h4>

            {/* 1. Aadhaar Verification Flow (Compliant with Pages 37-41 & 47) */}
            <div className="aadhaar-verification-box">
              <div className="aadhaar-header-row">
                <div className="aadhaar-title">
                  <FileCheck size={16} color="#C25E40" />
                  <strong>Aadhaar Identity Verification</strong>
                </div>

                {identityRecord?.status === 'VERIFIED' ? (
                  <span className="badge badge-confirmed">
                    <CheckCircle2 size={13} /> VERIFIED
                  </span>
                ) : (
                  <span className="badge badge-warning">
                    <AlertCircle size={13} /> NOT VERIFIED
                  </span>
                )}
              </div>

              {/* Verified Status Information Card */}
              {identityRecord?.status === 'VERIFIED' ? (
                <div className="aadhaar-verified-details-card">
                  <div className="av-detail-line">
                    <span className="av-lbl">Masked Aadhaar ID:</span>
                    <strong className="av-val font-mono">{identityRecord.masked_id || 'XXXX-XXXX-****'}</strong>
                  </div>
                  <div className="av-detail-line">
                    <span className="av-lbl">Verification Method:</span>
                    <span className="av-val">{identityRecord.verification_method || 'OFFLINE_PHYSICAL'}</span>
                  </div>
                  {identityRecord.verified_at && (
                    <div className="av-detail-line">
                      <span className="av-lbl">Verified On:</span>
                      <span className="av-val">{new Date(identityRecord.verified_at).toLocaleString()}</span>
                    </div>
                  )}
                  <button 
                    type="button" 
                    className="btn btn-ghost btn-sm"
                    style={{ alignSelf: 'flex-start', marginTop: '6px' }}
                    onClick={() => setShowVerifyForm(!showVerifyForm)}
                  >
                    Re-Verify / Update ID
                  </button>
                </div>
              ) : (
                <div className="aadhaar-unverified-prompt">
                  <p className="unverified-text">
                    Guest identity not yet verified. Please inspect original physical Aadhaar or scan mAadhaar QR at front desk.
                  </p>
                  {!showVerifyForm && (
                    <button 
                      type="button" 
                      className="btn btn-primary btn-sm btn-verify-now"
                      onClick={() => setShowVerifyForm(true)}
                    >
                      <ShieldCheck size={14} /> Verify Guest Aadhaar
                    </button>
                  )}
                </div>
              )}

              {/* Interactive Verification Form */}
              {showVerifyForm && (
                <div className="verify-action-form animate-fade-in">
                  <div className="form-group" style={{ marginBottom: '8px' }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>
                      Aadhaar Number or Last 4 Digits (Masked automatically)
                    </label>
                    <input 
                      type="text" 
                      className="form-input font-mono" 
                      placeholder="e.g. 1234 5678 9012 or 9012"
                      value={aadhaarInput}
                      onChange={(e) => setAadhaarInput(e.target.value)}
                    />
                  </div>

                  <div className="verify-options-button-row">
                    <button 
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={verifyingAadhaar}
                      onClick={() => handleVerifyAadhaar('OFFLINE_PHYSICAL')}
                      title="Inspect physical Aadhaar card presented by guest"
                    >
                      <ShieldCheck size={14} />
                      <span>{verifyingAadhaar ? 'Verifying...' : 'Verify Physical Card'}</span>
                    </button>

                    <button 
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={verifyingAadhaar}
                      onClick={() => handleVerifyAadhaar('OFFLINE_QR')}
                      title="Scan UIDAI secure QR code on mAadhaar app or physical letter"
                    >
                      <FileCheck size={14} />
                      <span>Verify mAadhaar QR</span>
                    </button>

                    <button 
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={verifyingAadhaar}
                      onClick={() => handleVerifyAadhaar('AADHAAR_UIDAI')}
                      title="Check UIDAI online API service"
                    >
                      Check Online UIDAI
                    </button>

                    <button 
                      type="button" 
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowVerifyForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {aadhaarMsg && (
                <div className="aadhaar-msg-banner">
                  <AlertCircle size={15} color="#D97706" />
                  <span>{aadhaarMsg}</span>
                </div>
              )}
            </div>

            {/* 2. Live Guest Photo Verification at Check-in */}
            <div className="guest-photo-box">
              <div className="photo-box-header">
                <div className="photo-title">
                  <Camera size={16} color="#059669" />
                  <strong>Live Guest Photo at Check-In</strong>
                </div>
                {!cameraActive && !capturedFrame && (
                  <div className="photo-btn-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      type="button" 
                      className="btn btn-primary btn-sm"
                      onClick={startCamera}
                      title="Open live webcam stream"
                    >
                      <Camera size={14} />
                      <span>{photoData ? 'Retake via Camera' : 'Live Camera'}</span>
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                      title="Snap photo with native device camera or upload image"
                    >
                      <Upload size={14} />
                      <span>Upload / Device Camera</span>
                    </button>
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      accept="image/*" 
                      capture="user" 
                      style={{ display: 'none' }} 
                      onChange={handleFileCapture} 
                    />
                  </div>
                )}
              </div>

              {photoError && (
                <div className="alert alert-error">
                  <AlertCircle size={14} />
                  <span>{photoError}</span>
                </div>
              )}

              {/* Active Camera View */}
              {cameraActive && (
                <div className="camera-live-stream-box">
                  <video 
                    ref={setVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="camera-video-elem" 
                  />
                  <div className="camera-controls">
                    <button type="button" className="btn btn-primary btn-sm" onClick={snapPhoto}>
                      <Camera size={14} /> Snap Photo
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={stopCamera}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Preview of Snapped Frame */}
              {capturedFrame && (
                <div className="photo-preview-wrap">
                  <img src={capturedFrame} alt="Captured preview" className="photo-preview-img" />
                  <div className="preview-controls">
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={savePhoto}
                      disabled={uploadingPhoto}
                    >
                      <Check size={14} /> {uploadingPhoto ? 'Saving...' : 'Save Securely'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={retakePhoto}>
                      <RefreshCw size={14} /> Retake
                    </button>
                  </div>
                </div>
              )}

              {/* Secure Display of Saved Photo */}
              {!cameraActive && !capturedFrame && photoData && (
                <div className="saved-photo-display">
                  <img src={photoData} alt="Verified Guest Photo" className="verified-photo-thumb" />
                  <div className="photo-meta-info">
                    <span className="badge badge-confirmed">
                      <ShieldCheck size={12} /> Live Photo Verified
                    </span>
                    {capturedAt && (
                      <span className="photo-timestamp">
                        Captured: {new Date(capturedAt).toLocaleString()}
                      </span>
                    )}
                    <button 
                      type="button"
                      className="btn btn-ghost btn-sm text-danger"
                      style={{ marginTop: '6px', alignSelf: 'flex-start' }}
                      onClick={handleDeletePhoto}
                      title="Securely delete stored guest photo per retention policy"
                    >
                      <Trash2 size={13} />
                      <span>Delete Photo</span>
                    </button>
                  </div>
                </div>
              )}

              {!cameraActive && !capturedFrame && !photoData && (
                <div className="photo-empty-hint">
                  <span>No live guest photo captured yet. Use camera during front-desk check-in.</span>
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
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
            max-width: 560px;
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
          .det-notes-box, .det-rejection-box {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding-top: 8px;
            border-top: 1px dashed var(--border-subtle);
          }
          .rejection-text {
            font-size: 0.8rem;
            color: #DC2626;
            font-weight: 600;
          }
          .notes-content {
            font-size: 0.8rem;
            color: var(--text-body);
            white-space: pre-line;
          }
          .receipt-quick-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #FAF4EF;
            border: 1px solid #F0D5C7;
            border-radius: 6px;
            padding: 12px 14px;
            gap: 10px;
          }
          .receipt-banner-info {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .receipt-banner-info strong {
            font-size: 0.84rem;
            color: #C25E40;
            display: block;
          }
          .receipt-banner-info p {
            font-size: 0.74rem;
            color: #716B64;
            margin: 0;
          }

          /* Identity & Live Photo */
          .identity-verification-section {
            background: #FFFFFF;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .identity-verification-section h4 {
            font-size: 0.88rem;
            font-weight: 700;
            color: var(--text-main);
            margin: 0;
          }
          .aadhaar-verification-box {
            background: #FDFCF9;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .aadhaar-header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .aadhaar-title {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.82rem;
            color: var(--text-main);
          }
          .aadhaar-verified-details-card {
            background: #F0FDF4;
            border: 1px solid #BBF7D0;
            border-radius: 6px;
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .av-detail-line {
            display: flex;
            justify-content: space-between;
            font-size: 0.8rem;
          }
          .av-lbl {
            color: #166534;
          }
          .av-val {
            color: #14532D;
            font-weight: 600;
          }
          .aadhaar-unverified-prompt {
            display: flex;
            flex-direction: column;
            gap: 8px;
            background: #FFFBEB;
            border: 1px solid #FDE68A;
            border-radius: 6px;
            padding: 10px 12px;
          }
          .unverified-text {
            font-size: 0.78rem;
            color: #92400E;
            margin: 0;
          }
          .btn-verify-now {
            align-self: flex-start;
          }
          .verify-action-form {
            background: #FFFFFF;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .verify-options-button-row {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .aadhaar-msg-banner {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #FFFBEB;
            border: 1px solid #FDE68A;
            border-radius: 4px;
            padding: 8px 10px;
            font-size: 0.78rem;
            color: #92400E;
          }
          .guest-photo-box {
            background: #FDFCF9;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .photo-box-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .photo-title {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.82rem;
            color: var(--text-main);
          }
          .camera-live-stream-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }
          .camera-video-elem {
            width: 100%;
            max-width: 320px;
            height: auto;
            border-radius: 6px;
            border: 1px solid var(--border-subtle);
            background: #000;
          }
          .camera-controls {
            display: flex;
            gap: 8px;
          }
          .photo-preview-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }
          .photo-preview-img {
            max-width: 220px;
            border-radius: 6px;
            border: 1px solid var(--border-subtle);
          }
          .preview-controls {
            display: flex;
            gap: 8px;
          }
          .saved-photo-display {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .verified-photo-thumb {
            width: 64px;
            height: 64px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid #059669;
          }
          .photo-meta-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .photo-timestamp {
            font-size: 0.72rem;
            color: var(--text-muted);
          }
          .photo-empty-hint {
            font-size: 0.76rem;
            color: var(--text-muted);
            font-style: italic;
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
