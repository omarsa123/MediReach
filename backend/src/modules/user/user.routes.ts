import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { UserController } from "./user.controller.js";

const userRouter = Router();

userRouter.get("/me", requireAuth, UserController.me);
userRouter.patch("/me", requireAuth, UserController.updateMe);

export { userRouter };
