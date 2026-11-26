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

// البحث والفلترة عن مقدمي الخدمة والخدمات والمواعيد المتاحة
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
patientRouter.get(
  "/providers/:providerId/availability",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.getProviderAvailability,
);

// الحجوزات
patientRouter.get(
  "/appointments",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.listAppointments,
);
patientRouter.get(
  "/appointments/:appointmentId",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.getAppointmentDetails,
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

/* ============================================================================
 * TODO [Patient Routes Remaining]:
 * 1. GET /providers/:providerId/reviews -> إضافة الراوت بعد إنشاء جدول Review.
 * 2. GET /services -> موجود بالفعل في service.routes.ts (/api/services) ولا يحتاج تكراره هنا.
 * ============================================================================ */
