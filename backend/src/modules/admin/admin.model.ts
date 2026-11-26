import { pool } from "../../config/dbconfig.js";

export class AdminModel {
  static async listPendingProviders() {
    const result = await pool.query(
      `SELECT
         pr."userId",
         u."name",
         u."email",
         u."phone",
         pr."providerType",
         pr."specialization",
         pr."licenseNumber",
         pr."qualification",
         pr."experienceYears",
         pr."verificationStatus",
         pr."profilePictureUrl",
         u."createdAt"
       FROM public."Provider" pr
       JOIN public."User" u ON u."userId" = pr."userId"
       WHERE pr."verificationStatus" = 'Pending'
       ORDER BY u."createdAt" ASC`,
    );
    return result.rows;
  }

  static async updateProviderVerification(
    providerId: string,
    status: "Pending" | "Approved" | "Rejected",
  ) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query(
        `SELECT "verificationStatus" FROM public."Provider" WHERE "userId" = $1 FOR UPDATE`,
        [providerId],
      );
      if (current.rows.length === 0) { await client.query("ROLLBACK"); return null; }
      const from = current.rows[0].verificationStatus as string;
      const allowed: Record<string, string[]> = { Pending: ["Approved", "Rejected"], Approved: ["Pending", "Rejected"], Rejected: ["Pending", "Approved"] };
      if (!(allowed[from] || []).includes(status)) {
        throw { status: 400, message: `Cannot change provider verification from ${from} to ${status}`, code: "INVALID_VERIFICATION_TRANSITION" };
      }
      const result = await client.query(
        `UPDATE public."Provider" SET "verificationStatus" = $1 WHERE "userId" = $2 RETURNING *`,
        [status, providerId],
      );
      await client.query(
        `UPDATE public."User" SET "status" = $1 WHERE "userId" = $2`,
        [status === "Approved" ? "Active" : status === "Rejected" ? "Suspended" : "Inactive", providerId],
      );
      await client.query("COMMIT");
      return result.rows[0] || null;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  static async listPendingOrganizations() {
    const result = await pool.query(
      `SELECT
         o."userId",
         u."name",
         u."email",
         u."phone",
         o."organizationName",
         o."organizerType",
         o."address",
         o."verificationStatus",
         o."licenseDocumentUrl",
         o."logoUrl",
         o."createdAt"
       FROM public."Organization" o
       JOIN public."User" u ON u."userId" = o."userId"
       WHERE o."verificationStatus" = 'Pending'
       ORDER BY o."createdAt" ASC`,
    );
    return result.rows;
  }

  static async updateOrganizationVerification(
    organizationId: string,
    status: "Pending" | "Approved" | "Rejected",
  ) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query(
        `SELECT "verificationStatus" FROM public."Organization" WHERE "userId" = $1 FOR UPDATE`,
        [organizationId],
      );
      if (current.rows.length === 0) { await client.query("ROLLBACK"); return null; }
      const from = current.rows[0].verificationStatus as string;
      const allowed: Record<string, string[]> = { Pending: ["Approved", "Rejected"], Approved: ["Pending", "Rejected"], Rejected: ["Pending", "Approved"] };
      if (!(allowed[from] || []).includes(status)) {
        throw { status: 400, message: `Cannot change organization verification from ${from} to ${status}`, code: "INVALID_VERIFICATION_TRANSITION" };
      }
      const result = await client.query(
        `UPDATE public."Organization" SET "verificationStatus" = $1 WHERE "userId" = $2 RETURNING *`,
        [status, organizationId],
      );
      await client.query(
        `UPDATE public."User" SET "status" = $1 WHERE "userId" = $2`,
        [status === "Approved" ? "Active" : status === "Rejected" ? "Suspended" : "Inactive", organizationId],
      );
      await client.query("COMMIT");
      return result.rows[0] || null;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  static async listUsers(filters?: { status?: string; role?: string }) {
    // role is derived by existence in role tables
    let roleJoin = "";
    let roleSelect = `
      CASE
        WHEN EXISTS (SELECT 1 FROM public."Admin" a WHERE a."userId" = u."userId") THEN 'admin'
        WHEN EXISTS (SELECT 1 FROM public."Organization" o WHERE o."userId" = u."userId") THEN 'organization'
        WHEN EXISTS (SELECT 1 FROM public."Provider" p WHERE p."userId" = u."userId") THEN 'provider'
        WHEN EXISTS (SELECT 1 FROM public."Patient" p WHERE p."userId" = u."userId") THEN 'patient'
        ELSE 'unknown'
      END AS "role"`;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.status) {
      conditions.push(`u."status" = $${idx++}`);
      values.push(filters.status);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT
         u."userId", u."name", u."username", u."email", u."phone",
         u."status", u."createdAt",
         ${roleSelect}
       FROM public."User" u
       ${roleJoin}
       ${where}
       ORDER BY u."createdAt" DESC
       LIMIT 200`,
      values,
    );

    let rows = result.rows;
    if (filters?.role) {
      rows = rows.filter((r: any) => r.role === filters.role);
    }
    return rows;
  }

  static async updateUserStatus(
    userId: string,
    status: "Active" | "Inactive" | "Suspended",
  ) {
    const result = await pool.query(
      `UPDATE public."User"
       SET "status" = $1
       WHERE "userId" = $2
       RETURNING "userId", "name", "email", "status"`,
      [status, userId],
    );
    return result.rows[0] || null;
  }

  static async listOrganizations(type?: string) {
    const values: unknown[] = [];
    const where = type ? `WHERE o."organizerType" = $1` : "";
    if (type) values.push(type);
    const result = await pool.query(
      `SELECT o."userId", o."organizationName", o."organizerType", o."address",
              o."verificationStatus", o."licenseDocumentUrl", o."createdAt",
              u."email", u."phone", u."status"
       FROM public."Organization" o
       JOIN public."User" u ON u."userId" = o."userId"
       ${where} ORDER BY o."createdAt" DESC`,
      values,
    );
    return result.rows;
  }

  static async dashboardStats() {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM public."User") AS "totalUsers",
        (SELECT COUNT(*)::int FROM public."Patient") AS "totalPatients",
        (SELECT COUNT(*)::int FROM public."Provider") AS "totalProviders",
        (SELECT COUNT(*)::int FROM public."Organization") AS "totalOrganizations",
        (SELECT COUNT(*)::int FROM public."Appointment") AS "totalAppointments",
        (SELECT COUNT(*)::int FROM public."Appointment" WHERE "status" = 'Pending') AS "pendingAppointments",
        (SELECT COUNT(*)::int FROM public."Provider" WHERE "verificationStatus" = 'Pending') AS "pendingProviders",
        (SELECT COUNT(*)::int FROM public."Organization" WHERE "verificationStatus" = 'Pending') AS "pendingOrganizations"
    `);
    return result.rows[0];
  }
}
