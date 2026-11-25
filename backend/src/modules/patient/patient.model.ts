import { pool } from "../../config/dbconfig.js";

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
  // TODO [Patient Profile Image]: اختياري للمريض. عند رفع الصورة على Supabase Storage (bucket: profile-images)
  // أو تحديد صورة افتراضية من الباكت، يتم تمرير الرابط كـ string وتحديثه في public."User"."profilePictureUrl".
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
  maxPrice?: number;
}

export interface CreateAppointmentInput {
  providerServiceId: number;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM or HH:MM:SS
  endTime: string; // HH:MM or HH:MM:SS
  visitAddress?: string | null;
  visitNotes?: string | null;
}

export class PatientModel {
  // جلب بروفايل المريض مع بيانات User الأساسية
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

  // تحديث بروفايل المريض + تحديث صورة البروفايل في "User" إن وُجدت
  static async updatePatientProfile(userId: string, data: UpdatePatientInput) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // TODO [Patient Profile Image]: تحديث عمود "profilePictureUrl" في جدول "User" كرابط نصي (string)
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

  // البحث والفلترة عن مقدمي الخدمة والخدمات المتاحة لهم
  static async searchProviders(filters: ProviderSearchFilters) {
    const conditions: string[] = [
      `u."status" = 'Active'`,
      `pr."verificationStatus" = 'Approved'`,
    ];
    const values: unknown[] = [];
    let idx = 1;

    if (filters.providerType) {
      conditions.push(`pr."providerType" = $${idx++}`);
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
         o."userId" AS "organizationId",
         o."organizationName",
         o."organizerType",
         ps."providerServiceId",
         ps."deliveryMode",
         os."price",
         os."durationMinutes",
         s."name" AS "serviceName",
         s."serviceType"
       FROM public."Provider" pr
       JOIN public."User" u ON u."userId" = pr."userId"
       LEFT JOIN public."ProviderAssignment" pa
         ON pa."providerId" = pr."userId" AND pa."status" = 'Approved'
       LEFT JOIN public."Organization" o
         ON o."userId" = pa."organizerId" AND o."verificationStatus" = 'Approved'
       LEFT JOIN public."ProviderService" ps
         ON ps."assignmentId" = pa."assignmentId" AND ps."isActive" = TRUE
       LEFT JOIN public."OrganizerService" os
         ON os."organizerServiceId" = ps."organizerServiceId" AND os."isActive" = TRUE
       LEFT JOIN public."Service" s
         ON s."serviceId" = os."serviceId" AND s."isAvailable" = TRUE
       ${whereClause}
       ORDER BY u."name" ASC`,
      values,
    );

    return result.rows;
  }

  // تفاصيل مقدم خدمة + خدماته + مواعيده الأسبوعية
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
         pr."profilePictureUrl"
       FROM public."Provider" pr
       JOIN public."User" u ON u."userId" = pr."userId"
       WHERE pr."userId" = $1
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

  // حجز موعد جديد مع جلب السعر الفعلي من OrganizerService والتحقق من التعارض
  static async createAppointment(
    patientId: string,
    input: CreateAppointmentInput,
  ) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const serviceRes = await client.query(
        `SELECT
           ps."providerServiceId",
           ps."isActive" AS "psActive",
           os."price",
           os."isActive" AS "osActive"
         FROM public."ProviderService" ps
         JOIN public."OrganizerService" os
           ON os."organizerServiceId" = ps."organizerServiceId"
         WHERE ps."providerServiceId" = $1
         LIMIT 1`,
        [input.providerServiceId],
      );

      if (serviceRes.rows.length === 0) {
        throw {
          status: 404,
          message: "Provider service not found",
          code: "SERVICE_NOT_FOUND",
        };
      }

      const svc = serviceRes.rows[0];
      if (!svc.psActive || !svc.osActive) {
        throw {
          status: 400,
          message: "This service is currently unavailable",
          code: "SERVICE_UNAVAILABLE",
        };
      }

      const conflictRes = await client.query(
        `SELECT 1
         FROM public."Appointment"
         WHERE "providerServiceId" = $1
           AND "appointmentDate" = $2
           AND "status" IN ('Pending', 'Confirmed', 'InProgress')
           AND ("startTime" < $4 AND "endTime" > $3)
         LIMIT 1`,
        [
          input.providerServiceId,
          input.appointmentDate,
          input.startTime,
          input.endTime,
        ],
      );

      if (conflictRes.rows.length > 0) {
        throw {
          status: 409,
          message: "This time slot is already booked",
          code: "SLOT_UNAVAILABLE",
        };
      }

      const insertRes = await client.query(
        `INSERT INTO public."Appointment"
          ("patientId", "providerServiceId", "appointmentDate", "startTime", "endTime",
           "status", "priceAtBooking", "visitAddress", "visitNotes")
         VALUES ($1, $2, $3, $4, $5, 'Pending', $6, $7, $8)
         RETURNING *`,
        [
          patientId,
          input.providerServiceId,
          input.appointmentDate,
          input.startTime,
          input.endTime,
          svc.price,
          input.visitAddress ?? null,
          input.visitNotes ?? null,
        ],
      );

      await client.query("COMMIT");
      return insertRes.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // عرض حجوزات المريض مع بيانات الطبيب والخدمة
  static async listAppointments(patientId: string, status?: string) {
    const params: unknown[] = [patientId];
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
       WHERE a."patientId" = $1 ${statusFilter}
       ORDER BY a."appointmentDate" DESC, a."startTime" DESC`,
      params,
    );

    return result.rows;
  }

  // إلغاء حجز بواسطة المريض
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
