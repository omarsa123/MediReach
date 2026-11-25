import { Router } from "express";
import { PatientController } from "./patient.controller.js";
import {
  authorizeRoles,
  requireAuth,
} from "../../middleware/auth.middleware.js";

const patientRouter = Router();

// البروفايل
patientRouter.get(
  "/profile",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.getProfile,
);
patientRouter.patch(
  "/profile",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.updateProfile,
);

// البحث والفلترة عن مقدمي الخدمة والخدمات
patientRouter.get(
  "/providers",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.searchProviders,
);
patientRouter.get(
  "/providers/:providerId",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.getProviderDetails,
);

// الحجوزات
patientRouter.get(
  "/appointments",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.listAppointments,
);
patientRouter.post(
  "/appointments",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.createAppointment,
);
patientRouter.patch(
  "/appointments/:appointmentId/cancel",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.cancelAppointment,
);

export { patientRouter };
