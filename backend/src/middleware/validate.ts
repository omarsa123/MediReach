import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { errorResponse } from "../utils/response.utils.js"; // تأكد من مسار الـ utils الصح لو متاح

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const messages = result.error.issues.map((e) => {
        const path = e.path.join(".");
        return path ? `${path}: ${e.message}` : e.message;
      });

      res.status(400).json({
        success: false,
        error: messages.join(" | "),
        code: "VALIDATION_ERROR",
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
