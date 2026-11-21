import nodemailer from "nodemailer";

// إعداد الـ Transporter (ممكن نستخدم Gmail أو Mailtrap للتجربة في الديفلوبمنت)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.mailtrap.io",
  port: Number(process.env.EMAIL_PORT) || 2525,
  auth: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
  },
});

export const sendVerificationEmail = async (email: string, token: string) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #007bff;">أهلاً بك في منصة MedReach 🩺</h2>
      <p>شكراً لتسجيلك معنا. لإتمام حسابك، يرجى تفعيل بريدك الإلكتروني بالضغط على الزر أدناه:</p>
      <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">تفعيل البريد الإلكتروني</a>
      <p style="margin-top: 20px; font-size: 12px; color: #777;">إذا لم تقم بطلب هذا الحساب، يمكنك تجاهل هذه الرسالة بأمان.</p>
    </div>
  `;

  await transporter.sendMail({
    from: '"MedReach Support" <support@medreach.com>',
    to: email,
    subject: "تفعيل حسابك الشخصي على MedReach",
    html: htmlContent,
  });
};
