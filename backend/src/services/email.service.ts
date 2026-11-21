import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  service: "gmail",
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await transporter.sendMail({
      from: `"MedReach Support" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || "support@medreach.com"}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw new Error("Failed to send email");
  }
};

/**
 * لينك يفتح من الإيميل:
 * 1) رابط HTTPS/HTTP على الـ API (شغال في Gmail) → بيوجّه للتطبيق
 * 2) Deep link احتياطي medreach://...
 */
const buildLinks = (type: "verify" | "reset", token: string) => {
  const scheme = (process.env.APP_DEEP_LINK_SCHEME || "medreach").replace(
    /:\/\/$/,
    "",
  );
  const path =
    type === "verify" ? "email_verification" : "reset_password";

  const deepLink = `${scheme}://${path}?token=${encodeURIComponent(token)}`;

  const apiBase = (
    process.env.API_PUBLIC_URL ||
    process.env.BACKEND_URL ||
    `http://localhost:${process.env.PORT || 5000}`
  ).replace(/\/$/, "");

  const webLink = `${apiBase}/api/auth/open-app?type=${type}&token=${encodeURIComponent(token)}`;

  return { deepLink, webLink };
};

export class EmailService {
  static async sendVerificationEmail(email: string, token: string) {
    const { deepLink, webLink } = buildLinks("verify", token);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; direction: rtl; text-align: right;">
        <h2 style="color: #007bff;">أهلاً بك في منصة MedReach 🩺</h2>
        <p>شكراً لتسجيلك معنا. لإتمام حسابك، يرجى تفعيل بريدك الإلكتروني بالضغط على الزر أدناه:</p>
        <a href="${webLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; font-weight: bold;">تفعيل البريد الإلكتروني</a>
        <p style="margin-top: 24px; font-size: 13px; color: #555;">إذا لم يعمل الزر، افتح الرابط التالي من الموبايل:</p>
        <p style="font-size: 12px; word-break: break-all; color: #007bff;"><a href="${webLink}">${webLink}</a></p>
        <p style="margin-top: 12px; font-size: 11px; color: #888;">أو استخدم رابط التطبيق مباشرة:</p>
        <p style="font-size: 11px; word-break: break-all; color: #666;">${deepLink}</p>
        <p style="margin-top: 20px; font-size: 12px; color: #777;">إذا لم تقم بطلب هذا الحساب، يمكنك تجاهل هذه الرسالة بأمان.</p>
      </div>
    `;

    await sendEmail(email, "تفعيل حسابك الشخصي على MedReach", htmlContent);
  }

  static async sendPasswordResetEmail(email: string, resetToken: string) {
    const { deepLink, webLink } = buildLinks("reset", resetToken);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; direction: rtl; text-align: right;">
        <h2 style="color: #dc3545;">إعادة تعيين كلمة المرور - MedReach 🔐</h2>
        <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. اضغط على الزر أدناه:</p>
        <a href="${webLink}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; font-weight: bold;">إعادة تعيين كلمة المرور</a>
        <p style="margin-top: 24px; font-size: 13px; color: #555;">إذا لم يعمل الزر، افتح الرابط التالي من الموبايل:</p>
        <p style="font-size: 12px; word-break: break-all; color: #dc3545;"><a href="${webLink}">${webLink}</a></p>
        <p style="margin-top: 12px; font-size: 11px; color: #888;">أو استخدم رابط التطبيق مباشرة:</p>
        <p style="font-size: 11px; word-break: break-all; color: #666;">${deepLink}</p>
        <p style="margin-top: 20px; font-size: 12px; color: #777;">هذا الرابط صالح لفترة محدودة. إذا لم تطلب تغيير كلمة المرور، تجاهل هذه الرسالة.</p>
      </div>
    `;

    await sendEmail(
      email,
      "إعادة تعيين كلمة المرور لحسابك على MedReach",
      htmlContent,
    );
  }
}
