import { Router } from "express";
import { AuthController } from "./authcontroller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const authRouter = Router();

// 1. الأساسيات
authRouter.post("/register", AuthController.registerUser);
authRouter.post("/login", AuthController.login);
authRouter.post("/logout", requireAuth, AuthController.logout);
authRouter.post("/refresh", AuthController.refresh); // 👈 أضفناه

// 2. إدارة كلمات المرور
authRouter.post("/forget-password", AuthController.forgotPassword);
authRouter.post("/reset-password", AuthController.resetPassword); // 👈 عدلنا المسار بدل "/"

// 3. بيانات المستخدم الحالي
authRouter.get("/me", requireAuth, AuthController.me); // 👈 أضفناه
authRouter.patch("/me", requireAuth, AuthController.updateMe); // 👈 أضفناه لتحديث البروفايل

// 4. مصادقة جوجل (Google OAuth)
authRouter.get("/google-url", AuthController.getGoogleAuthUrl);
authRouter.post("/google/callback", AuthController.googleCallback); // 👈 أضفناه

export { authRouter };
