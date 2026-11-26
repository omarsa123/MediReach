import { Router } from "express";
import { OrganizationController } from "./organization.controller.js";
import {
  authorizeRoles,
  requireAuth,
} from "../../middleware/auth.middleware.js";

const organizationRouter = Router();

// Profile
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

// Catalog of platform services (for org to pick when creating OrganizerService)
organizationRouter.get(
  "/catalog/services",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.listCatalogServices,
);

// OrganizerService CRUD
organizationRouter.get(
  "/services",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.listOrganizerServices,
);
organizationRouter.post(
  "/services",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.createOrganizerService,
);
organizationRouter.patch(
  "/services/:organizerServiceId",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.updateOrganizerService,
);
organizationRouter.delete(
  "/services/:organizerServiceId",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.deleteOrganizerService,
);

// ProviderAssignment
organizationRouter.get(
  "/assignments",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.listAssignments,
);
organizationRouter.post(
  "/assignments",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.createAssignment,
);
organizationRouter.patch(
  "/assignments/:assignmentId/status",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.updateAssignmentStatus,
);

// ProviderService (link assignment ↔ organizer service)
organizationRouter.get(
  "/provider-services",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.listProviderServices,
);
organizationRouter.post(
  "/provider-services",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.createProviderService,
);
organizationRouter.patch(
  "/provider-services/:providerServiceId",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.updateProviderService,
);

// Departments (Hospital)
organizationRouter.get(
  "/departments",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.listDepartments,
);
organizationRouter.post(
  "/departments",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.createDepartment,
);
organizationRouter.patch(
  "/departments/:departmentId",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.updateDepartment,
);
organizationRouter.delete(
  "/departments/:departmentId",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.deleteDepartment,
);
organizationRouter.post(
  "/departments/:departmentId/providers",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.assignProviderToDepartment,
);
organizationRouter.get(
  "/departments/:departmentId/providers",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.listDepartmentProviders,
);

// Ambulances (Hospital)
organizationRouter.get(
  "/ambulances",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.listAmbulances,
);
organizationRouter.post(
  "/ambulances",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.createAmbulance,
);
organizationRouter.patch(
  "/ambulances/:ambulanceId/status",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.updateAmbulanceStatus,
);

organizationRouter.get(
  "/appointments",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.listAppointments,
);
organizationRouter.get(
  "/assignments/:assignmentId",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.getAssignment,
);
// لحذف طبيب من قسم معين
organizationRouter.delete(
  "/departments/:departmentId/providers/:assignmentId",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.removeProviderFromDepartment,
);

// لعرض تقييمات ومراجعات المؤسسة
organizationRouter.get(
  "/reviews",
  requireAuth,
  authorizeRoles("organization"),
  OrganizationController.getOrganizationReviews,
);

export { organizationRouter };
