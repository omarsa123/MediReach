/**
 * OTP-only email delivery for MedReach.
 * Users enter codes directly inside the app; no browser/deep-link redirect.
 */
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT || 465),
  secure: true,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

export class EmailService {
  static async sendVerificationEmail(
    email: string,
    otp: string,
  ): Promise<void> {
    const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
<div style="max-width:480px;margin:auto;background:#fff;border-radius:16px;padding:32px 24px">
<h1 style="color:#0d9488">MedReach</h1>
<p>مرحباً، استخدم كود التفعيل التالي داخل تطبيق MedReach:</p>
<div style="text-align:center;background:#f0fdfa;border:2px dashed #0d9488;border-radius:12px;padding:16px;font-size:32px;font-weight:700;letter-spacing:8px">${otp}</div>
<p style="text-align:center;color:#64748b">الكود صالح لمدة 10 دقائق. ارجع للتطبيق وأدخله في شاشة Verify your email.</p>
<p style="text-align:center;color:#94a3b8">لا تشارك الكود مع أي شخص.</p>
</div></body></html>`;
    await this._send(
      email,
      "تفعيل حسابك في MedReach - Verification Code",
      html,
      `Your MedReach verification code is: ${otp}. It expires in 10 minutes.`,
    );
  }

  static async sendPasswordResetEmail(
    email: string,
    otp: string,
  ): Promise<void> {
    const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
<div style="max-width:480px;margin:auto;background:#fff;border-radius:16px;padding:32px 24px">
<h1 style="color:#0d9488">MedReach</h1>
<p>طلبت استعادة كلمة المرور. اكتب الكود التالي داخل تطبيق MedReach:</p>
<div style="text-align:center;background:#fffbeb;border:2px dashed #d97706;border-radius:12px;padding:16px;font-size:32px;font-weight:700;letter-spacing:8px">${otp}</div>
<p style="text-align:center;color:#64748b">الكود صالح لمدة 10 دقائق. ارجع لشاشة Reset password داخل التطبيق.</p>
<p style="text-align:center;color:#94a3b8">لا تشارك الكود مع أي شخص.</p>
</div></body></html>`;
    await this._send(
      email,
      "استعادة كلمة المرور - MedReach",
      html,
      `Your MedReach password reset code is: ${otp}. It expires in 10 minutes.`,
    );
  }

  private static async _send(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error(
        "EMAIL_USER or EMAIL_PASS is missing; email was not sent.",
      );
    }
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    });
    console.log("📧 Email sent successfully:", info.messageId, "→", to);
  }
}
