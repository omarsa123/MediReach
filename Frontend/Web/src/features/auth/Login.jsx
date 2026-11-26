import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import medreachLogo from './medreach.png';
import { loginWithRole } from '../../services/authService';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState('organization');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // States for Custom Email Autocomplete
  const [savedEmails, setSavedEmails] = useState(() => {
    try { return JSON.parse(localStorage.getItem('medreach_saved_emails') || '[]'); } catch { return []; }
  });
  const [showEmailList, setShowEmailList] = useState(false);

  const handleRoleSwitch = (selectedRole) => {
    if (role !== selectedRole) {
      setRole(selectedRole);
      setAlert({ type: '', message: '' });
    }
  };

  const handleLoginSubmit = async (e) => {
  e.preventDefault();
  setAlert({ type: '', message: '' });
  setLoading(true);

  try {
    // الدالة بتستقبل object مش قيم منفصلة
    const result = await loginWithRole({
      email: email.trim(),
      password,
      expectedRole: role,
    });

    // حفظ الإيميل في القائمة المخصصة
    const normalizedEmail = email.trim();
    if (normalizedEmail && !savedEmails.includes(normalizedEmail)) {
      const updated = [normalizedEmail, ...savedEmails];
      setSavedEmails(updated);
      localStorage.setItem('medreach_saved_emails', JSON.stringify(updated));
    }

    setAlert({ type: 'success', message: 'Login successful! Redirecting...' });

    // التوجيه حسب الـ role الفعلي الراجع من الباك
    const actualRole = result?.user?.role;
    setTimeout(() => {
      navigate(actualRole === 'admin' ? '/admin-dashboard' : actualRole === 'organization' ? '/org-dashboard' : '/forbidden', { replace: true });
    }, 1000);
  } catch (error) {
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
          
          <div className="role-switch">
            <button
              type="button"
              className={`role-btn ${role === 'organization' ? 'active' : ''}`}
              onClick={() => handleRoleSwitch('organization')}
            >
              Organization
            </button>
            <button
              type="button"
              className={`role-btn ${role === 'admin' ? 'active' : ''}`}
              onClick={() => handleRoleSwitch('admin')}
            >
              Admin
            </button>
          </div>

          <div className="form-header">
            <h2>{role === 'admin' ? 'Admin Portal' : 'Welcome Back!'}</h2>
            <p>
              {role === 'admin'
                ? 'Log in to MedReach administration dashboard'
                : 'Log in to your MedReach organization account'}
            </p>
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
              {showEmailList && savedEmails.length > 0 && (
                <ul className="custom-email-list">
                  {savedEmails.map((savedEmail, idx) => (
                    <li
                      key={idx}
                      className="custom-email-item"
                      onMouseDown={() => {
                        setEmail(savedEmail);
                        setShowEmailList(false);
                      }}
                    >
                      {savedEmail}
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
              <span>{loading ? 'Logging in...' : role === 'admin' ? 'Log In as Admin' : 'Log In'}</span>
            </button>
          </form>

          <div className={`register-footer ${role === 'admin' ? 'invisible' : ''}`}>
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