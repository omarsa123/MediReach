import rateLimit from "express-rate-limit";

// 1. Limiter صارم لمسارات الـ OTP وتغيير الباسوورد (5 محاولات كل 15 دقيقة)
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "تم تجاوز الحد المسموح من المحاولات، يرجى المحاولة بعد 15 دقيقة.",
    code: "RATE_LIMIT_OTP",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Limiter عام لمسارات تسجيل الدخول والتسجيل (10 محاولات كل 15 دقيقة)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "محاولات كثيرة جداً، يرجى الانتظار قليلاً.",
    code: "RATE_LIMIT_AUTH",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
