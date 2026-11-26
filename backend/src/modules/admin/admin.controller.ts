import type { Request, Response } from "express";
import { AdminModel } from "./admin.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse } from "../../utils/response.utils.js";

export class AdminController {
  // Legacy mobile API compatibility
  static legacyStats = catchAsync(async (_req: Request, res: Response) => {
    const stats: any = await AdminModel.dashboardStats();
    const orgs = await AdminModel.listOrganizations();
    const count = (type: string) => orgs.filter((o: any) => o.organizerType === type).length;
    res.json(successResponse({ ...stats, totalHospitals: count("Hospital"), totalClinics: count("Clinic"), totalLabs: count("Lab"), totalPhysio: count("PhysiotherapyCenter"), pendingCount: stats.pendingOrganizations }));
  });

  static legacyPendingOrganizations = catchAsync(async (_req: Request, res: Response) => {
    const organizations = await AdminModel.listPendingOrganizations();
    res.json(successResponse(organizations, "Pending organizations retrieved successfully"));
  });

  static legacyVerifyOrganization = catchAsync(async (req: Request, res: Response) => {
    const { organizationId, status } = req.body || {};
    if (!organizationId || !["Approved", "Rejected"].includes(status)) {
      res.status(400).json(errorResponse("organizationId and valid status are required", "INVALID_INPUT")); return;
    }
    const organization = await AdminModel.updateOrganizationVerification(organizationId, status);
    if (!organization) { res.status(404).json(errorResponse("Organization not found", "NOT_FOUND")); return; }
    res.json(successResponse(organization, `Organization has been ${status.toLowerCase()} successfully`));
  });

  static legacyOrganizations = catchAsync(async (req: Request, res: Response) => {
    const organizations = await AdminModel.listOrganizations(req.query.type as string | undefined);
    res.json(successResponse(organizations, "Organizations retrieved successfully"));
  });

  static legacyToggleUserStatus = catchAsync(async (req: Request, res: Response) => {
    const { userId, status } = req.body || {};
    if (!userId || !["Active", "Suspended"].includes(status)) {
      res.status(400).json(errorResponse("userId and valid status are required", "INVALID_INPUT")); return;
    }
    const user = await AdminModel.updateUserStatus(userId, status);
    if (!user) { res.status(404).json(errorResponse("User not found", "NOT_FOUND")); return; }
    res.json(successResponse(user, `User status changed to ${status}`));
  });

  static dashboard = catchAsync(
    async (_req: Request, res: Response): Promise<void> => {
      const stats = await AdminModel.dashboardStats();
      res.json(successResponse({ stats }));
    },
  );

  static listPendingProviders = catchAsync(
    async (_req: Request, res: Response): Promise<void> => {
      const providers = await AdminModel.listPendingProviders();
      res.json(successResponse({ providers }));
    },
  );

  static updateProviderVerification = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { status } = req.body;
      const allowed = ["Pending", "Approved", "Rejected"];
      if (!status || !allowed.includes(status)) {
        res
          .status(400)
          .json(
            errorResponse(
              `status must be one of: ${allowed.join(", ")}`,
              "INVALID_STATUS",
            ),
          );
        return;
      }
      const provider = await AdminModel.updateProviderVerification(
        req.params.providerId,
        status,
      );
      if (!provider) {
        res.status(404).json(errorResponse("Provider not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ provider }, "Provider verification updated"));
    },
  );

  static listPendingOrganizations = catchAsync(
    async (_req: Request, res: Response): Promise<void> => {
      const organizations = await AdminModel.listPendingOrganizations();
      res.json(successResponse({ organizations }));
    },
  );

  static updateOrganizationVerification = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { status } = req.body;
      const allowed = ["Pending", "Approved", "Rejected"];
      if (!status || !allowed.includes(status)) {
        res
          .status(400)
          .json(
            errorResponse(
              `status must be one of: ${allowed.join(", ")}`,
              "INVALID_STATUS",
            ),
          );
        return;
      }
      const organization = await AdminModel.updateOrganizationVerification(
        req.params.organizationId,
        status,
      );
      if (!organization) {
        res
          .status(404)
          .json(errorResponse("Organization not found", "NOT_FOUND"));
        return;
      }
      res.json(
        successResponse({ organization }, "Organization verification updated"),
      );
    },
  );

  static listUsers = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const status = req.query.status as string | undefined;
      const role = req.query.role as string | undefined;
      const users = await AdminModel.listUsers({ status, role });
      res.json(successResponse({ users }));
    },
  );

  static updateUserStatus = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { status } = req.body;
      const allowed = ["Active", "Inactive", "Suspended"];
      if (!status || !allowed.includes(status)) {
        res
          .status(400)
          .json(
            errorResponse(
              `status must be one of: ${allowed.join(", ")}`,
              "INVALID_STATUS",
            ),
          );
        return;
      }
      const user = await AdminModel.updateUserStatus(req.params.userId, status);
      if (!user) {
        res.status(404).json(errorResponse("User not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ user }, "User status updated"));
    },
  );
}
