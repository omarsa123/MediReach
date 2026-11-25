// src/services/authService.js
const API_URL = 'http://localhost:5050/api/v1/auth';

export const signUpOrganization = async (userData) => {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || result.message || 'Failed to register organization');
  return result.data;
};

export const verifyEmailOtp = async (email, otpCode) => {
  const response = await fetch(`${API_URL}/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp: otpCode }),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || result.message || 'Invalid or expired OTP');
  return result.data;
};

export const loginWithRole = async ({ email, password, expectedRole }) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role: expectedRole }),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || result.message || 'Invalid credentials');

  if (result.data?.session?.accessToken) {
    localStorage.setItem('medreach_token', result.data.session.accessToken);
    localStorage.setItem('medreach_refresh_token', result.data.session.refreshToken); // جديد
  }
  return result.data;
};

export const sendPasswordResetEmail = async (email) => {
  const response = await fetch(`${API_URL}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || result.message || 'Failed to send reset link');
  return result.data;
};

export const updateUserPassword = async (email, otp, newPassword) => {
  const response = await fetch(`${API_URL}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, newPassword }),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || result.message || 'Failed to update password');
  return result.data;
};

export const updateEmail = async (oldEmail, newEmail) => {
  const response = await fetch(`${API_URL}/update-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldEmail, newEmail }),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || result.message || 'Failed to update email');
  return result.data;
};

// بنستخدم الراوت الموجود أصلاً في الباك: /resend-verification
export const resendOtp = async (email) => {
  const response = await fetch(`${API_URL}/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || result.message || 'Failed to resend OTP');
  return result.data;
};