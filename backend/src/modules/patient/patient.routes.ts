import { Router } from "express";
import { PatientController } from "./patient.controller.js";
import {
  authorizeRoles,
  requireAuth,
} from "../../middleware/auth.middleware.js";

const patientRouter = Router();

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

export { patientRouter };
