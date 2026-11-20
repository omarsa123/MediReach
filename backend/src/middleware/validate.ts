import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
//import { errorResponse } from "../utils/user.utils.js";

/**
 * Generic Zod validation middleware.
 * Usage:
 *   router.post("/register", validate(RegisterSchema), AuthController.register);
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const messages = result.error.issues.map((e) => {
        const path = e.path.join(".");
        return path ? `${path}: ${e.message}` : e.message;
      });

      res.status(400);
      //.json(errorResponse(messages.join(" | "), "VALIDATION_ERROR"));
      return;
    }

    // Replace body with the parsed (and possibly transformed) data
    req.body = result.data;
    next();
  };
}
