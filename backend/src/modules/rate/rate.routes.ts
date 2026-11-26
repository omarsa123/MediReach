import { Router } from "express";
import { RateController } from "./rate.controller.js";
import {
  authorizeRoles,
  requireAuth,
} from "../../middleware/auth.middleware.js";

const rateRouter = Router();

rateRouter.post(
  "/",
  requireAuth,
  authorizeRoles("patient"),
  RateController.create,
);

rateRouter.patch(
  "/appointment/:appointmentId",
  requireAuth,
  authorizeRoles("patient"),
  RateController.update,
);

rateRouter.get(
  "/appointment/:appointmentId",
  requireAuth,
  RateController.getByAppointment,
);

rateRouter.get(
  "/provider/:providerId",
  requireAuth,
  RateController.listByProvider,
);

rateRouter.get(
  "/my",
  requireAuth,
  authorizeRoles("provider"),
  RateController.myProviderRates,
);

rateRouter.get(
  "/organization",
  requireAuth,
  authorizeRoles("organization"),
  RateController.organizationRates,
);

export { rateRouter };
