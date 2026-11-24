import { Router } from "express";
import { AuthController } from "./authcontroller.js";
import {
  requireAuth,
  authorizeRoles,
} from "../../middleware/auth.middleware.js";

const authRouter = Router();

// 1. Core auth
authRouter.post("/register", AuthController.registerUser);
authRouter.post("/login", AuthController.login);
authRouter.post("/logout", AuthController.logout);
authRouter.post("/refresh", AuthController.refresh);

// 2. Password recovery (both spellings for frontend compatibility)
authRouter.post("/forgot-password", AuthController.forgotPassword);
authRouter.post("/forget-password", AuthController.forgotPassword);
authRouter.post("/reset-password", AuthController.resetPassword);

// 3. Email verification + deep links
authRouter.post("/verify-email", AuthController.verifyEmail);
authRouter.get("/verify-email", AuthController.verifyEmail);
authRouter.get("/open-app", AuthController.openAppFromEmail);
authRouter.post("/resend-verification", AuthController.resendVerification);

// 4. Current user
authRouter.get("/me", requireAuth, AuthController.me);
authRouter.patch("/me", requireAuth, AuthController.updateMe);

// 5. Google OAuth (Supabase used only here)
authRouter.get("/google-url", AuthController.getGoogleAuthUrl);
authRouter.post("/google/callback", AuthController.googleCallback);
// Optional GET for browser redirect flow
authRouter.get("/google/callback", AuthController.googleCallback);

// 6. Admin / maintenance — لازم مصادقة + دور admin فقط
authRouter.post(
  "/hard-delete",
  requireAuth,
  authorizeRoles("admin"),
  AuthController.hardDelete,
);
authRouter.post(
  "/clean-orphans-quick",
  requireAuth,
  authorizeRoles("admin"),
  AuthController.cleanOrphansQuick,
);

export { authRouter };
