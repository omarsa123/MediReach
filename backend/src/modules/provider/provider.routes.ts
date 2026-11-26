import { Router } from "express";
import { ProviderController } from "./provider.controller.js";
import {
  authorizeRoles,
  requireAuth,
} from "../../middleware/auth.middleware.js";

const providerRouter = Router();

// البروفايل
providerRouter.get(
  "/profile",
  requireAuth,
  authorizeRoles("provider"),
  ProviderController.getProfile,
);
providerRouter.patch(
  "/profile",
  requireAuth,
  authorizeRoles("provider"),
  ProviderController.updateProfile,
);

// المواعيد
providerRouter.get(
  "/schedules",
  requireAuth,
  authorizeRoles("provider"),
  ProviderController.listSchedules,
);
providerRouter.post(
  "/schedules",
  requireAuth,
  authorizeRoles("provider"),
  ProviderController.createSchedule,
);
providerRouter.patch(
  "/schedules/:scheduleId",
  requireAuth,
  authorizeRoles("provider"),
  ProviderController.updateSchedule,
);
providerRouter.delete(
  "/schedules/:scheduleId",
  requireAuth,
  authorizeRoles("provider"),
  ProviderController.deleteSchedule,
);

// الحجوزات
providerRouter.get(
  "/appointments",
  requireAuth,
  authorizeRoles("provider"),
  ProviderController.listAppointments,
);
providerRouter.patch(
  "/appointments/:appointmentId/status",
  requireAuth,
  authorizeRoles("provider"),
  ProviderController.updateAppointmentStatus,
);

export { providerRouter };
