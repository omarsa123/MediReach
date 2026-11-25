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
    _expectedRole: string = "patient",
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
    const isGoogleIdentity =
      supabaseUser.app_metadata?.provider === "google" ||
      (supabaseUser.identities || []).some((identity) => identity.provider === "google");
    if (!isGoogleIdentity) {
      throw {
        status: 403,
        message: "This authentication flow only accepts Google accounts.",
        code: "GOOGLE_IDENTITY_REQUIRED",
      };
    }

    const email = (supabaseUser.email || "").trim().toLowerCase();
    if (!email || !supabaseUser.email_confirmed_at) {
      throw {
        status: 403,
        message: "A verified Google email is required.",
        code: "GOOGLE_EMAIL_NOT_VERIFIED",
      };
    }

    let user = await UserModel.findById(supabaseUser.id);

    // Existing local accounts may have been created before Google was linked.
    // Only use an email match after Supabase confirms the Google email.
    if (!user) {
      const byEmail = await UserModel.findByEmail(email);
      if (byEmail) user = await UserModel.findById(byEmail.userId);
    }

    // Do not silently create a Patient account. Ask the client to collect
    // the intended role and the role-specific registration data first.
    if (!user) {
      const meta = supabaseUser.user_metadata ?? {};
      const name =
        meta.full_name || meta.name || email.split("@")[0] || "Google User";
      const registrationToken = jwt.sign(
        {
          purpose: "google_registration",
          supabaseUserId: supabaseUser.id,
          email,
          name,
        },
        getJwtSecret(),
        { expiresIn: "10m" },
      );

      return {
        isNewUser: true,
        requiresRegistration: true,
        registrationToken,
        googleUser: { email, name },
      };
    }

    const role = (user.role || "patient").toString().toLowerCase();
    const currentStatus = normalizeStatus(user.status);

    // 1. تفعيل حساب المريض أو الأدمن تلقائياً طالما دخل بحساب Google موثق
    if ((role === "patient" || role === "admin") && currentStatus !== "active") {
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