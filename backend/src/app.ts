import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDB } from "./config/dbconfig.js";
import { authRouter } from "./modules/authUser/auth.routes.js";
import { userRouter } from "./modules/user/user.routes.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ---------- Global middleware ----------
app.use(helmet()); // basic security headers
// 2. تفعيل الـ CORS (بنسمح لأي أوريجين أو نقدر نحدد دومينات معينة لاحقاً)
app.use(
  cors({
    origin: true, // أو حط رابط الفرونت إند بتاعك هنا
    credentials: true,
  }),
);

app.use(express.json({ limit: "10kb" })); // keep payloads small for auth
app.use(express.urlencoded({ extended: true }));

// ---------- Health check ----------
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "medreach-auth",
    timestamp: new Date().toISOString(),
  });
});

// ---------- Auth routes ----------

// بعد تعريف الـ app وتجهيز الـ express.json()
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/users", userRouter);

// ---------- 404 ----------
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    code: "NOT_FOUND",
  });
});

// ---------- Global error handler ----------
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("[GlobalError]", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL",
    });
  },
);

// ---------- Start ----------
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT,'0.0.0.0', () => {
      console.log(`🚀 MedReach Auth server is running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV ?? "development"}`);
      console.log(`   Auth base path: /api/auth`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
