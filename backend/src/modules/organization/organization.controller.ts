import type { Request, Response } from "express";
import { OrganizationModel } from "./organization.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse } from "../../utils/response.utils.js";

export class OrganizationController {
  static getProfile = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const orgProfile = await OrganizationModel.findOrganizationProfile(
        user.userId,
      );
      if (!orgProfile) {
        res
          .status(404)
          .json(errorResponse("Organization profile not found", "NOT_FOUND"));
        return;
      }

      res.json(successResponse({ organization: orgProfile }));
    },
  );

  static updateProfile = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const updatedProfile = await OrganizationModel.updateOrganizationProfile(
        user.userId,
        req.body,
      );
      if (!updatedProfile) {
        res
          .status(404)
          .json(errorResponse("Organization profile not found", "NOT_FOUND"));
        return;
      }

      res.json(
        successResponse(
          { organization: updatedProfile },
          "Organization profile updated successfully",
        ),
      );
    },
  );
}
