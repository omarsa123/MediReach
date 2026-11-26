import { pool } from "../../config/dbconfig.js";

export class RateModel {
  static async findByAppointment(appointmentId: number | string) {
    const result = await pool.query(
      `SELECT * FROM public."Rate" WHERE "appointmentId" = $1`,
      [appointmentId],
    );
    return result.rows[0] || null;
  }

  static async create(data: {
    appointmentId: number;
    patientId: string;
    ratingValue: number;
    comment?: string | null;
  }) {
    if (data.ratingValue < 1 || data.ratingValue > 5) {
      throw {
        status: 400,
        message: "ratingValue must be between 1 and 5",
        code: "INVALID_RATING",
      };
    }

    const appt = await pool.query(
      `SELECT "appointmentId", "patientId", "status"
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
    if (appt.rows[0].patientId !== data.patientId) {
      throw { status: 403, message: "Forbidden", code: "FORBIDDEN" };
    }
    if (appt.rows[0].status !== "Completed") {
      throw {
        status: 400,
        message: "You can only rate completed appointments",
        code: "APPOINTMENT_NOT_COMPLETED",
      };
    }

    const existing = await this.findByAppointment(data.appointmentId);
    if (existing) {
      throw {
        status: 409,
        message: "You already rated this appointment",
        code: "RATE_EXISTS",
      };
    }

    try {
      const result = await pool.query(
        `INSERT INTO public."Rate" ("appointmentId", "ratingValue", "comment")
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.appointmentId, data.ratingValue, data.comment ?? null],
      );
      return result.rows[0];
    } catch (err: any) {
      if (err?.code === "23505") {
        throw {
          status: 409,
          message: "You already rated this appointment",
          code: "RATE_EXISTS",
        };
      }
      throw err;
    }
  }

  static async update(
    appointmentId: number | string,
    patientId: string,
    data: { ratingValue?: number; comment?: string | null },
  ) {
    const appt = await pool.query(
      `SELECT a."patientId"
       FROM public."Appointment" a
       WHERE a."appointmentId" = $1`,
      [appointmentId],
    );
    if (appt.rows.length === 0) {
      throw {
        status: 404,
        message: "Appointment not found",
        code: "APPOINTMENT_NOT_FOUND",
      };
    }
    if (appt.rows[0].patientId !== patientId) {
      throw { status: 403, message: "Forbidden", code: "FORBIDDEN" };
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (data.ratingValue !== undefined) {
      if (data.ratingValue < 1 || data.ratingValue > 5) {
        throw {
          status: 400,
          message: "ratingValue must be between 1 and 5",
          code: "INVALID_RATING",
        };
      }
      fields.push(`"ratingValue" = $${idx++}`);
      values.push(data.ratingValue);
    }
    if (data.comment !== undefined) {
      fields.push(`"comment" = $${idx++}`);
      values.push(data.comment);
    }
    if (fields.length === 0) {
      throw { status: 400, message: "No fields to update", code: "NO_FIELDS" };
    }

    values.push(appointmentId);
    const result = await pool.query(
      `UPDATE public."Rate"
       SET ${fields.join(", ")}
       WHERE "appointmentId" = $${idx}
       RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  }

  static async listByProvider(providerId: string) {
    const result = await pool.query(
      `SELECT
         r."rateId",
         r."appointmentId",
         r."ratingValue",
         r."comment",
         r."createdAt",
         a."appointmentDate",
         pu."name" AS "patientName"
       FROM public."Rate" r
       JOIN public."Appointment" a ON a."appointmentId" = r."appointmentId"
       JOIN public."ProviderService" ps ON ps."providerServiceId" = a."providerServiceId"
       JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
       JOIN public."User" pu ON pu."userId" = a."patientId"
       WHERE pa."providerId" = $1
       ORDER BY r."createdAt" DESC`,
      [providerId],
    );
    return result.rows;
  }

  static async averageForProvider(providerId: string) {
    const result = await pool.query(
      `SELECT
         COALESCE(AVG(r."ratingValue"), 0)::numeric(3,2) AS "averageRating",
         COUNT(r."rateId")::int AS "totalRatings"
       FROM public."Rate" r
       JOIN public."Appointment" a ON a."appointmentId" = r."appointmentId"
       JOIN public."ProviderService" ps ON ps."providerServiceId" = a."providerServiceId"
       JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
       WHERE pa."providerId" = $1`,
      [providerId],
    );
    return result.rows[0];
  }

  static async listByOrganization(organizerId: string) {
    const result = await pool.query(
      `SELECT
         r."rateId",
         r."appointmentId",
         r."ratingValue",
         r."comment",
         r."createdAt",
         a."appointmentDate",
         pa."providerId",
         pu."name" AS "patientName",
         pru."name" AS "providerName"
       FROM public."Rate" r
       JOIN public."Appointment" a ON a."appointmentId" = r."appointmentId"
       JOIN public."ProviderService" ps ON ps."providerServiceId" = a."providerServiceId"
       JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
       JOIN public."User" pu ON pu."userId" = a."patientId"
       JOIN public."User" pru ON pru."userId" = pa."providerId"
       WHERE pa."organizerId" = $1
       ORDER BY r."createdAt" DESC`,
      [organizerId],
    );
    return result.rows;
  }
}
