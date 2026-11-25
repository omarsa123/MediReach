import { pool } from "../../config/dbconfig.js";

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

  // تحديث حالة حجز يخص المزود (Confirmed / InProgress / Completed / Cancelled)
  static async updateAppointmentStatus(
    providerId: string,
    appointmentId: string,
    nextStatus: "Confirmed" | "InProgress" | "Completed" | "Cancelled",
  ) {
    const cancelledByClause =
      nextStatus === "Cancelled" ? `, "cancelledBy" = 'Provider'` : "";

    const result = await pool.query(
      `UPDATE public."Appointment" a
       SET "status" = $1 ${cancelledByClause}
       FROM public."ProviderService" ps
       JOIN public."ProviderAssignment" pa
         ON pa."assignmentId" = ps."assignmentId"
       WHERE a."appointmentId" = $2
         AND a."providerServiceId" = ps."providerServiceId"
         AND pa."providerId" = $3
       RETURNING a.*`,
      [nextStatus, appointmentId, providerId],
    );

    return result.rows[0] || null;
  }
}
