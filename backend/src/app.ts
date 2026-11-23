import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDB, pool } from "./config/dbconfig.js";
import { authRouter } from "./modules/authUser/auth.routes.js";
import { userRouter } from "./modules/user/user.routes.js";
import { EmailService } from "./services/email.service.js"; // 👈 استيراد خدمة الإيميل للتجربة
import { patientRouter } from "./modules/patient/patient.routes.js";
import { providerRouter } from "./modules/provider/provider.routes.js";
import { successResponse } from "./utils/response.utils.js";
import { AuthService } from "./modules/authUser/auth.service.js";

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

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// ---------- Health check ----------
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "medreach-auth",
    timestamp: new Date().toISOString(),
  });
});
app.use("/api/v1/patients", patientRouter);
app.use("/api/v1/providers", providerRouter);
// ---------- Test Email Route (راوت تجريبي للتأكد من إرسال الإيميلات) ----------
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

// ---------- Routes ----------
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);

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
    const statusCode = err.status || 500;
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
    app.listen(PORT, () => {
      console.log(`🚀 MedReach Auth server is running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV ?? "development"}`);
      console.log(`   Auth base path: /api/v1/auth`); // 👈 عدناها لتكون مطابقة للصح
      console.log(`   Users base path: /api/v1/users`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
