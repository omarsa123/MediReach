import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "../modules/user/user.model.js";
import { catchAsync } from "../utils/catchAsync.js";

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
      const secret = process.env.JWT_SECRET || "your_fallback_secret_key";
      const decoded = jwt.verify(token, secret) as { userId: string };

      // 3. التأكد إن المستخدم لسه موجود وحسابه نشط (Active) في قاعدة البيانات
      const user = await UserModel.findById(decoded.userId);
      if (!user || user.status !== "Active") {
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
      res.status(401).json({
        success: false,
        error: "Invalid or expired token.",
        code: "INVALID_TOKEN",
      });
    }
  },
);
