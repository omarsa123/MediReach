import { api } from '../core/api/client';

export async function signUpOrganization(userData) { return api.post('/auth/register', userData, { auth: false }); }
export async function verifyEmailOtp(email, otp) { return api.post('/auth/verify-email', { email, otp }, { auth: false }); }
export async function loginWithRole({ email, password, expectedRole }) {
  const result = await api.post('/auth/login', { email, password }, { auth: false });
  const actualRole = String(result?.user?.role || '').toLowerCase();
  if (expectedRole && actualRole !== expectedRole) {
    throw new Error(`This account is registered as ${actualRole || 'another role'}, not ${expectedRole}.`);
  }
  const accessToken = result?.session?.accessToken;
  if (!accessToken) throw new Error('The server did not return a valid session.');
  localStorage.setItem('medreach_token', accessToken);
  if (result.session.refreshToken) localStorage.setItem('medreach_refresh_token', result.session.refreshToken);
  localStorage.setItem('medreach_user', JSON.stringify(result.user));
  return result;
}
export async function sendPasswordResetEmail(email) { return api.post('/auth/forgot-password', { email }, { auth: false }); }
export async function updateUserPassword(email, otp, newPassword) { return api.post('/auth/reset-password', { email, otp, newPassword }, { auth: false }); }
export async function updateEmail() { throw new Error('Email change verification is not currently supported by the backend API.'); }
export async function resendOtp(email) { return api.post('/auth/resend-verification', { email }, { auth: false }); }
export function clearSession() {
  ['medreach_token', 'medreach_refresh_token', 'medreach_user'].forEach((key) => localStorage.removeItem(key));
}
