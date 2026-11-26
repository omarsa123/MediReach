import type { Request, Response } from "express";
import { PatientModel } from "./patient.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse } from "../../utils/response.utils.js";

export class PatientController {
  // جلب بروفايل المريض
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

  // تحديث بروفايل المريض
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

  // البحث والفلترة عن مقدمي الخدمة والخدمات
  static searchProviders = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const minPriceRaw = req.query.minPrice;
      const maxPriceRaw = req.query.maxPrice;
      const minPrice =
        minPriceRaw !== undefined ? Number(minPriceRaw) : undefined;
      const maxPrice =
        maxPriceRaw !== undefined ? Number(maxPriceRaw) : undefined;

      // دعم المسميات البديلة من وثيقة الـ API (type -> providerType, specialty -> specialization)
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

  // تفاصيل مقدم خدمة + خدماته + مواعيده
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

      res.json(successResponse({ provider }));
    },
  );

  // جلب المواعيد المتاحة لمزود معين وخدمة محددة في تاريخ معين
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

  // حجز موعد جديد
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
              "providerServiceId, appointmentDate, and startTime are required (endTime is calculated by the server)",
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

  // عرض حجوزات المريض
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

  // جلب تفاصيل حجز محدد
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

  // إلغاء حجز
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
}

/* ============================================================================
 * TODO [Patient Controller Remaining Endpoints]:
 * - GET /providers/:providerId/reviews : يتطلب إنشاء جدول Review في قاعدة البيانات أولاً.
 * - ملاحظة حول POST /appointments:
 *   الباك إند حالياً يعتمد على "providerServiceId" لتحديد المزود والخدمة والمؤسسة ونوع التقديم بدقة.
 *   الوثيقة تقترح إرسال (providerId + serviceId)، لذا يجب تنسيق هذا مع الفرونت إند أو تمرير providerServiceId.
 * ============================================================================ */
