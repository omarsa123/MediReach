import { Request, Response, NextFunction } from "express";

export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error("[GlobalError]", err);

  const rawStatus = Number(err?.statusCode ?? err?.status);
  const statusCode =
    Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus < 600
      ? rawStatus
      : 500;
  const isServerError = statusCode >= 500;
  const message = isServerError
    ? "Internal server error"
    : err?.message || "Request failed";
  const code = err?.code || (isServerError ? "INTERNAL" : "BAD_REQUEST");

  res.status(statusCode).json({
    success: false,
    message,
    error: message,
    code,
  });
};
