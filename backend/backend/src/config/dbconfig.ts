import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL in environment variables");
}
export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false, // مطلوب مع Supabase
  },
  max: 20, // عدد الاتصالات القصوى
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const connectDB = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    console.log("Database connected successfully");
    client.release();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(" Database connection error:", message);
    process.exit(1);
  }
};
