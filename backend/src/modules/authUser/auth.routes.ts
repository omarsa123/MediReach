import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { UserController } from "../user/user.controller.js";
import {
  requireAuth,
  authorizeRoles,
} from "../../middleware/auth.middleware.js";
import { authLimiter, otpLimiter } from "../../middleware/rateLimit.js";

const authRouter = Router();

// 1. الأساسيات
authRouter.post("/register", authLimiter, AuthController.register);
authRouter.post("/login", authLimiter, AuthController.login);
authRouter.post("/refresh-token", AuthController.refreshToken);
authRouter.get("/me", requireAuth, UserController.me);
authRouter.patch("/me", requireAuth, UserController.updateMe);

// 2. إدارة كلمات المرور والـ OTP
authRouter.post("/forgot-password", otpLimiter, AuthController.forgotPassword);
authRouter.post(
  "/verify-reset-otp",
  otpLimiter,
  AuthController.verifyResetPasswordOtp,
);
authRouter.post(
  "/reset-password",
  otpLimiter,
  AuthController.resetPasswordWithOtp,
);

// 3. تأكيد البريد الإلكتروني والـ OTP
authRouter.post("/verify-email", otpLimiter, AuthController.verifyEmailOtp);
authRouter.post(
  "/resend-verification",
  otpLimiter,
  AuthController.resendVerification,
);

// 4. مصادقة جوجل (Google OAuth)
authRouter.get("/google/url", AuthController.getGoogleAuthUrl);
authRouter.post("/google/exchange", AuthController.exchangeGoogleCode);
authRouter.post("/google/callback", AuthController.googleCallback);

// 5. الصيانة والحذف (Admin)
authRouter.post(
  "/hard-delete",
  requireAuth,
  authorizeRoles("admin"),
  AuthController.hardDeleteUser,
);
authRouter.post(
  "/clean-orphans-quick",
  requireAuth,
  authorizeRoles("admin"),
  AuthController.cleanOrphanUsers,
);

export { authRouter };
