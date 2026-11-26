import { pool } from "../../config/dbconfig.js";

export class PaymentModel {
  static async findByAppointment(appointmentId: number | string) {
    const result = await pool.query(
      `SELECT p.*, a."patientId", a."status" AS "appointmentStatus", a."priceAtBooking"
       FROM public."Payment" p
       JOIN public."Appointment" a ON a."appointmentId" = p."appointmentId"
       WHERE p."appointmentId" = $1`,
      [appointmentId],
    );
    return result.rows[0] || null;
  }

  static async findById(paymentId: number | string) {
    const result = await pool.query(
      `SELECT
         p.*,
         a."patientId",
         a."status" AS "appointmentStatus",
         a."priceAtBooking",
         a."appointmentDate",
         a."startTime",
         pa."providerId",
         pa."organizerId"
       FROM public."Payment" p
       JOIN public."Appointment" a ON a."appointmentId" = p."appointmentId"
       JOIN public."ProviderService" ps ON ps."providerServiceId" = a."providerServiceId"
       JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
       WHERE p."paymentId" = $1`,
      [paymentId],
    );
    return result.rows[0] || null;
  }

  static async create(data: {
    appointmentId: number;
    amount: number;
    paymentMethod: "Online" | "AtOrganizer";
  }) {
    const appt = await pool.query(
      `SELECT "appointmentId", "priceAtBooking", "status"
       FROM public."Appointment"
       WHERE "appointmentId" = $1`,
      [data.appointmentId],
    );
    if (appt.rows.length === 0) {
      throw {
        status: 404,
        message: "Appointment not found",
        code: "APPOINTMENT_NOT_FOUND",
      };
    }
    if (["Cancelled"].includes(appt.rows[0].status)) {
      throw {
        status: 400,
        message: "Cannot create payment for a cancelled appointment",
        code: "APPOINTMENT_CANCELLED",
      };
    }
    if (data.amount < 0) {
      throw {
        status: 400,
        message: "Amount must be >= 0",
        code: "INVALID_AMOUNT",
      };
    }

    // Prevent duplicate (unique on appointmentId)
    const existing = await pool.query(
      `SELECT "paymentId" FROM public."Payment" WHERE "appointmentId" = $1`,
      [data.appointmentId],
    );
    if (existing.rows.length > 0) {
      throw {
        status: 409,
        message: "Payment already exists for this appointment",
        code: "PAYMENT_EXISTS",
      };
    }

    try {
      const result = await pool.query(
        `INSERT INTO public."Payment"
           ("appointmentId", "amount", "paymentMethod", "paymentStatus")
         VALUES ($1, $2, $3, 'Pending')
         RETURNING *`,
        [data.appointmentId, data.amount, data.paymentMethod],
      );
      return result.rows[0];
    } catch (err: any) {
      if (err?.code === "23505") {
        throw {
          status: 409,
          message: "Payment already exists for this appointment",
          code: "PAYMENT_EXISTS",
        };
      }
      throw err;
    }
  }

  static async updateStatus(
    paymentId: number | string,
    paymentStatus: "Pending" | "Paid" | "Failed" | "Refunded",
  ) {
    const current = await this.findById(paymentId);
    if (!current) return null;

    // Simple transition guards
    if (current.paymentStatus === "Refunded" && paymentStatus !== "Refunded") {
      throw {
        status: 400,
        message: "Cannot change status of a refunded payment",
        code: "INVALID_TRANSITION",
      };
    }
    if (current.paymentStatus === "Paid" && paymentStatus === "Pending") {
      throw {
        status: 400,
        message: "Cannot revert a paid payment back to Pending",
        code: "INVALID_TRANSITION",
      };
    }

    const paidAtClause =
      paymentStatus === "Paid" ? `, "paidAt" = CURRENT_TIMESTAMP` : "";
    const clearPaidAt =
      paymentStatus !== "Paid" && current.paymentStatus === "Paid"
        ? `, "paidAt" = NULL`
        : "";

    const result = await pool.query(
      `UPDATE public."Payment"
       SET "paymentStatus" = $1 ${paidAtClause}${clearPaidAt}
       WHERE "paymentId" = $2
       RETURNING *`,
      [paymentStatus, paymentId],
    );
    return result.rows[0] || null;
  }

  static async listByPatient(patientId: string, status?: string) {
    const params: unknown[] = [patientId];
    let statusFilter = "";
    if (status) {
      statusFilter = ` AND p."paymentStatus" = $2`;
      params.push(status);
    }
    const result = await pool.query(
      `SELECT
         p.*,
         a."appointmentDate",
         a."startTime",
         a."status" AS "appointmentStatus",
         a."priceAtBooking"
       FROM public."Payment" p
       JOIN public."Appointment" a ON a."appointmentId" = p."appointmentId"
       WHERE a."patientId" = $1 ${statusFilter}
       ORDER BY p."paymentId" DESC`,
      params,
    );
    return result.rows;
  }

  static async listByProvider(providerId: string, status?: string) {
    const params: unknown[] = [providerId];
    let statusFilter = "";
    if (status) {
      statusFilter = ` AND p."paymentStatus" = $2`;
      params.push(status);
    }
    const result = await pool.query(
      `SELECT
         p.*,
         a."appointmentDate",
         a."startTime",
         a."status" AS "appointmentStatus",
         a."patientId",
         pu."name" AS "patientName"
       FROM public."Payment" p
       JOIN public."Appointment" a ON a."appointmentId" = p."appointmentId"
       JOIN public."ProviderService" ps ON ps."providerServiceId" = a."providerServiceId"
       JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
       JOIN public."User" pu ON pu."userId" = a."patientId"
       WHERE pa."providerId" = $1 ${statusFilter}
       ORDER BY p."paymentId" DESC`,
      params,
    );
    return result.rows;
  }

  static async listByOrganization(organizerId: string, status?: string) {
    const params: unknown[] = [organizerId];
    let statusFilter = "";
    if (status) {
      statusFilter = ` AND p."paymentStatus" = $2`;
      params.push(status);
    }
    const result = await pool.query(
      `SELECT
         p.*,
         a."appointmentDate",
         a."startTime",
         a."status" AS "appointmentStatus",
         a."patientId",
         pu."name" AS "patientName",
         pa."providerId"
       FROM public."Payment" p
       JOIN public."Appointment" a ON a."appointmentId" = p."appointmentId"
       JOIN public."ProviderService" ps ON ps."providerServiceId" = a."providerServiceId"
       JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
       JOIN public."User" pu ON pu."userId" = a."patientId"
       WHERE pa."organizerId" = $1 ${statusFilter}
       ORDER BY p."paymentId" DESC`,
      params,
    );
    return result.rows;
  }
}
