import { supabase, supabaseAdmin } from "../../config/subabase.js";
import { UserModel } from "../../modules/user/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  isUniqueViolation,
  mapUniqueViolationMessage,
  toPublicUser,
} from "../../utils/response.utils.js";
import { EmailService } from "../../services/email.service.js";

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "FATAL ERROR: JWT_SECRET is not defined in environment variables.",
    );
  }
  return secret;
};

export const generateLocalTokens = (userId: string, email: string) => {
  const secret = getJwtSecret();
  const accessToken = jwt.sign({ userId, email }, secret, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ userId, email }, secret, { expiresIn: "7d" });

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600,
    tokenType: "bearer",
  };
};

export class AuthService {
  static async register(body: any) {
    if (await UserModel.isEmailTaken(body.email)) {
      throw {
        status: 409,
        message: "This email is already registered",
        code: "EMAIL_EXISTS",
      };
    }

    if (await UserModel.isPhoneTaken(body.phone)) {
      throw {
        status: 409,
        message: "This phone number is already registered",
        code: "PHONE_EXISTS",
      };
    }

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
      throw {
        status: 400,
        message: authError?.message ?? "Failed to create auth user",
        code: "AUTH_CREATE_FAILED",
      };
    }

    const userId = authData.user.id;
    const passwordHash = await bcrypt.hash(body.password, 10);
    let publicUser;

    try {
      publicUser = await UserModel.createFromAuth(
        userId,
        {
          name: body.name,
          username: body.username,
          email: body.email,
          phone: body.phone,
          address: body.address,
          role: body.role,
          bloodType: body.bloodType,
          providerType: body.providerType,
          specialization: body.specialization,
          licenseNumber: body.licenseNumber,
          organizationName: body.organizationName,
          organizerType: body.organizerType,
          licenseDocumentUrl: body.licenseDocumentUrl,
        },
        passwordHash,
      );
    } catch (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);

      if (isUniqueViolation(dbError)) {
        throw {
          status: 409,
          message: mapUniqueViolationMessage(dbError),
          code: "UNIQUE_VIOLATION",
        };
      }
      throw dbError;
    }

    const tokens = generateLocalTokens(publicUser.userId, publicUser.email);

    // ملاحظة: إيميل التفعيل مش بيتبعت تلقائي عند التسجيل
    // بيتبعت فقط لما المستخدم يدوس على زرار Verify / Resend من شاشة التفعيل

    return {
      user: toPublicUser(publicUser),
      session: tokens,
    };
  }

  static async login(body: { email: string; password: string }) {
    const user = await UserModel.findByEmail(body.email);

    if (!user || !user.passwordHash) {
      throw {
        status: 401,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      };
    }

    const isPasswordValid = await bcrypt.compare(
      body.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw {
        status: 401,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      };
    }

    if (user.status !== "Active") {
      throw {
        status: 403,
        message: `Account is ${user.status.toLowerCase()}. Contact support.`,
        code: "ACCOUNT_INACTIVE",
      };
    }

    const tokens = generateLocalTokens(user.userId, user.email);

    return {
      user: toPublicUser(user),
      session: tokens,
    };
  }

  static async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw {
        status: 400,
        message: "refreshToken is required",
        code: "MISSING_REFRESH_TOKEN",
      };
    }

    const secret = getJwtSecret();

    try {
      const payload: any = jwt.verify(refreshToken, secret);
      const user = await UserModel.findById(payload.userId);

      if (!user || user.status !== "Active") {
        throw {
          status: 401,
          message: "User not found or inactive",
          code: "USER_INACTIVE",
        };
      }

      const tokens = generateLocalTokens(user.userId, user.email);

      return {
        user: toPublicUser(user),
        session: tokens,
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw {
        status: 401,
        message: "Invalid or expired refresh token",
        code: "INVALID_REFRESH_TOKEN",
      };
    }
  }

  static async forgotPassword(email: string) {
    const user = await UserModel.findByEmail(email);
    // لأسباب أمنية، لو الإيميل مش موجود بنرجع true بدون كشف وجود الحساب
    if (!user) return true;

    const redirectTo =
      process.env.PASSWORD_RESET_REDIRECT_URL ??
      `${process.env.FRONTEND_URL}/reset_password`;

    // توليد رابط استعادة من Supabase Admin وبعته من Gmail بتاعنا عبر EmailService
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (error || !data?.properties?.hashed_token) {
      throw {
        status: 500,
        message: error?.message ?? "Failed to generate recovery token",
        code: "RECOVERY_LINK_FAILED",
      };
    }

    await EmailService.sendPasswordResetEmail(
      email,
      data.properties.hashed_token,
    );

    return true;
  }

  static async resetPassword(
    token: string,
    refreshToken: string,
    newPassword: string,
  ) {
    if (!token) {
      throw {
        status: 401,
        message: "Recovery token is required",
        code: "MISSING_TOKEN",
      };
    }

    const { data: sessionData, error: setError } =
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: refreshToken ?? "",
      });

    if (setError || !sessionData.user) {
      throw {
        status: 401,
        message: "Invalid or expired recovery token",
        code: "INVALID_RECOVERY_TOKEN",
      };
    }

    const userId = sessionData.user.id;

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      throw {
        status: 400,
        message: updateError.message,
        code: "PASSWORD_UPDATE_FAILED",
      };
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePasswordHash(userId, newPasswordHash);

    return true;
  }

  static async getGoogleUrl() {
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
      throw {
        status: 500,
        message: error?.message ?? "Failed to generate Google auth URL",
        code: "OAUTH_URL_FAILED",
      };
    }

    return data.url;
  }

  static async googleCallback(accessToken: string, refreshToken: string) {
    if (!accessToken || !refreshToken) {
      throw {
        status: 400,
        message: "accessToken and refreshToken are required",
        code: "MISSING_TOKENS",
      };
    }

    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      throw {
        status: 401,
        message: "Invalid Google tokens",
        code: "INVALID_TOKENS",
      };
    }

    const supabaseUser = userData.user;
    let user = await UserModel.findById(supabaseUser.id);

    if (!user) {
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

      const defaultRandomHash = await bcrypt.hash("GOOGLE_OAUTH_USER_PASS", 10);

      user = await UserModel.createFromAuth(
        supabaseUser.id,
        {
          name,
          username: finalUsername,
          email,
          phone,
          role: "patient",
        },
        defaultRandomHash,
      );
    }

    if (user.status !== "Active") {
      throw {
        status: 403,
        message: `Account is ${user.status.toLowerCase()}`,
        code: "ACCOUNT_INACTIVE",
      };
    }

    const tokens = generateLocalTokens(user.userId, user.email);

    return {
      user: toPublicUser(user),
      session: tokens,
    };
  }

  static async hardDeleteUser(email: string) {
    const { data: listData, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      throw {
        status: 400,
        message: "Failed to list auth users",
        code: "LIST_FAILED",
      };
    }

    const authUser = listData.users.find((u) => u.email === email);

    if (authUser) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.id);
    }

    await UserModel.deleteByEmail(email);

    return {
      email,
      deletedFromSupabase: Boolean(authUser),
    };
  }
}
