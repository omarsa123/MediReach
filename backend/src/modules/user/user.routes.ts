import { Router } from "express";
import { UserController } from "./user.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const userRouter = Router();

// جميع مسارات الـ User محمية بـ requireAuth لأنها تخص المستخدم المسجل دخوله
userRouter.get("/me", requireAuth, UserController.me);
userRouter.patch("/me", requireAuth, UserController.updateMe);

export { userRouter };
