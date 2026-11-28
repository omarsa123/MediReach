import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDB } from "./config/dbconfig.js";
import { globalErrorHandler } from "./middleware/errorHandler.js";
import { EmailService } from "./services/email.service.js";

// Auth & User (خارج نطاق التعديل)
import { authRouter } from "./modules/authUser/auth.routes.js";
import { userRouter } from "./modules/user/user.routes.js";

// Core modules
import { patientRouter } from "./modules/patient/patient.routes.js";
import { providerRouter } from "./modules/provider/provider.routes.js";
import { organizationRouter } from "./modules/organization/organization.routes.js";
import { appointmentRouter } from "./modules/appointment/appointment.routes.js";
import { discoveryRouter } from "./modules/discovery/discovery.routes.js";
import { medicalRouter } from "./modules/medical/medical.routes.js";
import { notificationRouter } from "./modules/notification/notification.routes.js";
import { paymentRouter } from "./modules/payment/payment.routes.js";
import { rateRouter } from "./modules/rate/rate.routes.js";
import { serviceRouter } from "./modules/service/service.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";

dotenv.config();

const app = express();

// أضف هذا السطر لحل مشكلة الـ rate-limit و الـ X-Forwarded-For
app.set("trust proxy", 1);
const PORT = Number(process.env.PORT) || 3000;

// ---------- Global middleware ----------
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow native mobile clients / server-to-server requests with no Origin header
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) {
        if (process.env.NODE_ENV !== "production") return callback(null, true);
        return callback(new Error("CORS origin not allowed"));
      }
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS origin not allowed"));
    },
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
// Auth & User
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);

// Core domain
app.use("/api/v1/patients", patientRouter);
app.use("/api/v1/providers", providerRouter);
app.use("/api/v1/organizations", organizationRouter);
app.use("/api/v1/appointments", appointmentRouter);
app.use("/api/v1/discovery", discoveryRouter);
app.use("/api/v1/medical", medicalRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/rates", rateRouter);
app.use("/api/v1/services", serviceRouter);
app.use("/api/v1/admin", adminRouter);

// ---------- 404 ----------
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    code: "NOT_FOUND",
  });
});

// ---------- Global error handler (موحد) ----------
app.use(globalErrorHandler);

// ---------- Start ----------
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 MedReach API server is running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV ?? "development"}`);
      console.log(`   Routes mounted:`);
      console.log(`     /api/v1/auth`);
      console.log(`     /api/v1/users`);
      console.log(`     /api/v1/patients`);
      console.log(`     /api/v1/providers`);
      console.log(`     /api/v1/organizations`);
      console.log(`     /api/v1/appointments`);
      console.log(`     /api/v1/discovery`);
      console.log(`     /api/v1/medical`);
      console.log(`     /api/v1/notifications`);
      console.log(`     /api/v1/payments`);
      console.log(`     /api/v1/rates`);
      console.log(`     /api/v1/services`);
      console.log(`     /api/v1/admin`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
