import { pool } from "../../config/dbconfig.js";

export class NotificationModel {
  static async listByUser(userId: string, onlyUnread = false) {
    const params: unknown[] = [userId];
    let sql = `SELECT * FROM public."Notification" WHERE "userId" = $1`;
    if (onlyUnread) {
      sql += ` AND "isRead" = false`;
    }
    sql += ` ORDER BY "createdAt" DESC LIMIT 100`;
    const result = await pool.query(sql, params);
    return result.rows;
  }

  static async markAsRead(notificationId: number | string, userId: string) {
    const result = await pool.query(
      `UPDATE public."Notification"
       SET "isRead" = true
       WHERE "notificationId" = $1 AND "userId" = $2
       RETURNING *`,
      [notificationId, userId],
    );
    return result.rows[0] || null;
  }

  static async markAllAsRead(userId: string) {
    const result = await pool.query(
      `UPDATE public."Notification"
       SET "isRead" = true
       WHERE "userId" = $1 AND "isRead" = false
       RETURNING "notificationId"`,
      [userId],
    );
    return result.rowCount ?? 0;
  }

  static async unreadCount(userId: string) {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM public."Notification"
       WHERE "userId" = $1 AND "isRead" = false`,
      [userId],
    );
    return result.rows[0]?.count ?? 0;
  }

  static async create(data: {
    userId: string;
    appointmentId?: number | null;
    title: string;
    message: string;
    type?: string;
  }) {
    const result = await pool.query(
      `INSERT INTO public."Notification"
         ("userId", "appointmentId", "title", "message", "type")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.userId,
        data.appointmentId ?? null,
        data.title,
        data.message,
        data.type || "General",
      ],
    );
    return result.rows[0];
  }
}
