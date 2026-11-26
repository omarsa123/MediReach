import { pool } from "../../config/dbconfig.js";
import { bookAppointment } from "../appointment/appointment.service.js";

export interface UpdatePatientInput {
  birthDate?: string;
  gender?: "Female" | "Male" | "Other" | "PreferNotToSay" | string;
  bloodType?:
    | "A_Positive"
    | "A_Negative"
    | "B_Positive"
    | "B_Negative"
    | "AB_Positive"
    | "AB_Negative"
    | "O_Positive"
    | "O_Negative"
    | "Unknown"
    | string;
  allergies?: string;
  medicalHistory?: string;
  profilePictureUrl?: string | null;
}

export interface ProviderSearchFilters {
  search?: string;
  specialization?: string;
  providerType?:
    | "Doctor"
    | "Nurse"
    | "Physiotherapist"
    | "LabSpecialist"
    | string;
  deliveryMode?: "Online" | "InPerson" | "HomeVisit" | string;
  organizationId?: string;
  serviceId?: number | string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "price" | "name" | string;
  order?: "asc" | "desc" | string;
  page?: number;
  limit?: number;
}

export interface CreateAppointmentInput {
  providerServiceId: number;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM or HH:MM:SS
  /** @deprecated يُحسب من السيرفر — لا ترسله من العميل */
  endTime?: string;
  visitAddress?: string | null;
  visitNotes?: string | null;
}

export interface ListAppointmentsFilters {
  status?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: "date" | string;
  order?: "asc" | "desc" | string;
  page?: number;
  limit?: number;
}

function timeToMinutes(t: string): number {
  const parts = t.split(":").map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

function getDayOfWeekName(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw {
      status: 400,
      message: "date must strictly use YYYY-MM-DD format",
      code: "INVALID_DATE_FORMAT",
    };
  }
  const names = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const d = new Date(`${dateStr}T12:00:00Z`);
  return names[d.getUTCDay()];
}

export class PatientModel {
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

