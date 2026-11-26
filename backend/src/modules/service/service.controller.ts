import type { Request, Response } from "express";
import { ServiceModel } from "./service.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse } from "../../utils/response.utils.js";

export class ServiceController {
  static list = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const serviceType = req.query.serviceType as string | undefined;
    const isAvailable =
      req.query.isAvailable !== undefined
        ? req.query.isAvailable === "true"
        : undefined;
    const services = await ServiceModel.list({ serviceType, isAvailable });
    res.json(successResponse({ services }));
  });

  static getById = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const service = await ServiceModel.findById(req.params.serviceId);
      if (!service) {
        res
          .status(404)
          .json(errorResponse("Service not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ service }));
    },
  );

  static create = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { name, description, serviceType, isAvailable } = req.body;
      if (!name) {
        res
          .status(400)
          .json(errorResponse("name is required", "MISSING_FIELDS"));
        return;
      }
      const service = await ServiceModel.create({
        name,
        description,
        serviceType,
        isAvailable,
      });
      res
        .status(201)
        .json(successResponse({ service }, "Service created"));
    },
  );

  static update = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const service = await ServiceModel.update(req.params.serviceId, req.body);
      if (!service) {
        res
          .status(404)
          .json(errorResponse("Service not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ service }, "Service updated"));
    },
  );
}
