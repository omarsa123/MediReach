import { pool } from "../../config/dbconfig.js";

export interface BookAppointmentInput {
  patientId: string;
  providerServiceId: number;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM or HH:MM:SS
  visitAddress?: string;
  visitNotes?: string;
}

function addMinutesToTime(startTime: string, minutes: number): string {
  const parts = startTime.split(":").map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}:00`;
}

function normalizeTime(t: string): string {
  const parts = t.trim().split(":");
  const h = String(Number(parts[0] || 0)).padStart(2, "0");
  const m = String(Number(parts[1] || 0)).padStart(2, "0");
  const s = parts[2] !== undefined ? String(Number(parts[2])).padStart(2, "0") : "00";
  return `${h}:${m}:${s}`;
}

export class AppointmentModel {
  /**
   * Book appointment: server computes price + endTime from ProviderService → OrganizerService.
   * Rejects overlapping non-cancelled appointments for the same providerService.
   */
  static async book(data: BookAppointmentInput) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const ps = await client.query(
        `SELECT
           ps."providerServiceId",
           ps."isActive" AS "psActive",
           ps."deliveryMode",
           os."price",
           os."durationMinutes",
           os."isActive" AS "osActive",
           pa."providerId",
           pa."status" AS "assignmentStatus"
         FROM public."ProviderService" ps
         JOIN public."OrganizerService" os
           ON os."organizerServiceId" = ps."organizerServiceId"
          AND os."organizerId" = ps."organizerId"
         JOIN public."ProviderAssignment" pa
           ON pa."assignmentId" = ps."assignmentId"
         WHERE ps."providerServiceId" = $1
         FOR UPDATE`,
        [data.providerServiceId],
      );

      if (ps.rows.length === 0) {
        throw {
          status: 404,
          message: "Provider service not found",
          code: "PROVIDER_SERVICE_NOT_FOUND",
        };
      }

      const row = ps.rows[0];
      if (!row.psActive || !row.osActive) {
        throw {
          status: 400,
          message: "This service is not currently available",
          code: "SERVICE_INACTIVE",
        };
      }
      if (row.assignmentStatus !== "Approved") {
        throw {
          status: 400,
          message: "Provider is not approved for this organization",
          code: "ASSIGNMENT_NOT_APPROVED",
        };
      }

      const startTime = normalizeTime(data.startTime);
      const duration = Number(row.durationMinutes) || 30;
      const endTime = addMinutesToTime(startTime, duration);
      const price = Number(row.price);

      // Conflict: overlapping active appointments on same providerService + date
      const conflict = await client.query(
        `SELECT "appointmentId"
         FROM public."Appointment"
         WHERE "providerServiceId" = $1
           AND "appointmentDate" = $2
           AND "status" NOT IN ('Cancelled')
           AND "startTime" < $4::time
           AND "endTime" > $3::time
         LIMIT 1
         FOR UPDATE`,
        [data.providerServiceId, data.appointmentDate, startTime, endTime],
      );

      if (conflict.rows.length > 0) {
        throw {
          status: 409,
          message: "This time slot is already booked",
          code: "SLOT_CONFLICT",
        };
      }

      const insert = await client.query(
        `INSERT INTO public."Appointment"
           ("patientId", "providerServiceId", "appointmentDate", "startTime", "endTime",
            "status", "priceAtBooking", "visitAddress", "visitNotes")
         VALUES ($1, $2, $3, $4, $5, 'Pending', $6, $7, $8)
         RETURNING *`,
        [
          data.patientId,
          data.providerServiceId,
          data.appointmentDate,
          startTime,
          endTime,
          price,
          data.visitAddress ?? null,
          data.visitNotes ?? null,
        ],
      );

      await client.query("COMMIT");
      return insert.rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /** @deprecated use book() — kept for compatibility */
  static async create(data: {
    patientId: string;
    providerServiceId: number;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    priceAtBooking: number;
    visitAddress?: string;
    visitNotes?: string;
  }) {
    return this.book({
      patientId: data.patientId,
      providerServiceId: data.providerServiceId,
      appointmentDate: data.appointmentDate,
      startTime: data.startTime,
      visitAddress: data.visitAddress,
      visitNotes: data.visitNotes,
    });
  }

  static async findById(appointmentId: number | string) {
    const result = await pool.query(
      `SELECT a.*,
              ps."deliveryMode",
              pa."providerId"
       FROM public."Appointment" a
       LEFT JOIN public."ProviderService" ps ON ps."providerServiceId" = a."providerServiceId"
       LEFT JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
       WHERE a."appointmentId" = $1`,
      [appointmentId],
    );
    return result.rows[0] || null;
  }

  static async listByPatient(patientId: string, status?: string) {
    const params: unknown[] = [patientId];
    let sql = `SELECT a.* FROM public."Appointment" a WHERE a."patientId" = $1`;
    if (status) {
      params.push(status);
      sql += ` AND a."status" = $2`;
    }
    sql += ` ORDER BY a."appointmentDate" DESC, a."startTime" DESC`;
    const result = await pool.query(sql, params);
    return result.rows;
  }

  /** Appointments for a provider (via ProviderService → Assignment) */
  static async listByProvider(providerId: string, status?: string) {
    const params: unknown[] = [providerId];
    let sql = `
      SELECT a.*
      FROM public."Appointment" a
      JOIN public."ProviderService" ps ON ps."providerServiceId" = a."providerServiceId"
      JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
      WHERE pa."providerId" = $1`;
    if (status) {
      params.push(status);
      sql += ` AND a."status" = $2`;
    }
    sql += ` ORDER BY a."appointmentDate" DESC, a."startTime" DESC`;
    const result = await pool.query(sql, params);
    return result.rows;
  }

  static async updateStatus(
    appointmentId: number | string,
    status: string,
    cancelledBy?: string | null,
  ) {
    const allowed = [
      "Pending",
      "Confirmed",
      "InProgress",
      "Completed",
      "Cancelled",
    ];
    if (!allowed.includes(status)) {
      throw {
        status: 400,
        message: `Invalid status. Allowed: ${allowed.join(", ")}`,
        code: "INVALID_STATUS",
      };
    }

    const result = await pool.query(
      `UPDATE public."Appointment"
       SET "status" = $1, "cancelledBy" = $2
       WHERE "appointmentId" = $3
       RETURNING *`,
      [status, cancelledBy ?? null, appointmentId],
    );
    return result.rows[0] || null;
  }

  static async isProviderOwner(
    appointmentId: number | string,
    providerId: string,
  ): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1
       FROM public."Appointment" a
       JOIN public."ProviderService" ps ON ps."providerServiceId" = a."providerServiceId"
       JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
       WHERE a."appointmentId" = $1 AND pa."providerId" = $2
       LIMIT 1`,
      [appointmentId, providerId],
    );
    return result.rows.length > 0;
  }
}
