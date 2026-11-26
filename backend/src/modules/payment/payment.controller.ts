import type { Request, Response } from "express";
import { PaymentModel } from "./payment.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse } from "../../utils/response.utils.js";
import { pool } from "../../config/dbconfig.js";

export class PaymentController {
  static create = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { appointmentId, paymentMethod } = req.body;

      if (!appointmentId || !paymentMethod) {
        res
          .status(400)
          .json(
            errorResponse(
              "appointmentId and paymentMethod are required",
              "MISSING_FIELDS",
            ),
          );
        return;
      }

      const allowed = ["Online", "AtOrganizer"];
      if (!allowed.includes(paymentMethod)) {
        res
          .status(400)
          .json(
            errorResponse(
              `paymentMethod must be one of: ${allowed.join(", ")}`,
              "INVALID_METHOD",
            ),
          );
        return;
      }

      const appt = await pool.query(
        `SELECT "appointmentId", "patientId", "priceAtBooking", "status"
       FROM public."Appointment"
       WHERE "appointmentId" = $1`,
        [appointmentId],
      );
      if (appt.rows.length === 0) {
        res
          .status(404)
          .json(errorResponse("Appointment not found", "NOT_FOUND"));
        return;
      }

      if (user.role === "patient" && appt.rows[0].patientId !== user.userId) {
        res.status(403).json(errorResponse("Forbidden", "FORBIDDEN"));
        return;
      }

      const payment = await PaymentModel.create({
        appointmentId: Number(appointmentId),
        amount: Number(appt.rows[0].priceAtBooking),
        paymentMethod,
      });

      res
        .status(201)
        .json(successResponse({ payment }, "Payment created successfully"));
    },
  );

  static getById = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const paymentId = String(req.params.paymentId || "");
      const payment = await PaymentModel.findById(paymentId);
      if (!payment) {
        res.status(404).json(errorResponse("Payment not found", "NOT_FOUND"));
        return;
      }

      const allowed =
        user.role === "admin" ||
        (user.role === "patient" && payment.patientId === user.userId) ||
        (user.role === "provider" && payment.providerId === user.userId) ||
        (user.role === "organization" && payment.organizerId === user.userId);

      if (!allowed) {
        res.status(403).json(errorResponse("Forbidden", "FORBIDDEN"));
        return;
      }

      res.json(successResponse({ payment }));
    },
  );

  static getByAppointment = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const appointmentId = String(req.params.appointmentId || "");
      const payment = await PaymentModel.findByAppointment(appointmentId);
      if (!payment) {
        res.status(404).json(errorResponse("Payment not found", "NOT_FOUND"));
        return;
      }

      const meta = await pool.query(
        `SELECT a."patientId", pa."providerId", pa."organizerId"
         FROM public."Appointment" a
         JOIN public."ProviderService" ps ON ps."providerServiceId" = a."providerServiceId"
         JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
         WHERE a."appointmentId" = $1`,
        [appointmentId],
      );
      const row = meta.rows[0];
      const allowed =
        user.role === "admin" ||
        (row &&
          ((user.role === "patient" && row.patientId === user.userId) ||
            (user.role === "provider" && row.providerId === user.userId) ||
            (user.role === "organization" && row.organizerId === user.userId)));

      if (!allowed) {
        res.status(403).json(errorResponse("Forbidden", "FORBIDDEN"));
        return;
      }

      res.json(successResponse({ payment }));
    },
  );

  static updateStatus = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const paymentId = String(req.params.paymentId || "");
      const { paymentStatus } = req.body;
      const allowedStatuses = ["Pending", "Paid", "Failed", "Refunded"];
      if (!paymentStatus || !allowedStatuses.includes(paymentStatus)) {
        res
          .status(400)
          .json(
            errorResponse(
              `paymentStatus must be one of: ${allowedStatuses.join(", ")}`,
              "INVALID_STATUS",
            ),
          );
        return;
      }

      const existing = await PaymentModel.findById(paymentId);
      if (!existing) {
        res.status(404).json(errorResponse("Payment not found", "NOT_FOUND"));
        return;
      }

      const canUpdate =
        user.role === "admin" ||
        (user.role === "patient" && existing.patientId === user.userId) ||
        (user.role === "provider" && existing.providerId === user.userId) ||
        (user.role === "organization" && existing.organizerId === user.userId);

      if (!canOutputOrUpdate(canUpdate)) {
        res.status(403).json(errorResponse("Forbidden", "FORBIDDEN"));
        return;
      }

      if (user.role === "patient" && paymentStatus === "Refunded") {
        res
          .status(403)
          .json(
            errorResponse(
              "Patients cannot mark a payment as Refunded",
              "FORBIDDEN",
            ),
          );
        return;
      }

      const payment = await PaymentModel.updateStatus(paymentId, paymentStatus);
      res.json(successResponse({ payment }, "Payment status updated"));
    },
  );

  static myPayments = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const status =
        typeof req.query.status === "string" ? req.query.status : undefined;
      const payments = await PaymentModel.listByPatient(user.userId, status);
      res.json(successResponse({ payments }));
    },
  );

  static providerPayments = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const status =
        typeof req.query.status === "string" ? req.query.status : undefined;
      const payments = await PaymentModel.listByProvider(user.userId, status);
      res.json(successResponse({ payments }));
    },
  );

  static organizationPayments = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const status =
        typeof req.query.status === "string" ? req.query.status : undefined;
      const payments = await PaymentModel.listByOrganization(
        user.userId,
        status,
      );
      res.json(successResponse({ payments }));
    },
  );
}

// Helper function to safely evaluate boolean checks inside payment updates
function canOutputOrUpdate(allowed: boolean): boolean {
  return allowed;
}
