import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL in environment variables");
}
if (!supabaseAnonKey) {
  throw new Error("Missing SUPABASE_ANON_KEY in environment variables");
}
if (!supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in environment variables");
}

console.log("[Supabase Project]", new URL(supabaseUrl).host);

/**
 * Client used for regular user operations (signup, login, password reset).
 * Uses the anon key + respects RLS.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // Server-side: we manage tokens ourselves
      detectSessionInUrl: false,
    },
  },
);

/**
 * Admin client (service role) – bypasses RLS.
 * Use ONLY for trusted server-side operations:
 * - Creating users with email_confirm
 * - Syncing rows into public."User" after Auth signup
 * - Admin actions
 */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
