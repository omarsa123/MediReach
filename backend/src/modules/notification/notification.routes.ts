import { Router } from "express";
import { NotificationController } from "./notification.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const notificationRouter = Router();

notificationRouter.get("/", requireAuth, NotificationController.list);
notificationRouter.get(
  "/unread-count",
  requireAuth,
  NotificationController.unreadCount,
);
notificationRouter.patch(
  "/read-all",
  requireAuth,
  NotificationController.markAllRead,
);
notificationRouter.patch(
  "/:id/read",
  requireAuth,
  NotificationController.markRead,
);

export { notificationRouter };
