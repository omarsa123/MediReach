import type { Request, Response } from "express";
import { PatientModel } from "./patient.model.js";
import { MedicalModel } from "../medical/medical.model.js";
import { RateModel } from "../rate/rate.model.js";
import { NotificationModel } from "../notification/notification.model.js";
import { StorageService } from "../../services/storage.service.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse } from "../../utils/response.utils.js";

export class PatientController {
  static getProfile = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const patientProfile = await PatientModel.findPatientProfile(user.userId);
      if (!patientProfile) {
        res
          .status(404)
          .json(errorResponse("Patient profile not found", "NOT_FOUND"));
        return;
      }

      res.json(successResponse({ patient: patientProfile }));
    },
  );

  static updateProfile = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const updatedProfile = await PatientModel.updatePatientProfile(
        user.userId,
        req.body,
      );
      if (!updatedProfile) {
        res
          .status(404)
          .json(errorResponse("Patient profile not found", "NOT_FOUND"));
        return;
      }

      res.json(
        successResponse(
          { patient: updatedProfile },
          "Patient profile updated successfully",
        ),
      );
    },
  );

  static searchProviders = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const minPriceRaw = req.query.minPrice;
      const maxPriceRaw = req.query.maxPrice;
      const minPrice =
        minPriceRaw !== undefined ? Number(minPriceRaw) : undefined;
      const maxPrice =
        maxPriceRaw !== undefined ? Number(maxPriceRaw) : undefined;

      const providerType =
        (req.query.providerType as string | undefined) ||
        (req.query.type as string | undefined);
      const specialization =
        (req.query.specialization as string | undefined) ||
        (req.query.specialty as string | undefined);

      const providers = await PatientModel.searchProviders({
        search:
          typeof req.query.search === "string" ? req.query.search : undefined,
        specialization,
        providerType,
        deliveryMode:
          typeof req.query.deliveryMode === "string"
            ? req.query.deliveryMode
            : undefined,
        organizationId:
          typeof req.query.organizationId === "string"
            ? req.query.organizationId
            : undefined,
        serviceId:
          typeof req.query.serviceId === "string"
            ? req.query.serviceId
            : undefined,
        minPrice,
        maxPrice,
        sortBy:
          typeof req.query.sortBy === "string" ? req.query.sortBy : undefined,
        order:
          typeof req.query.order === "string" ? req.query.order : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });

      res.json(successResponse({ providers }));
    },
  );

  static getProviderDetails = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const providerId = String(req.params.providerId || "").trim();
      if (!providerId) {
        res
          .status(400)
          .json(errorResponse("providerId is required", "MISSING_PROVIDER_ID"));
        return;
      }

      const provider = await PatientModel.getProviderDetails(providerId);
      if (!provider) {
        res.status(404).json(errorResponse("Provider not found", "NOT_FOUND"));
        return;
      }

      const ratingStats = await RateModel.averageForProvider(providerId);

      res.json(
        successResponse({
          provider: {
            ...provider,
            rating: Number(ratingStats?.averageRating || 0),
            reviewCount: Number(ratingStats?.totalRatings || 0),
          },
        }),
      );
    },
  );

  static getProviderReviews = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const providerId = String(req.params.providerId || "").trim();
      if (!providerId) {
        res
          .status(400)
          .json(errorResponse("providerId is required", "MISSING_PROVIDER_ID"));
        return;
      }

      const [reviews, stats] = await Promise.all([
        RateModel.listByProvider(providerId),
        RateModel.averageForProvider(providerId),
      ]);

      res.json(
        successResponse({
          averageRating: Number(stats?.averageRating || 0),
          totalRatings: Number(stats?.totalRatings || 0),
          reviews,
        }),
      );
    },
  );

  static getProviderAvailability = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const providerId = String(req.params.providerId || "").trim();
      const serviceIdRaw = req.query.serviceId;
      const date =
        typeof req.query.date === "string" ? req.query.date.trim() : "";

      if (!providerId || !serviceIdRaw || !date) {
        res
          .status(400)
          .json(
            errorResponse(
              "providerId, serviceId, and date (YYYY-MM-DD) are required",
              "MISSING_FIELDS",
            ),
          );
        return;
      }

      const slots = await PatientModel.getProviderAvailability(
        providerId,
        Number(serviceIdRaw),
        date,
      );

      res.json(successResponse({ slots }));
    },
  );

  static createAppointment = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const {
        providerServiceId,
        appointmentDate,
        date,
        startTime,
        visitAddress,
        address,
        visitNotes,
      } = req.body;

      const resolvedDate = appointmentDate || date;
      const resolvedAddress = visitAddress ?? address;

      if (!providerServiceId || !resolvedDate || !startTime) {
        res
          .status(400)
          .json(
            errorResponse(
              "providerServiceId, appointmentDate, and startTime are required",
              "MISSING_FIELDS",
            ),
          );
        return;
      }

      const appointment = await PatientModel.createAppointment(user.userId, {
        providerServiceId: Number(providerServiceId),
        appointmentDate: String(resolvedDate),
        startTime: String(startTime),
        visitAddress: resolvedAddress,
        visitNotes,
      });

      res
        .status(201)
        .json(
          successResponse({ appointment }, "Appointment booked successfully"),
        );
    },
  );

  static listAppointments = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const appointments = await PatientModel.listAppointments(user.userId, {
        status:
          typeof req.query.status === "string" ? req.query.status : undefined,
        date: typeof req.query.date === "string" ? req.query.date : undefined,
        startDate:
          typeof req.query.startDate === "string"
            ? req.query.startDate
            : undefined,
        endDate:
          typeof req.query.endDate === "string" ? req.query.endDate : undefined,
        sortBy:
          typeof req.query.sortBy === "string" ? req.query.sortBy : undefined,
        order:
          typeof req.query.order === "string" ? req.query.order : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });

      res.json(successResponse({ appointments }));
    },
  );

  static getAppointmentDetails = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const appointmentId = String(req.params.appointmentId || "").trim();
      const appointment = await PatientModel.getAppointmentById(
        user.userId,
        appointmentId,
      );

      if (!appointment) {
        res
          .status(404)
          .json(errorResponse("Appointment not found", "NOT_FOUND"));
        return;
      }

      res.json(successResponse({ appointment }));
    },
  );

  static cancelAppointment = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const appointmentId = String(req.params.appointmentId || "").trim();
      const cancelled = await PatientModel.cancelAppointment(
        user.userId,
        appointmentId,
      );

      if (!cancelled) {
        res
          .status(404)
          .json(
            errorResponse(
              "Appointment not found or cannot be cancelled",
              "NOT_FOUND_OR_LOCKED",
            ),
          );
        return;
      }

      res.json(
        successResponse(
          { appointment: cancelled },
          "Appointment cancelled successfully",
        ),
      );
    },
  );

  // التقييم مع التحقق الآمن والصارم من الـ appointmentId
  static rateAppointment = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const appointmentId = Number(req.params.appointmentId);
      const { ratingValue, rating, comment } = req.body;
      const resolvedRating = Number(ratingValue ?? rating);

      if (
        !Number.isInteger(appointmentId) ||
        appointmentId <= 0 ||
        Number.isNaN(resolvedRating)
      ) {
        res
          .status(400)
          .json(
            errorResponse(
              "Valid positive appointmentId and ratingValue (1-5) are required",
              "MISSING_OR_INVALID_FIELDS",
            ),
          );
        return;
      }

      const createdRate = await RateModel.create({
        appointmentId,
        patientId: user.userId,
        ratingValue: resolvedRating,
        comment: comment ?? null,
      });

      res
        .status(201)
        .json(
          successResponse(
            { rate: createdRate },
            "Appointment rated successfully",
          ),
        );
    },
  );

  static listMedicalDocuments = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const documents = await MedicalModel.listDocuments(user.userId);
      res.json(successResponse({ documents }));
    },
  );

  static uploadMedicalDocument = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { fileName, fileType, fileUrl, fileBase64, description } = req.body;

      if (!fileName || (!fileUrl && !fileBase64)) {
        res
          .status(400)
          .json(
            errorResponse(
              "fileName and either fileUrl or fileBase64 are required",
              "MISSING_FIELDS",
            ),
          );
        return;
      }

      let resolvedUrl = fileUrl;
      if (!resolvedUrl && fileBase64) {
        if (
          typeof (StorageService as any).uploadMedicalDocument === "function"
        ) {
          resolvedUrl = await (StorageService as any).uploadMedicalDocument(
            fileBase64,
            user.userId,
            fileName,
          );
        } else {
          res
            .status(400)
            .json(
              errorResponse(
                "Direct base64 upload helper not configured; provide fileUrl",
                "UPLOAD_NOT_CONFIGURED",
              ),
            );
          return;
        }
      }

      const document = await MedicalModel.createDocument({
        patientId: user.userId,
        fileName: String(fileName).trim(),
        fileType,
        fileUrl: resolvedUrl,
        description: description ?? null,
      });

      res
        .status(201)
        .json(
          successResponse(
            { document },
            "Medical document uploaded successfully",
          ),
        );
    },
  );

  static deleteMedicalDocument = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const documentId = String(req.params.documentId || "").trim();
      const deleted = await MedicalModel.deleteDocument(
        documentId,
        user.userId,
      );

      if (!deleted) {
        res.status(404).json(errorResponse("Document not found", "NOT_FOUND"));
        return;
      }

      res.json(
        successResponse({ document: deleted }, "Medical document deleted"),
      );
    },
  );

  static listPrescriptions = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const prescriptions = await MedicalModel.listPrescriptionsByPatient(
        user.userId,
      );
      res.json(successResponse({ prescriptions }));
    },
  );

  static listMedicalNotes = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const notes = await MedicalModel.listNotesByPatient(user.userId);
      res.json(successResponse({ notes }));
    },
  );

  static listNotifications = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const onlyUnread = req.query.unread === "true";
      const [notifications, unreadCount] = await Promise.all([
        NotificationModel.listByUser(user.userId, onlyUnread),
        NotificationModel.unreadCount(user.userId),
      ]);
      res.json(successResponse({ unreadCount, notifications }));
    },
  );

  static markNotificationRead = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const notificationId = String(req.params.notificationId || "").trim();
      const updated = await NotificationModel.markAsRead(
        notificationId,
        user.userId,
      );

      if (!updated) {
        res
          .status(404)
          .json(errorResponse("Notification not found", "NOT_FOUND"));
        return;
      }

      res.json(successResponse({ notification: updated }));
    },
  );

  static markAllNotificationsRead = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const count = await NotificationModel.markAllAsRead(user.userId);
      res.json(
        successResponse(
          { markedCount: count },
          "All notifications marked as read",
        ),
      );
    },
  );
}
