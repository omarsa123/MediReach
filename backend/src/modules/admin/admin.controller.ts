import type { Request, Response } from "express";
import { AdminModel } from "./admin.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { successResponse, errorResponse } from "../../utils/response.utils.js";

export class AdminController {
  
  static getStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const stats = await AdminModel.getDashboardStats();
    res.json(successResponse(stats, "Stats retrieved successfully"));
  });

  static getPendingOrganizations = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const orgs = await AdminModel.getPendingOrganizations();
    res.json(successResponse(orgs, "Pending organizations retrieved successfully"));
  });

  static verifyOrganization = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { organizationId, status } = req.body;
    
    if (!organizationId || !['Approved', 'Rejected'].includes(status)) {
      res.status(400).json(errorResponse("Invalid input. Status must be Approved or Rejected.", "INVALID_INPUT"));
      return;
    }

    const updatedOrg = await AdminModel.verifyOrganization(organizationId, status);
    res.json(successResponse(updatedOrg, `Organization has been ${status.toLowerCase()} successfully`));
  });

  static getAllUsers = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const users = await AdminModel.getAllUsers();
    res.json(successResponse(users, "Users retrieved successfully"));
  });

  static toggleUserStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { userId, status } = req.body;
    
    if (!userId || !['Active', 'Suspended'].includes(status)) {
      res.status(400).json(errorResponse("Invalid input. Status must be Active or Suspended.", "INVALID_INPUT"));
      return;
    }

    const updatedUser = await AdminModel.toggleUserStatus(userId, status);
    res.json(successResponse(updatedUser, `User status changed to ${status}`));
  });

  static getAllOrganizations = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const type = req.query.type as string | undefined;
  const orgs = await AdminModel.getAllOrganizations(type);
  res.json(successResponse(orgs, "Organizations retrieved successfully"));
});
}