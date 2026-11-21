import type { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../../config/subabase.js";
import { pool } from "../../config/dbconfig.js";
import { UserModel } from "../../modules/user/user.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { EmailService } from "../../services/email.service.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

/**
 * ==========================================
 * HELPER FUNCTIONS (دوّال مساعدة موحدة للردود)
 * ==========================================
 */

// توحيد شكل استجابة النجاح (Success Response) في كل الـ APIs
export const successResponse = (data: any, message = "Success") => ({
  success: true,
  message,
  data,
});

// توحيد شكل استجابة الخطأ (Error Response) مع إرفاق كود واضح للـ Frontend
export const errorResponse = (error: string, code = "ERROR") => ({
  success: false,
  error,
  code,
});

// تجهيز بيانات المستخدم العامّة لإرجاعها في الـ Response
export const toPublicUser = (user: any) => {
  if (!user) return null;
  const { passwordHash, ...publicData } = user;
  return publicData;
};

// تحويل بيانات الجلسة لـ Tokens (تعديل لإنشاء Access Token و Refresh Token محلي/Supabase)
export const generateLocalTokens = (
  userId: string,
  email: string,
  refreshToken?: string,
) => {
  const secret = process.env.JWT_SECRET || "your_fallback_secret_key";
  const accessToken = jwt.sign(
    { userId, email },
    secret,
    { expiresIn: "1h" }, // مدة صلاحية التوكن ساعة
  );

  const localRefreshToken =
    refreshToken ||
    jwt.sign(
      { userId, email, type: "refresh" },
      secret,
      { expiresIn: "7d" },
    );

  return {
    accessToken,
    refreshToken: localRefreshToken,
    expiresIn: 3600,
    tokenType: "bearer",
  };
};

// التحقق هل الخطأ القادم من قاعدة البيانات هو انتهاك لقيد فريد (Unique Constraint Violation - Duplicate Key)
export const isUniqueViolation = (err: any) => err?.code === "23505";

// ترجمة أخطاء التكرار في قاعدة البيانات لرسائل واضحة يفهمها المستخدم
export const mapUniqueViolationMessage = (err: any) => {
  if (err?.detail?.includes("email")) return "This email is already registered";
  if (err?.detail?.includes("username"))
    return "This username is already taken";
  if (err?.detail?.includes("phone"))
    return "This phone number is already registered";
  return "A record with this value already exists";
};

/**
 * ==========================================
 * AUTH CONTROLLER (مسؤول عن منطق المصادقة بالكامل)
 * ==========================================
 */
export class AuthController {
  /**
   * 1. Register User (تسجيل مستخدم جديد)
   */
  static registerUser = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const body = req.body;

      // توحيد الدور: doctor -> provider, organizer -> organization
      let role = body.role || "patient";
      if (role === "doctor") role = "provider";
      if (role === "organizer") role = "organization";

      // توليد اسم مستخدم تلقائي إذا لم يُرسل
      let username = body.username;
      if (!username || typeof username !== "string" || username.trim() === "") {
        const base = (body.name || body.email?.split("@")[0] || "user")
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "");
        username = `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // فحص هل الإيميل مسجل مسبقاً في قاعدة البيانات
      if (await UserModel.isEmailTaken(body.email)) {
        res
          .status(409)
          .json(
            errorResponse("This email is already registered", "EMAIL_EXISTS"),
          );
        return;
      }

      // فحص هل رقم الهاتف مسجل مسبقاً
      if (await UserModel.isPhoneTaken(body.phone)) {
        res
          .status(409)
          .json(
            errorResponse(
              "This phone number is already registered",
              "PHONE_EXISTS",
            ),
          );
        return;
      }

      // إنشاء المستخدم في نظام الـ Auth الخاص بـ Supabase
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: false, // لازم يفعّل الإيميل قبل ما يستخدم الحساب
          user_metadata: {
            name: body.name,
            username: username,
            phone: body.phone,
          },
        });

      if (authError || !authData.user) {
        res
          .status(400)
          .json(
            errorResponse(
              authError?.message ?? "Failed to create auth user",
              "AUTH_CREATE_FAILED",
            ),
          );
        return;
      }

      const userId = authData.user.id;
      let publicUser: any;

      // إنشاء السجلات المرتبطة في جدول User والجداول الفرعية داخل قاعدة البيانات
      try {
        publicUser = await UserModel.createFromAuth(userId, {
          name: body.name,
          username: username,
          email: body.email,
          password: body.password,
          phone: body.phone,
          address: body.address,
          role: role,
          birthDate: body.birthDate,
          gender: body.gender,
          bloodType: body.bloodType,
          providerType: body.providerType || (role === "provider" ? "Doctor" : undefined),
          specialization: body.specialization,
          licenseNumber: body.licenseNumber,
          organizationName: body.organizationName,
          organizerType: body.organizerType,
          licenseDocumentUrl: body.licenseDocumentUrl,
        });
      } catch (dbError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);

        if (isUniqueViolation(dbError)) {
          res
            .status(409)
            .json(
              errorResponse(
                mapUniqueViolationMessage(dbError),
                "UNIQUE_VIOLATION",
              ),
            );
          return;
        }
        throw dbError;
      }

      // ملاحظة: إيميل التفعيل مش بيتبعت تلقائي عند التسجيل
      // بيتبعت فقط لما المستخدم يدوس على زرار Verify / Resend من شاشة التفعيل

      // محاولة تسجيل الدخول لإصدار التوكنز
      let refreshToken: string | undefined;
      try {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: body.email,
          password: body.password,
        });
        if (signInData?.session?.refresh_token) {
          refreshToken = signInData.session.refresh_token;
        }
      } catch {}

      const tokens = generateLocalTokens(
        publicUser.userId,
        publicUser.email,
        refreshToken,
      );

      res.status(201).json(
        successResponse(
          {
            user: toPublicUser(publicUser),
            session: tokens,
          },
          "Account created successfully",
        ),
      );
    },
  );

  /**
   * 2. Login (تسجيل الدخول)
   */
  static login = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const body = req.body;
      let userId: string | null = null;
      let supabaseRefreshToken: string | null = null;

      // 1. فحص عبر Supabase Auth
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: body.email,
          password: body.password,
        });
        if (!error && data.session && data.user) {
          userId = data.user.id;
          supabaseRefreshToken = data.session.refresh_token;
        }
      } catch {}

      // 2. كبديل: فحص عبر قاعدة البيانات المحلية (Local bcrypt)
      if (!userId) {
        const localUser = await UserModel.findByEmail(body.email);
        if (localUser && localUser.passwordHash) {
          const isMatch = await bcrypt.compare(body.password, localUser.passwordHash);
          if (isMatch) {
            userId = localUser.userId;
          }
        }
      }

      if (!userId) {
        res
          .status(401)
          .json(
            errorResponse(
              "Invalid email or password",
              "INVALID_CREDENTIALS",
            ),
          );
        return;
      }

      // جلب البروفايل العام للمستخدم من قاعدة البيانات
      const publicUser = await UserModel.findById(userId);

      if (!publicUser) {
        res
          .status(401)
          .json(
            errorResponse(
              "User profile not found. Please contact support.",
              "PROFILE_MISSING",
            ),
          );
        return;
      }

      // لو الإيميل لسه متفعّلش → نرجّع كود مخصوص عشان الفرونت يودّي لصفحة التفعيل
      const status = (publicUser.status || "").toString();
      if (status === "Pending" || status === "Unverified" || status === "pending") {
        res.status(403).json({
          success: false,
          error:
            "Please verify your email before signing in. Check your inbox or request a new link.",
          code: "EMAIL_NOT_VERIFIED",
          data: { email: publicUser.email },
        });
        return;
      }

      if (status !== "Active") {
        res
          .status(403)
          .json(
            errorResponse(
              `Account is ${status.toLowerCase()}. Contact support.`,
              "ACCOUNT_INACTIVE",
            ),
          );
        return;
      }

      res.json(
        successResponse(
          {
            user: toPublicUser(publicUser),
            session: generateLocalTokens(
              publicUser.userId,
              publicUser.email,
              supabaseRefreshToken ?? undefined,
            ),
          },
          "Logged in successfully",
        ),
      );
    },
  );

  /**
   * 3. Logout (تسجيل الخروج)
   */
  static logout = catchAsync(
    async (_req: Request, res: Response): Promise<void> => {
      try {
        await supabase.auth.signOut();
      } catch {}
      res.json(successResponse(null, "Logged out successfully"));
    },
  );

  /**
   * 4. Refresh Token (تجديد الجلسة)
   */
  static refresh = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res
          .status(400)
          .json(
            errorResponse("refreshToken is required", "MISSING_REFRESH_TOKEN"),
          );
        return;
      }

      const secret = process.env.JWT_SECRET || "your_fallback_secret_key";

      // 1. تجديد عبر Local JWT
      try {
        const payload = jwt.verify(refreshToken, secret) as { userId: string; email?: string };
        if (payload && payload.userId) {
          const publicUser = await UserModel.findById(payload.userId);
          if (!publicUser || publicUser.status !== "Active") {
            res.status(401).json(errorResponse("User not found or inactive", "USER_INACTIVE"));
            return;
          }

          res.json(
            successResponse(
              {
                user: toPublicUser(publicUser),
                session: generateLocalTokens(
                  publicUser.userId,
                  publicUser.email,
                  refreshToken,
                ),
              },
              "Session refreshed",
            ),
          );
          return;
        }
      } catch {
        // ليس Local JWT صالح، التجربة عبر Supabase
      }

      // 2. تجديد عبر Supabase Auth
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session || !data.user) {
        res
          .status(401)
          .json(
            errorResponse(
              error?.message ?? "Invalid refresh token",
              "INVALID_REFRESH_TOKEN",
            ),
          );
        return;
      }

      const publicUser = await UserModel.findById(data.user.id);
      if (!publicUser || publicUser.status !== "Active") {
        res
          .status(401)
          .json(errorResponse("User not found or inactive", "USER_INACTIVE"));
        return;
      }

      res.json(
        successResponse(
          {
            user: toPublicUser(publicUser),
            session: generateLocalTokens(
              publicUser.userId,
              publicUser.email,
              data.session.refresh_token,
            ),
          },
          "Session refreshed",
        ),
      );
    },
  );

  /**
   * 5. Forgot Password (طلب استعادة كلمة المرور)
   */
  static forgotPassword = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { email } = req.body;
      if (!email) {
        res.status(400).json(errorResponse("Email is required", "MISSING_EMAIL"));
        return;
      }

      const user = await UserModel.findByEmail(email);
      if (user) {
        const secret = process.env.JWT_SECRET || "your_fallback_secret_key";
        const resetToken = jwt.sign(
          { userId: user.userId, email: user.email, type: "password_reset" },
          secret,
          { expiresIn: "1h" },
        );

        try {
          await EmailService.sendPasswordResetEmail(email, resetToken);
        } catch (err) {
          console.error("⚠️ Failed to send password reset email:", err);
        }
      }

      res.json(
        successResponse(
          null,
          "If an account with that email exists, a password reset link has been sent.",
        ),
      );
    },
  );

  /**
   * 6. Reset Password (تعيين كلمة مرور جديدة)
   */
  static resetPassword = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const token =
        req.body.token ||
        (req.query.token as string) ||
        (req.headers.authorization
          ? req.headers.authorization.replace(/^Bearer\s+/i, "")
          : null) ||
        (req as any).accessToken;

      const newPassword = req.body.password || req.body.newPassword;

      if (!token) {
        res
          .status(400)
          .json(errorResponse("Recovery token is required", "MISSING_TOKEN"));
        return;
      }

      if (!newPassword) {
        res
          .status(400)
          .json(errorResponse("New password is required", "MISSING_PASSWORD"));
        return;
      }

      const secret = process.env.JWT_SECRET || "your_fallback_secret_key";
      let userId: string | null = null;

      // 1. فك تشفير Local JWT
      try {
        const decoded: any = jwt.verify(token, secret);
        userId = decoded.userId;
      } catch {
        // ليس Local JWT
      }

      if (userId) {
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await UserModel.updatePasswordHash(userId, passwordHash);

        try {
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword,
          });
        } catch {}

        res.json(successResponse(null, "Password has been reset successfully"));
        return;
      }

      // 2. تجربة Supabase recovery session
      const { data: sessionData, error: setError } =
        await supabase.auth.setSession({
          access_token: token,
          refresh_token: req.body.refreshToken ?? "",
        });

      if (setError || !sessionData?.user) {
        res
          .status(401)
          .json(
            errorResponse(
              "Invalid or expired recovery token",
              "INVALID_RECOVERY_TOKEN",
            ),
          );
        return;
      }

      const sbUserId = sessionData.user.id;
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        res
          .status(400)
          .json(errorResponse(updateError.message, "PASSWORD_UPDATE_FAILED"));
        return;
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await UserModel.updatePasswordHash(sbUserId, newPasswordHash);

      res.json(successResponse(null, "Password has been reset successfully"));
    },
  );

  /**
   * 7. Verify Email (تأكيد البريد الإلكتروني)
   */
  static verifyEmail = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const token =
        req.body.token ||
        (req.query.token as string) ||
        (req.headers.authorization
          ? req.headers.authorization.replace(/^Bearer\s+/i, "")
          : null);

      if (!token) {
        res
          .status(400)
          .json(errorResponse("Verification token is required", "MISSING_TOKEN"));
        return;
      }

      const secret = process.env.JWT_SECRET || "your_fallback_secret_key";
      let userId: string | null = null;

      try {
        const decoded: any = jwt.verify(token, secret);
        userId = decoded.userId;
      } catch {
        res
          .status(401)
          .json(
            errorResponse(
              "Invalid or expired verification token",
              "INVALID_TOKEN",
            ),
          );
        return;
      }

      if (!userId) {
        res
          .status(400)
          .json(errorResponse("Invalid token payload", "INVALID_TOKEN"));
        return;
      }

      const client = await pool.connect();
      try {
        await client.query(
          `UPDATE public."User" SET "status" = 'Active' WHERE "userId" = $1`,
          [userId],
        );
        await client.query(
          `UPDATE public."Provider" SET "verificationStatus" = 'Verified' WHERE "userId" = $1`,
          [userId],
        );
      } finally {
        client.release();
      }

      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          email_confirm: true,
        });
      } catch {}

      const updatedUser = await UserModel.findById(userId);

      res.json(
        successResponse(
          { user: toPublicUser(updatedUser), verified: true },
          "Email verified successfully",
        ),
      );
    },
  );

  /**
   * 8. Open App from email link (HTTPS → deep link)
   * GET /api/auth/open-app?type=verify|reset&token=...
   * بتفتح من الإيميل وتوجّه المستخدم للتطبيق الموبايل
   */
  static openAppFromEmail = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const type = String(req.query.type || "verify");
      const token = String(req.query.token || "");

      if (!token) {
        res
          .status(400)
          .send(
            "<h2>Invalid link</h2><p>Missing token. Please request a new email.</p>",
          );
        return;
      }

      const scheme = (process.env.APP_DEEP_LINK_SCHEME || "medreach").replace(
        /:\/\/$/,
        "",
      );
      const path =
        type === "reset" ? "reset_password" : "email_verification";
      const deepLink = `${scheme}://${path}?token=${encodeURIComponent(token)}`;

      // صفحة HTML بتحاول تفتح التطبيق + زر يدوي
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
  </style>
  <script>
    // محاولة فتح التطبيق تلقائياً
    window.location.href = ${JSON.stringify(deepLink)};
    setTimeout(function() {
      document.getElementById('fallback').style.display = 'block';
    }, 1200);
  </script>
</head>
<body>
  <div class="card">
    <h1>جاري فتح تطبيق MedReach...</h1>
    <p>لو التطبيق ما اتفتحش تلقائي، اضغط الزر بالأسفل.</p>
    <div id="fallback" style="display:none">
      <a class="btn" href="${deepLink}">فتح التطبيق</a>
      <p style="margin-top:16px;font-size:12px;word-break:break-all;color:#94a3b8">${deepLink}</p>
    </div>
  </div>
</body>
</html>`);
    },
  );

  /**
   * 9. Resend Verification Email (إعادة إرسال إيميل التفعيل)
   */
  static resendVerification = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { email } = req.body;
      if (!email) {
        res.status(400).json(errorResponse("Email is required", "MISSING_EMAIL"));
        return;
      }

      const user = await UserModel.findByEmail(email);
      if (user) {
        // لو الحساب متفعّل بالفعل
        if (user.status === "Active") {
          res.json(
            successResponse(
              null,
              "This email is already verified. You can sign in.",
            ),
          );
          return;
        }

        const secret = process.env.JWT_SECRET || "your_fallback_secret_key";
        const verificationToken = jwt.sign(
          { userId: user.userId, email: user.email },
          secret,
          { expiresIn: "1d" },
        );

        try {
          await EmailService.sendVerificationEmail(email, verificationToken);
        } catch (err) {
          console.error("⚠️ Failed to resend verification email:", err);
          res
            .status(500)
            .json(
              errorResponse(
                "Failed to send verification email. Please try again.",
                "EMAIL_SEND_FAILED",
              ),
            );
          return;
        }
      }

      res.json(
        successResponse(
          null,
          "If an account with that email exists, a verification link has been sent.",
        ),
      );
    },
  );

  /**
   * 9. Me (جلب بيانات المستخدم الحالي)
   */
  static me = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json(errorResponse("Not authenticated", "UNAUTHORIZED"));
      return;
    }

    res.json(successResponse({ user: toPublicUser(user) }));
  });

  /**
   * 10. Update Me (تحديث بيانات الملف الشخصي)
   */
  static updateMe = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const body = req.body;

      if (
        body.username &&
        (await UserModel.isUsernameTaken(body.username, user.userId))
      ) {
        res
          .status(409)
          .json(
            errorResponse("This username is already taken", "USERNAME_EXISTS"),
          );
        return;
      }
      if (
        body.phone &&
        (await UserModel.isPhoneTaken(body.phone, user.userId))
      ) {
        res
          .status(409)
          .json(
            errorResponse(
              "This phone number is already registered",
              "PHONE_EXISTS",
            ),
          );
        return;
      }

      const updated = await UserModel.updateProfile(user.userId, body);

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

  /**
   * 11. Get Google Auth URL
   */
  static getGoogleAuthUrl = catchAsync(
    async (_req: Request, res: Response): Promise<void> => {
      const redirectTo =
        process.env.GOOGLE_REDIRECT_URL ??
        `${process.env.FRONTEND_URL}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });

      if (error || !data.url) {
        res
          .status(500)
          .json(
            errorResponse(
              error?.message ?? "Failed to generate Google auth URL",
              "OAUTH_URL_FAILED",
            ),
          );
        return;
      }

      res.json(
        successResponse(
          { url: data.url },
          "Redirect the user to this URL to continue with Google",
        ),
      );
    },
  );

  /**
   * 12. Google Callback
   */
  static googleCallback = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { accessToken, refreshToken } = req.body;

      if (!accessToken || !refreshToken) {
        res
          .status(400)
          .json(
            errorResponse(
              "accessToken and refreshToken are required",
              "MISSING_TOKENS",
            ),
          );
        return;
      }

      const { data: userData, error: userError } =
        await supabase.auth.getUser(accessToken);

      if (userError || !userData.user) {
        res
          .status(401)
          .json(errorResponse("Invalid Google tokens", "INVALID_TOKENS"));
        return;
      }

      const supabaseUser = userData.user;
      let publicUser = await UserModel.findById(supabaseUser.id);

      if (!publicUser) {
        const meta = supabaseUser.user_metadata ?? {};
        const email = supabaseUser.email ?? meta.email ?? "";
        const name =
          meta.full_name || meta.name || email.split("@")[0] || "Google User";
        const username = (
          meta.preferred_username ||
          email.split("@")[0] ||
          `user_${supabaseUser.id.slice(0, 8)}`
        )
          .replace(/[^a-zA-Z0-9_]/g, "_")
          .slice(0, 60);
        const phone = meta.phone || `g-${supabaseUser.id.slice(0, 10)}`;

        let finalUsername = username;
        let attempt = 0;
        while (await UserModel.isUsernameTaken(finalUsername)) {
          attempt += 1;
          finalUsername = `${username}_${attempt}`.slice(0, 60);
        }

        publicUser = await UserModel.createFromAuth(supabaseUser.id, {
          name,
          username: finalUsername,
          email,
          phone,
          role: "patient",
        });
      }

      if (publicUser.status !== "Active") {
        res
          .status(403)
          .json(
            errorResponse(
              `Account is ${publicUser.status.toLowerCase()}`,
              "ACCOUNT_INACTIVE",
            ),
          );
        return;
      }

      res.json(
        successResponse(
          {
            user: toPublicUser(publicUser),
            session: {
              accessToken,
              refreshToken,
              expiresIn: 3600,
              tokenType: "bearer",
            },
          },
          "Google authentication successful",
        ),
      );
    },
  );
}
