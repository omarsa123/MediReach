import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserModel } from "../../modules/user/user.model.js";
import {
  isUniqueViolation,
  mapUniqueViolationMessage,
  toPublicUser,
} from "../../utils/response.utils.js";
import { EmailService } from "../../services/email.service.js";
import { OtpService } from "./otp.service.js";
import { pool } from "../../config/dbconfig.js";
import { supabaseAdmin } from "../../config/subabase.js";
import {
  GoogleAuthService,
  generateLocalTokens,
} from "./google-auth.service.js";

export { generateLocalTokens };

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "FATAL ERROR: JWT_SECRET is missing in environment variables.",
    );
  }
  return secret;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function uploadProfileImage(
  image: unknown,
  userId: string,
): Promise<string | null> {
  if (!image) return null;
  if (typeof image !== "string") {
    throw {
      status: 400,
      message: "profileImageBase64 must be a base64 string",
      code: "INVALID_IMAGE",
    };
  }
  const match = image.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/,
  );
  if (!match) {
    throw {
      status: 400,
      message: "Unsupported image format. Use JPG, PNG or WEBP.",
      code: "INVALID_IMAGE_FORMAT",
    };
  }
  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
    throw {
      status: 400,
      message: "Image must be smaller than 5 MB",
      code: "IMAGE_SIZE_INVALID",
    };
  }
  const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "profile-images";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: mime,
      upsert: true,
      cacheControl: "3600",
    });
  if (error || !data) {
    throw {
      status: 502,
      message: error?.message || "Image upload failed",
      code: "IMAGE_UPLOAD_FAILED",
    };
  }
  const { data: publicData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(data.path);
  return publicData.publicUrl;
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
  static async register(body: any) {
    body.email = normalizeEmail(String(body.email || ""));
    let role = body.role || "patient";
    if (role === "doctor") role = "provider";
    if (role === "organizer") role = "organization";

    // Public signup must never be able to create administrator accounts.
    if (!["patient", "provider", "organization"].includes(role)) {
      throw { status: 400, message: "Unsupported registration role", code: "INVALID_ROLE" };
    }
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      throw { status: 400, message: "name is required", code: "NAME_REQUIRED" };
    }
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      throw { status: 400, message: "A valid email is required", code: "INVALID_EMAIL" };
    }
    if (!body.phone || typeof body.phone !== "string" || !body.phone.trim()) {
      throw { status: 400, message: "phone is required", code: "PHONE_REQUIRED" };
    }
    if (role === "provider" && !body.licenseNumber) {
      throw { status: 400, message: "licenseNumber is required for provider registration", code: "LICENSE_REQUIRED" };
    }
    if (role === "organization" && !body.licenseDocumentUrl) {
      throw { status: 400, message: "licenseDocumentUrl is required for organization registration", code: "LICENSE_DOCUMENT_REQUIRED" };
    }
    if (role === "provider" && body.providerType && !["Doctor", "Nurse", "Physiotherapist", "LabSpecialist"].includes(body.providerType)) {
      throw { status: 400, message: "providerType must be Doctor, Nurse, Physiotherapist, or LabSpecialist", code: "INVALID_PROVIDER_TYPE" };
    }
    if (role === "organization" && body.organizerType && !["Clinic", "Hospital", "Lab", "PhysiotherapyCenter"].includes(body.organizerType)) {
      throw { status: 400, message: "Invalid organizerType", code: "INVALID_ORGANIZATION_TYPE" };
    }
    if (role === "patient" && body.gender && !["Female", "Male", "Other", "PreferNotToSay"].includes(body.gender)) {
      throw { status: 400, message: "Invalid gender value", code: "INVALID_GENDER" };
    }
    if (role === "patient" && body.bloodType && !["A_Positive", "A_Negative", "B_Positive", "B_Negative", "AB_Positive", "AB_Negative", "O_Positive", "O_Negative", "Unknown"].includes(body.bloodType)) {
      throw { status: 400, message: "Invalid bloodType value", code: "INVALID_BLOOD_TYPE" };
    }

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

    let authData: any = null;
    let authError: any = null;
    try {
      const createPromise = supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: { name: body.name, username, phone: body.phone, role },
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Supabase createUser timed out after 12s")),
          12000,
        ),
      );
      const result: any = await Promise.race([createPromise, timeoutPromise]);
      authData = result.data;
      authError = result.error;
    } catch (timeoutOrNetErr: any) {
      throw {
        status: 504,
        message:
          timeoutOrNetErr?.message ||
          "Authentication service timeout. Check credentials.",
        code: "AUTH_TIMEOUT",
      };
    }

    if (authError || !authData?.user) {
      const msg = authError?.message || "Failed to create auth user";
      if (
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("registered")
      ) {
        throw {
          status: 409,
          message:
            "This email still exists in authentication. Run hard-delete first.",
          code: "AUTH_EMAIL_EXISTS",
        };
      }
      throw { status: 400, message: msg, code: "AUTH_CREATE_FAILED" };
    }

    const userId = authData.user.id;
    const isProvider = role === "provider";
    if (isProvider && !body.profileImageBase64) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw {
        status: 400,
        message: "A profile photo is required for provider accounts",
        code: "PROFILE_IMAGE_REQUIRED",
      };
    }
    let profilePictureUrl: string | null = null;
    try {
      profilePictureUrl = await uploadProfileImage(
        body.profileImageBase64,
        userId,
      );
    } catch (imageError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw imageError;
    }
    const passwordHash = await bcrypt.hash(body.password, 10);

    let publicUser;
    try {
      publicUser = await UserModel.createFromAuth(
        userId,
        { ...body, role, username, profilePictureUrl },
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

    const otp = await OtpService.issue("verify", body.email);

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
    return { user: toPublicUser(publicUser), session: tokens };
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
      return { user: toPublicUser(user), session: tokens };
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
      const otp = await OtpService.issue("reset", email);
      await EmailService.sendPasswordResetEmail(email, otp);
    }
    return true;
  }

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

    const isValid = await OtpService.verify("reset", email, otp, false);
    if (!isValid) {
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

    const isValid = await OtpService.verify("reset", email, otp, false);
    if (!isValid) {
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

    const { error: authPasswordError } =
      await supabaseAdmin.auth.admin.updateUserById(user.userId, {
        password: newPassword,
      });
    if (authPasswordError) {
      throw {
        status: 502,
        message: authPasswordError.message,
        code: "AUTH_PASSWORD_UPDATE_FAILED",
      };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await UserModel.updatePasswordHash(
      user.userId,
      passwordHash,
    );
    if (!updated) {
      throw {
        status: 500,
        message: "Failed to update local password",
        code: "UPDATE_FAILED",
      };
    }

    await OtpService.clear(`reset_${email}`);
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

    const isValid = await OtpService.verify("verify", email, otp, false);
    if (!isValid) {
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

    await OtpService.clear(`verify_${email}`);
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

    const otp = await OtpService.issue("verify", email);
    await EmailService.sendVerificationEmail(email, otp);
    return true;
  }

  static async getGoogleAuthUrl(expectedRole: string = "patient") {
    return GoogleAuthService.getGoogleAuthUrl(expectedRole);
  }

  static async exchangeGoogleCode(code: string) {
    return GoogleAuthService.exchangeGoogleCode(code);
  }

  static async googleCallback(
    accessToken: string,
    _refreshToken: string,
    expectedRole: string = "patient",
    code?: string,
  ) {
    return GoogleAuthService.googleCallback(
      accessToken,
      _refreshToken,
      expectedRole,
      code,
    );
  }
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
      } catch (e: any) {}
    }

    if (authUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      } catch (e: any) {}
    }

    if (localUser) {
      const client = await pool.connect();
      const uid = localUser.userId;
      try {
        await client.query("BEGIN");

        const targetAppointmentsSubquery = `
          SELECT a."appointmentId"
          FROM public."Appointment" a
          LEFT JOIN public."ProviderService" ps ON ps."providerServiceId" = a."providerServiceId"
          LEFT JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
          WHERE a."patientId" = $1
             OR pa."providerId" = $1
             OR pa."organizerId" = $1
        `;

        const dependentDeletes = [
          `DELETE FROM public."Rate"
           WHERE "patientId" = $1
              OR "providerId" = $1
              OR "appointmentId" IN (${targetAppointmentsSubquery})`,
          `DELETE FROM public."Prescription"
           WHERE "patientId" = $1
              OR "providerId" = $1
              OR "appointmentId" IN (${targetAppointmentsSubquery})`,
          `DELETE FROM public."MedicalNote"
           WHERE "patientId" = $1
              OR "providerId" = $1
              OR "appointmentId" IN (${targetAppointmentsSubquery})`,
          `DELETE FROM public."Appointment"
           WHERE "appointmentId" IN (${targetAppointmentsSubquery})`,
          `DELETE FROM public."Schedule"
           WHERE "assignmentId" IN (
             SELECT "assignmentId" FROM public."ProviderAssignment"
             WHERE "providerId" = $1 OR "organizerId" = $1
           )`,
          `DELETE FROM public."ProviderService"
           WHERE "assignmentId" IN (
             SELECT "assignmentId" FROM public."ProviderAssignment"
             WHERE "providerId" = $1 OR "organizerId" = $1
           )
           OR "organizerServiceId" IN (
             SELECT "organizerServiceId" FROM public."OrganizerService"
             WHERE "organizerId" = $1
           )`,
          `DELETE FROM public."OrganizerService" WHERE "organizerId" = $1`,
          `DELETE FROM public."ProviderAssignment" WHERE "providerId" = $1 OR "organizerId" = $1`,
        ];

        for (const sql of dependentDeletes) {
          try {
            await client.query(sql, [uid]);
          } catch (e: any) {}
        }

        await client.query(`DELETE FROM public."Patient" WHERE "userId" = $1`, [
          uid,
        ]);
        await client.query(
          `DELETE FROM public."Provider" WHERE "userId" = $1`,
          [uid],
        );
        await client.query(
          `DELETE FROM public."Organization" WHERE "userId" = $1`,
          [uid],
        );
        await client.query(`DELETE FROM public."Admin" WHERE "userId" = $1`, [
          uid,
        ]);
        await client.query(`DELETE FROM public."User" WHERE "userId" = $1`, [
          uid,
        ]);
        await client.query("COMMIT");
      } catch (dbErr) {
        await client.query("ROLLBACK");
        throw {
          status: 500,
          message: "Failed to delete local user data",
          code: "DELETE_FAILED",
        };
      } finally {
        client.release();
      }
    }

    await OtpService.clear(`verify_${email}`);
    await OtpService.clear(`reset_${email}`);
    return { email, deleted: true, authUserId };
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
    const remainingAuthIds = new Set((supData2?.users || []).map((u) => u.id));

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
          await client2.query(`DELETE FROM public."User" WHERE "userId" = $1`, [
            row.userId,
          ]);
          deletedFromLocal.push(row.email || row.userId);
        }
      }
    } finally {
      client2.release();
    }

    return {
      deletedFromAuth: deletedFromAuth.length,
      deletedFromLocal: deletedFromLocal.length,
    };
  }
}
