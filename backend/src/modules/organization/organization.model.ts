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

export interface CreateOrganizerServiceInput {
  serviceId: number;
  price: number;
  durationMinutes: number;
  details?: string | null;
  isActive?: boolean;
}

export interface UpdateOrganizerServiceInput {
  price?: number;
  durationMinutes?: number;
  details?: string | null;
  isActive?: boolean;
}

export interface CreateDepartmentInput {
  name: string;
  description?: string | null;
}

export interface CreateAmbulanceInput {
  plateNumber: string;
  status?: "Available" | "OnTrip" | "Maintenance";
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

  // ---------- OrganizerService ----------
  static async listOrganizerServices(organizerId: string) {
    const result = await pool.query(
      `SELECT
         os."organizerServiceId",
         os."organizerId",
         os."serviceId",
         os."price",
         os."durationMinutes",
         os."details",
         os."isActive",
         s."name" AS "serviceName",
         s."description" AS "serviceDescription",
         s."serviceType",
         s."isAvailable"
       FROM public."OrganizerService" os
       JOIN public."Service" s ON s."serviceId" = os."serviceId"
       WHERE os."organizerId" = $1
       ORDER BY os."organizerServiceId" ASC`,
      [organizerId],
    );
    return result.rows;
  }

  static async createOrganizerService(
    organizerId: string,
    input: CreateOrganizerServiceInput,
  ) {
    if (input.price < 0) {
      throw { status: 400, message: "Price must be >= 0", code: "INVALID_PRICE" };
    }
    if (!input.durationMinutes || input.durationMinutes <= 0) {
      throw {
        status: 400,
        message: "durationMinutes must be > 0",
        code: "INVALID_DURATION",
      };
    }

    const serviceCheck = await pool.query(
      `SELECT "serviceId", "isAvailable" FROM public."Service" WHERE "serviceId" = $1`,
      [input.serviceId],
    );
    if (serviceCheck.rows.length === 0) {
      throw { status: 404, message: "Service not found", code: "SERVICE_NOT_FOUND" };
    }

    try {
      const result = await pool.query(
        `INSERT INTO public."OrganizerService"
           ("organizerId", "serviceId", "price", "durationMinutes", "details", "isActive")
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          organizerId,
          input.serviceId,
          input.price,
          input.durationMinutes,
          input.details ?? null,
          input.isActive !== false,
        ],
      );
      return result.rows[0];
    } catch (err: any) {
      if (err?.code === "23505") {
        throw {
          status: 409,
          message: "This service is already linked to the organization",
          code: "ORG_SERVICE_EXISTS",
        };
      }
      throw err;
    }
  }

  static async updateOrganizerService(
    organizerId: string,
    organizerServiceId: number,
    input: UpdateOrganizerServiceInput,
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.price !== undefined) {
      if (input.price < 0) {
        throw { status: 400, message: "Price must be >= 0", code: "INVALID_PRICE" };
      }
      fields.push(`"price" = $${idx++}`);
      values.push(input.price);
    }
    if (input.durationMinutes !== undefined) {
      if (input.durationMinutes <= 0) {
        throw {
          status: 400,
          message: "durationMinutes must be > 0",
          code: "INVALID_DURATION",
        };
      }
      fields.push(`"durationMinutes" = $${idx++}`);
      values.push(input.durationMinutes);
    }
    if (input.details !== undefined) {
      fields.push(`"details" = $${idx++}`);
      values.push(input.details);
    }
    if (input.isActive !== undefined) {
      fields.push(`"isActive" = $${idx++}`);
      values.push(input.isActive);
    }

    if (fields.length === 0) {
      throw { status: 400, message: "No fields to update", code: "NO_FIELDS" };
    }

    values.push(organizerServiceId, organizerId);
    const result = await pool.query(
      `UPDATE public."OrganizerService"
       SET ${fields.join(", ")}
       WHERE "organizerServiceId" = $${idx++} AND "organizerId" = $${idx}
       RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  }

  static async deleteOrganizerService(
    organizerId: string,
    organizerServiceId: number,
  ) {
    // Soft-delete preferred: deactivate
    const result = await pool.query(
      `UPDATE public."OrganizerService"
       SET "isActive" = FALSE
       WHERE "organizerServiceId" = $1 AND "organizerId" = $2
       RETURNING *`,
      [organizerServiceId, organizerId],
    );
    return result.rows[0] || null;
  }

  // ---------- ProviderAssignment ----------
  static async listAssignments(organizerId: string, status?: string) {
    const params: unknown[] = [organizerId];
    let statusFilter = "";
    if (status) {
      statusFilter = ` AND pa."status" = $2`;
      params.push(status);
    }

    const result = await pool.query(
      `SELECT
         pa."assignmentId",
         pa."providerId",
         pa."organizerId",
         pa."assignedAt",
         pa."status",
         u."name" AS "providerName",
         u."email" AS "providerEmail",
         u."phone" AS "providerPhone",
         pr."providerType",
         pr."specialization",
         pr."licenseNumber",
         pr."qualification",
         pr."experienceYears",
         pr."verificationStatus",
         pr."profilePictureUrl"
       FROM public."ProviderAssignment" pa
       JOIN public."Provider" pr ON pr."userId" = pa."providerId"
       JOIN public."User" u ON u."userId" = pr."userId"
       WHERE pa."organizerId" = $1 ${statusFilter}
       ORDER BY pa."assignedAt" DESC`,
      params,
    );
    return result.rows;
  }

  static async createAssignment(organizerId: string, providerId: string) {
    const providerCheck = await pool.query(
      `SELECT pr."userId", pr."verificationStatus"
       FROM public."Provider" pr
       JOIN public."User" u ON u."userId" = pr."userId"
       WHERE pr."userId" = $1 AND u."status" = 'Active'`,
      [providerId],
    );
    if (providerCheck.rows.length === 0) {
      throw { status: 404, message: "Provider not found", code: "PROVIDER_NOT_FOUND" };
    }
    if (providerCheck.rows[0].verificationStatus !== "Approved") {
      throw {
        status: 400,
        message: "Provider must be verified before assignment",
        code: "PROVIDER_NOT_VERIFIED",
      };
    }

    const result = await pool.query(
      `INSERT INTO public."ProviderAssignment"
         ("providerId", "organizerId", "status")
       VALUES ($1, $2, 'Pending')
       ON CONFLICT ("providerId", "organizerId") DO NOTHING
       RETURNING *`,
      [providerId, organizerId],
    );

    if (result.rows.length === 0) {
      throw {
        status: 409,
        message: "Provider already assigned to this organization",
        code: "ASSIGNMENT_EXISTS",
      };
    }
    return result.rows[0];
  }

  static async updateAssignmentStatus(
    organizerId: string,
    assignmentId: number,
    status: "Pending" | "Approved" | "Rejected" | "Ended",
  ) {
    const allowedFrom: Record<string, string[]> = {
      Pending: ["Approved", "Rejected"],
      Approved: ["Ended"],
      Rejected: [],
      Ended: [],
    };

    const current = await pool.query(
      `SELECT "status" FROM public."ProviderAssignment"
       WHERE "assignmentId" = $1 AND "organizerId" = $2`,
      [assignmentId, organizerId],
    );
    if (current.rows.length === 0) {
      return null;
    }

    const from = current.rows[0].status as string;
    const allowed = allowedFrom[from] || [];
    if (!allowed.includes(status)) {
      throw {
        status: 400,
        message: `Cannot transition assignment from ${from} to ${status}`,
        code: "INVALID_ASSIGNMENT_TRANSITION",
      };
    }

    const result = await pool.query(
      `UPDATE public."ProviderAssignment"
       SET "status" = $1
       WHERE "assignmentId" = $2 AND "organizerId" = $3
       RETURNING *`,
      [status, assignmentId, organizerId],
    );
    return result.rows[0] || null;
  }

  // ---------- ProviderService (link provider assignment to organizer service) ----------
  static async listProviderServices(organizerId: string, assignmentId?: number) {
    const params: unknown[] = [organizerId];
    let assignmentFilter = "";
    if (assignmentId) {
      assignmentFilter = ` AND ps."assignmentId" = $2`;
      params.push(assignmentId);
    }

    const result = await pool.query(
      `SELECT
         ps."providerServiceId",
         ps."assignmentId",
         ps."organizerId",
         ps."organizerServiceId",
         ps."deliveryMode",
         ps."isActive",
         os."price",
         os."durationMinutes",
         s."name" AS "serviceName",
         s."serviceType",
         pa."providerId",
         u."name" AS "providerName"
       FROM public."ProviderService" ps
       JOIN public."OrganizerService" os
         ON os."organizerServiceId" = ps."organizerServiceId"
        AND os."organizerId" = ps."organizerId"
       JOIN public."Service" s ON s."serviceId" = os."serviceId"
       JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
       JOIN public."User" u ON u."userId" = pa."providerId"
       WHERE ps."organizerId" = $1 ${assignmentFilter}
       ORDER BY ps."providerServiceId" ASC`,
      params,
    );
    return result.rows;
  }

  static async createProviderService(
    organizerId: string,
    data: {
      assignmentId: number;
      organizerServiceId: number;
      deliveryMode: "Online" | "InPerson" | "HomeVisit";
      isActive?: boolean;
    },
  ) {
    // Verify assignment belongs to this org and is approved
    const assignment = await pool.query(
      `SELECT "assignmentId", "status"
       FROM public."ProviderAssignment"
       WHERE "assignmentId" = $1 AND "organizerId" = $2`,
      [data.assignmentId, organizerId],
    );
    if (assignment.rows.length === 0) {
      throw {
        status: 404,
        message: "Assignment not found for this organization",
        code: "ASSIGNMENT_NOT_FOUND",
      };
    }
    if (assignment.rows[0].status !== "Approved") {
      throw {
        status: 400,
        message: "Assignment must be Approved before linking services",
        code: "ASSIGNMENT_NOT_APPROVED",
      };
    }

    const orgService = await pool.query(
      `SELECT "organizerServiceId", "isActive"
       FROM public."OrganizerService"
       WHERE "organizerServiceId" = $1 AND "organizerId" = $2`,
      [data.organizerServiceId, organizerId],
    );
    if (orgService.rows.length === 0) {
      throw {
        status: 404,
        message: "Organizer service not found",
        code: "ORG_SERVICE_NOT_FOUND",
      };
    }

    try {
      const result = await pool.query(
        `INSERT INTO public."ProviderService"
           ("assignmentId", "organizerId", "organizerServiceId", "deliveryMode", "isActive")
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          data.assignmentId,
          organizerId,
          data.organizerServiceId,
          data.deliveryMode,
          data.isActive !== false,
        ],
      );
      return result.rows[0];
    } catch (err: any) {
      if (err?.code === "23505") {
        throw {
          status: 409,
          message: "This provider service + delivery mode already exists",
          code: "PROVIDER_SERVICE_EXISTS",
        };
      }
      throw err;
    }
  }

  static async updateProviderService(
    organizerId: string,
    providerServiceId: number,
    data: { deliveryMode?: string; isActive?: boolean },
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.deliveryMode !== undefined) {
      fields.push(`"deliveryMode" = $${idx++}`);
      values.push(data.deliveryMode);
    }
    if (data.isActive !== undefined) {
      fields.push(`"isActive" = $${idx++}`);
      values.push(data.isActive);
    }
    if (fields.length === 0) {
      throw { status: 400, message: "No fields to update", code: "NO_FIELDS" };
    }

    values.push(providerServiceId, organizerId);
    const result = await pool.query(
      `UPDATE public."ProviderService"
       SET ${fields.join(", ")}
       WHERE "providerServiceId" = $${idx++} AND "organizerId" = $${idx}
       RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  }

  // ---------- Department (Hospital only) ----------
  static async listDepartments(hospitalId: string) {
    const result = await pool.query(
      `SELECT d."departmentId", d."hospitalId", d."name", d."description"
       FROM public."Department" d
       WHERE d."hospitalId" = $1
       ORDER BY d."name" ASC`,
      [hospitalId],
    );
    return result.rows;
  }

  static async createDepartment(hospitalId: string, input: CreateDepartmentInput) {
    // Ensure it's a hospital
    const hospital = await pool.query(
      `SELECT h."userId" FROM public."Hospital" h WHERE h."userId" = $1`,
      [hospitalId],
    );
    if (hospital.rows.length === 0) {
      throw {
        status: 400,
        message: "Departments are only available for Hospital organizations",
        code: "NOT_HOSPITAL",
      };
    }

    const result = await pool.query(
      `INSERT INTO public."Department" ("hospitalId", "name", "description")
       VALUES ($1, $2, $3)
       RETURNING *`,
      [hospitalId, input.name, input.description ?? null],
    );
    return result.rows[0];
  }

  static async updateDepartment(
    hospitalId: string,
    departmentId: number,
    data: { name?: string; description?: string | null },
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
    if (fields.length === 0) {
      throw { status: 400, message: "No fields to update", code: "NO_FIELDS" };
    }
    values.push(departmentId, hospitalId);
    const result = await pool.query(
      `UPDATE public."Department"
       SET ${fields.join(", ")}
       WHERE "departmentId" = $${idx++} AND "hospitalId" = $${idx}
       RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  }

  static async deleteDepartment(hospitalId: string, departmentId: number) {
    const result = await pool.query(
      `DELETE FROM public."Department"
       WHERE "departmentId" = $1 AND "hospitalId" = $2
       RETURNING *`,
      [departmentId, hospitalId],
    );
    return result.rows[0] || null;
  }

  // ---------- ProviderDepartment ----------
  static async assignProviderToDepartment(
    hospitalId: string,
    assignmentId: number,
    departmentId: number,
  ) {
    // Verify department belongs to hospital
    const dept = await pool.query(
      `SELECT "departmentId" FROM public."Department"
       WHERE "departmentId" = $1 AND "hospitalId" = $2`,
      [departmentId, hospitalId],
    );
    if (dept.rows.length === 0) {
      throw {
        status: 404,
        message: "Department not found in this hospital",
        code: "DEPARTMENT_NOT_FOUND",
      };
    }

    // Verify assignment belongs to this org
    const assignment = await pool.query(
      `SELECT "assignmentId" FROM public."ProviderAssignment"
       WHERE "assignmentId" = $1 AND "organizerId" = $2`,
      [assignmentId, hospitalId],
    );
    if (assignment.rows.length === 0) {
      throw {
        status: 404,
        message: "Assignment not found for this organization",
        code: "ASSIGNMENT_NOT_FOUND",
      };
    }

    const result = await pool.query(
      `INSERT INTO public."ProviderDepartment" ("assignmentId", "departmentId")
       VALUES ($1, $2)
       ON CONFLICT ("assignmentId", "departmentId") DO NOTHING
       RETURNING *`,
      [assignmentId, departmentId],
    );
    if (result.rows.length === 0) {
      throw {
        status: 409,
        message: "Provider already assigned to this department",
        code: "ALREADY_ASSIGNED",
      };
    }
    return result.rows[0];
  }

  static async listDepartmentProviders(hospitalId: string, departmentId: number) {
    const result = await pool.query(
      `SELECT
         pd."providerDepartmentId",
         pd."assignmentId",
         pd."departmentId",
         pa."providerId",
         u."name" AS "providerName",
         pr."providerType",
         pr."specialization"
       FROM public."ProviderDepartment" pd
       JOIN public."Department" d ON d."departmentId" = pd."departmentId"
       JOIN public."ProviderAssignment" pa ON pa."assignmentId" = pd."assignmentId"
       JOIN public."Provider" pr ON pr."userId" = pa."providerId"
       JOIN public."User" u ON u."userId" = pr."userId"
       WHERE d."hospitalId" = $1 AND d."departmentId" = $2`,
      [hospitalId, departmentId],
    );
    return result.rows;
  }

  // ---------- Ambulance ----------
  static async listAmbulances(hospitalId: string) {
    const result = await pool.query(
      `SELECT "ambulanceId", "hospitalId", "plateNumber", "status"
       FROM public."Ambulance"
       WHERE "hospitalId" = $1
       ORDER BY "ambulanceId" ASC`,
      [hospitalId],
    );
    return result.rows;
  }

  static async createAmbulance(hospitalId: string, input: CreateAmbulanceInput) {
    const hospital = await pool.query(
      `SELECT h."userId", h."offersAmbulanceService"
       FROM public."Hospital" h WHERE h."userId" = $1`,
      [hospitalId],
    );
    if (hospital.rows.length === 0) {
      throw {
        status: 400,
        message: "Ambulances are only available for Hospital organizations",
        code: "NOT_HOSPITAL",
      };
    }

    const result = await pool.query(
      `INSERT INTO public."Ambulance" ("hospitalId", "plateNumber", "status")
       VALUES ($1, $2, $3)
       RETURNING *`,
      [hospitalId, input.plateNumber, input.status || "Available"],
    );
    return result.rows[0];
  }

  static async updateAmbulanceStatus(
    hospitalId: string,
    ambulanceId: number,
    status: "Available" | "OnTrip" | "Maintenance",
  ) {
    const result = await pool.query(
      `UPDATE public."Ambulance"
       SET "status" = $1
       WHERE "ambulanceId" = $2 AND "hospitalId" = $3
       RETURNING *`,
      [status, ambulanceId, hospitalId],
    );
    return result.rows[0] || null;
  }

  // ---------- Catalog Service (read-only list for org to pick from) ----------
  static async listCatalogServices(serviceType?: string) {
    const params: unknown[] = [];
    let typeFilter = "";
    if (serviceType) {
      typeFilter = ` WHERE "serviceType" = $1 AND "isAvailable" = TRUE`;
      params.push(serviceType);
    } else {
      typeFilter = ` WHERE "isAvailable" = TRUE`;
    }
    const result = await pool.query(
      `SELECT "serviceId", "name", "description", "serviceType", "isAvailable"
       FROM public."Service"
       ${typeFilter}
       ORDER BY "serviceType", "name"`,
      params,
    );
    return result.rows;
  }
  // ---------- Appointments for this organization ----------
  static async listAppointments(organizerId: string, status?: string) {
    const params: unknown[] = [organizerId];
    let statusFilter = "";
    if (status) {
      statusFilter = ` AND a."status" = $2`;
      params.push(status);
    }
    const result = await pool.query(
      `SELECT
         a."appointmentId",
         a."patientId",
         a."providerServiceId",
         a."appointmentDate",
         a."startTime",
         a."endTime",
         a."status",
         a."priceAtBooking",
         a."createdAt",
         a."cancelledBy",
         a."visitAddress",
         a."visitNotes",
         ps."deliveryMode",
         s."name" AS "serviceName",
         s."serviceType",
         pa."providerId",
         pu."name" AS "patientName",
         pru."name" AS "providerName"
       FROM public."Appointment" a
       JOIN public."ProviderService" ps ON ps."providerServiceId" = a."providerServiceId"
       JOIN public."OrganizerService" os ON os."organizerServiceId" = ps."organizerServiceId"
       JOIN public."Service" s ON s."serviceId" = os."serviceId"
       JOIN public."ProviderAssignment" pa ON pa."assignmentId" = ps."assignmentId"
       JOIN public."User" pu ON pu."userId" = a."patientId"
       JOIN public."User" pru ON pru."userId" = pa."providerId"
       WHERE pa."organizerId" = $1 ${statusFilter}
       ORDER BY a."appointmentDate" DESC, a."startTime" DESC`,
      params,
    );
    return result.rows;
  }

  static async getAssignmentById(organizerId: string, assignmentId: number) {
    const result = await pool.query(
      `SELECT
         pa.*,
         u."name" AS "providerName",
         u."email" AS "providerEmail",
         u."phone" AS "providerPhone",
         pr."providerType",
         pr."specialization",
         pr."licenseNumber",
         pr."verificationStatus"
       FROM public."ProviderAssignment" pa
       JOIN public."Provider" pr ON pr."userId" = pa."providerId"
       JOIN public."User" u ON u."userId" = pr."userId"
       WHERE pa."assignmentId" = $1 AND pa."organizerId" = $2`,
      [assignmentId, organizerId],
    );
    return result.rows[0] || null;
  }

}
