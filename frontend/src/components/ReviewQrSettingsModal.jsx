import React, { useState } from 'react';
import { QrCode, Upload, Link, CheckCircle2, X, Star, Eye, Image } from 'lucide-react';

export default function ReviewQrSettingsModal({ isOpen, onClose, reviewSettings, onSave }) {
  if (!isOpen) return null;

  const [qrImage, setQrImage] = useState(reviewSettings?.review_qr_image || '');
  const [reviewUrl, setReviewUrl] = useState(reviewSettings?.review_url || 'https://g.page/r/arthayog-dormitory/review');
  const [title, setTitle] = useState(reviewSettings?.review_title || 'Review Arthayog Dormitory on Google');
  const [instructions, setInstructions] = useState(reviewSettings?.review_instructions || 'Scan QR code with your smartphone camera to rate our stay & share your feedback');
  const [rating, setRating] = useState(reviewSettings?.review_rating || '4.9');
  const [reviewCount, setReviewCount] = useState(reviewSettings?.review_count || '142');
  const [isEnabled, setIsEnabled] = useState(reviewSettings?.is_enabled ?? true);
  const [loading, setLoading] = useState(false);

  // File upload handler converting image to data URL
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setQrImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Helper to auto-generate QR code from direct URL
  const handleGenerateFromUrl = () => {
    if (!reviewUrl.trim()) return;
    const generated = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(reviewUrl)}&color=0-0-0&bgcolor=255-255-255`;
    setQrImage(generated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        review_qr_image: qrImage,
        review_url: reviewUrl,
        review_title: title,
        review_instructions: instructions,
        review_rating: rating,
        review_count: reviewCount,
        is_enabled: isEnabled
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="modal-card review-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="title-row">
            <QrCode size={20} color="#C25E40" />
            <h3 className="modal-title">Configure Guest Review QR Code</h3>
          </div>
          <button className="btn btn-ghost btn-sm modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body settings-form">
          <div className="qr-preview-panel">
            <div className="qr-box">
              {qrImage ? (
                <img src={qrImage} alt="Review QR Code Preview" className="qr-preview-img" />
              ) : (
                <div className="no-qr">
                  <QrCode size={40} color="#A8A29E" />
                  <span>No QR Configured</span>
                </div>
              )}
            </div>

            <div className="qr-meta-preview">
              <h4>Live User Page Preview</h4>
              <div className="stars-strip">
                <span className="stars-gold">★★★★★</span>
                <strong>{rating} / 5.0</strong>
                <span>({reviewCount} reviews)</span>
              </div>
              <p className="preview-text">{instructions}</p>
              <label className="checkbox-toggle">
                <input 
                  type="checkbox" 
                  checked={isEnabled} 
                  onChange={(e) => setIsEnabled(e.target.checked)} 
                />
                <span>Display Review QR on Guest Portal</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Review Headline</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="form-input" 
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Google Maps / Review Page URL</label>
            <div className="input-with-action">
              <input 
                type="url" 
                value={reviewUrl} 
                onChange={(e) => setReviewUrl(e.target.value)} 
                placeholder="https://g.page/r/..." 
                className="form-input" 
                required
              />
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={handleGenerateFromUrl}
                title="Generate QR code from URL"
              >
                Auto-Generate QR
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Upload Custom QR Code Image</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileUpload} 
              className="form-input file-input"
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Displayed Rating (e.g. 4.9)</label>
              <input 
                type="text" 
                value={rating} 
                onChange={(e) => setRating(e.target.value)} 
                className="form-input" 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Review Count (e.g. 142)</label>
              <input 
                type="text" 
                value={reviewCount} 
                onChange={(e) => setReviewCount(e.target.value)} 
                className="form-input" 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Guest Instructions</label>
            <textarea 
              rows="2" 
              value={instructions} 
              onChange={(e) => setInstructions(e.target.value)} 
              className="form-input" 
            />
          </div>

          <div className="modal-actions-right">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save & Publish to User Page'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .review-modal-card {
          max-width: 580px;
          width: 90%;
        }
        .title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .title-row h3 {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .qr-preview-panel {
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
        }
        .qr-box {
          width: 110px;
          height: 110px;
          background: #FFFFFF;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          flex-shrink: 0;
        }
        .qr-preview-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .no-qr {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          font-size: 0.65rem;
          color: var(--text-dim);
          text-align: center;
        }
        .qr-meta-preview {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .qr-meta-preview h4 {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .stars-strip {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .stars-gold {
          color: var(--accent-gold);
          letter-spacing: 1px;
        }
        .preview-text {
          font-size: 0.78rem;
          color: var(--text-body);
        }
        .checkbox-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-main);
          margin-top: 6px;
          cursor: pointer;
        }
        .input-with-action {
          display: flex;
          gap: 8px;
        }
        .input-with-action input {
          flex: 1;
        }
        .file-input {
          padding: 6px 10px;
        }
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .modal-actions-right {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
}
