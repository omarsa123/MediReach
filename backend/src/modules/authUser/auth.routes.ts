import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import {
  requireAuth,
  authorizeRoles,
} from "../../middleware/auth.middleware.js";

const authRouter = Router();

// 1. الأساسيات
authRouter.post("/register", AuthController.register);
authRouter.post("/login", AuthController.login);
authRouter.post("/refresh", AuthController.refreshToken);
authRouter.post("/refresh-token", AuthController.refreshToken);

// 2. إدارة كلمات المرور والـ OTP (يدعم الـ Formats الشائعة لضمان التوافق مع الفرونت)
authRouter.post("/forgot-password", AuthController.forgotPassword);
authRouter.post("/forget-password", AuthController.forgotPassword);
authRouter.post("/verify-reset-otp", AuthController.verifyResetPasswordOtp);
authRouter.post(
  "/verify-reset-password-otp",
  AuthController.verifyResetPasswordOtp,
);
authRouter.post("/reset-password", AuthController.resetPasswordWithOtp);
authRouter.post("/reset-password-otp", AuthController.resetPasswordWithOtp);


// 3. تأكيد البريد الإلكتروني والـ OTP
authRouter.post("/verify-email", AuthController.verifyEmailOtp);
authRouter.get("/verify-email", AuthController.verifyEmailOtp);
authRouter.post("/verify-email-otp", AuthController.verifyEmailOtp);
authRouter.post("/resend-verification", AuthController.resendVerification);

// 4. مصادقة جوجل (Google OAuth)
authRouter.get("/google-url", AuthController.getGoogleAuthUrl);
authRouter.get("/google/url", AuthController.getGoogleAuthUrl);
authRouter.post("/google/exchange", AuthController.exchangeGoogleCode);
authRouter.post("/google/callback", AuthController.googleCallback);
authRouter.get("/google/callback", AuthController.googleCallback);

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
