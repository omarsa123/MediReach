import type { Request, Response } from "express";
import { ProviderModel } from "./provider.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse } from "../../utils/response.utils.js";

export class ProviderController {
  static getProfile = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const providerProfile = await ProviderModel.findProviderProfile(
        user.userId,
      );
      if (!providerProfile) {
        res
          .status(404)
          .json(errorResponse("Provider profile not found", "NOT_FOUND"));
        return;
      }

      res.json(successResponse({ provider: providerProfile }));
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

      const updatedProfile = await ProviderModel.updateProviderProfile(
        user.userId,
        req.body,
      );
      if (!updatedProfile) {
        res
          .status(404)
          .json(errorResponse("Provider profile not found", "NOT_FOUND"));
        return;
      }

      res.json(
        successResponse(
          { provider: updatedProfile },
          "Provider profile updated successfully",
        ),
      );
    },
  );
}
