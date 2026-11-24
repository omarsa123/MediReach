import { randomInt } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserModel } from "../../modules/user/user.model.js";
import {
  isUniqueViolation,
  mapUniqueViolationMessage,
  toPublicUser,
} from "../../utils/response.utils.js";
import { EmailService } from "../../services/email.service.js";
import { pool } from "../../config/dbconfig.js";
import { supabase, supabaseAdmin } from "../../config/subabase.js";

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "FATAL ERROR: JWT_SECRET is missing in environment variables.",
    );
  }
  return secret;
};

export const generateLocalTokens = (userId: string, email: string) => {
  const secret = getJwtSecret();
  const accessToken = jwt.sign({ userId, email }, secret, { expiresIn: "1h" });
  const localRefreshToken = jwt.sign(
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

const otpStorage = new Map<string, { code: string; expiresAt: number }>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createOtp(): string {
  return randomInt(100000, 1000000).toString();
}

function storeOtp(key: string, code: string, ttlMs = 10 * 60 * 1000) {
  otpStorage.set(key, { code, expiresAt: Date.now() + ttlMs });
}

function getValidOtp(key: string): string | null {
  const stored = otpStorage.get(key);
  if (!stored) return null;
  if (stored.expiresAt < Date.now()) {
    otpStorage.delete(key);
    return null;
  }
  return stored.code;
}

function clearOtp(key: string) {
  otpStorage.delete(key);
}

function normalizeStatus(status: unknown): string {
  return (status ?? "").toString().trim().toLowerCase();
}

function isLoginAllowed(status: string): boolean {
  return status === "active";
}

function isAwaitingApproval(status: string, role?: string): boolean {
  if (role === "provider" || role === "organization") {
    return status === "inactive" || status === "pending";
  }
  return false;
}

function isUnverified(status: string): boolean {
  return (
    status === "inactive" || status === "unverified" || status === "pending"
  );
}

export class AuthService {
  // Register: create in Supabase Auth FIRST (UUID + FK), then local row
  static async register(body: any) {
    body.email = normalizeEmail(String(body.email || ""));
    let role = body.role || "patient";
    if (role === "doctor") role = "provider";
    if (role === "organizer") role = "organization";

    let username = body.username;
    if (!username || typeof username !== "string" || username.trim() === "") {
      const base = (body.name || body.email?.split("@")[0] || "user")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");
      username = `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    if (await UserModel.isEmailTaken(body.email)) {
      throw {
        status: 409,
        message: "This email is already registered",
        code: "EMAIL_EXISTS",
      };
    }

    if (body.phone && (await UserModel.isPhoneTaken(body.phone))) {
      throw {
        status: 409,
        message: "This phone number is already registered",
        code: "PHONE_EXISTS",
      };
    }

    if (!body.password || String(body.password).length < 6) {
      throw {
        status: 400,
        message: "Password must be at least 6 characters",
        code: "WEAK_PASSWORD",
      };
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          name: body.name,
          username,
          phone: body.phone,
          role,
        },
      });

    if (authError || !authData.user) {
      const msg = authError?.message || "Failed to create auth user";
      if (
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("registered")
      ) {
        throw {
          status: 409,
          message:
            "This email still exists in authentication. Run hard-delete or clean-orphans first.",
          code: "AUTH_EMAIL_EXISTS",
        };
      }
      throw {
        status: 400,
        message: msg,
        code: "AUTH_CREATE_FAILED",
      };
    }

    const userId = authData.user.id;
    const passwordHash = await bcrypt.hash(body.password, 10);

    let publicUser;
    try {
      publicUser = await UserModel.createFromAuth(
        userId,
        { ...body, role, username },
        passwordHash,
      );
    } catch (dbError) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (_) {}
      if (isUniqueViolation(dbError)) {
        throw {
          status: 409,
          message: mapUniqueViolationMessage(dbError),
          code: "UNIQUE_VIOLATION",
        };
      }
      throw dbError;
    }

    const otp = createOtp();
    storeOtp(`verify_${body.email}`, otp);

    try {
      await EmailService.sendVerificationEmail(body.email, otp);
    } catch (emailErr: any) {
      console.error(
        "[Register] Failed to send verification email:",
        emailErr?.message,
      );
    }

    return {
      user: toPublicUser(publicUser),
      needsVerification: true,
      email: body.email,
    };
  }

  static async login(body: { email: string; password: string }) {
    const email = normalizeEmail(body.email);

    const localUser = await UserModel.findByEmail(email);
    if (!localUser?.passwordHash) {
      throw {
        status: 401,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      };
    }

    const isMatch = await bcrypt.compare(body.password, localUser.passwordHash);
    if (!isMatch) {
      throw {
        status: 401,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      };
    }

    const publicUser = await UserModel.findById(localUser.userId);
    if (!publicUser) {
      throw {
        status: 401,
        message: "User profile not found",
        code: "PROFILE_MISSING",
      };
    }

    const status = normalizeStatus(publicUser.status);
    const role = (publicUser.role || "").toString().toLowerCase();

    if (isAwaitingApproval(status, role)) {
      throw {
        status: 403,
        message: "Your account is awaiting administrator approval.",
        code: "ACCOUNT_PENDING",
      };
    }

    if (!isLoginAllowed(status)) {
      if (isUnverified(status)) {
        throw {
          status: 403,
          message: "Please verify your email before signing in.",
          code: "EMAIL_NOT_VERIFIED",
          data: { email: publicUser.email },
        };
      }
      throw {
        status: 403,
        message: `Account is ${status || "inactive"}. Contact support.`,
        code: "ACCOUNT_INACTIVE",
      };
    }

    const tokens = generateLocalTokens(publicUser.userId, publicUser.email);

    return {
      user: toPublicUser(publicUser),
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
      if (payload.type !== "refresh") {
        throw {
          status: 401,
          message: "Invalid refresh token type",
          code: "INVALID_REFRESH_TOKEN",
        };
      }
      const user = await UserModel.findById(payload.userId);

      if (!user || !isLoginAllowed(normalizeStatus(user.status))) {
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
    email = normalizeEmail(email || "");
    if (!email) {
      throw {
        status: 400,
        message: "Email is required",
        code: "MISSING_EMAIL",
      };
    }

    const user = await UserModel.findByEmail(email);
    if (user) {
      const otp = createOtp();
      storeOtp(`reset_${email}`, otp);
      await EmailService.sendPasswordResetEmail(email, otp);
    }
    return true;
  }

  // Verifies the reset OTP without consuming it. The same OTP is then
  // submitted to resetPasswordWithOtp together with the new password.
  static async verifyResetPasswordOtp(email: string, otp: string) {
    email = normalizeEmail(email || "");
    otp = String(otp || "").trim();

    if (!email || !otp) {
      throw {
        status: 400,
        message: "email and otp are required",
        code: "MISSING_FIELDS",
      };
    }

    const storedCode = getValidOtp(`reset_${email}`);
    if (!storedCode || storedCode !== otp) {
      throw {
        status: 400,
        message: "Invalid or expired OTP code",
        code: "INVALID_OTP",
      };
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw { status: 404, message: "User not found", code: "NOT_FOUND" };
    }

    return { verified: true, email };
  }

  static async resetPasswordWithOtp(
    email: string,
    otp: string,
    newPassword: string,
  ) {
    email = normalizeEmail(email || "");
    otp = String(otp || "").trim();
    if (!email || !otp || !newPassword) {
      throw {
        status: 400,
        message: "email, otp and newPassword are required",
        code: "MISSING_FIELDS",
      };
    }

    if (String(newPassword).length < 6) {
      throw {
        status: 400,
        message: "Password must be at least 6 characters",
        code: "WEAK_PASSWORD",
      };
    }

    const storedCode = getValidOtp(`reset_${email}`);
    if (!storedCode || storedCode !== otp) {
      throw {
        status: 400,
        message: "Invalid or expired OTP code",
        code: "INVALID_OTP",
      };
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw { status: 404, message: "User not found", code: "NOT_FOUND" };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await UserModel.updatePasswordHash(
      user.userId,
      passwordHash,
    );
    if (!updated) {
      throw {
        status: 500,
        message: "Failed to update password",
        code: "UPDATE_FAILED",
      };
    }

    try {
      await supabaseAdmin.auth.admin.updateUserById(user.userId, {
        password: newPassword,
      });
    } catch (e: any) {
      console.warn(
        "[ResetPassword] Could not sync password to Supabase Auth:",
        e?.message,
      );
    }

    clearOtp(`reset_${email}`);
    return true;
  }

  static async verifyEmailOtp(email: string, otp: string) {
    email = normalizeEmail(email || "");
    otp = String(otp || "").trim();
    if (!email || !otp) {
      throw {
        status: 400,
        message: "email and otp are required",
        code: "MISSING_FIELDS",
      };
    }

    const storedCode = getValidOtp(`verify_${email}`);
    if (!storedCode || storedCode !== otp) {
      throw {
        status: 400,
        message: "Invalid or expired verification code",
        code: "INVALID_OTP",
      };
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw { status: 404, message: "User not found", code: "NOT_FOUND" };
    }

    const fullUser = await UserModel.findById(user.userId);
    const role = (fullUser?.role || "patient").toString().toLowerCase();

    if (role === "patient" || !fullUser?.role) {
      const client = await pool.connect();
      try {
        await client.query(
          `UPDATE public."User" SET "status" = 'Active' WHERE "userId" = $1`,
          [user.userId],
        );
      } finally {
        client.release();
      }
    }

    clearOtp(`verify_${email}`);

    const updatedUser = await UserModel.findById(user.userId);
    const tokens = generateLocalTokens(updatedUser.userId, updatedUser.email);

    return {
      user: toPublicUser(updatedUser),
      session: tokens,
      verified: true,
    };
  }

  static async resendVerification(email: string) {
    email = normalizeEmail(email || "");
    if (!email) {
      throw {
        status: 400,
        message: "Email is required",
        code: "MISSING_EMAIL",
      };
    }

    const user = await UserModel.findByEmail(email);
    if (!user) return true;

    if (normalizeStatus(user.status) === "active") {
      return { message: "This email is already verified." };
    }

    const otp = createOtp();
    storeOtp(`verify_${email}`, otp);
    await EmailService.sendVerificationEmail(email, otp);
    return true;
  }

  static async getGoogleAuthUrl(expectedRole: string = "patient") {
    // This must be the PUBLIC backend callback URL, not the app deep link.
    // Example: https://YOUR-NGROK-DOMAIN/api/v1/auth/google/callback
    const redirectTo = process.env.GOOGLE_REDIRECT_URL;

    if (!redirectTo) {
      throw {
        status: 500,
        message: "GOOGLE_REDIRECT_URL is missing from environment variables",
        code: "GOOGLE_REDIRECT_URL_MISSING",
      };
    }

    const callbackUrl = new URL(redirectTo);
    const role =
      String(expectedRole).toLowerCase() === "provider" ? "provider" : "patient";
    callbackUrl.searchParams.set("role", role);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error || !data?.url) {
      throw {
        status: 400,
        message: error?.message || "Failed to generate Google auth URL",
        code: "GOOGLE_URL_ERROR",
      };
    }

    return data.url;
  }

  // Exchanges the OAuth authorization code using the same Supabase client
  // that initiated signInWithOAuth (so its PKCE verifier is available).
  static async exchangeGoogleCode(code: string) {
    if (!code) {
      throw {
        status: 400,
        message: "Google authorization code is missing",
        code: "GOOGLE_CODE_MISSING",
      };
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session?.access_token || !data.session.refresh_token) {
      throw {
        status: 401,
        message: error?.message || "Could not exchange Google authorization code",
        code: "GOOGLE_CODE_EXCHANGE_FAILED",
      };
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  static async googleCallback(
    accessToken: string,
    _refreshToken: string,
    expectedRole: string = "patient",
  ) {
    if (!accessToken) {
      throw {
        status: 400,
        message: "accessToken is required",
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
    const requestedRole =
      String(expectedRole).toLowerCase() === "provider" ? "provider" : "patient";
    let user = await UserModel.findById(supabaseUser.id);

    if (!user) {
      const email = (supabaseUser.email || "").toLowerCase();
      if (email) {
        const byEmail = await UserModel.findByEmail(email);
        if (byEmail) user = await UserModel.findById(byEmail.userId);
      }
    }

    if (!user && requestedRole === "provider") {
      throw {
        status: 404,
        message:
          "No provider account was found for this Google email. Please register as a provider first.",
        code: "PROVIDER_ACCOUNT_NOT_FOUND",
      };
    }

    if (!user) {
      const meta = supabaseUser.user_metadata ?? {};
      const email = supabaseUser.email ?? meta.email ?? "";
      const name =
        meta.full_name || meta.name || email.split("@")[0] || "Google User";
      let username = (
        meta.preferred_username ||
        email.split("@")[0] ||
        `user_${supabaseUser.id.slice(0, 8)}`
      )
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .slice(0, 60);

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
          phone: meta.phone || `g-${supabaseUser.id.slice(0, 10)}`,
          role: "patient",
        },
        defaultRandomHash,
      );
    }

    if (normalizeStatus(user.status) !== "active") {
      const client = await pool.connect();
      try {
        await client.query(
          `UPDATE public."User" SET "status" = 'Active' WHERE "userId" = $1`,
          [user.userId],
        );
      } finally {
        client.release();
      }
      user.status = "Active";
    }

    const tokens = generateLocalTokens(user.userId, user.email);

    return {
      user: toPublicUser(user),
      session: tokens,
    };
  }

  /** Delete from auth.users FIRST (CASCADE), then safety cleanup local */
  static async hardDeleteUser(email: string) {
    email = normalizeEmail(email || "");
    if (!email) {
      throw {
        status: 400,
        message: "Email is required for deletion",
        code: "MISSING_EMAIL",
      };
    }

    const localUser = await UserModel.findByEmail(email);
    let authUserId: string | null = localUser?.userId ?? null;

    if (!authUserId) {
      try {
        const { data } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const found = data?.users?.find(
          (u) => normalizeEmail(u.email || "") === email,
        );
        if (found) authUserId = found.id;
      } catch (e: any) {
        console.warn("[HardDelete] listUsers failed:", e?.message);
      }
    }

    if (authUserId) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
      if (error) {
        console.warn("[HardDelete] auth.admin.deleteUser:", error.message);
      }
    }

    if (localUser) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`DELETE FROM public."Patient" WHERE "userId" = $1`, [
          localUser.userId,
        ]);
        await client.query(
          `DELETE FROM public."Provider" WHERE "userId" = $1`,
          [localUser.userId],
        );
        await client.query(
          `DELETE FROM public."Organization" WHERE "userId" = $1`,
          [localUser.userId],
        );
        await client.query(`DELETE FROM public."Admin" WHERE "userId" = $1`, [
          localUser.userId,
        ]);
        await client.query(`DELETE FROM public."User" WHERE "userId" = $1`, [
          localUser.userId,
        ]);
        await client.query("COMMIT");
      } catch (dbErr) {
        await client.query("ROLLBACK");
        console.error("[HardDelete] local cleanup error:", dbErr);
      } finally {
        client.release();
      }
    }

    try {
      await UserModel.deleteByEmail(email);
    } catch (_) {}

    clearOtp(`verify_${email}`);
    clearOtp(`reset_${email}`);

    return {
      email,
      deleted: true,
      authUserId,
      message: "User removed from Supabase Auth and local tables.",
    };
  }

  static async cleanOrphanUsers() {
    const { data: supData, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error || !supData?.users) {
      throw {
        status: 500,
        message: error?.message || "Failed to fetch Supabase users",
      };
    }

    const client = await pool.connect();
    const localIds = new Set<string>();
    const localEmails = new Set<string>();

    try {
      const res = await client.query(
        `SELECT "userId", "email" FROM public."User"`,
      );
      for (const row of res.rows) {
        if (row.userId) localIds.add(row.userId);
        if (row.email) localEmails.add(normalizeEmail(row.email));
      }
    } finally {
      client.release();
    }

    const deletedFromAuth: string[] = [];
    for (const supUser of supData.users) {
      const email = normalizeEmail(supUser.email || "");
      const existsLocally =
        localIds.has(supUser.id) || (email && localEmails.has(email));

      if (!existsLocally) {
        await supabaseAdmin.auth.admin.deleteUser(supUser.id);
        deletedFromAuth.push(email || supUser.id);
      }
    }

    const { data: supData2 } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const remainingAuthIds = new Set(
      (supData2?.users || []).map((u) => u.id),
    );

    const client2 = await pool.connect();
    const deletedFromLocal: string[] = [];
    try {
      const res = await client2.query(
        `SELECT "userId", "email" FROM public."User"`,
      );
      for (const row of res.rows) {
        if (!remainingAuthIds.has(row.userId)) {
          await client2.query(
            `DELETE FROM public."Patient" WHERE "userId" = $1`,
            [row.userId],
          );
          await client2.query(
            `DELETE FROM public."Provider" WHERE "userId" = $1`,
            [row.userId],
          );
          await client2.query(
            `DELETE FROM public."Organization" WHERE "userId" = $1`,
            [row.userId],
          );
          await client2.query(
            `DELETE FROM public."Admin" WHERE "userId" = $1`,
            [row.userId],
          );
          await client2.query(
            `DELETE FROM public."User" WHERE "userId" = $1`,
            [row.userId],
          );
          deletedFromLocal.push(row.email || row.userId);
        }
      }
    } finally {
      client2.release();
    }

    return {
      deletedFromAuth: deletedFromAuth.length,
      deletedFromLocal: deletedFromLocal.length,
      deletedAuthUsers: deletedFromAuth,
      deletedLocalUsers: deletedFromLocal,
    };
  }
}
