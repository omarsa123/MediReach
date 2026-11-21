import nodemailer from "nodemailer";

// إعداد الـ Transporter الموحد
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  service: "gmail",
  secure: false, // إلزامي مع بورت 465 لـ Gmail
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * دالة عامة لإرسال أي إيميل لتقليل التكرار (DRY Principle)
 */
const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await transporter.sendMail({
      from: `"MedReach Support" <${process.env.EMAIL_FROM || "support@medreach.com"}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw new Error("Failed to send email");
  }
};

export class EmailService {
  /**
   * 1. إيميل تفعيل البريد الإلكتروني
   */
  static async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; direction: rtl; text-align: right;">
        <h2 style="color: #007bff;">أهلاً بك في منصة MedReach 🩺</h2>
        <p>شكراً لتسجيلك معنا. لإتمام حسابك، يرجى تفعيل بريدك الإلكتروني بالضغط على الزر أدناه:</p>
        <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">تفعيل البريد الإلكتروني</a>
        <p style="margin-top: 20px; font-size: 12px; color: #777;">إذا لم تقم بطلب هذا الحساب، يمكنك تجاهل هذه الرسالة بأمان.</p>
      </div>
    `;

    await sendEmail(email, "تفعيل حسابك الشخصي على MedReach", htmlContent);
  }

  /**
   * 2. إيميل استعادة كلمة المرور (متوافق مع الـ Forgot Password اللي عملناها)
   */
  static async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; direction: rtl; text-align: right;">
        <h2 style="color: #dc3545;">إعادة تعيين كلمة المرور - MedReach 🔐</h2>
        <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. يمكنك اختيار كلمة مرور جديدة بالضغط على الزر أدناه:</p>
        <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">إعادة تعيين كلمة المرور</a>
        <p style="margin-top: 20px; font-size: 12px; color: #777;">هذا الرابط صالح لفترة محدودة. إذا لم تطلب تغيير كلمة المرور، يرجى تجاهل هذه الرسالة.</p>
      </div>
    `;

    await sendEmail(
      email,
      "إعادة تعيين كلمة المرور لحسابك على MedReach",
      htmlContent,
    );
  }
}
