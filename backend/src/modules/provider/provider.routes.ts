import { Router } from "express";
import { ProviderController } from "./provider.controller.js";
import {
  authorizeRoles,
  requireAuth,
} from "../../middleware/auth.middleware.js";

const providerRouter = Router();

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

export { providerRouter };
