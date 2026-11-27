import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, X } from 'lucide-react';
import medreachLogo from '../../assets/medreach.png';
import { useAuth } from '../../hooks/useAuth';
import {
  getSavedLoginEmails,
  markEmailVerified,
  removeSavedLoginEmail,
  saveLoginEmail,
} from '../../services/authService';
import { isValidEmail } from '../../utils/validators';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // States for Custom Email Autocomplete
  const [savedEmails, setSavedEmails] = useState(() => getSavedLoginEmails());
  const [showEmailList, setShowEmailList] = useState(false);

  const filteredEmails = savedEmails.filter((savedEmail) => {
    const q = email.trim().toLowerCase();
    return !q || String(savedEmail).toLowerCase().includes(q);
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });
    setLoading(true);

    const normalizedEmail = email.trim();
    if (isValidEmail(normalizedEmail)) {
      setSavedEmails(saveLoginEmail(normalizedEmail));
    }

    try {
      const result = await login({
        email: normalizedEmail,
        password,
        allowedRoles: ['admin', 'organization'],
      });

      const actualRole = String(result?.user?.role || '').toLowerCase();
      if (actualRole !== 'admin' && actualRole !== 'organization') {
        setAlert({
          type: 'error',
          message: 'Access denied. Only Admin and Organization accounts can log in here.',
        });
        return;
      }

      setAlert({ type: 'success', message: 'Login successful! Redirecting...' });

      setTimeout(() => {
        navigate(actualRole === 'admin' ? '/admin-dashboard' : '/org-dashboard', { replace: true });
      }, 1000);
    } catch (error) {
      const targetEmail = error?.data?.email || normalizedEmail;
      if (error?.code === 'EMAIL_NOT_VERIFIED' && targetEmail) {
        setAlert({
          type: 'error',
          message: 'Please verify your email first. Redirecting to OTP verification...',
        });
        setTimeout(() => {
          navigate('/verify-otp', {
            state: { email: targetEmail, mode: 'verify', fromLogin: true },
          });
        }, 1000);
        return;
      }

      if (error?.code === 'ACCOUNT_PENDING' && targetEmail) {
        markEmailVerified(targetEmail);
      }
      setAlert({ type: 'error', message: error.message || 'Login failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        
        {/* Left Panel */}
        <div className="brand-panel">
          <div className="brand-overlay" />
          <div className="brand-content">
            <div className="logo-wrapper">
              <img src={medreachLogo} alt="MedReach Logo" className="brand-logo" />
            </div>
            <h1 className="brand-name">MedReach</h1>
          </div>

          <svg className="brand-wave" viewBox="0 0 500 120" preserveAspectRatio="none">
            <path d="M0,40 C150,120 350,0 500,80 L500,120 L0,120 Z" fill="rgba(19, 108, 114, 0.25)" />
            <path d="M0,70 C180,20 320,110 500,50 L500,120 L0,120 Z" fill="rgba(19, 108, 114, 0.4)" />
          </svg>
        </div>

        {/* Right Panel */}
        <div className="form-panel">
          <div className="form-header">
            <h2>Welcome Back!</h2>
            <p>Log in to your MedReach account</p>
          </div>

          {alert.message && (
            <div className={`alert ${alert.type}`}>
              {alert.message}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} autoComplete="off">
            
            {/* Custom Email Input */}
            <div className="input-group relative-group">
              <span className="input-icon">
                <Mail size={18} />
              </span>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="new-password"
                onFocus={() => {
                  if (savedEmails.length > 0) setShowEmailList(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowEmailList(false), 200);
                }}
                required
              />
              
              {/* القائمة المخصصة */}
              {showEmailList && filteredEmails.length > 0 && (
                <ul className="custom-email-list">
                  {filteredEmails.map((savedEmail) => (
                    <li
                      key={savedEmail}
                      className="custom-email-item"
                      onMouseDown={() => {
                        setEmail(savedEmail);
                        setShowEmailList(false);
                      }}
                    >
                      <span>{savedEmail}</span>
                      <button
                        type="button"
                        className="custom-email-remove"
                        aria-label={`Remove ${savedEmail}`}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setSavedEmails(removeSavedLoginEmail(savedEmail));
                        }}
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Password Input */}
            <div className="input-group">
              <span className="input-icon">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label="Toggle Password"
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>

            {/* Form Options (Forgot Password Only) */}
            <div className="form-options options-end">
              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="primary-btn" disabled={loading}>
              <span>{loading ? 'Logging in...' : 'Log In'}</span>
            </button>
          </form>

          <div className="register-footer">
            <p>
              Don't have an account?
              <Link to="/signup" className="register-link-btn">
                Register
              </Link>
            </p>
          </div>

          <div className="heartbeat-footer">
            <svg viewBox="0 0 300 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10 20 H105 L112 8 L120 32 L127 14 L132 20 H140"
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M150 28 C150 28 141 21 141 15.5 C141 12.5 143.5 10.5 146 10.5 C148 10.5 149.5 11.8 150 13 C150.5 11.8 152 10.5 154 10.5 C156.5 10.5 159 12.5 159 15.5 C159 21 150 28 150 28 Z"
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
              <path
                d="M160 20 H168 L173 14 L180 32 L188 8 L195 20 H290"
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
}