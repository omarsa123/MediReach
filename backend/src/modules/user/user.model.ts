import { pool } from "../../config/dbconfig.js";
import bcrypt from "bcrypt";

export type UserRole = "patient" | "provider" | "organization" | "admin";

export interface RegisterInput {
  name: string;
  username: string;
  email: string;
  password?: string;
  phone: string;
  address?: string;
  role: UserRole;

  // Patient
  birthDate?: string;
  gender?: string;
  bloodType?: string;
  allergies?: string;
  medicalHistory?: string;

  // Provider
  providerType?: string;
  specialization?: string;
  licenseNumber?: string;
  qualification?: string;
  experienceYears?: number;

  // Organization
  organizationName?: string;
  organizerType?: "Clinic" | "Hospital" | "Lab" | "PhysiotherapyCenter";
  licenseDocumentUrl?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  logoUrl?: string;
}

export interface UpdateProfileInput {
  name?: string;
  username?: string;
  phone?: string;
  address?: string;
  profilePictureUrl?: string;
}

export class UserModel {
  // متوافقة مع استدعاء الـ Controller القديم والجديد
  static async createFromAuth(
    userId: string,
    data: RegisterInput,
    explicitPasswordHash?: string,
  ) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const passwordHash = explicitPasswordHash
        ? explicitPasswordHash
        : data.password
          ? await bcrypt.hash(data.password, 10)
          : await bcrypt.hash("OAUTH_USER_DEFAULT_PASS", 10);

      // Use Inactive (allowed by default CHECK). Patient → Active after OTP.
      // Provider stays Inactive until admin sets Active/Approved.
      const initialStatus = "Inactive";

      const insertUser = await client.query(
        `INSERT INTO public."User"
          ("userId", "name", "username", "email", "passwordHash", "phone", "address", "status")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING
           "userId", "name", "username", "email", "phone",
           "address", "profilePictureUrl", "createdAt", "status"`,
        [
          userId,
          data.name,
          data.username,
          data.email,
          passwordHash,
          data.phone,
          data.address ?? null,
          initialStatus, // 👈 هنا بنمرر الحالة الصح حسب الدور
        ],
      );

      const user = insertUser.rows[0];

      // إنشاء الصف في الجدول الفرعي حسب الـ Role
      await this.createRoleRow(client, userId, data);

      await client.query("COMMIT");
      return { ...user, role: data.role ?? "patient" };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // توزيع الصفوف الفرعية حسب الـ Role والجدول المطلوب
  private static async createRoleRow(
    client: any,
    userId: string,
    data: RegisterInput,
  ) {
    const role = data.role ?? "patient";
    switch (role) {
      case "patient":
        await client.query(
          `INSERT INTO public."Patient"
            ("userId", "bloodType", "birthDate", "gender", "allergies", "medicalHistory")
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT ("userId") DO NOTHING`,
          [
            userId,
            data.bloodType || "Unknown",
            data.birthDate || null,
            data.gender || null,
            data.allergies || null,
            data.medicalHistory || null,
          ],
        );
        break;

      case "provider":
        await client.query(
          `INSERT INTO public."Provider"
            ("userId", "providerType", "specialization", "licenseNumber",
             "qualification", "experienceYears", "verificationStatus", "profilePictureUrl")
           VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7)
           ON CONFLICT ("userId") DO NOTHING`,
          [
            userId,
            data.providerType || "Doctor",
            data.specialization || "Other",
            data.licenseNumber || `TEMP-${userId.slice(0, 8)}`,
            data.qualification || null,
            data.experienceYears ?? 0,
            "https://example.com/default-avatar.png",
          ],
        );
        break;

      case "organization":
        await client.query(
          `INSERT INTO public."Organization"
            ("userId", "organizationName", "organizerType", "address",
             "verificationStatus", "licenseDocumentUrl", "description",
             "latitude", "longitude", "logoUrl")
           VALUES ($1, $2, $3, $4, 'Pending', $5, $6, $7, $8, $9)
           ON CONFLICT ("userId") DO NOTHING`,
          [
            userId,
            data.organizationName || "Pending Name",
            data.organizerType || "Clinic",
            data.address || "Pending Address",
            data.licenseDocumentUrl ||
              "https://example.com/pending-license.pdf",
            data.description || null,
            data.latitude ?? null,
            data.longitude ?? null,
            data.logoUrl || null,
          ],
        );
        break;

      case "admin":
        await client.query(
          `INSERT INTO public."Admin" ("userId")
           VALUES ($1)
           ON CONFLICT ("userId") DO NOTHING`,
          [userId],
        );
        break;

      default:
        await client.query(
          `INSERT INTO public."Patient" ("userId", "bloodType")
           VALUES ($1, 'Unknown')
           ON CONFLICT ("userId") DO NOTHING`,
          [userId],
        );
    }
  }

