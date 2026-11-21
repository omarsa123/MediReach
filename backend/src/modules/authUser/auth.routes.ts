import { Router } from "express";
import { AuthController } from "./authcontroller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const authRouter = Router();

// 1. الأساسيات
authRouter.post("/register", AuthController.registerUser);
authRouter.post("/login", AuthController.login);
authRouter.post("/logout", AuthController.logout);
authRouter.post("/refresh", AuthController.refresh);

// 2. إدارة كلمات المرور
authRouter.post("/forget-password", AuthController.forgotPassword);
authRouter.post("/reset-password", AuthController.resetPassword);

// 3. تأكيد البريد الإلكتروني + فتح التطبيق من لينك الإيميل
authRouter.post("/verify-email", AuthController.verifyEmail);
authRouter.get("/verify-email", AuthController.verifyEmail);
authRouter.get("/open-app", AuthController.openAppFromEmail);
authRouter.post("/resend-verification", AuthController.resendVerification);

// 4. بيانات المستخدم الحالي
authRouter.get("/me", requireAuth, AuthController.me);
authRouter.patch("/me", requireAuth, AuthController.updateMe);

// 5. مصادقة جوجل (Google OAuth)
authRouter.get("/google-url", AuthController.getGoogleAuthUrl);
authRouter.post("/google/callback", AuthController.googleCallback);

export { authRouter };
