import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDB } from "./config/dbconfig.js";
import { authRouter } from "./modules/authUser/auth.routes.js";
import { userRouter } from "./modules/user/user.routes.js";
import { patientRouter } from "./modules/patient/patient.routes.js";
import { providerRouter } from "./modules/provider/provider.routes.js";
import { EmailService } from "./services/email.service.js";
import { adminRouter } from "./modules/admin/admin.routes.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ---------- Global middleware ----------

app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

// رفع الحد من 10kb إلى 10mb لاستيعاب طلبات الـ JSON والصور base64 بأمان
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ---------- Health check ----------
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "medreach-api",
    timestamp: new Date().toISOString(),
  });
});

// ---------- Test Email Route (للتطوير فقط) ----------
if (process.env.NODE_ENV !== "production") {
  app.get("/api/v1/test-email", async (req, res) => {
    try {
      const testEmail = (req.query.email as string) || "test@example.com";
      await EmailService.sendVerificationEmail(testEmail, "sample-token-12345");
      res.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}!`,
      });
    } catch (error: any) {
      console.error("Email test failed:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

// ---------- Routes ----------
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/patients", patientRouter);
app.use("/api/v1/providers", providerRouter);
app.use("/api/v1/admin", adminRouter);

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
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("[GlobalError]", err);
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: err.message || "Internal server error",
      code: err.code || "INTERNAL",
    });
  },
);

// ---------- Start ----------
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 MedReach API server is running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV ?? "development"}`);
      console.log(`   Auth base path: /api/v1/auth`);
      console.log(`   Users base path: /api/v1/users`);
      console.log(`   Patients base path: /api/v1/patients`);
      console.log(`   Providers base path: /api/v1/providers`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
