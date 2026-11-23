import { pool } from "../../config/dbconfig.js";

export interface UpdatePatientInput {
  birthDate?: string;
  gender?: string;
  bloodType?: string;
  allergies?: string;
  medicalHistory?: string;
}

export class PatientModel {
  // جلب بيانات المريض بالتفصيل مع جدول الUser الأساسي
  static async findPatientProfile(userId: string) {
    const result = await pool.query(
      `SELECT 
         u."userId", u."name", u."username", u."email", u."phone", 
         u."address", u."profilePictureUrl", u."createdAt", u."status",
         p."birthDate", p."gender", p."bloodType", p."allergies", p."medicalHistory"
       FROM public."User" u
       JOIN public."Patient" p ON u."userId" = p."userId"
       WHERE u."userId" = $1`,
      [userId],
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  // تحديث بيانات المريض الخاصة فقط
  static async updatePatientProfile(userId: string, data: UpdatePatientInput) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.birthDate !== undefined) {
      fields.push(`"birthDate" = $${idx++}`);
      values.push(data.birthDate);
    }
    if (data.gender !== undefined) {
      fields.push(`"gender" = $${idx++}`);
      values.push(data.gender);
    }
    if (data.bloodType !== undefined) {
      fields.push(`"bloodType" = $${idx++}`);
      values.push(data.bloodType);
    }
    if (data.allergies !== undefined) {
      fields.push(`"allergies" = $${idx++}`);
      values.push(data.allergies);
    }
    if (data.medicalHistory !== undefined) {
      fields.push(`"medicalHistory" = $${idx++}`);
      values.push(data.medicalHistory);
    }

    if (fields.length === 0) {
      return this.findPatientProfile(userId);
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE public."Patient"
       SET ${fields.join(", ")}
       WHERE "userId" = $${idx}
       RETURNING "birthDate", "gender", "bloodType", "allergies", "medicalHistory"`,
      values,
    );

    if (result.rows.length === 0) return null;
    return this.findPatientProfile(userId);
  }
}
