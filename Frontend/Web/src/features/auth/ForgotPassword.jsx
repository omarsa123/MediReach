import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import medreachLogo from '../../assets/medreach.png';
import { sendPasswordResetEmail } from '../../services/authService';
import './Auth.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });
    setLoading(true);

    try {
      await sendPasswordResetEmail(email.trim());
      setAlert({
        type: 'success',
        message: 'OTP has been sent to your email.',
      });
      
      // التوجيه لصفحة إدخال الـ OTP مع تمرير الإيميل والوضع
      setTimeout(() => {
        navigate('/verify-otp', { state: { email: email.trim(), mode: 'reset' } });
      }, 1500);
      
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.message || 'Failed to send reset link.',
      });
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
            <h2>Forgot Password</h2>
            <p>Enter your email to receive a password reset OTP.</p>
          </div>

          {alert.message && (
            <div className={`alert ${alert.type}`}>
              {alert.message}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="input-group">
              <span className="input-icon">
                <Mail size={18} />
              </span>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: '20px' }}>
              <span>{loading ? 'Sending...' : 'Send Reset OTP'}</span>
            </button>
          </form>

          <div className="register-footer" style={{ marginTop: '30px' }}>
            <Link to="/login" className="register-link-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}