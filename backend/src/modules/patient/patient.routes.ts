import { Router } from "express";
import { PatientController } from "./patient.controller.js";
import {
  authorizeRoles,
  requireAuth,
} from "../../middleware/auth.middleware.js";

const patientRouter = Router();

// 1. البروفايل
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

// 2. البحث والفلترة عن مقدمي الخدمة والخدمات والمواعيد المتاحة والتقييمات
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
  "/providers/:providerId/reviews",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.getProviderReviews,
);
patientRouter.get(
  "/providers/:providerId/availability",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.getProviderAvailability,
);

// 3. الحجوزات والتقييم
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
patientRouter.post(
  "/appointments/:appointmentId/rate",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.rateAppointment,
);

// 4. السجل الطبي (المستندات، الروشتات، الملاحظات الطبية)
patientRouter.get(
  "/documents",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.listMedicalDocuments,
);
patientRouter.post(
  "/documents",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.uploadMedicalDocument,
);
patientRouter.delete(
  "/documents/:documentId",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.deleteMedicalDocument,
);
patientRouter.get(
  "/prescriptions",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.listPrescriptions,
);
patientRouter.get(
  "/medical-notes",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.listMedicalNotes,
);

// 5. الإشعارات
patientRouter.get(
  "/notifications",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.listNotifications,
);
patientRouter.patch(
  "/notifications/read-all",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.markAllNotificationsRead,
);
patientRouter.patch(
  "/notifications/:notificationId/read",
  requireAuth,
  authorizeRoles("patient"),
  PatientController.markNotificationRead,
);

export { patientRouter };
