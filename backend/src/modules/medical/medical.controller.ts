import type { Request, Response } from "express";
import { MedicalModel } from "./medical.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse } from "../../utils/response.utils.js";

function canAccessAppointment(
  user: any,
  parties: { patientId: string; providerId: string; organizerId: string },
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "patient" && parties.patientId === user.userId) return true;
  if (user.role === "provider" && parties.providerId === user.userId)
    return true;
  if (user.role === "organization" && parties.organizerId === user.userId)
    return true;
  return false;
}

export class MedicalController {
  // ---------- Documents (patient) ----------
  static listDocuments = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const documents = await MedicalModel.listDocuments(user.userId);
      res.json(successResponse({ documents }));
    },
  );

  static getDocument = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const documentId = String(req.params.documentId || "");
      const document = await MedicalModel.getDocument(
        documentId,
        user.role === "patient" ? user.userId : undefined,
      );
      if (!document) {
        res.status(404).json(errorResponse("Document not found", "NOT_FOUND"));
        return;
      }
      if (user.role === "patient" && document.patientId !== user.userId) {
        res.status(403).json(errorResponse("Forbidden", "FORBIDDEN"));
        return;
      }
      if (user.role !== "patient" && user.role !== "admin") {
        res.status(403).json(errorResponse("Forbidden", "FORBIDDEN"));
        return;
      }
      res.json(successResponse({ document }));
    },
  );

  static createDocument = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { fileName, fileType, fileUrl, fileBase64, description } = req.body;

      let finalUrl = fileUrl as string | undefined;

      if (fileBase64) {
        const { StorageService } =
          await import("../../services/storage.service.js");
        finalUrl = await StorageService.uploadMedicalFile({
          base64Data: fileBase64,
          ownerId: user.userId,
          kind: "medical-document",
          fileName,
          maxSizeMb: 20,
        });
      }

      if (!fileName || !finalUrl) {
        res
          .status(400)
          .json(
            errorResponse(
              "fileName and (fileUrl or fileBase64) are required",
              "MISSING_FIELDS",
            ),
          );
        return;
      }
      const document = await MedicalModel.createDocument({
        patientId: user.userId,
        fileName,
        fileType,
        fileUrl: finalUrl,
        description,
      });
      res.status(201).json(successResponse({ document }, "Document uploaded"));
    },
  );

  static updateDocument = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const documentId = String(req.params.documentId || "");
      const updated = await MedicalModel.updateDocument(
        documentId,
        user.userId,
        req.body,
      );
      if (!updated) {
        res.status(404).json(errorResponse("Document not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ document: updated }, "Document updated"));
    },
  );

  static deleteDocument = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const documentId = String(req.params.documentId || "");
      const deleted = await MedicalModel.deleteDocument(
        documentId,
        user.userId,
      );
      if (!deleted) {
        res.status(404).json(errorResponse("Document not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ document: deleted }, "Document deleted"));
    },
  );

  // ---------- Notes ----------
  static getNote = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const appointmentId = String(req.params.appointmentId || "");
      const parties = await MedicalModel.getAppointmentParties(appointmentId);
      if (!parties) {
        res
          .status(404)
          .json(errorResponse("Appointment not found", "NOT_FOUND"));
        return;
      }
      if (!canAccessAppointment(user, parties)) {
        res.status(403).json(errorResponse("Forbidden", "FORBIDDEN"));
        return;
      }
      const note = await MedicalModel.getNoteByAppointment(appointmentId);
      if (!note) {
        res.status(404).json(errorResponse("Note not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ note }));
    },
  );

  static listMyNotes = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const notes = await MedicalModel.listNotesByPatient(user.userId);
      res.json(successResponse({ notes }));
    },
  );

  static listProviderNotes = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const notes = await MedicalModel.listNotesByProvider(user.userId);
      res.json(successResponse({ notes }));
    },
  );

  static upsertNote = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { appointmentId, content } = req.body;
      if (!appointmentId || content === undefined) {
        res
          .status(400)
          .json(
            errorResponse(
              "appointmentId and content are required",
              "MISSING_FIELDS",
            ),
          );
        return;
      }

      const parties = await MedicalModel.getAppointmentParties(appointmentId);
      if (!parties) {
        res
          .status(404)
          .json(errorResponse("Appointment not found", "NOT_FOUND"));
        return;
      }
      if (parties.providerId !== user.userId) {
        res.status(403).json(errorResponse("Forbidden", "FORBIDDEN"));
        return;
      }

      const note = await MedicalModel.upsertNote({
        appointmentId: Number(appointmentId),
        patientId: parties.patientId,
        providerId: user.userId,
        content,
      });
      res.status(201).json(successResponse({ note }, "Medical note saved"));
    },
  );

  // ---------- Prescriptions ----------
  static getPrescription = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const appointmentId = String(req.params.appointmentId || "");
      const parties = await MedicalModel.getAppointmentParties(appointmentId);
      if (!parties) {
        res
          .status(404)
          .json(errorResponse("Appointment not found", "NOT_FOUND"));
        return;
      }
      if (!canAccessAppointment(user, parties)) {
        res.status(403).json(errorResponse("Forbidden", "FORBIDDEN"));
        return;
      }
      const prescription =
        await MedicalModel.getPrescriptionByAppointment(appointmentId);
      if (!prescription) {
        res
          .status(404)
          .json(errorResponse("Prescription not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ prescription }));
    },
  );

  static listMyPrescriptions = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const prescriptions = await MedicalModel.listPrescriptionsByPatient(
        user.userId,
      );
      res.json(successResponse({ prescriptions }));
    },
  );

  static listProviderPrescriptions = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const prescriptions = await MedicalModel.listPrescriptionsByProvider(
        user.userId,
      );
      res.json(successResponse({ prescriptions }));
    },
  );

  static createPrescription = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { appointmentId, description } = req.body;
      if (!appointmentId || description === undefined) {
        res
          .status(400)
          .json(
            errorResponse(
              "appointmentId and description are required",
              "MISSING_FIELDS",
            ),
          );
        return;
      }

      const parties = await MedicalModel.getAppointmentParties(appointmentId);
      if (!parties) {
        res
          .status(404)
          .json(errorResponse("Appointment not found", "NOT_FOUND"));
        return;
      }
      if (parties.providerId !== user.userId) {
        res.status(403).json(errorResponse("Forbidden", "FORBIDDEN"));
        return;
      }

      const prescription = await MedicalModel.createPrescription({
        appointmentId: Number(appointmentId),
        patientId: parties.patientId,
        providerId: user.userId,
        description,
      });
      res
        .status(201)
        .json(successResponse({ prescription }, "Prescription saved"));
    },
  );

  // ---------- Recording ----------
  static getRecording = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const appointmentId = String(req.params.appointmentId || "");
      const parties = await MedicalModel.getAppointmentParties(appointmentId);
      if (!parties) {
        res
          .status(404)
          .json(errorResponse("Appointment not found", "NOT_FOUND"));
        return;
      }
      if (!canAccessAppointment(user, parties)) {
        res.status(403).json(errorResponse("Forbidden", "FORBIDDEN"));
        return;
      }
      const recording =
        await MedicalModel.getRecordingByAppointment(appointmentId);
      if (!recording) {
        res.status(404).json(errorResponse("Recording not found", "NOT_FOUND"));
        return;
      }
      let playbackUrl = recording.fileUrl;
      if (
        typeof recording.fileUrl === "string" &&
        !/^https?:\/\//i.test(recording.fileUrl)
      ) {
        const { StorageService } =
          await import("../../services/storage.service.js");
        playbackUrl = await StorageService.createRecordingDownloadUrl(
          recording.fileUrl,
        );
      }
      res.json(successResponse({ recording: { ...recording, playbackUrl } }));
    },
  );

  static createRecordingUploadUrl = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { appointmentId, fileName, contentType } = req.body ?? {};
      if (!appointmentId || !fileName || !contentType) {
        res
          .status(400)
          .json(
            errorResponse(
              "appointmentId, fileName, and contentType are required",
              "MISSING_FIELDS",
            ),
          );
        return;
      }
      const parties = await MedicalModel.getAppointmentParties(appointmentId);
      if (!parties) {
        res
          .status(404)
          .json(errorResponse("Appointment not found", "NOT_FOUND"));
        return;
      }
      if (parties.providerId !== user.userId) {
        res
          .status(403)
          .json(
            errorResponse(
              "Only the assigned provider can upload the session recording",
              "FORBIDDEN",
            ),
          );
        return;
      }
      if (!["InProgress", "Completed"].includes(parties.status)) {
        res
          .status(409)
          .json(
            errorResponse(
              "Recording is allowed only for an active or completed session",
              "SESSION_NOT_STARTED",
            ),
          );
        return;
      }
      const { StorageService } =
        await import("../../services/storage.service.js");
      const upload = await StorageService.createRecordingUploadUrl({
        providerId: user.userId,
        appointmentId,
        fileName: String(fileName),
        contentType: String(contentType),
      });
      res
        .status(201)
        .json(
          successResponse(
            { upload },
            "Upload URL created. Upload the video directly to Supabase.",
          ),
        );
    },
  );

  static confirmRecordingUpload = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { appointmentId, storagePath, durationSeconds } = req.body ?? {};
      if (!appointmentId || !storagePath) {
        res
          .status(400)
          .json(
            errorResponse(
              "appointmentId and storagePath are required",
              "MISSING_FIELDS",
            ),
          );
        return;
      }
      const parties = await MedicalModel.getAppointmentParties(appointmentId);
      if (!parties) {
        res
          .status(404)
          .json(errorResponse("Appointment not found", "NOT_FOUND"));
        return;
      }
      if (parties.providerId !== user.userId) {
        res
          .status(403)
          .json(
            errorResponse(
              "Only the assigned provider can save the session recording",
              "FORBIDDEN",
            ),
          );
        return;
      }
      if (!["InProgress", "Completed"].includes(parties.status)) {
        res
          .status(409)
          .json(
            errorResponse(
              "Recording can be saved only for an active or completed session",
              "SESSION_NOT_STARTED",
            ),
          );
        return;
      }
      const expectedPrefix = `${user.userId}/${appointmentId}/`;
      if (
        typeof storagePath !== "string" ||
        !storagePath.startsWith(expectedPrefix) ||
        storagePath.includes("..")
      ) {
        res
          .status(400)
          .json(
            errorResponse(
              "storagePath does not belong to this provider and appointment",
              "INVALID_STORAGE_PATH",
            ),
          );
        return;
      }
      const { StorageService } =
        await import("../../services/storage.service.js");
      await StorageService.createRecordingDownloadUrl(storagePath);
      const recording = await MedicalModel.createRecording({
        appointmentId: Number(appointmentId),
        fileUrl: storagePath,
        durationSeconds:
          durationSeconds !== undefined ? Number(durationSeconds) : null,
      });
      res
        .status(201)
        .json(successResponse({ recording }, "Session recording saved"));
    },
  );

  static createRecording = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { appointmentId, fileUrl, fileBase64, durationSeconds } = req.body;
      if (!appointmentId) {
        res
          .status(400)
          .json(errorResponse("appointmentId is required", "MISSING_FIELDS"));
        return;
      }

      const parties = await MedicalModel.getAppointmentParties(appointmentId);
      if (!parties) {
        res
          .status(404)
          .json(errorResponse("Appointment not found", "NOT_FOUND"));
        return;
      }
      const allowed =
        user.role === "admin" ||
        (user.role === "provider" && parties.providerId === user.userId) ||
        (user.role === "organization" && parties.organizerId === user.userId);
      if (!allowed) {
        res.status(403).json(errorResponse("Forbidden", "FORBIDDEN"));
        return;
      }

      let finalUrl = fileUrl as string | undefined;
      if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
        res
          .status(400)
          .json(
            errorResponse(
              "fileUrl must be a valid HTTPS URL",
              "INVALID_FILE_URL",
            ),
          );
        return;
      }
      if (fileBase64) {
        const { StorageService } =
          await import("../../services/storage.service.js");
        finalUrl = await StorageService.uploadMedicalFile({
          base64Data: fileBase64,
          ownerId: String(parties.providerId),
          kind: "recording",
          maxSizeMb: 100,
        });
      }

      if (!appointmentId || !finalUrl) {
        res
          .status(400)
          .json(
            errorResponse(
              "appointmentId and (fileUrl or fileBase64) are required",
              "MISSING_FIELDS",
            ),
          );
        return;
      }

      const recording = await MedicalModel.createRecording({
        appointmentId: Number(appointmentId),
        fileUrl: finalUrl,
        durationSeconds:
          durationSeconds !== undefined ? Number(durationSeconds) : null,
      });
      res.status(201).json(successResponse({ recording }, "Recording saved"));
    },
  );

  // ---------- OnlineRoom ----------
  static getMyOnlineRoom = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const room = await MedicalModel.getOnlineRoom(user.userId);
      res.json(successResponse({ room }));
    },
  );

  static getProviderOnlineRoom = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const providerId = String(req.params.providerId || "").trim();
      if (!providerId) {
        res
          .status(400)
          .json(errorResponse("providerId is required", "MISSING_PROVIDER_ID"));
        return;
      }

      const allowed = await MedicalModel.canAccessOnlineRoom(
        user.userId,
        user.role,
        providerId,
      );
      if (!allowed) {
        res
          .status(403)
          .json(
            errorResponse(
              "You do not have an active appointment with this provider",
              "FORBIDDEN",
            ),
          );
        return;
      }

      const room = await MedicalModel.getOnlineRoom(providerId);
      if (!room || room.status !== "Active") {
        res
          .status(404)
          .json(errorResponse("Online room not available", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ room }));
    },
  );

  static upsertOnlineRoom = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { roomLink, status } = req.body;
      if (!roomLink) {
        res
          .status(400)
          .json(errorResponse("roomLink is required", "MISSING_FIELDS"));
        return;
      }
      const room = await MedicalModel.upsertOnlineRoom({
        providerId: user.userId,
        roomLink,
        status,
      });
      res.json(successResponse({ room }, "Online room saved"));
    },
  );
}
