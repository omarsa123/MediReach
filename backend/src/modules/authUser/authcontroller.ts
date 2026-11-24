import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { successResponse, errorResponse } from "../../utils/response.utils.js";
import { AuthService } from "./auth.service.js";
import { UserModel } from "../../modules/user/user.model.js";
import { toPublicUser } from "../../utils/response.utils.js";

export class AuthController {
  // 1. Register
  static registerUser = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const result = await AuthService.register(req.body);
      res
        .status(201)
        .json(
          successResponse(
            result,
            "Account created successfully. Please verify your email with the OTP sent.",
          ),
        );
    },
  );

  // 2. Login
  static login = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const result = await AuthService.login(req.body);
      res.json(successResponse(result, "Logged in successfully"));
    },
  );

  // Clean Orphans Quick Endpoint Handler
  static cleanOrphansQuick = catchAsync(
    async (_req: Request, res: Response): Promise<void> => {
      const result = await AuthService.cleanOrphanUsers();
      res.json(successResponse(result, "All orphan users wiped successfully!"));
    },
  );

  // Google Auth URL (frontend calls GET /api/v1/auth/google-url)
  static getGoogleAuthUrl = catchAsync(
    async (_req: Request, res: Response): Promise<void> => {
      const url = await AuthService.getGoogleAuthUrl();
      res.json(successResponse({ url }, "Google auth URL generated"));
    },
  );

  // 3. Logout
  static logout = catchAsync(
    async (_req: Request, res: Response): Promise<void> => {
      res.json(successResponse(null, "Logged out successfully"));
    },
  );

  // 4. Refresh Token
  static refresh = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const result = await AuthService.refreshToken(req.body.refreshToken);
      res.json(successResponse(result, "Session refreshed"));
    },
  );

  // 5. Forgot Password
  static forgotPassword = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      await AuthService.forgotPassword(req.body.email);
      res.json(
        successResponse(
          null,
          "If an account with that email exists, a password reset OTP has been sent.",
        ),
      );
    },
  );

  // 6. Reset Password (OTP)
  static resetPassword = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { email, otp, newPassword, password } = req.body;
      await AuthService.resetPasswordWithOtp(
        email,
        otp,
        newPassword || password,
      );
      res.json(successResponse(null, "Password has been reset successfully"));
    },
  );

  // 7. Verify Email (OTP)
  static verifyEmail = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const email = req.body.email || (req.query.email as string) || undefined;
      const otp = req.body.otp || (req.query.otp as string) || undefined;

      if (!email || !otp) {
        res
          .status(400)
          .json(errorResponse("email and otp are required", "MISSING_FIELDS"));
        return;
      }

      const result = await AuthService.verifyEmailOtp(email, otp);
      res.json(successResponse(result, "Email verified successfully"));
    },
  );

  // 8. Resend Verification
  static resendVerification = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      await AuthService.resendVerification(req.body.email);
      res.json(successResponse(null, "Verification OTP has been resent."));
    },
  );

  // 9. Me
  static me = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json(errorResponse("Not authenticated", "UNAUTHORIZED"));
      return;
    }
    res.json(successResponse({ user: toPublicUser(user) }));
  });

  // 10. Update Me
  static updateMe = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const updated = await UserModel.updateProfile(user.userId, req.body);

      if (!updated) {
        res.status(404).json(errorResponse("User not found", "NOT_FOUND"));
        return;
      }

      res.json(
        successResponse(
          { user: toPublicUser(updated) },
          "Profile updated successfully",
        ),
      );
    },
  );

  static hardDelete = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { email } = req.body;
      const result = await AuthService.hardDeleteUser(email);
      res.json(successResponse(result, "User hard deleted successfully"));
    },
  );

  // 12. Google Callback
  // 12. Google Callback (Supports both API POST and Browser Redirect)
  static googleCallback = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      // دعم الاستقبال من الـ Body أو الـ Query Parameters (الراجعة من توجيه جوجل)
      const accessToken =
        req.body.accessToken || req.query.access_token || req.query.accessToken;
      const refreshToken =
        req.body.refreshToken ||
        req.query.refresh_token ||
        req.query.refreshToken;

      if (!accessToken) {
        res
          .status(400)
          .json(errorResponse("accessToken is required", "MISSING_TOKENS"));
        return;
      }

      const result = await AuthService.googleCallback(
        String(accessToken),
        String(refreshToken || ""),
      );

      // لو الطلب جاي من بروزر (عشان نرجع جوه التطبيق)
      if (req.method === "GET" || req.query.mobile === "true") {
        const scheme = (process.env.APP_DEEP_LINK_SCHEME || "medreach").replace(
          /:\/\/$/,
          "",
        );
        const deepLink = `${scheme}://auth/success?accessToken=${result.session.accessToken}&refreshToken=${result.session.refreshToken}`;

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(`<!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>تسجيل الدخول - MedReach</title>
          <script>
            window.location.href = ${JSON.stringify(deepLink)};
            setTimeout(function() {
              window.close();
            }, 1000);
          </script>
        </head>
        <body style="font-family:Arial;text-align:center;padding-top:50px;">
          <h2>تم تسجيل الدخول بنجاح! جاري العودة للتطبيق...</h2>
          <a href="${deepLink}" style="display:inline-block;padding:10px 20px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;margin-top:20px;">اضغط هنا للعودة للتطبيق</a>
        </body>
        </html>`);
        return;
      }

      res.json(successResponse(result, "Google authentication successful"));
    },
  );
  /**
   * 13. Open App from Email Link
   * GET /api/v1/auth/open-app?type=verify|reset&email=...&otp=...
   */
  static openAppFromEmail = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const type = String(req.query.type || "verify");
      const email = String(req.query.email || "");
      const otp = String(req.query.otp || "");

      if (!email || !otp) {
        res
          .status(400)
          .send(
            "<h2>Invalid link</h2><p>Missing email or OTP. Please request a new email.</p>",
          );
        return;
      }

      const scheme = (process.env.APP_DEEP_LINK_SCHEME || "medreach").replace(
        /:\/\/$/,
        "",
      );

      const path = type === "reset" ? "reset_password" : "email_verification";

      const deepLink = `${scheme}://${path}?email=${encodeURIComponent(
        email,
      )}&otp=${encodeURIComponent(otp)}`;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MedReach - Opening app...</title>
  <style>
    body { font-family: Arial, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#f8fafc; color:#0f172a; }
    .card { background:#fff; padding:28px 24px; border-radius:16px; box-shadow:0 8px 30px rgba(15,23,42,.08); max-width:420px; text-align:center; }
    h1 { font-size:20px; margin:0 0 8px; }
    p { color:#64748b; font-size:14px; line-height:1.5; }
    a.btn { display:inline-block; margin-top:18px; background:#0d9488; color:#fff; text-decoration:none; padding:12px 22px; border-radius:10px; font-weight:700; }
    .otp { font-size:28px; font-weight:700; letter-spacing:6px; margin:16px 0; color:#0f172a; }
  </style>
  <script>
    window.location.href = ${JSON.stringify(deepLink)};
    setTimeout(function() {
      document.getElementById('fallback').style.display = 'block';
    }, 1400);
  </script>
</head>
<body>
  <div class="card">
    <h1>جاري فتح تطبيق MedReach...</h1>
    <p>لو التطبيق ما اتفتحش تلقائي، اضغط الزر بالأسفل.</p>
    <div class="otp">${otp}</div>
    <div id="fallback" style="display:none">
      <a class="btn" href="${deepLink}">فتح التطبيق</a>
      <p style="margin-top:16px;font-size:12px;word-break:break-all;color:#94a3b8">${deepLink}</p>
    </div>
  </div>
</body>
</html>`);
    },
  );
}
