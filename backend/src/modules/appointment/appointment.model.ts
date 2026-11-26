import { pool } from "../../config/dbconfig.js";
import {
  bookAppointment,
  transitionAppointmentStatus,
  type BookAppointmentInput,
  type AppointmentStatus,
} from "./appointment.service.js";

export type { BookAppointmentInput };

export class AppointmentModel {
  /**
   * حجز موعد — يستخدم المنطق الموحد في appointment.service
   */
  static async book(data: BookAppointmentInput) {
    return bookAppointment(data);
  }

  /** @deprecated use book() — kept for compatibility */
  static async create(data: {
    patientId: string;
    providerServiceId: number;
    appointmentDate: string;
    startTime: string;
    endTime?: string;
    priceAtBooking?: number;
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
              pa."providerId",
              pa."organizerId"
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

  /**
   * تحديث الحالة مع التحقق من الانتقالات المسموح بها
   */
  static async updateStatus(
    appointmentId: number | string,
    status: AppointmentStatus,
    cancelledBy?: string | null,
  ) {
    return transitionAppointmentStatus(appointmentId, status, cancelledBy);
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

  static async isPatientOwner(
    appointmentId: number | string,
    patientId: string,
  ): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM public."Appointment"
       WHERE "appointmentId" = $1 AND "patientId" = $2
       LIMIT 1`,
      [appointmentId, patientId],
    );
    return result.rows.length > 0;
  }
}
