import { api } from './api';

const SESSION_KEYS = ['medreach_token', 'medreach_refresh_token', 'medreach_user'];
const UNVERIFIED_EMAILS_KEY = 'medreach_unverified_emails';
const SAVED_EMAILS_KEY = 'medreach_saved_emails';

export function getSavedLoginEmails() {
  try {
    const list = JSON.parse(localStorage.getItem(SAVED_EMAILS_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveLoginEmail(email) {
  const trimmed = String(email || '').trim();
  if (!trimmed) return getSavedLoginEmails();
  const normalized = trimmed.toLowerCase();
  const next = [
    trimmed,
    ...getSavedLoginEmails().filter((item) => String(item).toLowerCase() !== normalized),
  ].slice(0, 8);
  localStorage.setItem(SAVED_EMAILS_KEY, JSON.stringify(next));
  return next;
}

export function removeSavedLoginEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const next = getSavedLoginEmails().filter((item) => String(item).toLowerCase() !== normalized);
  localStorage.setItem(SAVED_EMAILS_KEY, JSON.stringify(next));
  return next;
}

function getUnverifiedEmailSet() {
  try {
    const list = JSON.parse(localStorage.getItem(UNVERIFIED_EMAILS_KEY) || '[]');
    return new Set(Array.isArray(list) ? list.map((e) => String(e).toLowerCase()) : []);
  } catch {
    return new Set();
  }
}

export function markEmailUnverified(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return;
  const set = getUnverifiedEmailSet();
  set.add(normalized);
  localStorage.setItem(UNVERIFIED_EMAILS_KEY, JSON.stringify([...set]));
}

export function markEmailVerified(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return;
  const set = getUnverifiedEmailSet();
  set.delete(normalized);
  localStorage.setItem(UNVERIFIED_EMAILS_KEY, JSON.stringify([...set]));
}

export function isEmailUnverified(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return normalized ? getUnverifiedEmailSet().has(normalized) : false;
}

export function getStoredToken() {
  return localStorage.getItem('medreach_token');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('medreach_user') || 'null');
  } catch {
    return null;
  }
}

export function saveSession({ user, session }) {
  if (session?.accessToken) {
    localStorage.setItem('medreach_token', session.accessToken);
  }
  if (session?.refreshToken) {
    localStorage.setItem('medreach_refresh_token', session.refreshToken);
  }
  if (user) {
    localStorage.setItem('medreach_user', JSON.stringify(user));
  }
}

export function clearSession() {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
}

export async function signUpOrganization(userData) {
  return api.post('/auth/register', userData, { auth: false });
}

export async function verifyEmailOtp(email, otp) {
  return api.post('/auth/verify-email', { email, otp }, { auth: false });
}

export async function loginWithRole({ email, password, expectedRole, allowedRoles }) {
  const result = await api.post('/auth/login', { email, password }, { auth: false });
  const actualRole = String(result?.user?.role || '').toLowerCase();
  if (expectedRole && actualRole !== expectedRole) {
    throw new Error(
      `This account is registered as ${actualRole || 'another role'}, not ${expectedRole}.`
    );
  }
  if (allowedRoles?.length && !allowedRoles.includes(actualRole)) {
    throw new Error(
      `Access denied. Accounts with role "${actualRole || 'unknown'}" cannot sign in to this portal.`
    );
  }
  const accessToken = result?.session?.accessToken;
  if (!accessToken) throw new Error('The server did not return a valid session.');
  saveSession(result);
  return result;
}

export async function getCurrentUser() {
  return api.get('/auth/me');
}

export async function sendPasswordResetEmail(email) {
  return api.post('/auth/forgot-password', { email }, { auth: false });
}

export async function verifyResetOtp(email, otp) {
  return api.post('/auth/verify-reset-otp', { email, otp }, { auth: false });
}

export async function updateUserPassword(email, otp, newPassword) {
  return api.post('/auth/reset-password', { email, otp, newPassword }, { auth: false });
}

export async function updateEmail() {
  throw new Error('Email change verification is not currently supported by the backend API.');
}

export async function resendOtp(email) {
  return api.post('/auth/resend-verification', { email }, { auth: false });
}
