import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserModel } from "../../modules/user/user.model.js";
import { toPublicUser } from "../../utils/response.utils.js";
import { pool } from "../../config/dbconfig.js";
import { supabase } from "../../config/subabase.js";
import { ProviderModel } from "../provider/provider.model.js";

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

function normalizeStatus(status: unknown): string {
  return (status ?? "").toString().trim().toLowerCase();
}

export class GoogleAuthService {
  static async getGoogleAuthUrl(expectedRole: string = "patient") {
    const redirectTo = process.env.APP_OAUTH_REDIRECT_URL || "medreach://auth";
    let callbackUrl: URL;
    try {
      callbackUrl = new URL(redirectTo);
    } catch {
      throw {
        status: 500,
        message: "APP_OAUTH_REDIRECT_URL is invalid",
        code: "OAUTH_REDIRECT_INVALID",
      };
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });

    if (error || !data?.url) {
      throw {
        status: 400,
        message: error?.message || "Failed to generate Google auth URL",
        code: "GOOGLE_URL_ERROR",
      };
    }
    return { url: data.url };
  }

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
        message:
          error?.message || "Could not exchange Google authorization code",
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
    code?: string,
  ) {
    let resolvedAccessToken = accessToken;

    if (
      (!resolvedAccessToken || resolvedAccessToken.trim() === "") &&
      code &&
      code.trim() !== ""
    ) {
      const exchanged = await this.exchangeGoogleCode(code);
      resolvedAccessToken = exchanged.accessToken;
    }

    if (!resolvedAccessToken) {
      throw {
        status: 400,
        message: "accessToken or code is required",
        code: "MISSING_TOKENS",
      };
    }

    const { data: userData, error: userError } =
      await supabase.auth.getUser(resolvedAccessToken);
    if (userError || !userData.user) {
      throw {
        status: 401,
        message: "Invalid Google tokens or code",
        code: "INVALID_TOKENS",
      };
    }

    const supabaseUser = userData.user;
    const requestedRole =
      String(expectedRole).toLowerCase() === "provider"
        ? "provider"
        : "patient";
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
        message: "No provider account found for this Google email.",
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

    const role = (user.role || "patient").toString().toLowerCase();
    const currentStatus = normalizeStatus(user.status);

    // 1. تفعيل حساب المريض أو الأدمن تلقائياً طالما دخل بحساب Google موثق
    if (
      (role === "patient" || role === "admin") &&
      currentStatus !== "active"
    ) {
      await pool.query(
        `UPDATE public."User" SET "status" = 'Active' WHERE "userId" = $1`,
        [user.userId],
      );
      user.status = "Active";
    }

    // 2. التحقق من حالة المزود (Provider)
    if (role === "provider") {
      const providerProfile = await ProviderModel.findProviderProfile(
        user.userId,
      );
      const verificationStatus = normalizeStatus(
        providerProfile?.verificationStatus || currentStatus,
      );

      const isAuthorized =
        currentStatus === "active" || verificationStatus === "active";

      if (!isAuthorized && verificationStatus === "pending") {
        throw {
          status: 403,
          message: "Your account is pending admin approval.",
          code: "PROVIDER_PENDING",
        };
      }

      if (
        !isAuthorized &&
        (verificationStatus === "rejected" ||
          verificationStatus === "suspended" ||
          verificationStatus === "inactive")
      ) {
        throw {
          status: 403,
          message: `Access denied. Your account status is ${providerProfile?.verificationStatus || currentStatus}.`,
          code: "PROVIDER_ACCESS_DENIED",
        };
      }
    }

    const tokens = generateLocalTokens(user.userId, user.email);
    return { user: toPublicUser(user), session: tokens };
  }
}
