import type { Request, Response } from "express";
import { ProviderModel } from "./provider.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse } from "../../utils/response.utils.js";

const ALLOWED_APPOINTMENT_STATUSES = new Set([
  "Confirmed",
  "InProgress",
  "Completed",
  "Cancelled",
]);

export class ProviderController {
  static getProfile = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const providerProfile = await ProviderModel.findProviderProfile(
        user.userId,
      );
      if (!providerProfile) {
        res
          .status(404)
          .json(errorResponse("Provider profile not found", "NOT_FOUND"));
        return;
      }

      res.json(successResponse({ provider: providerProfile }));
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

      const updatedProfile = await ProviderModel.updateProviderProfile(
        user.userId,
        req.body,
      );
      if (!updatedProfile) {
        res
          .status(404)
          .json(errorResponse("Provider profile not found", "NOT_FOUND"));
        return;
      }

      res.json(
        successResponse(
          { provider: updatedProfile },
          "Provider profile updated successfully",
        ),
      );
    },
  );

  static listSchedules = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const schedules = await ProviderModel.listSchedules(user.userId);
      res.json(successResponse({ schedules }));
    },
  );

  static createSchedule = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const { assignmentId, dayOfWeek, startTime, endTime, deliveryMode } =
        req.body;
      if (
        !assignmentId ||
        !dayOfWeek ||
        !startTime ||
        !endTime ||
        !deliveryMode
      ) {
        res
          .status(400)
          .json(
            errorResponse(
              "assignmentId, dayOfWeek, startTime, endTime, and deliveryMode are required",
              "MISSING_FIELDS",
            ),
          );
        return;
      }

      const schedule = await ProviderModel.createSchedule(user.userId, {
        assignmentId: Number(assignmentId),
        dayOfWeek,
        startTime,
        endTime,
        deliveryMode,
      });

      res
        .status(201)
        .json(successResponse({ schedule }, "Schedule created successfully"));
    },
  );

  static updateSchedule = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const scheduleId = Number(req.params.scheduleId);
      if (!scheduleId) {
        res
          .status(400)
          .json(errorResponse("scheduleId is required", "MISSING_SCHEDULE_ID"));
        return;
      }

      const updated = await ProviderModel.updateSchedule(
        user.userId,
        scheduleId,
        req.body,
      );
      if (!updated) {
        res
          .status(404)
          .json(errorResponse("Schedule not found", "NOT_FOUND"));
        return;
      }

      res.json(
        successResponse({ schedule: updated }, "Schedule updated successfully"),
      );
    },
  );

  static deleteSchedule = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const scheduleId = Number(req.params.scheduleId);
      if (!scheduleId) {
        res
          .status(400)
          .json(errorResponse("scheduleId is required", "MISSING_SCHEDULE_ID"));
        return;
      }

      const deleted = await ProviderModel.deleteSchedule(
        user.userId,
        scheduleId,
      );
      if (!deleted) {
        res
          .status(404)
          .json(errorResponse("Schedule not found", "NOT_FOUND"));
        return;
      }

      res.json(
        successResponse(
          { schedule: deleted },
          "Schedule deactivated successfully",
        ),
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

      const appointments = await ProviderModel.listAppointments(
        user.userId,
        req.query.status as string | undefined,
      );

      res.json(successResponse({ appointments }));
    },
  );

  static updateAppointmentStatus = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const appointmentId = String(req.params.appointmentId || "").trim();
      const nextStatus = String(req.body?.status || "").trim();

      if (!ALLOWED_APPOINTMENT_STATUSES.has(nextStatus)) {
        res
          .status(400)
          .json(
            errorResponse(
              "Invalid status. Allowed: Confirmed, InProgress, Completed, Cancelled",
              "INVALID_STATUS",
            ),
          );
        return;
      }

      const updated = await ProviderModel.updateAppointmentStatus(
        user.userId,
        appointmentId,
        nextStatus as "Confirmed" | "InProgress" | "Completed" | "Cancelled",
      );

      if (!updated) {
        res
          .status(404)
          .json(errorResponse("Appointment not found", "NOT_FOUND"));
        return;
      }

      res.json(
        successResponse(
          { appointment: updated },
          "Appointment status updated successfully",
        ),
      );
    },
  );
}
