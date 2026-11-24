import { Router } from "express";
import { DiscoveryController } from "./discovery.controller.js";

const discoveryRouter = Router();

// Public discovery (approved + Active only)
discoveryRouter.get("/organizations", DiscoveryController.listOrganizations);
discoveryRouter.get(
  "/organizations/nearby",
  DiscoveryController.nearbyOrganizations,
);
discoveryRouter.get(
  "/organizations/:organizationId",
  DiscoveryController.getOrganization,
);

discoveryRouter.get("/providers", DiscoveryController.listProviders);
discoveryRouter.get("/providers/:providerId", DiscoveryController.getProvider);

discoveryRouter.get("/services", DiscoveryController.listServices);
discoveryRouter.get("/services/:serviceId", DiscoveryController.getService);

export { discoveryRouter };
