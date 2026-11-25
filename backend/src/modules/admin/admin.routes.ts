import { Router } from "express";
import { AdminController } from "./admin.controller.js";
import { requireAuth, authorizeRoles } from "../../middleware/auth.middleware.js";

const adminRouter = Router();

// نطبق حماية على كل مسارات الأدمن (لازم يكون عامل لوجين والرول بتاعته admin)
adminRouter.use(requireAuth, authorizeRoles("admin"));

// مسارات الإحصائيات والمنظمات
adminRouter.get("/stats", AdminController.getStats);
adminRouter.get("/pending-organizations", AdminController.getPendingOrganizations);
adminRouter.post("/verify-organization", AdminController.verifyOrganization);
adminRouter.get("/organizations", AdminController.getAllOrganizations);

// مسارات إدارة المستخدمين
adminRouter.get("/users", AdminController.getAllUsers);
adminRouter.post("/toggle-user-status", AdminController.toggleUserStatus);

export { adminRouter };