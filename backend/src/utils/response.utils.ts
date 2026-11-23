/**
 * Standard API response helpers for MedReach.
 */

export function successResponse(data: any, message = "Success") {
  return {
    success: true,
    message,
    data,
  };
}

export function errorResponse(message: string, code = "ERROR", data?: any) {
  return {
    success: false,
    message,
    code,
    ...(data !== undefined ? { data } : {}),
  };
}

/** Strip sensitive fields before sending user object to the client. */
export function toPublicUser(user: any) {
  if (!user) return null;
  const {
    passwordHash,
    password,
    ...publicFields
  } = user;
  return publicFields;
}

/** Postgres unique-violation error code. */
export function isUniqueViolation(err: any): boolean {
  return err?.code === "23505";
}

export function mapUniqueViolationMessage(err: any): string {
  const detail = String(err?.detail || err?.message || "");
  if (detail.includes("email")) return "This email is already registered";
  if (detail.includes("username")) return "This username is already taken";
  if (detail.includes("phone")) return "This phone number is already registered";
  return "A record with the same unique value already exists";
}
