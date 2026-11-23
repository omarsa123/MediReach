import type { Request, Response } from "express";
import { PatientModel } from "./patient.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse } from "../../utils/response.utils.js";

export class PatientController {
  // جلب بروفايل المريض
  static getProfile = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const patientProfile = await PatientModel.findPatientProfile(user.userId);
      if (!patientProfile) {
        res
          .status(404)
          .json(errorResponse("Patient profile not found", "NOT_FOUND"));
        return;
      }

      res.json(successResponse({ patient: patientProfile }));
    },
  );

  // تحديث بروفايل المريض
  static updateProfile = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const updatedProfile = await PatientModel.updatePatientProfile(
        user.userId,
        req.body,
      );
      if (!updatedProfile) {
        res
          .status(404)
          .json(errorResponse("Patient profile not found", "NOT_FOUND"));
        return;
      }

      res.json(
        successResponse(
          { patient: updatedProfile },
          "Patient profile updated successfully",
        ),
      );
    },
  );
}
