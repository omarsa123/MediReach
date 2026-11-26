import { randomInt } from "node:crypto";
import { pool } from "../../config/dbconfig.js";

const DEFAULT_OTP_TTL_MS =
  (Number(process.env.OTP_EXPIRES_MINUTES) || 10) * 60 * 1000;

export class OtpService {
  static generate(): string {
    return randomInt(100000, 1000000).toString();
  }

  static async store(
    key: string,
    code: string,
    ttlMs: number = DEFAULT_OTP_TTL_MS,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO public."AuthOtp" ("key", "code", "expiresAt")
       VALUES ($1, $2, NOW() + ($3::bigint * INTERVAL '1 millisecond'))
       ON CONFLICT ("key") DO UPDATE
       SET "code" = EXCLUDED."code", "expiresAt" = EXCLUDED."expiresAt"`,
      [key, code, ttlMs],
    );
  }

  static async issue(
    prefix: "verify" | "reset",
    email: string,
    ttlMs: number = DEFAULT_OTP_TTL_MS,
  ): Promise<string> {
    const code = this.generate();
    await this.store(`${prefix}_${email}`, code, ttlMs);
    return code;
  }

  static async getValid(key: string): Promise<string | null> {
    const result = await pool.query(
      `SELECT "code" FROM public."AuthOtp"
       WHERE "key" = $1 AND "expiresAt" > NOW()`,
      [key],
    );

    if (!result.rows.length) {
      await this.clear(key);
      return null;
    }

    return String(result.rows[0].code);
  }

  static async verify(
    prefix: "verify" | "reset",
    email: string,
    otp: string,
    consume: boolean = false,
  ): Promise<boolean> {
    const key = `${prefix}_${email}`;
    const storedCode = await this.getValid(key);
    if (!storedCode || storedCode !== otp.trim()) return false;

    if (consume) {
      await this.clear(key);
    }
    return true;
  }

  static async clear(key: string): Promise<void> {
    await pool.query(`DELETE FROM public."AuthOtp" WHERE "key" = $1`, [key]);
  }
}
