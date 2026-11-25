import { Router } from "express";
import { AppointmentController } from "./appointment.controller.js";
import {
  authorizeRoles,
  requireAuth,
} from "../../middleware/auth.middleware.js";

const appointmentRouter = Router();

appointmentRouter.post(
  "/",
  requireAuth,
  authorizeRoles("patient"),
  AppointmentController.create,
);

appointmentRouter.get(
  "/my",
  requireAuth,
  authorizeRoles("patient"),
  AppointmentController.myAppointments,
);

appointmentRouter.get(
  "/:id",
  requireAuth,
  AppointmentController.getById,
);

appointmentRouter.post(
  "/:id/cancel",
  requireAuth,
  AppointmentController.cancel,
);

export { appointmentRouter };
