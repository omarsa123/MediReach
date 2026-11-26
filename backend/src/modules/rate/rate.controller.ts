import type { Request, Response } from "express";
import { RateModel } from "./rate.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse } from "../../utils/response.utils.js";

export class RateController {
  static create = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { appointmentId, ratingValue, comment } = req.body;

    if (!appointmentId || ratingValue === undefined) {
      res
        .status(400)
        .json(
          errorResponse(
            "appointmentId and ratingValue are required",
            "MISSING_FIELDS",
          ),
        );
      return;
    }

    const rate = await RateModel.create({
      appointmentId: Number(appointmentId),
      patientId: user.userId,
      ratingValue: Number(ratingValue),
      comment,
    });

    res.status(201).json(successResponse({ rate }, "Rating submitted"));
  });

  static update = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const appointmentId = String(req.params.appointmentId || "");
    const { ratingValue, comment } = req.body;

    if (ratingValue === undefined && comment === undefined) {
      res
        .status(400)
        .json(errorResponse("Nothing to update", "NO_FIELDS"));
      return;
    }

    const rate = await RateModel.update(appointmentId, user.userId, {
      ratingValue:
        ratingValue !== undefined ? Number(ratingValue) : undefined,
      comment,
    });
    if (!rate) {
      res.status(404).json(errorResponse("Rating not found", "NOT_FOUND"));
      return;
    }
    res.json(successResponse({ rate }, "Rating updated"));
  });

  static getByAppointment = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const rate = await RateModel.findByAppointment(
        String(req.params.appointmentId || ""),
      );
      if (!rate) {
        res.status(404).json(errorResponse("Rating not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ rate }));
    },
  );

  static listByProvider = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const providerId = String(req.params.providerId || "");
      const rates = await RateModel.listByProvider(providerId);
      const summary = await RateModel.averageForProvider(providerId);
      res.json(successResponse({ rates, summary }));
    },
  );

  static myProviderRates = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const rates = await RateModel.listByProvider(user.userId);
      const summary = await RateModel.averageForProvider(user.userId);
      res.json(successResponse({ rates, summary }));
    },
  );

  static organizationRates = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const rates = await RateModel.listByOrganization(user.userId);
      res.json(successResponse({ rates }));
    },
  );
}
