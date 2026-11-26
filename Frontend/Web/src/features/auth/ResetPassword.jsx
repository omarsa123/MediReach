import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, Mail, Key } from 'lucide-react';
import medreachLogo from './medreach.png';
import { updateUserPassword, sendPasswordResetEmail } from '../../services/authService'; // ضفنا sendPasswordResetEmail
import './Auth.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  // 👈 إضافة العداد وزرار إعادة الإرسال
  const [timer, setTimer] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);

  // 👈 تشغيل العداد
  useEffect(() => {
    const interval = timer > 0 && setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

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
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to update password. OTP might be expired.' });
    } finally {
      setLoading(false);
    }
  };

  // 👈 دالة إعادة الإرسال
  const handleResend = async () => {
    if (timer > 0 || !email) return;
    setResendLoading(true);
    setAlert({ type: '', message: '' });

    try {
      await sendPasswordResetEmail(email.trim()); // نستخدم نفس API اللي بيبعت إيميل الـ Reset
      setAlert({ type: 'success', message: 'A new OTP has been sent to your email.' });
      setOtp(''); // تفريغ خانة الـ OTP
      setTimer(60); // إعادة تشغيل العداد
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to resend OTP.' });
    } finally {
      setResendLoading(false);
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
            <p>Enter your email, the OTP received, and your new password.</p>
          </div>

          {alert.message && <div className={`alert ${alert.type}`}>{alert.message}</div>}

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="input-group">
              <span className="input-icon"><Mail size={18} /></span>
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                autoComplete="off"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
                required 
              />
            </div>

            <div className="input-group" style={{ marginBottom: '8px' }}>
              <span className="input-icon"><Key size={18} /></span>
              <input 
                type="text" 
                placeholder="6-Digit OTP" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                maxLength={6} 
                autoComplete="off"
                required 
              />
            </div>
            
            {/* 👈 جزء الـ Resend تحت خانة الـ OTP */}
            <div style={{ textAlign: 'right', marginBottom: '16px', fontSize: '13px', color: '#64748b' }}>
              {timer > 0 ? (
                <span>Resend OTP in <strong style={{ color: '#1e293b' }}>00:{timer < 10 ? `0${timer}` : timer}</strong></span>
              ) : (
                <button 
                  type="button" 
                  onClick={handleResend}
                  disabled={resendLoading}
                  style={{ background: 'none', border: 'none', color: '#006F76', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                >
                  {resendLoading ? 'Sending...' : 'Resend OTP'}
                </button>
              )}
            </div>

            <div className="input-group">
              <span className="input-icon"><Lock size={18} /></span>
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
              <span className="input-icon"><Lock size={18} /></span>
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