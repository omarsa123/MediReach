import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import medreachLogo from '../../assets/medreach.png';
import {
  markEmailVerified,
  resendOtp,
  sendPasswordResetEmail,
  verifyEmailOtp,
  verifyResetOtp,
} from '../../services/authService';
import './Auth.css';

export default function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentEmail = location.state?.email || '';
  const mode = location.state?.mode === 'reset' ? 'reset' : 'verify';
  const fromLogin = Boolean(location.state?.fromLogin);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  // العداد (60 ثانية، أو 0 لو جاي من محاولة Login لإتاحة الإرسال فوراً)
  const [timer, setTimer] = useState(fromLogin ? 0 : 60);
  const [resendLoading, setResendLoading] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!currentEmail) {
      navigate(mode === 'reset' ? '/forgot-password' : '/signup', { replace: true });
    }
  }, [currentEmail, mode, navigate]);

  // تشغيل العداد التنازلي
  useEffect(() => {
    const interval = timer > 0 && setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (e, index) => {
    const { value } = e.target;
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1].focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1].focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');

    if (otpCode.length < 6) {
      setAlert({ type: 'error', message: 'Please enter the 6-digit code.' });
      return;
    }

    setLoading(true);
    setAlert({ type: '', message: '' });

    try {
      if (mode === 'reset') {
        await verifyResetOtp(currentEmail, otpCode);
        setAlert({
          type: 'success',
          message: 'OTP verified! Redirecting to set your new password...',
        });
        setTimeout(() => {
          navigate('/reset-password', {
            state: { email: currentEmail, otp: otpCode },
            replace: true,
          });
        }, 1000);
      } else {
        const result = await verifyEmailOtp(currentEmail, otpCode);
        markEmailVerified(currentEmail);
        const status = String(result?.user?.status || '').toLowerCase();
        setAlert({
          type: 'success',
          message:
            status === 'active'
              ? 'Email verified successfully! Redirecting...'
              : 'Email verified! Your account is now awaiting administrator approval.',
        });
        setTimeout(() => navigate('/login', { replace: true }), 1800);
      }
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Invalid or expired OTP.' });
    } finally {
      setLoading(false);
    }
  };

  // دالة إعادة إرسال الـ OTP
  const handleResendOtp = async () => {
    if (timer > 0) return;
    setResendLoading(true);
    setAlert({ type: '', message: '' });

    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(currentEmail);
      } else {
        await resendOtp(currentEmail);
      }
      setAlert({ type: 'success', message: 'A new OTP has been sent to your email.' });
      setOtp(['', '', '', '', '', '']);
      setTimer(60);
      inputRefs.current[0]?.focus();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to resend OTP.' });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      className="auth-wrapper"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafb', minHeight: '100vh' }}
    >
      <div
        style={{
          background: '#ffffff',
          padding: '48px 40px',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
          width: '100%',
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          border: '1px solid #e2e8f0',
        }}
      >
        <img src={medreachLogo} alt="MedReach Logo" style={{ width: '70px', marginBottom: '24px' }} />
        <h2 style={{ fontSize: '26px', fontWeight: '700', color: '#1e293b', margin: '0 0 12px 0' }}>
          {mode === 'reset' ? 'Verify Reset Code' : 'Verify Your Email'}
        </h2>

        <p style={{ fontSize: '15px', color: '#64748b', textAlign: 'center', margin: '0 0 28px 0', lineHeight: '1.6' }}>
          We sent a 6-digit code to <br />
          <strong style={{ color: '#006F76' }}>{currentEmail}</strong>
        </p>

        {alert.message && (
          <div className={`alert ${alert.type}`} style={{ width: '100%', marginBottom: '20px' }}>
            {alert.message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '24px' }}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                style={{
                  width: '54px',
                  height: '64px',
                  fontSize: '28px',
                  textAlign: 'center',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  backgroundColor: '#F5FAFB',
                  color: '#064D5B',
                  fontWeight: '700',
                  outline: 'none',
                  padding: '0',
                }}
              />
            ))}
          </div>

          <div style={{ textAlign: 'center', marginBottom: '24px', fontSize: '14px', color: '#64748b' }}>
            {timer > 0 ? (
              <span>
                Resend code in <strong style={{ color: '#1e293b' }}>00:{timer < 10 ? `0${timer}` : timer}</strong>
              </span>
            ) : (
              <p style={{ margin: 0 }}>
                Didn&apos;t receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#006F76',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  {resendLoading ? 'Sending...' : 'Resend OTP'}
                </button>
              </p>
            )}
          </div>

          <button
            type="submit"
            className="primary-btn"
            disabled={loading}
            style={{ width: '100%', backgroundColor: '#006F76', borderColor: '#006F76' }}
          >
            <span>{loading ? 'Verifying...' : 'Verify OTP'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
