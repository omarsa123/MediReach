export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EGYPT_PHONE_REGEX = /^01[0125][0-9]{8}$/;
export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{6,}$/;

export function isValidUsername(value) {
  return USERNAME_REGEX.test(String(value || '').trim());
}

export function isValidEmail(value) {
  return EMAIL_REGEX.test(String(value || '').trim());
}

export function isValidEgyptianPhone(value) {
  return EGYPT_PHONE_REGEX.test(String(value || '').trim());
}

export function isStrongPassword(value) {
  return STRONG_PASSWORD_REGEX.test(String(value || ''));
}
