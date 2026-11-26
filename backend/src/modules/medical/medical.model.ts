import { pool } from "../../config/dbconfig.js";

export class MedicalModel {
  // ---------- helpers ----------
  static async getAppointmentParties(appointmentId: number | string) {
    const result = await pool.query(
      `SELECT
         a."appointmentId",
         a."patientId",
         a."status",
         pa."providerId",
         pa."organizerId"
       FROM public."Appointment" a
       JOIN public."ProviderService" ps ON ps."providerServiceId" = a."providerServiceId"
       JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
       WHERE a."appointmentId" = $1`,
      [appointmentId],
    );
    return result.rows[0] || null;
  }

  // ---------- MedicalDocument ----------
  static async listDocuments(patientId: string) {
    const result = await pool.query(
      `SELECT * FROM public."MedicalDocument"
       WHERE "patientId" = $1
       ORDER BY "uploadedAt" DESC`,
      [patientId],
    );
    return result.rows;
  }

  static async getDocument(documentId: number | string, patientId?: string) {
    const params: unknown[] = [documentId];
    let ownerFilter = "";
    if (patientId) {
      ownerFilter = ` AND "patientId" = $2`;
      params.push(patientId);
    }
    const result = await pool.query(
      `SELECT * FROM public."MedicalDocument"
       WHERE "documentId" = $1 ${ownerFilter}`,
      params,
    );
    return result.rows[0] || null;
  }

