import type { Request, Response } from "express";
import { AppointmentModel } from "./appointment.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse } from "../../utils/response.utils.js";

export class AppointmentController {
  static create = catchAsync(
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
        visitAddress,
        visitNotes,
      } = req.body;

      if (!providerServiceId || !appointmentDate || !startTime) {
        res
          .status(400)
          .json(
            errorResponse(
              "providerServiceId, appointmentDate, and startTime are required (endTime and price are calculated by the server)",
              "MISSING_FIELDS",
            ),
          );
        return;
      }

      const appointment = await AppointmentModel.book({
        patientId: user.userId,
        providerServiceId: Number(providerServiceId),
        appointmentDate,
        startTime,
        visitAddress,
        visitNotes,
      });

      res
        .status(201)
        .json(
          successResponse({ appointment }, "Appointment created successfully"),
        );
    },
  );

  static myAppointments = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const status = req.query.status as string | undefined;
      const appointments = await AppointmentModel.listByPatient(
        user.userId,
        status,
      );
      res.json(
        successResponse({ appointments }, "Appointments fetched successfully"),
      );
    },
  );

  static getById = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const id = req.params.id as string;
      const appointment = await AppointmentModel.findById(id);
      if (!appointment) {
        res
          .status(404)
          .json(errorResponse("Appointment not found", "NOT_FOUND"));
        return;
      }

      // تحقق الملكية: المريض أو المزود أو الأدمن أو المؤسسة
      const isPatient = appointment.patientId === user.userId;
      const isProvider =
        user.role === "provider" &&
        (await AppointmentModel.isProviderOwner(id, user.userId));
      const isPrivileged =
        user.role === "admin" || user.role === "organization";

      if (!isPatient && !isProvider && !isPrivileged) {
        res.status(403).json(errorResponse("Forbidden", "FORBIDDEN"));
        return;
      }

      res.json(successResponse({ appointment }));
    },
  );

  static cancel = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const id = req.params.id as string;
      const appointment = await AppointmentModel.findById(id);
      if (!appointment) {
        res
          .status(404)
          .json(errorResponse("Appointment not found", "NOT_FOUND"));
        return;
      }

      const isPatient = appointment.patientId === user.userId;
      const isProvider =
        user.role === "provider" &&
        (await AppointmentModel.isProviderOwner(id, user.userId));
      const isPrivileged =
        user.role === "admin" || user.role === "organization";

      if (!isPatient && !isProvider && !isPrivileged) {
        res.status(403).json(errorResponse("Forbidden", "FORBIDDEN"));
        return;
      }

      const cancelledBy =
        user.role === "patient"
          ? "Patient"
          : user.role === "provider"
            ? "Provider"
            : user.role === "organization"
              ? "Organizer"
              : "Admin";

      // يستخدم transitionAppointmentStatus → يمنع إلغاء Completed مثلاً
      const updated = await AppointmentModel.updateStatus(
        id,
        "Cancelled",
        cancelledBy,
      );
      res.json(
        successResponse({ appointment: updated }, "Appointment cancelled"),
      );
    },
  );
}
