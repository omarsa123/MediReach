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

  // بيانات إضافية حسب الدور
  birthDate?: string;
  gender?: string;
  bloodType?: string;
  providerType?: string;
  specialization?: string;
  licenseNumber?: string;
  organizationName?: string;
  organizerType?: "Clinic" | "Hospital" | "Lab" | "PhysiotherapyCenter";
  licenseDocumentUrl?: string;
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

      const insertUser = await client.query(
        `INSERT INTO public."User"
          ("userId", "name", "username", "email", "passwordHash", "phone", "address", "status")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending')
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
          `INSERT INTO public."Patient" ("userId", "bloodType")
           VALUES ($1, $2)
           ON CONFLICT ("userId") DO NOTHING`,
          [userId, data.bloodType || "Unknown"],
        );
        break;

      case "provider":
        await client.query(
          `INSERT INTO public."Provider"
            ("userId", "providerType", "specialization", "licenseNumber",
             "experienceYears", "verificationStatus", "profilePictureUrl")
           VALUES ($1, $2, $3, $4, 0, 'Pending', 'https://example.com/default-avatar.png')
           ON CONFLICT ("userId") DO NOTHING`,
          [
            userId,
            data.providerType || "Doctor",
            data.specialization || "Other",
            data.licenseNumber || `TEMP-${userId.slice(0, 8)}`,
          ],
        );
        break;

      case "organization":
        await client.query(
          `INSERT INTO public."Organization"
            ("userId", "organizationName", "organizerType", "address",
             "verificationStatus", "licenseDocumentUrl")
           VALUES ($1, $2, $3, $4, 'Pending', $5)
           ON CONFLICT ("userId") DO NOTHING`,
          [
            userId,
            data.organizationName || "Pending Name",
            data.organizerType || "Clinic",
            data.address || "Pending Address",
            data.licenseDocumentUrl ||
              "https://example.com/pending-license.pdf",
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

  // البحث بالـ ID مع استرجاع الـ role والبيانات المرتبطة
  static async findById(userId: string) {
    const result = await pool.query(
      `SELECT
         "userId", "name", "username", "email", "phone",
         "address", "profilePictureUrl", "createdAt", "status"
       FROM public."User"
       WHERE "userId" = $1`,
      [userId],
    );

    if (result.rows.length === 0) return null;
    const user = result.rows[0];

    try {
      const [patientRes, providerRes, orgRes, adminRes] = await Promise.all([
        pool.query(`SELECT "bloodType" FROM public."Patient" WHERE "userId" = $1 LIMIT 1`, [userId]),
        pool.query(`SELECT "providerType", "specialization", "licenseNumber" FROM public."Provider" WHERE "userId" = $1 LIMIT 1`, [userId]),
        pool.query(`SELECT "organizationName", "organizerType" FROM public."Organization" WHERE "userId" = $1 LIMIT 1`, [userId]),
        pool.query(`SELECT 1 FROM public."Admin" WHERE "userId" = $1 LIMIT 1`, [userId]),
      ]);

      if (providerRes.rows.length > 0) {
        user.role = "provider";
        user.specialization = providerRes.rows[0].specialization;
        user.providerType = providerRes.rows[0].providerType;
        user.licenseNumber = providerRes.rows[0].licenseNumber;
      } else if (orgRes.rows.length > 0) {
        user.role = "organization";
        user.organizationName = orgRes.rows[0].organizationName;
        user.organizerType = orgRes.rows[0].organizerType;
      } else if (adminRes.rows.length > 0) {
        user.role = "admin";
      } else {
        user.role = "patient";
        if (patientRes.rows.length > 0) {
          user.bloodType = patientRes.rows[0].bloodType;
        }
      }
    } catch {
      user.role = user.role || "patient";
    }

    return user;
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

  static async updatePasswordHash(userId: string, passwordHash: string): Promise<boolean> {
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