    const row = result.rows[0];
    if (!row.profilePictureUrl && process.env.DEFAULT_PATIENT_AVATAR_URL) {
      row.profilePictureUrl = process.env.DEFAULT_PATIENT_AVATAR_URL;
    }
    return row;
  }

  static async updatePatientProfile(userId: string, data: UpdatePatientInput) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (data.profilePictureUrl !== undefined) {
        await client.query(
          `UPDATE public."User"
           SET "profilePictureUrl" = $1
           WHERE "userId" = $2`,
          [data.profilePictureUrl, userId],
        );
      }

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

      if (fields.length > 0) {
        values.push(userId);
        await client.query(
          `UPDATE public."Patient"
           SET ${fields.join(", ")}
           WHERE "userId" = $${idx}`,
          values,
        );
      }

      await client.query("COMMIT");
      return this.findPatientProfile(userId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async searchProviders(filters: ProviderSearchFilters) {
    const conditions: string[] = [
      `u."status" = 'Active'`,
      `pr."verificationStatus" = 'Approved'`,
    ];
    const values: unknown[] = [];
    let idx = 1;

    if (filters.providerType) {
      conditions.push(`LOWER(pr."providerType"::text) = LOWER($${idx++})`);
      values.push(filters.providerType.trim());
    }

    if (filters.specialization) {
      conditions.push(`LOWER(pr."specialization") = LOWER($${idx++})`);
      values.push(filters.specialization.trim());
    }

    if (filters.deliveryMode) {
      conditions.push(`ps."deliveryMode" = $${idx++}`);
      values.push(filters.deliveryMode.trim());
    }

    if (filters.organizationId) {
      conditions.push(`pa."organizerId" = $${idx++}`);
      values.push(filters.organizationId.trim());
    }

    if (filters.serviceId !== undefined && filters.serviceId !== "") {
      conditions.push(`s."serviceId" = $${idx++}`);
      values.push(Number(filters.serviceId));
    }

    if (filters.minPrice !== undefined && !Number.isNaN(filters.minPrice)) {
      conditions.push(`os."price" >= $${idx++}`);
      values.push(filters.minPrice);
    }

    if (filters.maxPrice !== undefined && !Number.isNaN(filters.maxPrice)) {
      conditions.push(`os."price" <= $${idx++}`);
      values.push(filters.maxPrice);
    }

    if (filters.search) {
      conditions.push(
        `(LOWER(u."name") LIKE LOWER($${idx})
          OR LOWER(pr."specialization") LIKE LOWER($${idx})
          OR LOWER(COALESCE(s."name", '')) LIKE LOWER($${idx})
          OR LOWER(COALESCE(o."organizationName", '')) LIKE LOWER($${idx}))`,
      );
      values.push(`%${filters.search.trim()}%`);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const direction =
      String(filters.order || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
    const orderByClause =
      String(filters.sortBy || "").toLowerCase() === "price"
        ? `ORDER BY os."price" ${direction} NULLS LAST, u."name" ASC`
        : `ORDER BY u."name" ${direction}`;

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    values.push(limit, offset);

    const result = await pool.query(
      `SELECT DISTINCT
         pr."userId" AS "providerId",
         u."name",
         u."address",
         pr."providerType",
         pr."specialization",
         pr."qualification",
         pr."experienceYears",
         pr."verificationStatus",
         pr."profilePictureUrl",
         0 AS "rating",
         0 AS "reviewCount",
         o."userId" AS "organizationId",
         o."organizationName",
         o."organizerType",
         ps."providerServiceId",
         ps."deliveryMode",
         os."price",
         os."durationMinutes",
         s."serviceId",
         s."name" AS "serviceName",
         s."serviceType"
       FROM public."Provider" pr
       JOIN public."User" u ON u."userId" = pr."userId"
       LEFT JOIN public."ProviderAssignment" pa
         ON pa."providerId" = pr."userId" AND pa."status" = 'Approved'
       LEFT JOIN public."Organization" o
         ON o."userId" = pa."organizerId"
        AND o."verificationStatus" = 'Approved'
       LEFT JOIN public."User" u_org
         ON u_org."userId" = o."userId" AND u_org."status" = 'Active'
       LEFT JOIN public."ProviderService" ps
         ON ps."assignmentId" = pa."assignmentId" AND ps."isActive" = TRUE
         AND o."userId" IS NOT NULL AND u_org."userId" IS NOT NULL
       LEFT JOIN public."OrganizerService" os
         ON os."organizerServiceId" = ps."organizerServiceId" AND os."isActive" = TRUE
       LEFT JOIN public."Service" s
         ON s."serviceId" = os."serviceId" AND s."isAvailable" = TRUE
       ${whereClause}
       ${orderByClause}
       LIMIT $${idx++} OFFSET $${idx}`,
      values,
    );

    return result.rows;
  }

  static async getProviderDetails(providerId: string) {
    const providerRes = await pool.query(
      `SELECT
         pr."userId" AS "providerId",
         u."name",
         u."phone",
         u."address",
         pr."providerType",
         pr."specialization",
         pr."qualification",
         pr."experienceYears",
         pr."verificationStatus",
         pr."profilePictureUrl",
         0 AS "rating",
         0 AS "reviewCount"
       FROM public."Provider" pr
       JOIN public."User" u ON u."userId" = pr."userId"
       WHERE pr."userId" = $1
         AND pr."verificationStatus" = 'Approved'
         AND u."status" = 'Active'
       LIMIT 1`,
      [providerId],
    );

    if (providerRes.rows.length === 0) return null;

    const servicesRes = await pool.query(
      `SELECT
         ps."providerServiceId",
         ps."deliveryMode",
         os."price",
         os."durationMinutes",
         os."details",
         s."serviceId",
         s."name" AS "serviceName",
         s."serviceType",
         o."userId" AS "organizationId",
         o."organizationName",
         o."organizerType"
       FROM public."ProviderAssignment" pa
       JOIN public."ProviderService" ps
         ON ps."assignmentId" = pa."assignmentId" AND ps."isActive" = TRUE
       JOIN public."OrganizerService" os
         ON os."organizerServiceId" = ps."organizerServiceId" AND os."isActive" = TRUE
       JOIN public."Service" s
         ON s."serviceId" = os."serviceId" AND s."isAvailable" = TRUE
       JOIN public."Organization" o
         ON o."userId" = pa."organizerId"
        AND o."verificationStatus" = 'Approved'
       JOIN public."User" u_org
         ON u_org."userId" = o."userId" AND u_org."status" = 'Active'
       WHERE pa."providerId" = $1 AND pa."status" = 'Approved'`,
      [providerId],
    );

    const schedulesRes = await pool.query(
      `SELECT
         sc."scheduleId",
         sc."assignmentId",
         sc."dayOfWeek",
         sc."startTime",
         sc."endTime",
         sc."deliveryMode"
       FROM public."Schedule" sc
       JOIN public."ProviderAssignment" pa
         ON pa."assignmentId" = sc."assignmentId"
       WHERE pa."providerId" = $1
         AND pa."status" = 'Approved'
         AND sc."isActive" = TRUE
       ORDER BY sc."scheduleId" ASC`,
      [providerId],
    );

    return {
      ...providerRes.rows[0],
      services: servicesRes.rows,
      schedules: schedulesRes.rows,
    };
  }

  // حساب الفترات الزمنية المتاحة للحجز مع منع التكرار (Deduplication)
  static async getProviderAvailability(
    providerId: string,
    serviceId: number,
    date: string,
  ) {
    const dayOfWeek = getDayOfWeekName(date);

    const psRes = await pool.query(
      `SELECT
         ps."providerServiceId",
         ps."deliveryMode",
         pa."assignmentId",
         os."durationMinutes",
         os."price"
       FROM public."ProviderService" ps
       JOIN public."OrganizerService" os
         ON os."organizerServiceId" = ps."organizerServiceId" AND os."isActive" = TRUE
       JOIN public."ProviderAssignment" pa
         ON pa."assignmentId" = ps."assignmentId" AND pa."status" = 'Approved'
       WHERE pa."providerId" = $1
         AND (os."serviceId" = $2 OR ps."providerServiceId" = $2)
         AND ps."isActive" = TRUE`,
      [providerId, serviceId],
    );

    if (psRes.rows.length === 0) {
      throw {
        status: 404,
        message: "This provider does not offer the selected service",
        code: "SERVICE_NOT_OFFERED",
      };
    }

    const schedulesRes = await pool.query(
      `SELECT sc."assignmentId", sc."startTime", sc."endTime", sc."deliveryMode"
       FROM public."Schedule" sc
       JOIN public."ProviderAssignment" pa
         ON pa."assignmentId" = sc."assignmentId"
       WHERE pa."providerId" = $1
         AND pa."status" = 'Approved'
         AND sc."isActive" = TRUE
         AND sc."dayOfWeek" = $2`,
      [providerId, dayOfWeek],
    );

    if (schedulesRes.rows.length === 0) {
      return [];
    }

    const bookedRes = await pool.query(
      `SELECT a."startTime", a."endTime"
       FROM public."Appointment" a
       JOIN public."ProviderService" ps2
         ON ps2."providerServiceId" = a."providerServiceId"
       JOIN public."ProviderAssignment" pa2
         ON pa2."assignmentId" = ps2."assignmentId"
       WHERE pa2."providerId" = $1
         AND a."appointmentDate" = $2
         AND a."status" <> 'Cancelled'`,
      [providerId, date],
    );

    const bookedRanges = bookedRes.rows.map((b) => ({
      start: timeToMinutes(String(b.startTime)),
      end: timeToMinutes(String(b.endTime)),
    }));

    const rawSlots: Array<{
      providerServiceId: number;
      deliveryMode: string;
      price: number;
      startTime: string;
      endTime: string;
    }> = [];

    for (const ps of psRes.rows) {
      const duration = Number(ps.durationMinutes) || 30;
      const matchingSchedules = schedulesRes.rows.filter(
        (sc) =>
          sc.assignmentId === ps.assignmentId &&
          (!sc.deliveryMode || sc.deliveryMode === ps.deliveryMode),
      );

      for (const sc of matchingSchedules) {
        let cursor = timeToMinutes(String(sc.startTime));
        const limitEnd = timeToMinutes(String(sc.endTime));

        while (cursor + duration <= limitEnd) {
          const slotStart = cursor;
          const slotEnd = cursor + duration;

          const hasConflict = bookedRanges.some(
            (b) => slotStart < b.end && slotEnd > b.start,
          );

          if (!hasConflict) {
            rawSlots.push({
              providerServiceId: ps.providerServiceId,
              deliveryMode: ps.deliveryMode,
              price: Number(ps.price),
              startTime: minutesToTime(slotStart),
              endTime: minutesToTime(slotEnd),
            });
          }
          cursor += duration;
        }
      }
    }

    // تصفية الفترات المتكررة نتيجة تداخل الجداول (Deduplication)
    const uniqueMap = new Map<string, (typeof rawSlots)[0]>();
    for (const slot of rawSlots) {
      const key = `${slot.startTime}-${slot.endTime}-${slot.providerServiceId}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, slot);
      }
    }

    return Array.from(uniqueMap.values());
  }

  static async createAppointment(
    patientId: string,
    input: CreateAppointmentInput,
  ) {
    return bookAppointment({
      patientId,
      providerServiceId: input.providerServiceId,
      appointmentDate: input.appointmentDate,
      startTime: input.startTime,
      visitAddress: input.visitAddress,
      visitNotes: input.visitNotes,
    });
  }

  static async listAppointments(
    patientId: string,
    filters: ListAppointmentsFilters = {},
  ) {
    const conditions: string[] = [`a."patientId" = $1`];
    const params: unknown[] = [patientId];
    let idx = 2;

    if (filters.status) {
      conditions.push(`LOWER(a."status"::text) = LOWER($${idx++})`);
      params.push(filters.status.trim());
    }

    if (filters.date) {
      conditions.push(`a."appointmentDate" = $${idx++}`);
      params.push(filters.date.trim());
    }

    if (filters.startDate) {
      conditions.push(`a."appointmentDate" >= $${idx++}`);
      params.push(filters.startDate.trim());
    }

    if (filters.endDate) {
      conditions.push(`a."appointmentDate" <= $${idx++}`);
      params.push(filters.endDate.trim());
    }

    const direction =
      String(filters.order || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    params.push(limit, offset);

    const result = await pool.query(
      `SELECT
         a."appointmentId",
         a."patientId",
         a."providerServiceId",
         a."appointmentDate",
         a."startTime",
         a."endTime",
         a."status",
         a."priceAtBooking",
         a."createdAt",
         a."cancelledBy",
         a."visitAddress",
         a."visitNotes",
         ps."deliveryMode",
         s."serviceId",
         s."name" AS "serviceName",
         s."serviceType",
         pr."userId" AS "providerId",
         u."name" AS "providerName",
         pr."specialization",
         pr."profilePictureUrl" AS "providerProfilePicture",
         o."organizationName"
       FROM public."Appointment" a
       JOIN public."ProviderService" ps
         ON ps."providerServiceId" = a."providerServiceId"
       JOIN public."OrganizerService" os
         ON os."organizerServiceId" = ps."organizerServiceId"
       JOIN public."Service" s
         ON s."serviceId" = os."serviceId"
       JOIN public."ProviderAssignment" pa
         ON pa."assignmentId" = ps."assignmentId"
       JOIN public."Provider" pr
         ON pr."userId" = pa."providerId"
       JOIN public."User" u
         ON u."userId" = pr."userId"
       JOIN public."Organization" o
         ON o."userId" = pa."organizerId"
       WHERE ${conditions.join(" AND ")}
       ORDER BY a."appointmentDate" ${direction}, a."startTime" ${direction}
       LIMIT $${idx++} OFFSET $${idx}`,
      params,
    );

    return result.rows;
  }

  static async getAppointmentById(patientId: string, appointmentId: string) {
    const result = await pool.query(
      `SELECT
         a."appointmentId",
         a."patientId",
         a."providerServiceId",
         a."appointmentDate",
         a."startTime",
         a."endTime",
         a."status",
         a."priceAtBooking",
         a."createdAt",
         a."cancelledBy",
         a."visitAddress",
         a."visitNotes",
         ps."deliveryMode",
         s."serviceId",
         s."name" AS "serviceName",
         s."serviceType",
         pr."userId" AS "providerId",
         u."name" AS "providerName",
         pr."specialization",
         pr."profilePictureUrl" AS "providerProfilePicture",
         o."userId" AS "organizationId",
         o."organizationName"
       FROM public."Appointment" a
       JOIN public."ProviderService" ps
         ON ps."providerServiceId" = a."providerServiceId"
       JOIN public."OrganizerService" os
         ON os."organizerServiceId" = ps."organizerServiceId"
       JOIN public."Service" s
         ON s."serviceId" = os."serviceId"
       JOIN public."ProviderAssignment" pa
         ON pa."assignmentId" = ps."assignmentId"
       JOIN public."Provider" pr
         ON pr."userId" = pa."providerId"
       JOIN public."User" u
         ON u."userId" = pr."userId"
       JOIN public."Organization" o
         ON o."userId" = pa."organizerId"
       WHERE a."appointmentId" = $1 AND a."patientId" = $2
       LIMIT 1`,
      [appointmentId, patientId],
    );

    return result.rows[0] || null;
  }

  static async cancelAppointment(patientId: string, appointmentId: string) {
    const result = await pool.query(
      `UPDATE public."Appointment"
       SET "status" = 'Cancelled', "cancelledBy" = 'Patient'
       WHERE "appointmentId" = $1
         AND "patientId" = $2
         AND "status" IN ('Pending', 'Confirmed')
       RETURNING *`,
      [appointmentId, patientId],
    );

    return result.rows[0] || null;
  }
}