  // البحث بالـ ID مع استرجاع الـ role والبيانات المرتبطة — كويري واحدة فقط
  static async findById(userId: string) {
    const result = await pool.query(
      `SELECT
         u."userId", u."name", u."username", u."email", u."phone",
         u."address", u."profilePictureUrl", u."createdAt", u."status",
         CASE
           WHEN pr."userId" IS NOT NULL THEN 'provider'
           WHEN o."userId"  IS NOT NULL THEN 'organization'
           WHEN a."userId"  IS NOT NULL THEN 'admin'
           ELSE 'patient'
         END AS role,
         p."bloodType",
         pr."providerType", pr."specialization", pr."licenseNumber",
         o."organizationName", o."organizerType"
       FROM public."User" u
       LEFT JOIN public."Patient"      p  ON p."userId"  = u."userId"
       LEFT JOIN public."Provider"     pr ON pr."userId" = u."userId"
       LEFT JOIN public."Organization" o  ON o."userId"  = u."userId"
       LEFT JOIN public."Admin"        a  ON a."userId"  = u."userId"
       WHERE u."userId" = $1
       LIMIT 1`,
      [userId],
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  // تحديث البروفايل
  static async updateProfile(userId: string, data: UpdateProfileInput) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`"name" = $${idx++}`);
      values.push(data.name);
    }
    if (data.username !== undefined) {
      fields.push(`"username" = $${idx++}`);
      values.push(data.username);
    }
    if (data.phone !== undefined) {
      fields.push(`"phone" = $${idx++}`);
      values.push(data.phone);
    }
    if (data.address !== undefined) {
      fields.push(`"address" = $${idx++}`);
      values.push(data.address);
    }
    if (data.profilePictureUrl !== undefined) {
      fields.push(`"profilePictureUrl" = $${idx++}`);
      values.push(data.profilePictureUrl);
    }

    if (fields.length === 0) {
      return this.findById(userId);
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE public."User"
       SET ${fields.join(", ")}
       WHERE "userId" = $${idx}
       RETURNING
         "userId", "name", "username", "email", "phone",
         "address", "profilePictureUrl", "createdAt", "status"`,
      values,
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  // دوال فحص التوافر مع دعم الاستثناء عند التحديث
  static async isUsernameTaken(
    username: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    const query = excludeUserId
      ? `SELECT 1 FROM public."User" WHERE "username" = $1 AND "userId" != $2 LIMIT 1`
      : `SELECT 1 FROM public."User" WHERE "username" = $1 LIMIT 1`;
    const params = excludeUserId ? [username, excludeUserId] : [username];
    const res = await pool.query(query, params);
    return res.rows.length > 0;
  }

  static async isEmailTaken(email: string): Promise<boolean> {
    const res = await pool.query(
      `SELECT 1 FROM public."User" WHERE "email" = $1 LIMIT 1`,
      [email],
    );
    return res.rows.length > 0;
  }

  static async isPhoneTaken(
    phone: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    const query = excludeUserId
      ? `SELECT 1 FROM public."User" WHERE "phone" = $1 AND "userId" != $2 LIMIT 1`
      : `SELECT 1 FROM public."User" WHERE "phone" = $1 LIMIT 1`;
    const params = excludeUserId ? [phone, excludeUserId] : [phone];
    const res = await pool.query(query, params);
    return res.rows.length > 0;
  }

  static async findByEmail(email: string) {
    const result = await pool.query(
      `SELECT
         "userId", "name", "username", "email", "phone", "passwordHash",
         "address", "profilePictureUrl", "createdAt", "status"
       FROM public."User"
       WHERE "email" = $1`,
      [email],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  static async updatePasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<boolean> {
    const result = await pool.query(
      `UPDATE public."User"
       SET "passwordHash" = $1
       WHERE "userId" = $2
       RETURNING "userId"`,
      [passwordHash, userId],
    );
    return result.rows.length > 0;
  }

  static async deleteByEmail(email: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM public."User" WHERE "email" = $1 RETURNING "userId"`,
      [email],
    );
    return result.rows.length > 0;
  }
}
