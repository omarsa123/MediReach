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
        endTime,
        priceAtBooking,
        visitAddress,
        visitNotes,
      } = req.body;

      if (
        !providerServiceId ||
        !appointmentDate ||
        !startTime ||
        !endTime ||
        priceAtBooking === undefined
      ) {
        res
          .status(400)
          .json(
            errorResponse(
              "providerServiceId, appointmentDate, startTime, endTime, priceAtBooking are required",
              "MISSING_FIELDS",
            ),
          );
        return;
      }

      const appointment = await AppointmentModel.create({
        patientId: user.userId,
        providerServiceId: Number(providerServiceId),
        appointmentDate,
        startTime,
        endTime,
        priceAtBooking: Number(priceAtBooking),
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
      const id = req.params.id as string;
      const appointment = await AppointmentModel.findById(id);
      if (!appointment) {
        res
          .status(404)
          .json(errorResponse("Appointment not found", "NOT_FOUND"));
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

      // Simple ownership check for patient
      if (
        appointment.patientId !== user.userId &&
        user.role !== "admin" &&
        user.role !== "provider" &&
        user.role !== "organization"
      ) {
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
