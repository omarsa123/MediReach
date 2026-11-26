import { Router } from "express";
import { MedicalController } from "./medical.controller.js";
import {
  authorizeRoles,
  requireAuth,
} from "../../middleware/auth.middleware.js";

const medicalRouter = Router();

// ---------- Patient medical documents ----------
medicalRouter.get(
  "/documents",
  requireAuth,
  authorizeRoles("patient"),
  MedicalController.listDocuments,
);
medicalRouter.get(
  "/documents/:documentId",
  requireAuth,
  authorizeRoles("patient", "admin"),
  MedicalController.getDocument,
);
medicalRouter.post(
  "/documents",
  requireAuth,
  authorizeRoles("patient"),
  MedicalController.createDocument,
);
medicalRouter.patch(
  "/documents/:documentId",
  requireAuth,
  authorizeRoles("patient"),
  MedicalController.updateDocument,
);
medicalRouter.delete(
  "/documents/:documentId",
  requireAuth,
  authorizeRoles("patient"),
  MedicalController.deleteDocument,
);

// ---------- Notes ----------
medicalRouter.get(
  "/notes/my",
  requireAuth,
  authorizeRoles("patient"),
  MedicalController.listMyNotes,
);
medicalRouter.get(
  "/notes/provider",
  requireAuth,
  authorizeRoles("provider"),
  MedicalController.listProviderNotes,
);
medicalRouter.get(
  "/notes/appointment/:appointmentId",
  requireAuth,
  MedicalController.getNote,
);
medicalRouter.post(
  "/notes",
  requireAuth,
  authorizeRoles("provider"),
  MedicalController.upsertNote,
);

// ---------- Prescriptions ----------
medicalRouter.get(
  "/prescriptions/my",
  requireAuth,
  authorizeRoles("patient"),
  MedicalController.listMyPrescriptions,
);
medicalRouter.get(
  "/prescriptions/provider",
  requireAuth,
  authorizeRoles("provider"),
  MedicalController.listProviderPrescriptions,
);
medicalRouter.get(
  "/prescriptions/appointment/:appointmentId",
  requireAuth,
  MedicalController.getPrescription,
);
medicalRouter.post(
  "/prescriptions",
  requireAuth,
  authorizeRoles("provider"),
  MedicalController.createPrescription,
);

// ---------- Recordings ----------
medicalRouter.get(
  "/recordings/appointment/:appointmentId",
  requireAuth,
  MedicalController.getRecording,
);
medicalRouter.post(
  "/recordings",
  requireAuth,
  authorizeRoles("provider", "organization", "admin"),
  MedicalController.createRecording,
);

// ---------- Online room ----------
medicalRouter.get(
  "/online-room",
  requireAuth,
  authorizeRoles("provider"),
  MedicalController.getMyOnlineRoom,
);
medicalRouter.get(
  "/online-room/:providerId",
  requireAuth,
  MedicalController.getProviderOnlineRoom,
);
medicalRouter.put(
  "/online-room",
  requireAuth,
  authorizeRoles("provider"),
  MedicalController.upsertOnlineRoom,
);

export { medicalRouter };
