import { Router } from "express";
import { AuthController } from "./authcontroller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const authRouter = Router();

// 1. الأساسيات (مع دعم المسارين للتوافق مع الفرونت)
authRouter.post("/register", AuthController.registerUser);
authRouter.post("/login", AuthController.login);
authRouter.post("/logout", AuthController.logout);
authRouter.post("/refresh", AuthController.refresh);

// 2. إدارة كلمات المرور (دعم forget-password و forgot-password)
authRouter.post("/forgot-password", AuthController.forgotPassword);
authRouter.post("/forget-password", AuthController.forgotPassword); // دعم الإملاءين للفرونت
authRouter.post("/reset-password", AuthController.resetPassword);

// 3. تأكيد البريد الإلكتروني والـ OTP
authRouter.post("/verify-email", AuthController.verifyEmail);
authRouter.get("/verify-email", AuthController.verifyEmail);
authRouter.get("/open-app", AuthController.openAppFromEmail);
authRouter.post("/resend-verification", AuthController.resendVerification);

// 4. بيانات المستخدم الحالي
authRouter.get("/me", requireAuth, AuthController.me);
authRouter.patch("/me", requireAuth, AuthController.updateMe);

// 5. مصادقة جوجل (Google OAuth)
authRouter.get("/google-url", AuthController.getGoogleAuthUrl);
authRouter.get("/google/url", AuthController.getGoogleAuthUrl); // دعم المسار الإضافي للفرونت
authRouter.post("/google/callback", AuthController.googleCallback);
authRouter.post("/hard-delete", AuthController.hardDelete);
authRouter.post("/clean-orphans-quick", AuthController.cleanOrphansQuick);

export { authRouter };
