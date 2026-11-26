import { Router } from "express";
import { ProviderController } from "./provider.controller.js";
import {
  authorizeRoles,
  requireAuth,
} from "../../middleware/auth.middleware.js";

const providerRouter = Router();

// 1. البروفايل
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

// 2. المواعيد (Schedules)
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

// 3. الحجوزات (Appointments)
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

// 4. السجل الطبي والروشتات (Prescriptions & Medical Notes)
providerRouter.get(
  "/prescriptions",
  requireAuth,
  authorizeRoles("provider"),
  ProviderController.listProviderPrescriptions,
);
providerRouter.post(
  "/prescriptions",
  requireAuth,
  authorizeRoles("provider"),
  ProviderController.createPrescription,
);
providerRouter.get(
  "/medical-notes",
  requireAuth,
  authorizeRoles("provider"),
  ProviderController.listProviderMedicalNotes,
);
providerRouter.post(
  "/medical-notes",
  requireAuth,
  authorizeRoles("provider"),
  ProviderController.upsertMedicalNote,
);

// 5. غرفة الكشف الأونلاين والتقييمات
providerRouter.get(
  "/online-room",
  requireAuth,
  authorizeRoles("provider"),
  ProviderController.getOnlineRoom,
);
providerRouter.post(
  "/online-room",
  requireAuth,
  authorizeRoles("provider"),
  ProviderController.upsertOnlineRoom,
);
providerRouter.get(
  "/reviews",
  requireAuth,
  authorizeRoles("provider"),
  ProviderController.getProviderReviews,
);

export { providerRouter };
