import React, { useState } from 'react';
import { Mail, ShieldCheck, X, AlertCircle, Building2, Key, ArrowRight, RotateCw, CheckCircle2 } from 'lucide-react';
import { api, setToken, setUser } from '../api';
import { useLanguage } from '../i18n.jsx';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  if (!isOpen) return null;

  const { t } = useLanguage();
  // Flow: 'OTP' (default modern email OTP) or 'PASSWORD' (traditional password)
  const [authMethod, setAuthMethod] = useState('OTP');
  
  // OTP flow states: 'ENTER_EMAIL' -> 'ENTER_OTP'
  const [otpStep, setOtpStep] = useState('ENTER_EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [otpNotice, setOtpNotice] = useState('');

  // 1. Send OTP to actual email
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setOtpNotice('');

    try {
      const res = await api.auth.sendOtp(email.trim());
      setOtpStep('ENTER_OTP');
      if (res.otp_preview) {
        setOtpNotice(`OTP sent to ${email}. (Login Code: ${res.otp_preview})`);
      } else {
        setOtpNotice(`Verification OTP sent to ${email}. Please check your inbox.`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send OTP. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify OTP and sign in
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otp || otp.trim().length < 4) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.auth.verifyOtp({
        email: email.trim(),
        otp: otp.trim(),
        full_name: fullName.trim() || undefined,
        phone: phone.trim() || undefined
      });
      setToken(res.access_token);
      setUser(res.user);
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Fallback Password Login
  const handlePasswordLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.auth.login({ email: email.trim(), password });
      setToken(res.access_token);
      setUser(res.user);
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetModal = () => {
    setOtpStep('ENTER_EMAIL');
    setOtp('');
    setErrorMsg('');
    setOtpNotice('');
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="auth-brand-header">
            <div className="auth-brand-icon">
              <Building2 size={24} color="#C25E40" />
            </div>
            <div>
              <h3 className="auth-brand-name">{t('app_title', 'Arthayog Dormitory')}</h3>
              <span className="auth-brand-sub">{t('app_tagline', '16-Bed Boutique Stay')}</span>
            </div>
          </div>
          <button 
            className="btn btn-ghost btn-sm modal-close-btn" 
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body auth-modal-body">
          {errorMsg && (
            <div className="alert-box error animate-fade-in">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {otpNotice && (
            <div className="alert-box success animate-fade-in">
              <CheckCircle2 size={16} />
              <span>{otpNotice}</span>
            </div>
          )}

          {/* ================= OTP LOGIN FLOW ================= */}
          {authMethod === 'OTP' && (
            <>
              {otpStep === 'ENTER_EMAIL' ? (
                <form onSubmit={handleSendOtp} className="auth-form-fields">
                  <div className="otp-intro-badge">
                    <Mail size={16} color="#C25E40" />
                    <span>Enter your email to receive a secure login code</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('email_label', 'Email Address')}</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary btn-block btn-lg auth-submit-btn" 
                    disabled={loading || !email}
                  >
                    {loading ? 'Sending OTP Code...' : 'Send Login OTP →'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="auth-form-fields">
                  <div className="otp-email-sent-badge">
                    <span>Code sent to <strong>{email}</strong></span>
                    <button 
                      type="button" 
                      className="btn-edit-email"
                      onClick={handleResetModal}
                    >
                      Change
                    </button>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Enter 6-Digit OTP Code</label>
                    <input 
                      type="text" 
                      maxLength="6"
                      className="form-input otp-digit-input" 
                      placeholder="• • • • • •"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                      autoFocus
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary btn-block btn-lg auth-submit-btn" 
                    disabled={loading || otp.length < 4}
                  >
                    {loading ? 'Verifying OTP...' : 'Verify OTP & Sign In'}
                  </button>

                  <div className="otp-resend-row">
                    <span>Didn't get the code?</span>
                    <button 
                      type="button" 
                      className="auth-switch-link resend-link"
                      onClick={handleSendOtp}
                      disabled={loading}
                    >
                      Resend OTP
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ================= PASSWORD LOGIN FALLBACK ================= */}
          {authMethod === 'PASSWORD' && (
            <form onSubmit={handlePasswordLogin} className="auth-form-fields">
              <div className="form-group">
                <label className="form-label">{t('email_label', 'Email Address')}</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('password_label', 'Password')}</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-block btn-lg auth-submit-btn" 
                disabled={loading}
              >
                {loading ? t('submitting', 'Verifying...') : t('nav_sign_in', 'Sign In with Password')}
              </button>
            </form>
          )}

          {/* Switch between OTP and Password */}
          <div className="auth-toggle-footer">
            {authMethod === 'OTP' ? (
              <button 
                type="button" 
                className="auth-switch-link"
                onClick={() => { setAuthMethod('PASSWORD'); setErrorMsg(''); setOtpNotice(''); }}
              >
                Sign in with Password instead
              </button>
            ) : (
              <button 
                type="button" 
                className="auth-switch-link"
                onClick={() => { setAuthMethod('OTP'); setOtpStep('ENTER_EMAIL'); setErrorMsg(''); setOtpNotice(''); }}
              >
                ← Sign in with Email OTP code
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .auth-modal-card {
          max-width: 440px;
          width: 90%;
        }
        .auth-brand-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .auth-brand-icon {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-md);
          background: var(--primary-light);
          border: 1px solid var(--primary-border);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .auth-brand-name {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .auth-brand-sub {
          font-size: 0.74rem;
          color: var(--text-muted);
        }
        .auth-modal-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .alert-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.82rem;
        }
        .alert-box.error {
          background: var(--danger-light);
          border: 1px solid var(--danger-border);
          color: var(--danger);
        }
        .alert-box.success {
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          color: #047857;
        }
        .otp-intro-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .otp-email-sent-badge {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          font-size: 0.82rem;
          color: var(--text-main);
        }
        .btn-edit-email {
          background: none;
          border: none;
          color: var(--primary);
          font-weight: 600;
          cursor: pointer;
          font-size: 0.78rem;
          text-decoration: underline;
        }
        .otp-digit-input {
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: 6px;
          text-align: center;
          font-family: var(--font-mono, monospace);
        }
        .otp-resend-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .auth-form-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .auth-submit-btn {
          margin-top: 4px;
        }
        .auth-toggle-footer {
          text-align: center;
          font-size: 0.82rem;
          padding-top: 6px;
          border-top: 1px solid var(--border-subtle);
        }
        .auth-switch-link {
          color: var(--primary);
          font-weight: 600;
          cursor: pointer;
          border: none;
          background: none;
        }
        .auth-switch-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

