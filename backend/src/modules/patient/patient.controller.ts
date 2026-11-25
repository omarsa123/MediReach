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
      const maxPriceRaw = req.query.maxPrice;
      const maxPrice =
        maxPriceRaw !== undefined ? Number(maxPriceRaw) : undefined;

      const providers = await PatientModel.searchProviders({
        search: req.query.search as string | undefined,
        specialization: req.query.specialization as string | undefined,
        providerType: req.query.providerType as string | undefined,
        deliveryMode: req.query.deliveryMode as string | undefined,
        organizationId: req.query.organizationId as string | undefined,
        maxPrice,
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
        startTime,
        endTime,
        visitAddress,
        visitNotes,
      } = req.body;

      if (!providerServiceId || !appointmentDate || !startTime || !endTime) {
        res
          .status(400)
          .json(
            errorResponse(
              "providerServiceId, appointmentDate, startTime, and endTime are required",
              "MISSING_FIELDS",
            ),
          );
        return;
      }

      const appointment = await PatientModel.createAppointment(user.userId, {
        providerServiceId: Number(providerServiceId),
        appointmentDate,
        startTime,
        endTime,
        visitAddress,
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

      const appointments = await PatientModel.listAppointments(
        user.userId,
        req.query.status as string | undefined,
      );

      res.json(successResponse({ appointments }));
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
