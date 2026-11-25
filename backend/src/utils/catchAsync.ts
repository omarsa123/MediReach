import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps async route handlers so rejected promises are passed to the error middleware.
 */
export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
