import type { Request, Response } from "express";
import { UserModel } from "./user.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import {
  errorResponse,
  successResponse,
  toPublicUser,
} from "../../utils/response.utils.js";

export class UserController {
  /**
   * جلب بيانات المستخدم الحالي (Me)
   */
  static me = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json(errorResponse("Not authenticated", "UNAUTHORIZED"));
      return;
    }

    res.json(successResponse({ user: toPublicUser(user) }));
  });

  /**
   * تحديث بيانات الملف الشخصي (Update Me)
   */
  static updateMe = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const body = req.body;

      if (
        body.username &&
        (await UserModel.isUsernameTaken(body.username, user.userId))
      ) {
        res
          .status(409)
          .json(
            errorResponse("This username is already taken", "USERNAME_EXISTS"),
          );
        return;
      }
      if (
        body.phone &&
        (await UserModel.isPhoneTaken(body.phone, user.userId))
      ) {
        res
          .status(409)
          .json(
            errorResponse(
              "This phone number is already registered",
              "PHONE_EXISTS",
            ),
          );
        return;
      }

      const updated = await UserModel.updateProfile(user.userId, body);

      if (!updated) {
        res.status(404).json(errorResponse("User not found", "NOT_FOUND"));
        return;
      }

      res.json(
        successResponse(
          { user: toPublicUser(updated) },
          "Profile updated successfully",
        ),
      );
    },
  );
}
