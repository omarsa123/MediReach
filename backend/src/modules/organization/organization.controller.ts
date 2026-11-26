import type { Request, Response } from "express";
import { OrganizationModel } from "./organization.model.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse } from "../../utils/response.utils.js";

export class OrganizationController {
  static getProfile = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const orgProfile = await OrganizationModel.findOrganizationProfile(
        user.userId,
      );
      if (!orgProfile) {
        res
          .status(404)
          .json(errorResponse("Organization profile not found", "NOT_FOUND"));
        return;
      }

      res.json(successResponse({ organization: orgProfile }));
    },
  );

  static updateProfile = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      if (!user) {
        res
          .status(401)
          .json(errorResponse("Not authenticated", "UNAUTHORIZED"));
        return;
      }

      const updatedProfile = await OrganizationModel.updateOrganizationProfile(
        user.userId,
        req.body,
      );
      if (!updatedProfile) {
        res
          .status(404)
          .json(errorResponse("Organization profile not found", "NOT_FOUND"));
        return;
      }

      res.json(
        successResponse(
          { organization: updatedProfile },
          "Organization profile updated successfully",
        ),
      );
    },
  );

  // ---------- Catalog services ----------
  static listCatalogServices = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const serviceType = req.query.serviceType as string | undefined;
      const services = await OrganizationModel.listCatalogServices(serviceType);
      res.json(successResponse({ services }));
    },
  );

  // ---------- OrganizerService ----------
  static listOrganizerServices = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const services = await OrganizationModel.listOrganizerServices(
        user.userId,
      );
      res.json(successResponse({ services }));
    },
  );

  static createOrganizerService = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { serviceId, price, durationMinutes, details, isActive } = req.body;
      if (!serviceId || price === undefined || !durationMinutes) {
        res
          .status(400)
          .json(
            errorResponse(
              "serviceId, price, durationMinutes are required",
              "MISSING_FIELDS",
            ),
          );
        return;
      }
      const service = await OrganizationModel.createOrganizerService(
        user.userId,
        {
          serviceId: Number(serviceId),
          price: Number(price),
          durationMinutes: Number(durationMinutes),
          details,
          isActive,
        },
      );
      res
        .status(201)
        .json(successResponse({ service }, "Organizer service created"));
    },
  );

  static updateOrganizerService = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const organizerServiceId = Number(req.params.organizerServiceId);
      const updated = await OrganizationModel.updateOrganizerService(
        user.userId,
        organizerServiceId,
        req.body,
      );
      if (!updated) {
        res
          .status(404)
          .json(errorResponse("Organizer service not found", "NOT_FOUND"));
        return;
      }
      res.json(
        successResponse({ service: updated }, "Organizer service updated"),
      );
    },
  );

  static deleteOrganizerService = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const organizerServiceId = Number(req.params.organizerServiceId);
      const deleted = await OrganizationModel.deleteOrganizerService(
        user.userId,
        organizerServiceId,
      );
      if (!deleted) {
        res
          .status(404)
          .json(errorResponse("Organizer service not found", "NOT_FOUND"));
        return;
      }
      res.json(
        successResponse({ service: deleted }, "Organizer service deactivated"),
      );
    },
  );

  // ---------- ProviderAssignment ----------
  static listAssignments = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const status = req.query.status as string | undefined;
      const assignments = await OrganizationModel.listAssignments(
        user.userId,
        status,
      );
      res.json(successResponse({ assignments }));
    },
  );

  static createAssignment = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { providerId } = req.body;
      if (!providerId) {
        res
          .status(400)
          .json(errorResponse("providerId is required", "MISSING_FIELDS"));
        return;
      }
      const assignment = await OrganizationModel.createAssignment(
        user.userId,
        providerId,
      );
      res
        .status(201)
        .json(successResponse({ assignment }, "Provider assignment created"));
    },
  );

  static updateAssignmentStatus = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const assignmentId = Number(req.params.assignmentId);
      const { status } = req.body;
      const allowed = ["Pending", "Approved", "Rejected", "Ended"];
      if (!status || !allowed.includes(status)) {
        res
          .status(400)
          .json(
            errorResponse(
              `status must be one of: ${allowed.join(", ")}`,
              "INVALID_STATUS",
            ),
          );
        return;
      }
      const assignment = await OrganizationModel.updateAssignmentStatus(
        user.userId,
        assignmentId,
        status,
      );
      if (!assignment) {
        res
          .status(404)
          .json(errorResponse("Assignment not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ assignment }, "Assignment status updated"));
    },
  );

  // ---------- ProviderService ----------
  static listProviderServices = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const assignmentId = req.query.assignmentId
        ? Number(req.query.assignmentId)
        : undefined;
      const services = await OrganizationModel.listProviderServices(
        user.userId,
        assignmentId,
      );
      res.json(successResponse({ services }));
    },
  );

  static createProviderService = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { assignmentId, organizerServiceId, deliveryMode, isActive } =
        req.body;
      if (!assignmentId || !organizerServiceId || !deliveryMode) {
        res
          .status(400)
          .json(
            errorResponse(
              "assignmentId, organizerServiceId, deliveryMode are required",
              "MISSING_FIELDS",
            ),
          );
        return;
      }
      const allowedModes = ["Online", "InPerson", "HomeVisit"];
      if (!allowedModes.includes(deliveryMode)) {
        res
          .status(400)
          .json(
            errorResponse(
              `deliveryMode must be one of: ${allowedModes.join(", ")}`,
              "INVALID_MODE",
            ),
          );
        return;
      }
      const service = await OrganizationModel.createProviderService(
        user.userId,
        {
          assignmentId: Number(assignmentId),
          organizerServiceId: Number(organizerServiceId),
          deliveryMode,
          isActive,
        },
      );
      res
        .status(201)
        .json(successResponse({ service }, "Provider service linked"));
    },
  );

  static updateProviderService = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const providerServiceId = Number(req.params.providerServiceId);
      const updated = await OrganizationModel.updateProviderService(
        user.userId,
        providerServiceId,
        req.body,
      );
      if (!updated) {
        res
          .status(404)
          .json(errorResponse("Provider service not found", "NOT_FOUND"));
        return;
      }
      res.json(
        successResponse({ service: updated }, "Provider service updated"),
      );
    },
  );

  // ---------- Department ----------
  static listDepartments = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const departments = await OrganizationModel.listDepartments(user.userId);
      res.json(successResponse({ departments }));
    },
  );

  static createDepartment = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { name, description } = req.body;
      if (!name) {
        res
          .status(400)
          .json(errorResponse("name is required", "MISSING_FIELDS"));
        return;
      }
      const department = await OrganizationModel.createDepartment(user.userId, {
        name,
        description,
      });
      res
        .status(201)
        .json(successResponse({ department }, "Department created"));
    },
  );

  static updateDepartment = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const departmentId = Number(req.params.departmentId);
      const updated = await OrganizationModel.updateDepartment(
        user.userId,
        departmentId,
        req.body,
      );
      if (!updated) {
        res
          .status(404)
          .json(errorResponse("Department not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ department: updated }, "Department updated"));
    },
  );

  static deleteDepartment = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const departmentId = Number(req.params.departmentId);
      const deleted = await OrganizationModel.deleteDepartment(
        user.userId,
        departmentId,
      );
      if (!deleted) {
        res
          .status(404)
          .json(errorResponse("Department not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ department: deleted }, "Department deleted"));
    },
  );

  static assignProviderToDepartment = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const departmentId = Number(req.params.departmentId);
      const { assignmentId } = req.body;
      if (!assignmentId) {
        res
          .status(400)
          .json(errorResponse("assignmentId is required", "MISSING_FIELDS"));
        return;
      }
      const link = await OrganizationModel.assignProviderToDepartment(
        user.userId,
        Number(assignmentId),
        departmentId,
      );
      res
        .status(201)
        .json(successResponse({ link }, "Provider assigned to department"));
    },
  );

  static listDepartmentProviders = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const departmentId = Number(req.params.departmentId);
      const providers = await OrganizationModel.listDepartmentProviders(
        user.userId,
        departmentId,
      );
      res.json(successResponse({ providers }));
    },
  );

  // ---------- Ambulance ----------
  static listAmbulances = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const ambulances = await OrganizationModel.listAmbulances(user.userId);
      res.json(successResponse({ ambulances }));
    },
  );

  static createAmbulance = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { plateNumber, status } = req.body;
      if (!plateNumber) {
        res
          .status(400)
          .json(errorResponse("plateNumber is required", "MISSING_FIELDS"));
        return;
      }
      const ambulance = await OrganizationModel.createAmbulance(user.userId, {
        plateNumber,
        status,
      });
      res.status(201).json(successResponse({ ambulance }, "Ambulance created"));
    },
  );

  static updateAmbulanceStatus = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const ambulanceId = Number(req.params.ambulanceId);
      const { status } = req.body;
      const allowed = ["Available", "OnTrip", "Maintenance"];
      if (!status || !allowed.includes(status)) {
        res
          .status(400)
          .json(
            errorResponse(
              `status must be one of: ${allowed.join(", ")}`,
              "INVALID_STATUS",
            ),
          );
        return;
      }
      const ambulance = await OrganizationModel.updateAmbulanceStatus(
        user.userId,
        ambulanceId,
        status,
      );
      if (!ambulance) {
        res.status(404).json(errorResponse("Ambulance not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ ambulance }, "Ambulance status updated"));
    },
  );
  static listAppointments = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const status = req.query.status as string | undefined;
      const appointments = await OrganizationModel.listAppointments(
        user.userId,
        status,
      );
      res.json(successResponse({ appointments }));
    },
  );

  static getAssignment = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const assignmentId = Number(req.params.assignmentId);
      const assignment = await OrganizationModel.getAssignmentById(
        user.userId,
        assignmentId,
      );
      if (!assignment) {
        res
          .status(404)
          .json(errorResponse("Assignment not found", "NOT_FOUND"));
        return;
      }
      res.json(successResponse({ assignment }));
    },
  );
  // إزالة طبيب من قسم
  static removeProviderFromDepartment = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const departmentId = Number(req.params.departmentId);
      const assignmentId = Number(req.params.assignmentId);

      if (!departmentId || !assignmentId) {
        res
          .status(400)
          .json(
            errorResponse(
              "departmentId and assignmentId are required",
              "MISSING_FIELDS",
            ),
          );
        return;
      }

      const removed = await OrganizationModel.removeProviderFromDepartment(
        user.userId,
        departmentId,
        assignmentId,
      );

      if (!removed) {
        res
          .status(404)
          .json(
            errorResponse(
              "Assignment link not found in department",
              "NOT_FOUND",
            ),
          );
        return;
      }

      res.json(
        successResponse(
          { link: removed },
          "Provider removed from department successfully",
        ),
      );
    },
  );

  // جلب تقييمات المؤسسة
  static getOrganizationReviews = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const [reviews, stats] = await Promise.all([
        OrganizationModel.listOrganizationReviews(user.userId),
        OrganizationModel.averageOrganizationRating(user.userId),
      ]);

      res.json(
        successResponse({
          averageRating: Number(stats?.averageRating || 0),
          totalRatings: Number(stats?.totalRatings || 0),
          reviews,
        }),
      );
    },
  );
}
