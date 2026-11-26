import { pool } from "../../config/dbconfig.js";

export class ServiceModel {
  static async list(filters?: { serviceType?: string; isAvailable?: boolean }) {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.serviceType) {
      conditions.push(`"serviceType" = $${idx++}`);
      values.push(filters.serviceType);
    }
    if (filters?.isAvailable !== undefined) {
      conditions.push(`"isAvailable" = $${idx++}`);
      values.push(filters.isAvailable);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT * FROM public."Service" ${where} ORDER BY "serviceType", "name"`,
      values,
    );
    return result.rows;
  }

  static async findById(serviceId: number | string) {
    const result = await pool.query(
      `SELECT * FROM public."Service" WHERE "serviceId" = $1`,
      [serviceId],
    );
    return result.rows[0] || null;
  }

  static async create(data: {
    name: string;
    description?: string | null;
    serviceType?: string;
    isAvailable?: boolean;
  }) {
    const result = await pool.query(
      `INSERT INTO public."Service" ("name", "description", "serviceType", "isAvailable")
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        data.name,
        data.description ?? null,
        data.serviceType || "Other",
        data.isAvailable !== false,
      ],
    );
    return result.rows[0];
  }

  static async update(
    serviceId: number | string,
    data: {
      name?: string;
      description?: string | null;
      serviceType?: string;
      isAvailable?: boolean;
    },
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`"name" = $${idx++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`"description" = $${idx++}`);
      values.push(data.description);
    }
    if (data.serviceType !== undefined) {
      fields.push(`"serviceType" = $${idx++}`);
      values.push(data.serviceType);
    }
    if (data.isAvailable !== undefined) {
      fields.push(`"isAvailable" = $${idx++}`);
      values.push(data.isAvailable);
    }

    if (fields.length === 0) {
      throw { status: 400, message: "No fields to update", code: "NO_FIELDS" };
    }

    values.push(serviceId);
    const result = await pool.query(
      `UPDATE public."Service"
       SET ${fields.join(", ")}
       WHERE "serviceId" = $${idx}
       RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  }
}
