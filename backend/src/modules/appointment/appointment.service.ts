import { pool } from "../../config/dbconfig.js";

export type AppointmentStatus =
  | "Pending"
  | "Confirmed"
  | "InProgress"
  | "Completed"
  | "Cancelled";

/** الانتقالات المسموح بها فقط */
export const ALLOWED_STATUS_TRANSITIONS: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["InProgress", "Cancelled", "Completed"],
  InProgress: ["Completed", "Cancelled"],
  Completed: [], // نهائية
  Cancelled: [], // نهائية
};

export interface BookAppointmentInput {
  patientId: string;
  providerServiceId: number;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM or HH:MM:SS
  visitAddress?: string | null;
  visitNotes?: string | null;
}

function addMinutesToTime(startTime: string, minutes: number): string {
  const parts = startTime.split(":").map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const total = h * 60 + m + minutes;
  // معالجة الالتفاف بسلاسة بحيث لا يتداخل بالسالب أو بشكل خاطئ
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}:00`;
}

function normalizeTime(t: string): string {
  const parts = t.trim().split(":");
  const h = String(Number(parts[0] || 0)).padStart(2, "0");
  const m = String(Number(parts[1] || 0)).padStart(2, "0");
  const s =
    parts[2] !== undefined ? String(Number(parts[2])).padStart(2, "0") : "00";
  return `${h}:${m}:${s}`;
}

/** أسماء أيام الأسبوع كما تُخزَّن في Schedule */
function getDayOfWeekName(dateStr: string): string {
  const names = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const d = new Date(dateStr + "T12:00:00Z");
  return names[d.getUTCDay()];
}

/**
 * منطق الحجز الموحد:
 * - السعر ووقت النهاية يُحسبان من السيرفر
 * - التحقق من اعتماد المزود والمؤسسة والخدمة والـ Assignment
 * - منع التعارض على مستوى المزود (كل خدماته)
 * - قفل الصفوف لمنع الحجز المتزامن بشكل دقيق
 * - التحقق من جدول العمل الخاص بيوم الأسبوع إن وُجد
 */
export async function bookAppointment(data: BookAppointmentInput) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) جلب الخدمة + الـ Assignment + المزود + المؤسسة
    const ps = await client.query(
      `SELECT
         ps."providerServiceId",
         ps."isActive"          AS "psActive",
         ps."deliveryMode",
         os."price",
         os."durationMinutes",
         os."isActive"          AS "osActive",
         pa."assignmentId",
         pa."providerId",
         pa."organizerId",
         pa."status"            AS "assignmentStatus",
         pr."verificationStatus" AS "providerVerification",
         u_pr."status"          AS "providerUserStatus",
         u_org."status"         AS "orgUserStatus",
         org."verificationStatus" AS "orgVerification"
       FROM public."ProviderService" ps
       JOIN public."OrganizerService" os
         ON os."organizerServiceId" = ps."organizerServiceId"
        AND os."organizerId" = ps."organizerId"
       JOIN public."ProviderAssignment" pa
         ON pa."assignmentId" = ps."assignmentId"
       JOIN public."Provider" pr
         ON pr."userId" = pa."providerId"
       JOIN public."User" u_pr
         ON u_pr."userId" = pa."providerId"
       JOIN public."Organization" org
         ON org."userId" = pa."organizerId"
       JOIN public."User" u_org
         ON u_org."userId" = pa."organizerId"
       WHERE ps."providerServiceId" = $1`,
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

    // قفل واضح وموجه على الـ Assignment لمنع سباق الحجوزات دون قفل عشوائي للجداول المرتبطة
    await client.query(
      `SELECT 1 FROM public."ProviderAssignment" WHERE "assignmentId" = $1 FOR UPDATE`,
      [row.assignmentId],
    );

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
    if (row.providerVerification !== "Approved") {
      throw {
        status: 400,
        message: "Provider is not verified",
        code: "PROVIDER_NOT_VERIFIED",
      };
    }
    if (row.providerUserStatus !== "Active") {
      throw {
        status: 400,
        message: "Provider account is not active",
        code: "PROVIDER_INACTIVE",
      };
    }
    if (row.orgVerification !== "Approved") {
      throw {
        status: 400,
        message: "Organization is not verified",
        code: "ORGANIZATION_NOT_VERIFIED",
      };
    }
    if (row.orgUserStatus !== "Active") {
      throw {
        status: 400,
        message: "Organization account is not active",
        code: "ORGANIZATION_INACTIVE",
      };
    }

    const startTime = normalizeTime(data.startTime);
    const duration = Number(row.durationMinutes) || 30;
    const endTime = addMinutesToTime(startTime, duration);
    const price = Number(row.price);

    const dayOfWeek = getDayOfWeekName(data.appointmentDate);

    // 2) التحقق من جدول العمل: فحص ما إذا كان هناك جدول نشط في *نفس* يوم الأسبوع المختار
    const hasAnyScheduleForDay = await client.query(
      `SELECT 1 FROM public."Schedule"
       WHERE "assignmentId" = $1 AND "isActive" = TRUE AND "dayOfWeek" = $2
       LIMIT 1`,
      [row.assignmentId, dayOfWeek],
    );

    // التحقق من أن الموعد يقع ضمن فترات العمل في نفس اليوم
    const scheduleCheck = await client.query(
      `SELECT "scheduleId", "startTime", "endTime", "deliveryMode"
       FROM public."Schedule"
       WHERE "assignmentId" = $1
         AND "isActive" = TRUE
         AND "dayOfWeek" = $2
         AND "startTime" <= $3::time
         AND "endTime" >= $4::time
       LIMIT 1`,
      [row.assignmentId, dayOfWeek, startTime, endTime],
    );

    // إذا وُجد جدول نشط في هذا اليوم ولكن الموعد لا يقع ضمن أي فترة منها -> خارج الجدول
    if (
      hasAnyScheduleForDay.rows.length > 0 &&
      scheduleCheck.rows.length === 0
    ) {
      throw {
        status: 400,
        message: "Selected time is outside the provider's working schedule",
        code: "OUTSIDE_SCHEDULE",
      };
    }

    // 3) منع التعارض على مستوى المزود (كل خدماته) وليس فقط نفس providerService
    const conflict = await client.query(
      `SELECT a."appointmentId"
       FROM public."Appointment" a
       JOIN public."ProviderService" ps2
         ON ps2."providerServiceId" = a."providerServiceId"
       JOIN public."ProviderAssignment" pa2
         ON pa2."assignmentId" = ps2."assignmentId"
       WHERE pa2."providerId" = $1
         AND a."appointmentDate" = $2
         AND a."status" NOT IN ('Cancelled')
         AND a."startTime" < $4::time
         AND a."endTime" > $3::time
       LIMIT 1
       FOR UPDATE`,
      [row.providerId, data.appointmentDate, startTime, endTime],
    );

    if (conflict.rows.length > 0) {
      throw {
        status: 409,
        message: "This time slot is already booked for this provider",
        code: "SLOT_CONFLICT",
      };
    }

    // 4) الإدراج
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

/**
 * تحديث حالة الحجز مع التحقق من الانتقالات المسموح بها
 */
export async function transitionAppointmentStatus(
  appointmentId: number | string,
  nextStatus: AppointmentStatus,
  cancelledBy?: string | null,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const current = await client.query(
      `SELECT "appointmentId", "status", "cancelledBy"
       FROM public."Appointment"
       WHERE "appointmentId" = $1
       FOR UPDATE`,
      [appointmentId],
    );

    if (current.rows.length === 0) {
      throw {
        status: 404,
        message: "Appointment not found",
        code: "NOT_FOUND",
      };
    }

    const currentStatus = current.rows[0].status as AppointmentStatus;
    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(nextStatus)) {
      throw {
        status: 400,
        message: `Cannot transition from ${currentStatus} to ${nextStatus}`,
        code: "INVALID_STATUS_TRANSITION",
      };
    }

    const cancelledByValue =
      nextStatus === "Cancelled" ? (cancelledBy ?? null) : null;

    const result = await client.query(
      `UPDATE public."Appointment"
       SET "status" = $1, "cancelledBy" = $2
       WHERE "appointmentId" = $3
       RETURNING *`,
      [nextStatus, cancelledByValue, appointmentId],
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
