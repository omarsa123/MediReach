import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { AuthController } from "../authUser/authcontroller.js";

const userRouter = Router();

// Profile endpoints are already under /auth/me; keep a thin user router for compatibility.
userRouter.get("/me", requireAuth, AuthController.me);
userRouter.patch("/me", requireAuth, AuthController.updateMe);

export { userRouter };
