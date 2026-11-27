import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import medreachLogo from '../../assets/medreach.png';
import { updateUserPassword } from '../../services/authService';
import './Auth.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || '';
  const otp = location.state?.otp || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    if (!email || !otp) {
      navigate('/forgot-password', { replace: true });
    }
  }, [email, otp, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    if (password !== confirmPassword) {
      setAlert({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    if (password.length < 6) {
      setAlert({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);

    try {
      await updateUserPassword(email.trim(), otp.trim(), password);
      setAlert({ type: 'success', message: 'Password updated successfully! Redirecting to login...' });
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to update password. OTP might be expired.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '900px' }}>
        <div className="brand-panel">
          <div className="brand-overlay" />
          <div className="brand-content">
            <div className="logo-wrapper">
              <img src={medreachLogo} alt="MedReach Logo" className="brand-logo" />
            </div>
            <h1 className="brand-name">MedReach</h1>
          </div>
        </div>

        <div className="form-panel">
          <div className="form-header">
            <h2>Set New Password</h2>
            <p>
              Enter your new password for <strong style={{ color: '#006F76' }}>{email}</strong>.
            </p>
          </div>

          {alert.message && <div className={`alert ${alert.type}`}>{alert.message}</div>}

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="input-group">
              <span className="input-icon">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
                required
              />
              <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>

            <div className="input-group">
              <span className="input-icon">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
                required
              />
            </div>

            <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: '10px' }}>
              <span>{loading ? 'Updating...' : 'Update Password'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
