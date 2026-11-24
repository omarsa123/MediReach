import { Router } from "express";
import { OrganizationController } from "./organization.controller.js";
import {
  authorizeRoles,
  requireAuth,
} from "../../middleware/auth.middleware.js";

const organizationRouter = Router();

organizationRouter.get(
  "/profile",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.getProfile,
);
organizationRouter.patch(
  "/profile",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.updateProfile,
);

export { organizationRouter };
