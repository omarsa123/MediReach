/**
 * MedReach seed: 5 patients + 7 doctors
 * Creates users in Supabase Auth FIRST, then public tables.
 *
 * Usage:
 *   1. Copy .env next to this file (or run from project root with dotenv)
 *   2. node seed.mjs
 *
 * All accounts password: Password123!
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const { Pool } = pg;

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !serviceKey || !databaseUrl) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / DATABASE_URL");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const PASSWORD = "Password123!";

const patients = [
  { name: "Ahmed Hassan", email: "patient1@medreach.test", phone: "01000000001", bloodType: "A_Positive" },
  { name: "Sara Mohamed", email: "patient2@medreach.test", phone: "01000000002", bloodType: "O_Positive" },
  { name: "Omar Ali", email: "patient3@medreach.test", phone: "01000000003", bloodType: "B_Positive" },
  { name: "Nour Ibrahim", email: "patient4@medreach.test", phone: "01000000004", bloodType: "AB_Positive" },
  { name: "Youssef Kamal", email: "patient5@medreach.test", phone: "01000000005", bloodType: "O_Negative" },
];

const doctors = [
  { name: "Dr. Mona Said", email: "doctor1@medreach.test", phone: "01100000001", specialization: "Cardiology", licenseNumber: "LIC-DOC-001" },
  { name: "Dr. Hany Farouk", email: "doctor2@medreach.test", phone: "01100000002", specialization: "Dermatology", licenseNumber: "LIC-DOC-002" },
  { name: "Dr. Laila Adel", email: "doctor3@medreach.test", phone: "01100000003", specialization: "Pediatrics", licenseNumber: "LIC-DOC-003" },
  { name: "Dr. Karim Nabil", email: "doctor4@medreach.test", phone: "01100000004", specialization: "Orthopedics", licenseNumber: "LIC-DOC-004" },
  { name: "Dr. Rania Samir", email: "doctor5@medreach.test", phone: "01100000005", specialization: "Neurology", licenseNumber: "LIC-DOC-005" },
  { name: "Dr. Tarek Mostafa", email: "doctor6@medreach.test", phone: "01100000006", specialization: "General Practitioner", licenseNumber: "LIC-DOC-006" },
  { name: "Dr. Heba Fathy", email: "doctor7@medreach.test", phone: "01100000007", specialization: "Gynecology", licenseNumber: "LIC-DOC-007" },
];

async function ensureUser({ name, email, phone, role, extra }) {
  email = email.toLowerCase().trim();

  // Skip if local email exists
  const existing = await pool.query(
    `SELECT "userId" FROM public."User" WHERE "email" = $1`,
    [email],
  );
  if (existing.rows.length) {
    console.log(`  skip (exists): ${email}`);
    return existing.rows[0].userId;
  }

  // Create in Auth
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name, phone, role },
  });

  if (error || !data.user) {
    // Maybe orphan in auth — try list and delete then recreate
    console.error(`  auth create failed for ${email}:`, error?.message);
    throw error || new Error("no user");
  }

  const userId = data.user.id;
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const username =
    email.split("@")[0].replace(/[^a-z0-9_]/gi, "_") +
    "_" +
    Math.floor(1000 + Math.random() * 9000);

  const status = role === "patient" ? "Active" : "Active"; // seed doctors as Active for testing

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO public."User"
        ("userId", "name", "username", "email", "passwordHash", "phone", "status")
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT ("userId") DO NOTHING`,
      [userId, name, username, email, passwordHash, phone, status],
    );

    if (role === "patient") {
      await client.query(
        `INSERT INTO public."Patient" ("userId", "bloodType")
         VALUES ($1, $2)
         ON CONFLICT ("userId") DO NOTHING`,
        [userId, extra.bloodType || "Unknown"],
      );
    } else if (role === "provider") {
      await client.query(
        `INSERT INTO public."Provider"
          ("userId", "providerType", "specialization", "licenseNumber",
           "experienceYears", "verificationStatus", "profilePictureUrl")
         VALUES ($1, 'Doctor', $2, $3, 5, 'Approved', 'https://example.com/default-avatar.png')
         ON CONFLICT ("userId") DO NOTHING`,
        [userId, extra.specialization || "Other", extra.licenseNumber],
      );
    }

    await client.query("COMMIT");
    console.log(`  ok: ${email} (${role}) → ${userId}`);
    return userId;
  } catch (e) {
    await client.query("ROLLBACK");
    // rollback auth
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch (_) {}
    throw e;
  } finally {
    client.release();
  }
}

async function main() {
  console.log("Seeding patients...");
  for (const p of patients) {
    await ensureUser({
      name: p.name,
      email: p.email,
      phone: p.phone,
      role: "patient",
      extra: { bloodType: p.bloodType },
    });
  }

  console.log("Seeding doctors...");
  for (const d of doctors) {
    await ensureUser({
      name: d.name,
      email: d.email,
      phone: d.phone,
      role: "provider",
      extra: {
        specialization: d.specialization,
        licenseNumber: d.licenseNumber,
      },
    });
  }

  console.log("\nDone. Password for all: Password123!");
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
