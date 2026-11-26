import { randomInt, createHash, timingSafeEqual } from "node:crypto";
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
    const codeHash = createHash("sha256").update(code).digest("hex");
    await pool.query(
      `INSERT INTO public."AuthOtp" ("key", "codeHash", "expiresAt")
       VALUES ($1, $2, NOW() + ($3::bigint * INTERVAL '1 millisecond'))
       ON CONFLICT ("key") DO UPDATE
       SET "codeHash" = EXCLUDED."codeHash", "expiresAt" = EXCLUDED."expiresAt"`,
      [key, codeHash, ttlMs],
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
      `SELECT "codeHash" FROM public."AuthOtp"
       WHERE "key" = $1 AND "expiresAt" > NOW()`,
      [key],
    );

    if (!result.rows.length) {
      await this.clear(key);
      return null;
    }

    // Stored hashes cannot be converted back to OTP codes; getValid is retained
    // only for compatibility and verify() performs hash comparison.
    return String(result.rows[0].codeHash);
  }

  static async verify(
    prefix: "verify" | "reset",
    email: string,
    otp: string,
    consume: boolean = false,
  ): Promise<boolean> {
    const key = `${prefix}_${email}`;
    const storedHash = await this.getValid(key);
    if (!storedHash) return false;
    const suppliedHash = createHash("sha256").update(otp).digest("hex");
    const storedBuffer = Buffer.from(storedHash, "hex");
    const suppliedBuffer = Buffer.from(suppliedHash, "hex");
    if (storedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(storedBuffer, suppliedBuffer)) return false;

    if (consume) {
      await this.clear(key);
    }
    return true;
  }

  static async clear(key: string): Promise<void> {
    await pool.query(`DELETE FROM public."AuthOtp" WHERE "key" = $1`, [key]);
  }
}
