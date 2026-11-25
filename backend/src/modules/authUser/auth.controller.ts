import type { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse } from "../../utils/response.utils.js";

function getErrorStatus(err: any): number {
  const status = Number(err?.status ?? err?.statusCode);
  return Number.isInteger(status) && status >= 400 && status < 600
    ? status
    : 500;
}

export class AuthController {
  static register = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await AuthService.register(req.body || {});
        res
          .status(201)
          .json(
            successResponse(
              result,
              "Registered successfully. Please verify your email with the OTP sent.",
            ),
          );
      } catch (err: any) {
        res
          .status(getErrorStatus(err))
          .json(
            errorResponse(
              err?.message || "Registration failed",
              err?.code || "REGISTER_FAILED",
              err?.data,
            ),
          );
      }
    },
  );

  static login = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await AuthService.login(req.body || {});
        res.json(successResponse(result, "Logged in successfully"));
      } catch (err: any) {
        res
          .status(getErrorStatus(err))
          .json(
            errorResponse(
              err?.message || "Login failed",
              err?.code || "LOGIN_FAILED",
              err?.data,
            ),
          );
      }
    },
  );

  static refreshToken = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const refreshToken =
          req.body?.refreshToken || req.body?.refresh_token || "";
        const result = await AuthService.refreshToken(refreshToken);
        res.json(successResponse(result, "Token refreshed successfully"));
      } catch (err: any) {
        res
          .status(getErrorStatus(err))
          .json(
            errorResponse(
              err?.message || "Failed to refresh token",
              err?.code || "REFRESH_FAILED",
              err?.data,
            ),
          );
      }
    },
  );

  static forgotPassword = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      try {
        await AuthService.forgotPassword(req.body?.email);
        res.json(
          successResponse(
            { sent: true },
            "If the email is registered, a password reset OTP has been sent.",
          ),
        );
      } catch (err: any) {
        res
          .status(getErrorStatus(err))
          .json(
            errorResponse(
              err?.message || "Failed to process forgot password request",
              err?.code || "FORGOT_PASSWORD_FAILED",
              err?.data,
            ),
          );
      }
    },
  );

  static verifyResetPasswordOtp = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const email = req.body?.email || "";
        const otp = req.body?.otp || req.body?.code || "";
        const result = await AuthService.verifyResetPasswordOtp(email, otp);
        res.json(successResponse(result, "OTP verified successfully"));
      } catch (err: any) {
        res
          .status(getErrorStatus(err))
          .json(
            errorResponse(
              err?.message || "OTP verification failed",
              err?.code || "OTP_VERIFY_FAILED",
              err?.data,
            ),
          );
      }
    },
  );

  static resetPasswordWithOtp = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const email = req.body?.email || "";
        const otp = req.body?.otp || req.body?.code || "";
        const newPassword = req.body?.newPassword || req.body?.password || "";

        await AuthService.resetPasswordWithOtp(email, otp, newPassword);
        res.json(
          successResponse(
            { reset: true },
            "Password reset successfully. You can now log in.",
          ),
        );
      } catch (err: any) {
        res
          .status(getErrorStatus(err))
          .json(
            errorResponse(
              err?.message || "Password reset failed",
              err?.code || "RESET_PASSWORD_FAILED",
              err?.data,
            ),
          );
      }
    },
  );

  static verifyEmailOtp = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const email = req.body?.email || "";
        const otp = req.body?.otp || req.body?.code || "";
        const result = await AuthService.verifyEmailOtp(email, otp);
        res.json(successResponse(result, "Email verified successfully"));
      } catch (err: any) {
        res
          .status(getErrorStatus(err))
          .json(
            errorResponse(
              err?.message || "Email verification failed",
              err?.code || "EMAIL_VERIFY_FAILED",
              err?.data,
            ),
          );
      }
    },
  );

  static resendVerification = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await AuthService.resendVerification(req.body?.email);
        if (typeof result === "object" && result?.message) {
          res.json(successResponse(result, result.message));
          return;
        }
        res.json(
          successResponse(
            { sent: true },
            "Verification OTP sent successfully.",
          ),
        );
      } catch (err: any) {
        res
          .status(getErrorStatus(err))
          .json(
            errorResponse(
              err?.message || "Failed to resend verification code",
              err?.code || "RESEND_FAILED",
              err?.data,
            ),
          );
      }
    },
  );

  static getGoogleAuthUrl = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const role = String(req.query?.role || req.body?.role || "patient");
        const result = await AuthService.getGoogleAuthUrl(role);
        res.json(successResponse(result));
      } catch (err: any) {
        res
          .status(getErrorStatus(err))
          .json(
            errorResponse(
              err?.message || "Failed to generate Google auth URL",
              err?.code || "GOOGLE_URL_FAILED",
              err?.data,
            ),
          );
      }
    },
  );

  static exchangeGoogleCode = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const code = String(req.body?.code || req.query?.code || "");
        const result = await AuthService.exchangeGoogleCode(code);
        res.json(successResponse(result, "Google sign-in successful"));
      } catch (err: any) {
        res
          .status(getErrorStatus(err))
          .json(
            errorResponse(
              err?.message || "Google code exchange failed",
              err?.code || "GOOGLE_EXCHANGE_FAILED",
              err?.data,
            ),
          );
      }
    },
  );

  static googleCallback = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const accessToken = String(
          req.body?.accessToken ||
            req.body?.access_token ||
            req.query?.access_token ||
            "",
        );
        const refreshToken = String(
          req.body?.refreshToken ||
            req.body?.refresh_token ||
            req.query?.refresh_token ||
            "",
        );
        const code = String(req.body?.code || req.query?.code || "");
        const expectedRole = String(
          req.body?.expectedRole ||
            req.body?.role ||
            req.query?.role ||
            "patient",
        );
        const result = await AuthService.googleCallback(
          accessToken,
          refreshToken,
          expectedRole,
          code,
        );
        res.json(successResponse(result, "Google authentication successful"));
      } catch (err: any) {
        res
          .status(getErrorStatus(err))
          .json(
            errorResponse(
              err?.message || "Google authentication failed",
              err?.code || "GOOGLE_CALLBACK_FAILED",
              err?.data,
            ),
          );
      }
    },
  );

  static hardDeleteUser = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const email = String(req.body?.email || req.query?.email || "");
        const result = await AuthService.hardDeleteUser(email);
        res.json(successResponse(result, "User deleted permanently"));
      } catch (err: any) {
        res
          .status(getErrorStatus(err))
          .json(
            errorResponse(
              err?.message || "Failed to delete user",
              err?.code || "HARD_DELETE_FAILED",
              err?.data,
            ),
          );
      }
    },
  );

  static cleanOrphanUsers = catchAsync(
    async (_req: Request, res: Response): Promise<void> => {
      try {
        const result = await AuthService.cleanOrphanUsers();
        res.json(successResponse(result, "Orphan users cleaned up"));
      } catch (err: any) {
        res
          .status(getErrorStatus(err))
          .json(
            errorResponse(
              err?.message || "Failed to clean orphan users",
              err?.code || "CLEAN_ORPHANS_FAILED",
              err?.data,
            ),
          );
      }
    },
  );
}
