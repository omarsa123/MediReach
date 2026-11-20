import type { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../../config/subabase.js";
import { UserModel } from "../../modules/user/user.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import jwt from "jsonwebtoken";
/**
 * ==========================================
 * HELPER FUNCTIONS (دوّال مساعدة موحدة للردود)
 * ==========================================
 */

// توحيد شكل استجابة النجاح (Success Response) في كل الـ APIs
const successResponse = (data: any, message = "Success") => ({
  success: true,
  message,
  data,
});

// توحيد شكل استجابة الخطأ (Error Response) مع إرفاق كود واضح للـ Frontend
const errorResponse = (error: string, code = "ERROR") => ({
  success: false,
  error,
  code,
});

// تجهيز بيانات المستخدم العامّة لإرجاعها في الـ Response
const toPublicUser = (user: any) => user;

// تحويل بيانات الجلسة لـ Tokens (تعديل لإنشاء Access Token محلي)
const generateLocalTokens = (
  userId: string,
  email: string,
  refreshToken: string,
) => {
  const secret = process.env.JWT_SECRET || "your_fallback_secret_key";
  const accessToken = jwt.sign(
    { userId, email },
    secret,
    { expiresIn: "1h" }, // مدة صلاحية التوكن ساعة
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600,
    tokenType: "bearer",
  };
};

// التحقق هل الخطأ القادم من قاعدة البيانات هو انتهاك لقيد فريد (Unique Constraint Violation - Duplicate Key)
const isUniqueViolation = (err: any) => err?.code === "23505";

// ترجمة أخطاء التكرار في قاعدة البيانات لرسائل واضحة يفهمها المستخدم
const mapUniqueViolationMessage = (err: any) => {
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
   * - يفحص تكرار الإيميل ورقم الهاتف.
   * - ينشئ حساباً في Supabase Auth (عن طريق الـ Admin).
   * - ينشئ البروفايل والجداول المرتبطة (Patient/Provider/Org) في قاعدة البيانات المحلية.
   */
  static registerUser = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const body = req.body;

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

      // إنشاء المستخدم في نظام الـ Auth الخاص بـ Supabase مع تفعيل الحساب تلقائياً
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: true,
          user_metadata: {
            name: body.name,
            username: body.username,
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
      let publicUser;

      // إنشاء السجلات المرتبطة في جدول User والجداول الفرعية داخل قاعدة البيانات
      try {
        publicUser = await UserModel.createFromAuth(userId, {
          name: body.name,
          username: body.username,
          email: body.email,
          phone: body.phone,
          address: body.address,
          role: body.role,
        });
      } catch (dbError) {
        // لو حصل خطأ في قاعدة البيانات، نعمل Rollback بحذف المستخدم من سوبا بيز Auth لعدم حدوث تضارب
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
        throw dbError; // الخطأ هيروح تلقائياً للـ Global Error Handler عبر catchAsync
      }

      // محاولة تسجيل الدخول تلقائياً بعد التسجيل لإصدار التوكنز للعميل
      // محاولة تسجيل الدخول تلقائياً بعد التسجيل لإصدار التوكنز للعميل
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: body.email,
          password: body.password,
        });

      if (signInError || !signInData.session || !signInData.user) {
        res
          .status(201)
          .json(
            successResponse(
              { user: toPublicUser(publicUser) },
              "Account created successfully. Please log in.",
            ),
          );
        return;
      }

      res.status(201).json(
        successResponse(
          {
            user: toPublicUser(publicUser),
            session: generateLocalTokens(
              publicUser.userId,
              publicUser.email,
              signInData.session.refresh_token,
            ),
          },
          "Account created and logged in successfully",
        ),
      );
      return;
    },
  );

  /**
   * 2. Login (تسجيل الدخول)
   * - يتحقق من صحة البريد الإلكتروني وكلمة المرور عبر Supabase Auth.
   * - يجلب بيانات البروفايل ويتحقق من حالة الحساب (Active).
   */
  static login = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const body = req.body;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });

      if (error || !data.session || !data.user) {
        res
          .status(401)
          .json(
            errorResponse(
              error?.message ?? "Invalid email or password",
              "INVALID_CREDENTIALS",
            ),
          );
        return;
      }

      // جلب البروفايل العام للمستخدم من قاعدة البيانات
      const publicUser = await UserModel.findById(data.user.id);

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

      // التحقق من أن الحساب نشط (Active)
      if (publicUser.status !== "Active") {
        res
          .status(403)
          .json(
            errorResponse(
              `Account is ${publicUser.status.toLowerCase()}. Contact support.`,
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
              data.session.refresh_token,
            ),
          },
          "Logged in successfully",
        ),
      );
    },
  );

  /**
   * 3. Logout (تسجيل الخروج)
   * - ينهي الجلسة الحالية في سوبا بيز.
   */
  static logout = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      if ((req as any).accessToken) {
        await supabase.auth.signOut();
      }
      res.json(successResponse(null, "Logged out successfully"));
    },
  );

  /**
   * 4. Refresh Token (تجديد الجلسة)
   * - يستقبل الـ Refresh Token ويُصدر Access Token جديد للمستخدم.
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
   * - يرسل إيميل يحتوي على رابط إعادة تعيين كلمة المرور.
   */
  static forgotPassword = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const body = req.body;
      const redirectTo =
        process.env.PASSWORD_RESET_REDIRECT_URL ??
        `${process.env.FRONTEND_URL}/auth/reset-password`;

      await supabase.auth.resetPasswordForEmail(body.email, { redirectTo });

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
   * - يستقبل التوكن المؤقت وكلمة المرور الجديدة لتحديثها.
   */
  static resetPassword = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const body = req.body;
      const token = (req as any).accessToken;

      if (!token) {
        res
          .status(401)
          .json(errorResponse("Recovery token is required", "MISSING_TOKEN"));
        return;
      }

      const { error: setError } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: req.body.refreshToken ?? "",
      });

      if (setError) {
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

      const { error: updateError } = await supabase.auth.updateUser({
        password: body.password,
      });

      if (updateError) {
        res
          .status(400)
          .json(errorResponse(updateError.message, "PASSWORD_UPDATE_FAILED"));
        return;
      }

      res.json(successResponse(null, "Password has been reset successfully"));
    },
  );

  /**
   * 7. Me (جلب بيانات المستخدم الحالي)
   * - يعيد بيانات المستخدم المسجل دخوله حالياً بناءً على الـ Middleware الخاص بالتوكن.
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
   * 8. Update Me (تحديث بيانات الملف الشخصي)
   * - يسمح للمستخدم بتحديث بياناته (الاسم، العنوان، الهاتف، الخ) مع فحص التوافر.
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
   * 9. Get Google Auth URL (توليد رابط تسجيل الدخول بجوجل)
   * - يعيد للفرونت إند رابط التوجيه الخاص بـ Google OAuth.
   */
  static getGoogleAuthUrl = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
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
   * 10. Google Callback (معالجة رجوع المستخدم من جوجل)
   * - يتحقق من توكن جوجل، ولو المستخدم لأول مرة يسجل دخوله، ينشئ له بروفايل في قاعدة البيانات.
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

      // أول مرة يسجل بجوجل -> يتم إنشاء بروفايل جديد له
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
