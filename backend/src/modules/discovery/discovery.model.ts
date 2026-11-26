import { pool } from "../../config/dbconfig.js";

export class DiscoveryModel {
  /** Public: approved organizations only */
  static async listOrganizations(filters: {
    organizerType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [`o."verificationStatus" = 'Approved'`, `u."status" = 'Active'`];
    const values: unknown[] = [];
    let idx = 1;

    if (filters.organizerType) {
      conditions.push(`o."organizerType" = $${idx++}`);
      values.push(filters.organizerType);
    }
    if (filters.search) {
      conditions.push(
        `(o."organizationName" ILIKE $${idx} OR o."description" ILIKE $${idx})`,
      );
      values.push(`%${filters.search}%`);
      idx++;
    }

    const where = conditions.join(" AND ");

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM public."Organization" o
       JOIN public."User" u ON u."userId" = o."userId"
       WHERE ${where}`,
      values,
    );
    const totalItems = countRes.rows[0]?.total ?? 0;

    values.push(limit, offset);
    const result = await pool.query(
      `SELECT
         o."userId" AS "organizationId",
         o."organizationName",
         o."organizerType",
         o."description",
         o."address",
         o."latitude",
         o."longitude",
         o."logoUrl",
         o."verificationStatus"
       FROM public."Organization" o
       JOIN public."User" u ON u."userId" = o."userId"
       WHERE ${where}
       ORDER BY o."organizationName" ASC
       LIMIT $${idx++} OFFSET $${idx}`,
      values,
    );

    return {
      items: result.rows,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 0,
      },
    };
  }

  static async getOrganization(organizationId: string) {
    const result = await pool.query(
      `SELECT
         o."userId" AS "organizationId",
         o."organizationName",
         o."organizerType",
         o."description",
         o."address",
         o."latitude",
         o."longitude",
         o."logoUrl",
         o."verificationStatus"
       FROM public."Organization" o
       JOIN public."User" u ON u."userId" = o."userId"
       WHERE o."userId" = $1
         AND o."verificationStatus" = 'Approved'
         AND u."status" = 'Active'`,
      [organizationId],
    );
    return result.rows[0] || null;
  }

  /** Public: approved providers only */
  static async listProviders(filters: {
    providerType?: string;
    specialization?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [
      `pr."verificationStatus" = 'Approved'`,
      `u."status" = 'Active'`,
    ];
    const values: unknown[] = [];
    let idx = 1;

    if (filters.providerType) {
      conditions.push(`pr."providerType" = $${idx++}`);
      values.push(filters.providerType);
    }
    if (filters.specialization) {
      conditions.push(`pr."specialization" ILIKE $${idx++}`);
      values.push(`%${filters.specialization}%`);
    }
    if (filters.search) {
      conditions.push(`(u."name" ILIKE $${idx} OR pr."specialization" ILIKE $${idx})`);
      values.push(`%${filters.search}%`);
      idx++;
    }

    const where = conditions.join(" AND ");

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM public."Provider" pr
       JOIN public."User" u ON u."userId" = pr."userId"
       WHERE ${where}`,
      values,
    );
    const totalItems = countRes.rows[0]?.total ?? 0;

    values.push(limit, offset);
    const result = await pool.query(
      `SELECT
         pr."userId" AS "providerId",
         u."name",
         pr."providerType",
         pr."specialization",
         pr."qualification",
         pr."experienceYears",
         pr."profilePictureUrl",
         pr."verificationStatus"
       FROM public."Provider" pr
       JOIN public."User" u ON u."userId" = pr."userId"
       WHERE ${where}
       ORDER BY u."name" ASC
       LIMIT $${idx++} OFFSET $${idx}`,
      values,
    );

    return {
      items: result.rows,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 0,
      },
    };
  }

  static async getProvider(providerId: string) {
    const result = await pool.query(
      `SELECT
         pr."userId" AS "providerId",
         u."name",
         pr."providerType",
         pr."specialization",
         pr."qualification",
         pr."experienceYears",
         pr."profilePictureUrl",
         pr."verificationStatus"
       FROM public."Provider" pr
       JOIN public."User" u ON u."userId" = pr."userId"
       WHERE pr."userId" = $1
         AND pr."verificationStatus" = 'Approved'
         AND u."status" = 'Active'`,
      [providerId],
    );
    if (result.rows.length === 0) return null;

    // خدمات نشطة فقط من مؤسسات معتمدة وحسابات نشطة
    const servicesRes = await pool.query(
      `SELECT
         ps."providerServiceId",
         ps."deliveryMode",
         os."price",
         os."durationMinutes",
         s."serviceId",
         s."name" AS "serviceName",
         s."serviceType",
         o."userId" AS "organizationId",
         o."organizationName"
       FROM public."ProviderAssignment" pa
       JOIN public."ProviderService" ps
         ON ps."assignmentId" = pa."assignmentId" AND ps."isActive" = TRUE
       JOIN public."OrganizerService" os
         ON os."organizerServiceId" = ps."organizerServiceId" AND os."isActive" = TRUE
       JOIN public."Service" s
         ON s."serviceId" = os."serviceId" AND s."isAvailable" = TRUE
       JOIN public."Organization" o
         ON o."userId" = pa."organizerId" AND o."verificationStatus" = 'Approved'
       JOIN public."User" u_org
         ON u_org."userId" = o."userId" AND u_org."status" = 'Active'
       WHERE pa."providerId" = $1 AND pa."status" = 'Approved'`,
      [providerId],
    );

    return {
      ...result.rows[0],
      services: servicesRes.rows,
    };
  }

  static async listServices(filters: {
    serviceType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [`"isAvailable" = true`];
    const values: unknown[] = [];
    let idx = 1;

    if (filters.serviceType) {
      conditions.push(`"serviceType" = $${idx++}`);
      values.push(filters.serviceType);
    }
    if (filters.search) {
      conditions.push(`"name" ILIKE $${idx++}`);
      values.push(`%${filters.search}%`);
    }

    const where = conditions.join(" AND ");

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM public."Service" WHERE ${where}`,
      values,
    );
    const totalItems = countRes.rows[0]?.total ?? 0;

    values.push(limit, offset);
    const result = await pool.query(
      `SELECT "serviceId", "name", "description", "serviceType", "isAvailable"
       FROM public."Service"
       WHERE ${where}
       ORDER BY "name" ASC
       LIMIT $${idx++} OFFSET $${idx}`,
      values,
    );

    return {
      items: result.rows,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 0,
      },
    };
  }

  static async getService(serviceId: number) {
    const result = await pool.query(
      `SELECT "serviceId", "name", "description", "serviceType", "isAvailable"
       FROM public."Service"
       WHERE "serviceId" = $1 AND "isAvailable" = true`,
      [serviceId],
    );
    return result.rows[0] || null;
  }

  /** Nearby organizations (Haversine approx, km) */
  static async nearbyOrganizations(filters: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    organizerType?: string;
    limit?: number;
  }) {
    const radiusKm = filters.radiusKm ?? 10;
    const limit = Math.min(50, Math.max(1, filters.limit || 20));

    const conditions = [
      `o."verificationStatus" = 'Approved'`,
      `u."status" = 'Active'`,
      `o."latitude" IS NOT NULL`,
      `o."longitude" IS NOT NULL`,
    ];
    const values: unknown[] = [
      filters.latitude,
      filters.longitude,
      radiusKm,
    ];
    let idx = 4;

    if (filters.organizerType) {
      conditions.push(`o."organizerType" = $${idx++}`);
      values.push(filters.organizerType);
    }

    values.push(limit);

    // Haversine formula (km)
    const result = await pool.query(
      `SELECT * FROM (
         SELECT
           o."userId" AS "organizationId",
           o."organizationName",
           o."organizerType",
           o."description",
           o."address",
           o."latitude",
           o."longitude",
           o."logoUrl",
           (
             6371 * acos(
               LEAST(1.0, GREATEST(-1.0,
                 cos(radians($1)) * cos(radians(o."latitude")) *
                 cos(radians(o."longitude") - radians($2)) +
                 sin(radians($1)) * sin(radians(o."latitude"))
               ))
             )
           ) AS "distanceKm"
         FROM public."Organization" o
         JOIN public."User" u ON u."userId" = o."userId"
         WHERE ${conditions.join(" AND ")}
       ) sub
       WHERE sub."distanceKm" <= $3
       ORDER BY sub."distanceKm" ASC
       LIMIT $${idx}`,
      values,
    );

    return result.rows;
  }
}