  static async createDocument(data: {
    patientId: string;
    fileName: string;
    fileType?: string;
    fileUrl: string;
    description?: string | null;
  }) {
    const allowedTypes = ["PDF", "JPG", "JPEG", "PNG", "DOC", "DOCX", "Other"];
    const fileType = data.fileType || "Other";
    if (!allowedTypes.includes(fileType)) {
      throw {
        status: 400,
        message: `fileType must be one of: ${allowedTypes.join(", ")}`,
        code: "INVALID_FILE_TYPE",
      };
    }

    const result = await pool.query(
      `INSERT INTO public."MedicalDocument"
         ("patientId", "fileName", "fileType", "fileUrl", "description")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.patientId,
        data.fileName,
        fileType,
        data.fileUrl,
        data.description ?? null,
      ],
    );
    return result.rows[0];
  }

  static async updateDocument(
    documentId: number | string,
    patientId: string,
    data: { fileName?: string; description?: string | null; fileUrl?: string },
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (data.fileName !== undefined) {
      fields.push(`"fileName" = $${idx++}`);
      values.push(data.fileName);
    }
    if (data.description !== undefined) {
      fields.push(`"description" = $${idx++}`);
      values.push(data.description);
    }
    if (data.fileUrl !== undefined) {
      fields.push(`"fileUrl" = $${idx++}`);
      values.push(data.fileUrl);
    }
    if (fields.length === 0) {
      throw { status: 400, message: "No fields to update", code: "NO_FIELDS" };
    }
    values.push(documentId, patientId);
    const result = await pool.query(
      `UPDATE public."MedicalDocument"
       SET ${fields.join(", ")}
       WHERE "documentId" = $${idx++} AND "patientId" = $${idx}
       RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  }

  static async deleteDocument(documentId: number | string, patientId: string) {
    const result = await pool.query(
      `DELETE FROM public."MedicalDocument"
       WHERE "documentId" = $1 AND "patientId" = $2
       RETURNING *`,
      [documentId, patientId],
    );
    return result.rows[0] || null;
  }

  // ---------- MedicalNote ----------
  static async getNoteByAppointment(appointmentId: number | string) {
    const result = await pool.query(
      `SELECT mn.*, u."name" AS "providerName"
       FROM public."MedicalNote" mn
       JOIN public."User" u ON u."userId" = mn."providerId"
       WHERE mn."appointmentId" = $1`,
      [appointmentId],
    );
    return result.rows[0] || null;
  }

  static async listNotesByPatient(patientId: string) {
    const result = await pool.query(
      `SELECT mn.*, u."name" AS "providerName"
       FROM public."MedicalNote" mn
       JOIN public."User" u ON u."userId" = mn."providerId"
       WHERE mn."patientId" = $1
       ORDER BY mn."createdAt" DESC`,
      [patientId],
    );
    return result.rows;
  }

  static async listNotesByProvider(providerId: string) {
    const result = await pool.query(
      `SELECT mn.*, pu."name" AS "patientName"
       FROM public."MedicalNote" mn
       JOIN public."User" pu ON pu."userId" = mn."patientId"
       WHERE mn."providerId" = $1
       ORDER BY mn."createdAt" DESC`,
      [providerId],
    );
    return result.rows;
  }

  static async upsertNote(data: {
    appointmentId: number;
    patientId: string;
    providerId: string;
    content: string;
  }) {
    if (!data.content || !String(data.content).trim()) {
      throw {
        status: 400,
        message: "content cannot be empty",
        code: "EMPTY_CONTENT",
      };
    }

    const ownership = await pool.query(
      `SELECT a."appointmentId", a."status"
       FROM public."Appointment" a
       JOIN public."ProviderService" ps ON ps."providerServiceId" = a."providerServiceId"
       JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
       WHERE a."appointmentId" = $1
         AND a."patientId" = $2
         AND pa."providerId" = $3`,
      [data.appointmentId, data.patientId, data.providerId],
    );
    if (ownership.rows.length === 0) {
      throw {
        status: 403,
        message: "You are not authorized for this appointment",
        code: "FORBIDDEN_APPOINTMENT",
      };
    }

    const result = await pool.query(
      `INSERT INTO public."MedicalNote"
         ("appointmentId", "patientId", "providerId", "content")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("appointmentId") DO UPDATE
         SET "content" = EXCLUDED."content",
             "updatedAt" = CURRENT_TIMESTAMP
       RETURNING *`,
      [data.appointmentId, data.patientId, data.providerId, data.content],
    );
    return result.rows[0];
  }

  // ---------- Prescription ----------
  static async getPrescriptionByAppointment(appointmentId: number | string) {
    const result = await pool.query(
      `SELECT pr.*, u."name" AS "providerName"
       FROM public."Prescription" pr
       JOIN public."User" u ON u."userId" = pr."providerId"
       WHERE pr."appointmentId" = $1`,
      [appointmentId],
    );
    return result.rows[0] || null;
  }

  static async listPrescriptionsByPatient(patientId: string) {
    const result = await pool.query(
      `SELECT pr.*, u."name" AS "providerName"
       FROM public."Prescription" pr
       JOIN public."User" u ON u."userId" = pr."providerId"
       WHERE pr."patientId" = $1
       ORDER BY pr."createdAt" DESC`,
      [patientId],
    );
    return result.rows;
  }

  static async listPrescriptionsByProvider(providerId: string) {
    const result = await pool.query(
      `SELECT pr.*, pu."name" AS "patientName"
       FROM public."Prescription" pr
       JOIN public."User" pu ON pu."userId" = pr."patientId"
       WHERE pr."providerId" = $1
       ORDER BY pr."createdAt" DESC`,
      [providerId],
    );
    return result.rows;
  }

  static async createPrescription(data: {
    appointmentId: number;
    patientId: string;
    providerId: string;
    description: string;
  }) {
    if (!data.description || !String(data.description).trim()) {
      throw {
        status: 400,
        message: "description cannot be empty",
        code: "EMPTY_DESCRIPTION",
      };
    }

    const ownership = await pool.query(
      `SELECT a."appointmentId"
       FROM public."Appointment" a
       JOIN public."ProviderService" ps ON ps."providerServiceId" = a."providerServiceId"
       JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
       WHERE a."appointmentId" = $1
         AND a."patientId" = $2
         AND pa."providerId" = $3`,
      [data.appointmentId, data.patientId, data.providerId],
    );
    if (ownership.rows.length === 0) {
      throw {
        status: 403,
        message: "You are not authorized for this appointment",
        code: "FORBIDDEN_APPOINTMENT",
      };
    }

    const result = await pool.query(
      `INSERT INTO public."Prescription"
         ("appointmentId", "patientId", "providerId", "description")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("appointmentId") DO UPDATE
         SET "description" = EXCLUDED."description"
       RETURNING *`,
      [
        data.appointmentId,
        data.patientId,
        data.providerId,
        data.description,
      ],
    );
    return result.rows[0];
  }

  // ---------- Recording ----------
  static async getRecordingByAppointment(appointmentId: number | string) {
    const result = await pool.query(
      `SELECT * FROM public."Recording" WHERE "appointmentId" = $1`,
      [appointmentId],
    );
    return result.rows[0] || null;
  }

  static async createRecording(data: {
    appointmentId: number;
    fileUrl: string;
    durationSeconds?: number | null;
  }) {
    const parties = await this.getAppointmentParties(data.appointmentId);
    if (!parties) {
      throw {
        status: 404,
        message: "Appointment not found",
        code: "APPOINTMENT_NOT_FOUND",
      };
    }

    if (
      data.durationSeconds !== undefined &&
      data.durationSeconds !== null &&
      (Number.isNaN(Number(data.durationSeconds)) ||
        Number(data.durationSeconds) < 0)
    ) {
      throw {
        status: 400,
        message: "durationSeconds must be a non-negative number",
        code: "INVALID_DURATION",
      };
    }

    const result = await pool.query(
      `INSERT INTO public."Recording"
         ("appointmentId", "fileUrl", "durationSeconds")
       VALUES ($1, $2, $3)
       ON CONFLICT ("appointmentId") DO UPDATE
         SET "fileUrl" = EXCLUDED."fileUrl",
             "durationSeconds" = EXCLUDED."durationSeconds"
       RETURNING *`,
      [data.appointmentId, data.fileUrl, data.durationSeconds ?? null],
    );
    return result.rows[0];
  }

  // ---------- OnlineRoom ----------
  static async getOnlineRoom(providerId: string) {
    const result = await pool.query(
      `SELECT * FROM public."OnlineRoom" WHERE "providerId" = $1`,
      [providerId],
    );
    return result.rows[0] || null;
  }

  /**
   * هل يحق للمستخدم رؤية رابط غرفة المزود؟
   * - المزود نفسه
   * - الأدمن
   * - مريض لديه موعد نشط (Pending/Confirmed/InProgress) مع هذا المزود
   * - مؤسسة مرتبطة بـ Assignment معتمد لهذا المزود
   */
  static async canAccessOnlineRoom(
    userId: string,
    role: string,
    providerId: string,
  ): Promise<boolean> {
    if (role === "admin") return true;
    if (role === "provider" && userId === providerId) return true;

    if (role === "patient") {
      const result = await pool.query(
        `SELECT 1
         FROM public."Appointment" a
         JOIN public."ProviderService" ps
           ON ps."providerServiceId" = a."providerServiceId"
         JOIN public."ProviderAssignment" pa
           ON pa."assignmentId" = ps."assignmentId"
         WHERE a."patientId" = $1
           AND pa."providerId" = $2
           AND a."status" IN ('Pending', 'Confirmed', 'InProgress')
         LIMIT 1`,
        [userId, providerId],
      );
      return result.rows.length > 0;
    }

    if (role === "organization") {
      const result = await pool.query(
        `SELECT 1
         FROM public."ProviderAssignment" pa
         WHERE pa."organizerId" = $1
           AND pa."providerId" = $2
           AND pa."status" = 'Approved'
         LIMIT 1`,
        [userId, providerId],
      );
      return result.rows.length > 0;
    }

    return false;
  }

  static async upsertOnlineRoom(data: {
    providerId: string;
    roomLink: string;
    status?: "Active" | "Inactive";
  }) {
    if (!data.roomLink || !String(data.roomLink).trim()) {
      throw {
        status: 400,
        message: "roomLink is required",
        code: "MISSING_ROOM_LINK",
      };
    }
    const status = data.status || "Active";
    if (!["Active", "Inactive"].includes(status)) {
      throw {
        status: 400,
        message: "status must be Active or Inactive",
        code: "INVALID_STATUS",
      };
    }

    try {
      const result = await pool.query(
        `INSERT INTO public."OnlineRoom" ("providerId", "roomLink", "status")
         VALUES ($1, $2, $3)
         ON CONFLICT ("providerId") DO UPDATE
           SET "roomLink" = EXCLUDED."roomLink",
               "status" = EXCLUDED."status"
         RETURNING *`,
        [data.providerId, data.roomLink.trim(), status],
      );
      return result.rows[0];
    } catch (err: any) {
      if (err?.code === "23505") {
        throw {
          status: 409,
          message: "This room link is already in use",
          code: "ROOM_LINK_EXISTS",
        };
      }
      throw err;
    }
  }
}
