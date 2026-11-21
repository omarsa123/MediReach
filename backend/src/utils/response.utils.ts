import jwt from "jsonwebtoken";

// 1. استجابة النجاح
export const successResponse = (data: any, message = "Success") => ({
  success: true,
  message,
  data,
});

// 2. استجابة الخطأ
export const errorResponse = (error: string, code = "ERROR") => ({
  success: false,
  error,
  code,
});

// 3. تنظيف بيانات المستخدم لإخفاء الحساسات (مثل الـ passwordHash)
export const toPublicUser = (user: any) => {
  if (!user) return null;
  const { passwordHash, ...publicData } = user;
  return publicData;
};

// 4. توليد التوكنز المحلية (JWT)
export const generateLocalTokens = (userId: string, email: string) => {
  const secret = process.env.JWT_SECRET || "your_fallback_secret_key";
  const accessToken = jwt.sign({ userId, email }, secret, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ userId, email }, secret, { expiresIn: "7d" });

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600,
    tokenType: "bearer",
  };
};

// 5. فحص أخطاء التكرار في قاعدة البيانات (Unique Constraints)
export const isUniqueViolation = (err: any) => err?.code === "23505";

export const mapUniqueViolationMessage = (err: any) => {
  if (err?.detail?.includes("email")) return "This email is already registered";
  if (err?.detail?.includes("username"))
    return "This username is already taken";
  if (err?.detail?.includes("phone"))
    return "This phone number is already registered";
  return "A record with this value already exists";
};
