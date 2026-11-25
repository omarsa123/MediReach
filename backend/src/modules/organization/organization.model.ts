import { pool } from "../../config/dbconfig.js";

export interface UpdateOrganizationInput {
  organizationName?: string;
  organizerType?: "Clinic" | "Hospital" | "Lab" | "PhysiotherapyCenter";
  description?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  licenseDocumentUrl?: string;
  logoUrl?: string;
  // sub-type specific
  specialization?: string; // Clinic
  offersAmbulanceService?: boolean; // Hospital
  offersHomeSampleCollection?: boolean; // Lab
  offersHomeService?: boolean; // PhysiotherapyCenter
}

export class OrganizationModel {
  static async findOrganizationProfile(userId: string) {
    const result = await pool.query(
      `SELECT 
         u."userId", u."name", u."username", u."email", u."phone", 
         u."address" AS "userAddress", u."profilePictureUrl", u."createdAt", u."status",
         o."organizationName", o."organizerType", o."description", o."address",
         o."latitude", o."longitude", o."verificationStatus",
         o."licenseDocumentUrl", o."logoUrl", o."createdAt" AS "orgCreatedAt"
       FROM public."User" u
       JOIN public."Organization" o ON u."userId" = o."userId"
       WHERE u."userId" = $1`,
      [userId],
    );

    if (result.rows.length === 0) return null;
    const org = result.rows[0];

    // Attach sub-type fields if present
    const type = org.organizerType;
    if (type === "Clinic") {
      const sub = await pool.query(
        `SELECT "specialization" FROM public."Clinic" WHERE "userId" = $1`,
        [userId],
      );
      if (sub.rows[0]) org.specialization = sub.rows[0].specialization;
    } else if (type === "Hospital") {
      const sub = await pool.query(
        `SELECT "offersAmbulanceService" FROM public."Hospital" WHERE "userId" = $1`,
        [userId],
      );
      if (sub.rows[0])
        org.offersAmbulanceService = sub.rows[0].offersAmbulanceService;
    } else if (type === "Lab") {
      const sub = await pool.query(
        `SELECT "offersHomeSampleCollection" FROM public."Lab" WHERE "userId" = $1`,
        [userId],
      );
      if (sub.rows[0])
        org.offersHomeSampleCollection =
          sub.rows[0].offersHomeSampleCollection;
    } else if (type === "PhysiotherapyCenter") {
      const sub = await pool.query(
        `SELECT "offersHomeService" FROM public."PhysiotherapyCenter" WHERE "userId" = $1`,
        [userId],
      );
      if (sub.rows[0]) org.offersHomeService = sub.rows[0].offersHomeService;
    }

    return org;
  }

  static async updateOrganizationProfile(
    userId: string,
    data: UpdateOrganizationInput,
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.organizationName !== undefined) {
      fields.push(`"organizationName" = $${idx++}`);
      values.push(data.organizationName);
    }
    if (data.organizerType !== undefined) {
      fields.push(`"organizerType" = $${idx++}`);
      values.push(data.organizerType);
    }
    if (data.description !== undefined) {
      fields.push(`"description" = $${idx++}`);
      values.push(data.description);
    }
    if (data.address !== undefined) {
      fields.push(`"address" = $${idx++}`);
      values.push(data.address);
    }
    if (data.latitude !== undefined) {
      fields.push(`"latitude" = $${idx++}`);
      values.push(data.latitude);
    }
    if (data.longitude !== undefined) {
      fields.push(`"longitude" = $${idx++}`);
      values.push(data.longitude);
    }
    if (data.licenseDocumentUrl !== undefined) {
      fields.push(`"licenseDocumentUrl" = $${idx++}`);
      values.push(data.licenseDocumentUrl);
    }
    if (data.logoUrl !== undefined) {
      fields.push(`"logoUrl" = $${idx++}`);
      values.push(data.logoUrl);
    }

    if (fields.length > 0) {
      values.push(userId);
      await pool.query(
        `UPDATE public."Organization"
         SET ${fields.join(", ")}
         WHERE "userId" = $${idx}`,
        values,
      );
    }

    // Update sub-type tables (simple upsert style)
    if (data.specialization !== undefined) {
      await pool.query(
        `INSERT INTO public."Clinic" ("userId", "specialization")
         VALUES ($1, $2)
         ON CONFLICT ("userId") DO UPDATE SET "specialization" = EXCLUDED."specialization"`,
        [userId, data.specialization],
      );
    }
    if (data.offersAmbulanceService !== undefined) {
      await pool.query(
        `INSERT INTO public."Hospital" ("userId", "offersAmbulanceService")
         VALUES ($1, $2)
         ON CONFLICT ("userId") DO UPDATE SET "offersAmbulanceService" = EXCLUDED."offersAmbulanceService"`,
        [userId, data.offersAmbulanceService],
      );
    }
    if (data.offersHomeSampleCollection !== undefined) {
      await pool.query(
        `INSERT INTO public."Lab" ("userId", "offersHomeSampleCollection")
         VALUES ($1, $2)
         ON CONFLICT ("userId") DO UPDATE SET "offersHomeSampleCollection" = EXCLUDED."offersHomeSampleCollection"`,
        [userId, data.offersHomeSampleCollection],
      );
    }
    if (data.offersHomeService !== undefined) {
      await pool.query(
        `INSERT INTO public."PhysiotherapyCenter" ("userId", "offersHomeService")
         VALUES ($1, $2)
         ON CONFLICT ("userId") DO UPDATE SET "offersHomeService" = EXCLUDED."offersHomeService"`,
        [userId, data.offersHomeService],
      );
    }

    return this.findOrganizationProfile(userId);
  }
}
