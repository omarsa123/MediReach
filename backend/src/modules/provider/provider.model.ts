import { pool } from "../../config/dbconfig.js";
import { transitionAppointmentStatus } from "../appointment/appointment.service.js";

export interface UpdateProviderInput {
  providerType?: "Doctor" | "Nurse" | "Physiotherapist" | "LabSpecialist";
  specialization?: string;
  licenseNumber?: string;
  qualification?: string;
  experienceYears?: number;
  // الصورة إجبارية للمزود وتُحفظ كرابط نصي (string) مرفوع على Storage
  profilePictureUrl?: string;
}

export interface CreateScheduleInput {
  assignmentId: number;
  dayOfWeek:
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday";
  startTime: string; // HH:MM or HH:MM:SS
  endTime: string; // HH:MM or HH:MM:SS
  deliveryMode: "Online" | "InPerson" | "HomeVisit";
}

export class ProviderModel {
  // جلب بيانات المزود بالتفصيل مع جدول الـ User الأساسي
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

  // تحديث بيانات الـ Provider الخاصة (مع الحفاظ على إلزامية profilePictureUrl ومزامنتها في User)
  static async updateProviderProfile(
    userId: string,
    data: UpdateProviderInput,
  ) {
    if (
      data.profilePictureUrl !== undefined &&
      (!data.profilePictureUrl || !data.profilePictureUrl.trim())
    ) {
      throw {
        status: 400,
        message: "Profile picture URL is required for provider accounts",
        code: "PROFILE_IMAGE_REQUIRED",
      };
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

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
        const cleanUrl = data.profilePictureUrl.trim();
        fields.push(`"profilePictureUrl" = $${idx++}`);
        values.push(cleanUrl);

        await client.query(
          `UPDATE public."User"
           SET "profilePictureUrl" = $1
           WHERE "userId" = $2`,
          [cleanUrl, userId],
        );
      }

      if (fields.length > 0) {
        values.push(userId);
        await client.query(
          `UPDATE public."Provider"
           SET ${fields.join(", ")}
           WHERE "userId" = $${idx}`,
          values,
        );
      }

      await client.query("COMMIT");
      return this.findProviderProfile(userId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // عرض مواعيد عمل المزود المعتمدة
  static async listSchedules(providerId: string) {
    const result = await pool.query(
      `SELECT
         sc."scheduleId",
         sc."assignmentId",
         sc."dayOfWeek",
         sc."startTime",
         sc."endTime",
         sc."deliveryMode",
         sc."isActive",
         o."userId" AS "organizationId",
         o."organizationName"
       FROM public."Schedule" sc
       JOIN public."ProviderAssignment" pa
         ON pa."assignmentId" = sc."assignmentId"
       JOIN public."Organization" o
         ON o."userId" = pa."organizerId"
       WHERE pa."providerId" = $1
       ORDER BY sc."scheduleId" ASC`,
      [providerId],
    );

    return result.rows;
  }

  /** منع تداخل جداول نفس الـ Assignment في نفس اليوم */
  private static async assertNoScheduleOverlap(
    assignmentId: number,
    dayOfWeek: string,
    startTime: string,
    endTime: string,
    excludeScheduleId?: number,
  ) {
    if (startTime >= endTime) {
      throw {
        status: 400,
        message: "startTime must be before endTime",
        code: "INVALID_TIME_RANGE",
      };
    }

    const params: unknown[] = [assignmentId, dayOfWeek, startTime, endTime];
    let exclude = "";
    if (excludeScheduleId !== undefined) {
      exclude = ` AND "scheduleId" <> $5`;
      params.push(excludeScheduleId);
    }

    const overlap = await pool.query(
      `SELECT "scheduleId"
       FROM public."Schedule"
       WHERE "assignmentId" = $1
         AND "dayOfWeek" = $2
         AND "isActive" = TRUE
         AND "startTime" < $4::time
         AND "endTime" > $3::time
         ${exclude}
       LIMIT 1`,
      params,
    );

    if (overlap.rows.length > 0) {
      throw {
        status: 409,
        message: "Schedule overlaps with an existing working slot",
        code: "SCHEDULE_OVERLAP",
      };
    }
  }

  // إضافة موعد عمل جديد لـ assignment خاص بالمزود
  static async createSchedule(providerId: string, input: CreateScheduleInput) {
    const assignmentRes = await pool.query(
      `SELECT "assignmentId"
       FROM public."ProviderAssignment"
       WHERE "assignmentId" = $1
         AND "providerId" = $2
         AND "status" = 'Approved'
       LIMIT 1`,
      [input.assignmentId, providerId],
    );

    if (assignmentRes.rows.length === 0) {
      throw {
        status: 403,
        message: "Invalid or unapproved provider assignment",
        code: "INVALID_ASSIGNMENT",
      };
    }

    await this.assertNoScheduleOverlap(
      input.assignmentId,
      input.dayOfWeek,
      input.startTime,
      input.endTime,
    );

    const result = await pool.query(
      `INSERT INTO public."Schedule"
        ("assignmentId", "dayOfWeek", "startTime", "endTime", "deliveryMode", "isActive")
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING *`,
      [
        input.assignmentId,
        input.dayOfWeek,
        input.startTime,
        input.endTime,
        input.deliveryMode,
      ],
    );

    return result.rows[0];
  }

  static async updateSchedule(
    providerId: string,
    scheduleId: number,
    input: Partial<CreateScheduleInput> & { isActive?: boolean },
  ) {
    const existing = await pool.query(
      `SELECT sc.*
       FROM public."Schedule" sc
       JOIN public."ProviderAssignment" pa ON pa."assignmentId" = sc."assignmentId"
       WHERE sc."scheduleId" = $1 AND pa."providerId" = $2`,
      [scheduleId, providerId],
    );
    if (existing.rows.length === 0) {
      return null;
    }

    const row = existing.rows[0];
    const dayOfWeek = input.dayOfWeek ?? row.dayOfWeek;
    const startTime = input.startTime ?? row.startTime;
    const endTime = input.endTime ?? row.endTime;

    await this.assertNoScheduleOverlap(
      row.assignmentId,
      dayOfWeek,
      startTime,
      endTime,
      scheduleId,
    );

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.dayOfWeek !== undefined) {
      fields.push(`"dayOfWeek" = $${idx++}`);
      values.push(input.dayOfWeek);
    }
    if (input.startTime !== undefined) {
      fields.push(`"startTime" = $${idx++}`);
      values.push(input.startTime);
    }
    if (input.endTime !== undefined) {
      fields.push(`"endTime" = $${idx++}`);
      values.push(input.endTime);
    }
    if (input.deliveryMode !== undefined) {
      fields.push(`"deliveryMode" = $${idx++}`);
      values.push(input.deliveryMode);
    }
    if (input.isActive !== undefined) {
      fields.push(`"isActive" = $${idx++}`);
      values.push(input.isActive);
    }

    if (fields.length === 0) {
      throw {
        status: 400,
        message: "No fields to update",
        code: "NO_FIELDS",
      };
    }

    values.push(scheduleId);
    const result = await pool.query(
      `UPDATE public."Schedule"
       SET ${fields.join(", ")}
       WHERE "scheduleId" = $${idx}
       RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  }

  /** تعطيل الجدول (soft delete) مع التحقق من الملكية */
  static async deleteSchedule(providerId: string, scheduleId: number) {
    const result = await pool.query(
      `UPDATE public."Schedule" sc
       SET "isActive" = FALSE
       FROM public."ProviderAssignment" pa
       WHERE sc."scheduleId" = $1
         AND sc."assignmentId" = pa."assignmentId"
         AND pa."providerId" = $2
       RETURNING sc.*`,
      [scheduleId, providerId],
    );
    return result.rows[0] || null;
  }

  // عرض حجوزات المزود مع بيانات المريض والخدمة
  static async listAppointments(providerId: string, status?: string) {
    const params: unknown[] = [providerId];
    let statusFilter = "";

    if (status) {
      statusFilter = ` AND a."status" = $2`;
      params.push(status.trim());
    }

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
         s."name" AS "serviceName",
         s."serviceType",
         pu."name" AS "patientName",
         pu."phone" AS "patientPhone",
         p."gender" AS "patientGender",
         p."bloodType" AS "patientBloodType"
       FROM public."Appointment" a
       JOIN public."ProviderService" ps
         ON ps."providerServiceId" = a."providerServiceId"
       JOIN public."OrganizerService" os
         ON os."organizerServiceId" = ps."organizerServiceId"
       JOIN public."Service" s
         ON s."serviceId" = os."serviceId"
       JOIN public."ProviderAssignment" pa
         ON pa."assignmentId" = ps."assignmentId"
       JOIN public."User" pu
         ON pu."userId" = a."patientId"
       JOIN public."Patient" p
         ON p."userId" = a."patientId"
       WHERE pa."providerId" = $1 ${statusFilter}
       ORDER BY a."appointmentDate" DESC, a."startTime" DESC`,
      params,
    );

    return result.rows;
  }

  /**
   * تحديث حالة حجز يخص المزود
   * يتحقق من الملكية ثم يستخدم الانتقالات الآمنة (يمنع Completed → Confirmed مثلاً)
   */
  static async updateAppointmentStatus(
    providerId: string,
    appointmentId: string,
    nextStatus: "Confirmed" | "InProgress" | "Completed" | "Cancelled",
  ) {
    // تحقق أن الموعد يخص هذا المزود
    const ownership = await pool.query(
      `SELECT 1
       FROM public."Appointment" a
       JOIN public."ProviderService" ps ON ps."providerServiceId" = a."providerServiceId"
       JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
       WHERE a."appointmentId" = $1 AND pa."providerId" = $2
       LIMIT 1`,
      [appointmentId, providerId],
    );

    if (ownership.rows.length === 0) {
      return null;
    }

    const cancelledBy = nextStatus === "Cancelled" ? "Provider" : null;
    return transitionAppointmentStatus(appointmentId, nextStatus, cancelledBy);
  }
}
