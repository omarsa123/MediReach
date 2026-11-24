import { Router } from "express";
import { AuthController } from "./authcontroller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const authRouter = Router();

authRouter.post("/register", AuthController.registerUser);
authRouter.post("/login", AuthController.login);
authRouter.post("/logout", AuthController.logout);
authRouter.post("/refresh", AuthController.refresh);

authRouter.post("/forgot-password", AuthController.forgotPassword);
authRouter.post("/forget-password", AuthController.forgotPassword);
authRouter.post("/reset-password", AuthController.resetPassword);
authRouter.post("/verify-reset-otp", AuthController.verifyResetOtp);

authRouter.post("/verify-email", AuthController.verifyEmail);
authRouter.get("/verify-email", AuthController.verifyEmail);
authRouter.get("/open-app", AuthController.openAppFromEmail);
authRouter.post("/resend-verification", AuthController.resendVerification);

authRouter.get("/me", requireAuth, AuthController.me);
authRouter.patch("/me", requireAuth, AuthController.updateMe);

authRouter.get("/google-url", AuthController.getGoogleAuthUrl);
authRouter.get("/google/url", AuthController.getGoogleAuthUrl);
authRouter.post("/google/callback", AuthController.googleCallback);
authRouter.get("/google/callback", AuthController.googleOAuthRedirect);

authRouter.post("/hard-delete", AuthController.hardDelete);
authRouter.post("/clean-orphans-quick", AuthController.cleanOrphansQuick);

export { authRouter };
