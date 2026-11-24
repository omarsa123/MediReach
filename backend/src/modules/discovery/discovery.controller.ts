import type { Request, Response } from "express";
import { DiscoveryModel } from "./discovery.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse } from "../../utils/response.utils.js";

export class DiscoveryController {
  static listOrganizations = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const data = await DiscoveryModel.listOrganizations({
        organizerType: req.query.organizerType as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      });
      res.json(successResponse(data, "Organizations fetched"));
    },
  );

  static getOrganization = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const org = await DiscoveryModel.getOrganization(
        req.params.organizationId as string,
      );
      if (!org) {
        res
          .status(404)
          .json(errorResponse("Organization not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ organization: org }));
    },
  );

  static listProviders = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const data = await DiscoveryModel.listProviders({
        providerType: req.query.providerType as string | undefined,
        specialization: req.query.specialization as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      });
      res.json(successResponse(data, "Providers fetched"));
    },
  );

  static getProvider = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const provider = await DiscoveryModel.getProvider(
        req.params.providerId as string,
      );
      if (!provider) {
        res.status(404).json(errorResponse("Provider not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ provider }));
    },
  );

  static listServices = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const data = await DiscoveryModel.listServices({
        serviceType: req.query.serviceType as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      });
      res.json(successResponse(data, "Services fetched"));
    },
  );

  static getService = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const id = Number(req.params.serviceId);
      if (!id || Number.isNaN(id)) {
        res.status(400).json(errorResponse("Invalid service id", "INVALID_ID"));
        return;
      }
      const service = await DiscoveryModel.getService(id);
      if (!service) {
        res.status(404).json(errorResponse("Service not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ service }));
    },
  );

  static nearbyOrganizations = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const latitude = Number(req.query.latitude);
      const longitude = Number(req.query.longitude);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        res
          .status(400)
          .json(
            errorResponse(
              "latitude and longitude are required numbers",
              "MISSING_FIELDS",
            ),
          );
        return;
      }
      const items = await DiscoveryModel.nearbyOrganizations({
        latitude,
        longitude,
        radiusKm: req.query.radiusKm ? Number(req.query.radiusKm) : 10,
        organizerType: req.query.organizerType as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      });
      res.json(successResponse({ items }, "Nearby organizations"));
    },
  );
}
