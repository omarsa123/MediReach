import type { Request, Response } from "express";
import { NotificationModel } from "./notification.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse } from "../../utils/response.utils.js";

export class NotificationController {
  static list = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json(errorResponse("Not authenticated", "UNAUTHORIZED"));
      return;
    }
    const onlyUnread = String(req.query.unread || "") === "true";
    const notifications = await NotificationModel.listByUser(
      user.userId,
      onlyUnread,
    );
    res.json(
      successResponse({ notifications }, "Notifications fetched successfully"),
    );
  });

  static unreadCount = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }
      const count = await NotificationModel.unreadCount(user.userId);
      res.json(successResponse({ count }));
    },
  );

  static markRead = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }
      const id = req.params.id;
      const updated = await NotificationModel.markAsRead(id, user.userId);
      if (!updated) {
        res
          .status(404)
          .json(errorResponse("Notification not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ notification: updated }, "Marked as read"));
    },
  );

  static markAllRead = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }
      const updatedCount = await NotificationModel.markAllAsRead(user.userId);
      res.json(
        successResponse({ updatedCount }, "All notifications marked as read"),
      );
    },
  );
}
