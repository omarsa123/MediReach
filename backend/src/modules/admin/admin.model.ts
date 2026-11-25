import { pool } from "../../config/dbconfig.js";

export class AdminModel {
  // 1. جلب إحصائيات الداشبورد
  static async getDashboardStats() {
  const client = await pool.connect();
  try {
    const [users, hospitals, clinics, labs, physio, pending] = await Promise.all([
      client.query(`SELECT COUNT(*)::int AS count FROM public."User"`),
      client.query(`SELECT COUNT(*)::int AS count FROM public."Organization" WHERE "organizerType" = 'Hospital'`),
      client.query(`SELECT COUNT(*)::int AS count FROM public."Organization" WHERE "organizerType" = 'Clinic'`),
      client.query(`SELECT COUNT(*)::int AS count FROM public."Organization" WHERE "organizerType" = 'Lab'`),
      client.query(`SELECT COUNT(*)::int AS count FROM public."Organization" WHERE "organizerType" = 'PhysiotherapyCenter'`),
      client.query(`SELECT COUNT(*)::int AS count FROM public."Organization" WHERE "verificationStatus" = 'Pending'`),
    ]);

    return {
      totalUsers: users.rows[0].count,
      totalHospitals: hospitals.rows[0].count,
      totalClinics: clinics.rows[0].count,
      totalLabs: labs.rows[0].count,
      totalPhysio: physio.rows[0].count,
      pendingCount: pending.rows[0].count,
    };
  } finally {
    client.release();
  }
}

  // 2. جلب المنظمات اللي في انتظار الموافقة
  static async getPendingOrganizations() {
    const result = await pool.query(`
      SELECT 
        o."userId", 
        o."organizationName", 
        o."organizerType", 
        o."address", 
        o."licenseDocumentUrl", 
        o."verificationStatus",
        u."email",
        u."phone",
        o."createdAt"
      FROM public."Organization" o
      JOIN public."User" u ON o."userId" = u."userId"
      WHERE o."verificationStatus" = 'Pending'
      ORDER BY o."createdAt" ASC
    `);
    return result.rows;
  }

  // 3. الموافقة أو الرفض على منظمة (Transaction)
  static async verifyOrganization(organizationId: string, status: "Approved" | "Rejected") {
    const client = await pool.connect();
    try {
      await client.query("BEGIN"); // بداية الترانزاكشن
      
      // تحديث حالة المنظمة
      const updateOrg = await client.query(`
        UPDATE public."Organization" 
        SET "verificationStatus" = $1 
        WHERE "userId" = $2 
        RETURNING *
      `, [status, organizationId]);

      if (updateOrg.rows.length === 0) {
        throw { status: 404, message: "Organization not found", code: "NOT_FOUND" };
      }

      // لو تم الموافقة، نفعل حساب اليوزر الأساسي عشان يقدر يدخل
      if (status === "Approved") {
        await client.query(`
          UPDATE public."User" 
          SET "status" = 'Active' 
          WHERE "userId" = $1
        `, [organizationId]);
      } else if (status === "Rejected") {
        await client.query(`
          UPDATE public."User" 
          SET "status" = 'Suspended' 
          WHERE "userId" = $1
        `, [organizationId]);
      }

      await client.query("COMMIT"); // تأكيد التعديلات
      return updateOrg.rows[0];
    } catch (error) {
      await client.query("ROLLBACK"); // التراجع لو حصل إيرور
      throw error;
    } finally {
      client.release();
    }
  }

  // 4. جلب كل المستخدمين (لإدارة المستخدمين)
  static async getAllUsers() {
    const result = await pool.query(`
      SELECT "userId", "name", "email", "phone", "status", "createdAt"
      FROM public."User"
      ORDER BY "createdAt" DESC
    `);
    return result.rows;
  }

  // 5. إيقاف أو تفعيل مستخدم
  static async toggleUserStatus(userId: string, status: "Active" | "Suspended") {
    const result = await pool.query(`
      UPDATE public."User" 
      SET "status" = $1 
      WHERE "userId" = $2 
      RETURNING "userId", "status"
    `, [status, userId]);
    
    if (result.rows.length === 0) {
      throw { status: 404, message: "User not found", code: "NOT_FOUND" };
    }
    return result.rows[0];
  }
  static async getAllOrganizations(type?: string) {
  const params: unknown[] = [];
  let where = "";
  if (type) {
    params.push(type);
    where = `WHERE o."organizerType" = $1`;
  }

  const result = await pool.query(
    `SELECT
       o."userId", o."organizationName", o."organizerType", o."address",
       o."verificationStatus", o."licenseDocumentUrl", o."createdAt",
       u."email", u."phone", u."status"
     FROM public."Organization" o
     JOIN public."User" u ON u."userId" = o."userId"
     ${where}
     ORDER BY o."createdAt" DESC`,
    params,
  );
  return result.rows;
}
}