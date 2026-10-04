import React, { useState } from 'react';
import { LogIn, UserPlus, Shield, X, AlertCircle, Sparkles, Building2, Key } from 'lucide-react';
import { api, setToken, setUser } from '../api';
import { useLanguage } from '../i18n.jsx';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  if (!isOpen) return null;

  const { t } = useLanguage();
  const [mode, setMode] = useState('LOGIN'); // 'LOGIN' or 'REGISTER'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (mode === 'LOGIN') {
        const res = await api.auth.login({ email, password });
        setToken(res.access_token);
        setUser(res.user);
        onAuthSuccess(res.user);
      } else {
        const res = await api.auth.register({
          email,
          password,
          full_name: fullName,
          phone: phone || undefined
        });
        setToken(res.access_token);
        setUser(res.user);
        onAuthSuccess(res.user);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
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
            <div className="alert-box error">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form-fields">
            {mode === 'REGISTER' && (
              <>
                <div className="form-group">
                  <label className="form-label">{t('full_name_label', 'Full Name')}</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Ramesh Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('phone_label', 'Phone Number (Optional)')}</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </>
            )}

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
              {loading ? t('submitting', 'Verifying...') : (mode === 'LOGIN' ? t('nav_sign_in', 'Sign In') : t('sign_up_tab', 'Create Account'))}
            </button>
          </form>



          <div className="auth-toggle-footer">
            {mode === 'LOGIN' ? (
              <span>
                {t('dont_have_account', "Don't have an account?")}{' '}
                <button type="button" className="auth-switch-link" onClick={() => { setMode('REGISTER'); setErrorMsg(''); }}>
                  {t('register_btn', 'Create Guest Account')}
                </button>
              </span>
            ) : (
              <span>
                {t('already_have_account', 'Already have an account?')}{' '}
                <button type="button" className="auth-switch-link" onClick={() => { setMode('LOGIN'); setErrorMsg(''); }}>
                  {t('nav_sign_in', 'Sign In')}
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .auth-modal-card {
          max-width: 480px;
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
          gap: 16px;
        }
        .alert-box.error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          background: var(--danger-light);
          border: 1px solid var(--danger-border);
          color: var(--danger);
          font-size: 0.82rem;
        }


        .auth-divider {
          display: flex;
          align-items: center;
          text-align: center;
          color: var(--text-dim);
          font-size: 0.74rem;
        }
        .auth-divider::before, .auth-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border-subtle);
        }
        .auth-divider span {
          padding: 0 10px;
        }
        .auth-form-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .auth-submit-btn {
          margin-top: 6px;
        }
        .auth-toggle-footer {
          text-align: center;
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .auth-switch-link {
          color: var(--primary);
          font-weight: 700;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
