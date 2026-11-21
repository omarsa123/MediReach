import { Request, Response, NextFunction } from "express";

export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error("[GlobalError]", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";
  const code = err.code || "INTERNAL";

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
  });
};
