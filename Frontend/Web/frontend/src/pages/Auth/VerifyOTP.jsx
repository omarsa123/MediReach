import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import medreachLogo from '../../assets/medreach.png';
import { verifyEmailOtp, updateEmail, resendOtp } from '../../services/authService'; // ضفنا resendOtp
import './Auth.css';

export default function VerifyOTP() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // 👈 إضافة حالة العداد (60 ثانية)
  const [timer, setTimer] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);

  const inputRefs = useRef([]);
  const location = useLocation();
  const navigate = useNavigate();

  const [currentEmail, setCurrentEmail] = useState(location.state?.email || '');

  useEffect(() => {
    if (!currentEmail) navigate('/signup');
  }, [currentEmail, navigate]);

  // 👈 تشغيل العداد التنازلي
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
      await verifyEmailOtp(currentEmail, otpCode);
      setAlert({ type: 'success', message: 'Email verified successfully! Redirecting...' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Invalid or expired OTP.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      setAlert({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setUpdateLoading(true);
    setAlert({ type: '', message: '' });

    try {
      await updateEmail(currentEmail, newEmail); 
      setAlert({ type: 'success', message: 'Email updated! A new OTP has been sent.' });
      setCurrentEmail(newEmail);
      setIsChangingEmail(false);
      setNewEmail('');
      setOtp(['', '', '', '', '', '']); 
      setTimer(60); // 👈 إعادة تشغيل العداد لو غير الإيميل
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to update email.' });
    } finally {
      setUpdateLoading(false);
    }
  };

  // 👈 دالة إعادة إرسال الـ OTP
  const handleResendOtp = async () => {
    if (timer > 0) return; // منع الضغط لو العداد شغال
    setResendLoading(true);
    setAlert({ type: '', message: '' });

    try {
      await resendOtp(currentEmail);
      setAlert({ type: 'success', message: 'A new OTP has been sent to your email.' });
      setOtp(['', '', '', '', '', '']); // تفريغ الخانات
      setTimer(60); // إعادة تشغيل العداد لـ 60 ثانية
      inputRefs.current[0]?.focus(); // التركيز على أول خانة
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to resend OTP.' });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafb', minHeight: '100vh' }}>
      <div style={{ background: '#ffffff', padding: '48px 40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)', width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #e2e8f0' }}>
        <img src={medreachLogo} alt="MedReach Logo" style={{ width: '70px', marginBottom: '24px' }} />
        <h2 style={{ fontSize: '26px', fontWeight: '700', color: '#1e293b', margin: '0 0 12px 0' }}>Verify Your Email</h2>
        
        {!isChangingEmail ? (
          <>
            <p style={{ fontSize: '15px', color: '#64748b', textAlign: 'center', margin: '0 0 8px 0', lineHeight: '1.6' }}>
              We sent a 6-digit code to <br/><strong style={{ color: '#006F76' }}>{currentEmail}</strong>
            </p>
            <button type="button" onClick={() => setIsChangingEmail(true)} style={{ background: 'none', border: 'none', color: '#009F9A', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline', marginBottom: '28px', padding: '0' }}>Change email address</button>
          </>
        ) : (
          <form onSubmit={handleEmailUpdate} style={{ width: '100%', marginBottom: '24px' }}>
             <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px', textAlign: 'center' }}>Enter your new email address below:</p>
             <div style={{ display: 'flex', gap: '8px' }}>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="New email address" style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }} required />
                <button type="submit" disabled={updateLoading} style={{ backgroundColor: '#006F76', color: 'white', border: 'none', borderRadius: '8px', padding: '0 16px', fontWeight: '600', cursor: 'pointer' }}>{updateLoading ? 'Wait...' : 'Update'}</button>
             </div>
             <button type="button" onClick={() => setIsChangingEmail(false)} style={{ background: 'none', border: 'none', color: '#7998A1', fontSize: '13px', fontWeight: '500', cursor: 'pointer', marginTop: '12px', width: '100%', textDecoration: 'underline' }}>Cancel</button>
          </form>
        )}

        {alert.message && (
          <div className={`alert ${alert.type}`} style={{ width: '100%', marginBottom: '20px' }}>{alert.message}</div>
        )}

        {!isChangingEmail && (
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '24px' }}>
              {otp.map((digit, index) => (
                <input key={index} ref={(el) => (inputRefs.current[index] = el)} type="text" maxLength="1" value={digit} onChange={(e) => handleChange(e, index)} onKeyDown={(e) => handleKeyDown(e, index)} style={{ width: '54px', height: '64px', fontSize: '28px', textAlign: 'center', border: '2px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#F5FAFB', color: '#064D5B', fontWeight: '700', outline: 'none', padding: '0' }} />
              ))}
            </div>

            {/* 👈 جزء العداد التنازلي وإعادة الإرسال */}
            <div style={{ textAlign: 'center', marginBottom: '24px', fontSize: '14px', color: '#64748b' }}>
              {timer > 0 ? (
                <span>Resend code in <strong style={{ color: '#1e293b' }}>00:{timer < 10 ? `0${timer}` : timer}</strong></span>
              ) : (
                <p style={{ margin: 0 }}>
                  Didn't receive the code?{' '}
                  <button 
                    type="button" 
                    onClick={handleResendOtp}
                    disabled={resendLoading}
                    style={{ background: 'none', border: 'none', color: '#006F76', fontWeight: '600', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                  >
                    {resendLoading ? 'Sending...' : 'Resend OTP'}
                  </button>
                </p>
              )}
            </div>

            <button type="submit" className="primary-btn" disabled={loading} style={{ width: '100%', backgroundColor: '#006F76', borderColor: '#006F76' }}>
              <span>{loading ? 'Verifying...' : 'Verify OTP'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}