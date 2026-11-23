import { pool } from "../../config/dbconfig.js";

export interface UpdateProviderInput {
  providerType?: "Doctor" | "Nurse" | "Physiotherapist" | "LabSpecialist";
  specialization?: string;
  licenseNumber?: string;
  qualification?: string;
  experienceYears?: number;
  profilePictureUrl?: string;
}

export class ProviderModel {
  // جلب بيانات المزود بالتفصيل مع جدول الUser الأساسي
  static async findProviderProfile(userId: string) {
    const result = await pool.query(
      `SELECT 
         u."userId", u."name", u."username", u."email", u."phone", 
         u."address", u."profilePictureUrl" AS "userProfilePicture", u."createdAt", u."status",
         pr."providerType", pr."specialization", pr."licenseNumber", 
         pr."qualification", pr."experienceYears", pr."verificationStatus", pr."profilePictureUrl"
       FROM public."User" u
       JOIN public."Provider" pr ON u."userId" = pr."userId"
       WHERE u."userId" = $1`,
      [userId],
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  // تحديث بيانات الـ Provider الخاصة
  static async updateProviderProfile(
    userId: string,
    data: UpdateProviderInput,
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.providerType !== undefined) {
      fields.push(`"providerType" = $${idx++}`);
      values.push(data.providerType);
    }
    if (data.specialization !== undefined) {
      fields.push(`"specialization" = $${idx++}`);
      values.push(data.specialization);
    }
    if (data.licenseNumber !== undefined) {
      fields.push(`"licenseNumber" = $${idx++}`);
      values.push(data.licenseNumber);
    }
    if (data.qualification !== undefined) {
      fields.push(`"qualification" = $${idx++}`);
      values.push(data.qualification);
    }
    if (data.experienceYears !== undefined) {
      fields.push(`"experienceYears" = $${idx++}`);
      values.push(data.experienceYears);
    }
    if (data.profilePictureUrl !== undefined) {
      fields.push(`"profilePictureUrl" = $${idx++}`);
      values.push(data.profilePictureUrl);
    }

    if (fields.length === 0) {
      return this.findProviderProfile(userId);
    }

    values.push(userId);

    await pool.query(
      `UPDATE public."Provider"
       SET ${fields.join(", ")}
       WHERE "userId" = $${idx}`,
      values,
    );

    return this.findProviderProfile(userId);
  }
}
