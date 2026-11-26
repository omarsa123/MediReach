import { Router } from "express";
import { AdminController } from "./admin.controller.js";
import {
  authorizeRoles,
  requireAuth,
} from "../../middleware/auth.middleware.js";

const adminRouter = Router();

adminRouter.use(requireAuth, authorizeRoles("admin"));

// New web endpoints
adminRouter.get("/dashboard", AdminController.dashboard);
// Compatibility endpoints used by the earlier mobile frontend
adminRouter.get("/stats", AdminController.legacyStats);
adminRouter.get("/pending-organizations", AdminController.legacyPendingOrganizations);
adminRouter.post("/verify-organization", AdminController.legacyVerifyOrganization);
adminRouter.get("/organizations", AdminController.legacyOrganizations);
adminRouter.post("/toggle-user-status", AdminController.legacyToggleUserStatus);

adminRouter.get("/providers/pending", AdminController.listPendingProviders);
adminRouter.patch(
  "/providers/:providerId/verification",
  AdminController.updateProviderVerification,
);

adminRouter.get(
  "/organizations/pending",
  AdminController.listPendingOrganizations,
);
adminRouter.patch(
  "/organizations/:organizationId/verification",
  AdminController.updateOrganizationVerification,
);

adminRouter.get("/users", AdminController.listUsers);
adminRouter.patch("/users/:userId/status", AdminController.updateUserStatus);

export { adminRouter };
