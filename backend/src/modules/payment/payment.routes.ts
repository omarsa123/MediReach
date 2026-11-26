import { Router } from "express";
import { PaymentController } from "./payment.controller.js";
import {
  authorizeRoles,
  requireAuth,
} from "../../middleware/auth.middleware.js";

const paymentRouter = Router();

paymentRouter.post(
  "/",
  requireAuth,
  authorizeRoles("patient", "admin"),
  PaymentController.create,
);

paymentRouter.get(
  "/my",
  requireAuth,
  authorizeRoles("patient"),
  PaymentController.myPayments,
);

paymentRouter.get(
  "/provider",
  requireAuth,
  authorizeRoles("provider"),
  PaymentController.providerPayments,
);

paymentRouter.get(
  "/organization",
  requireAuth,
  authorizeRoles("organization"),
  PaymentController.organizationPayments,
);

paymentRouter.get(
  "/appointment/:appointmentId",
  requireAuth,
  PaymentController.getByAppointment,
);

paymentRouter.get(
  "/:paymentId",
  requireAuth,
  PaymentController.getById,
);

paymentRouter.patch(
  "/:paymentId/status",
  requireAuth,
  authorizeRoles("patient", "provider", "organization", "admin"),
  PaymentController.updateStatus,
);

export { paymentRouter };
