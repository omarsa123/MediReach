import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "../modules/user/user.model.js";
import { catchAsync } from "../utils/catchAsync.js";
import { errorResponse } from "../utils/response.utils.js";

// توسيع واجهة الـ Request في TypeScript عشان يقبل user و accessToken بدون أخطاء
declare global {
  namespace Express {
    interface Request {
      user?: any;
      accessToken?: string;
    }
  }
}

export const requireAuth = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // 1. استخراج التوكن من الهيدر (Authorization: Bearer <token>)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "Access denied. No token provided.",
        code: "UNAUTHORIZED",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    try {
      // 2. فك تشفير التوكن والتحقق من صلاحيته
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        res.status(500).json({
          success: false,
          error: "Server authentication configuration error.",
          code: "AUTH_CONFIG_ERROR",
        });
        return;
      }

      let decoded: { userId: string };
      try {
        decoded = jwt.verify(token, secret) as { userId: string };
      } catch {
        res.status(401).json({
          success: false,
          error: "Invalid or expired token.",
          code: "INVALID_TOKEN",
        });
        return;
      }

      // 3. التأكد إن المستخدم لسه موجود وحسابه نشط (Active) في قاعدة البيانات
      const user = await UserModel.findById(decoded.userId);
      const status = (user?.status ?? "").toString().toLowerCase();
      if (!user || status !== "active") {
        res.status(401).json({
          success: false,
          error: "User no longer exists or account is inactive.",
          code: "USER_INACTIVE",
        });
        return;
      }

      // 4. حفظ بيانات المستخدم والتوكن جوه الـ req عشان الكنترولر يستخدمها
      req.user = user;
      req.accessToken = token;

      next();
    } catch (error) {
      next(error);
    }
  },
);
export const authorizeRoles = (...allowedRoles: string[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const authUser = (req as any).user;

    if (!authUser || !authUser.userId) {
      res.status(401).json(errorResponse("Not authenticated", "UNAUTHORIZED"));
      return;
    }

    const userRole = authUser.role
      ? String(authUser.role)
      : (await UserModel.findById(authUser.userId))?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      res
        .status(403)
        .json(
          errorResponse(
            `Access denied. Required role: ${allowedRoles.join(" or ")}`,
            "FORBIDDEN",
          ),
        );
      return;
    }

    (req as any).user.role = userRole;
    next();
  };
};
