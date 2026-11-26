import { Router } from "express";
import { ServiceController } from "./service.controller.js";
import {
  authorizeRoles,
  requireAuth,
} from "../../middleware/auth.middleware.js";

const serviceRouter = Router();

// Public / authenticated read
serviceRouter.get("/", ServiceController.list);
serviceRouter.get("/:serviceId", ServiceController.getById);

// Admin only write
serviceRouter.post(
  "/",
  requireAuth,
  authorizeRoles("admin"),
  ServiceController.create,
);
serviceRouter.patch(
  "/:serviceId",
  requireAuth,
  authorizeRoles("admin"),
  ServiceController.update,
);

export { serviceRouter };
