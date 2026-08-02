/**
 * Promotes an account to admin (creating it if needed) or removes a user.
 *
 *   node scripts/manage-production-admin.mjs ensure-admin <email> [temporaryPassword]
 *   node scripts/manage-production-admin.mjs delete-user <email>
 */

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { connect, createDb, loadEnvFiles, randomUUID } from "./lib/mysql-client.mjs";

loadEnvFiles([".env.local", ".env"]);

const [action, emailArg, passwordArg] = process.argv.slice(2);

if (!action || !emailArg) {
  console.error("Usage:");
  console.error("  node scripts/manage-production-admin.mjs ensure-admin <email> [temporaryPassword]");
  console.error("  node scripts/manage-production-admin.mjs delete-user <email>");
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();

if (!email) {
  console.error("Email is required.");
  process.exit(1);
}

function buildDisplayName(targetEmail) {
  const local = targetEmail.split("@")[0] ?? "admin";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function generatePassword() {
  return `JobPulse!${crypto.randomBytes(9).toString("base64url")}`;
}

async function ensureAdmin(db, emailAddress, requestedPassword) {
  const password = requestedPassword?.trim() || generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const fullName = buildDisplayName(emailAddress);

  const { data: existing, error: lookupError } = await db
    .from("users")
    .select("id")
    .eq("email", emailAddress)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);

  const fields = {
    name: fullName,
    role: "admin",
    password_hash: passwordHash,
    email_verified: true,
    is_banned: false,
    app_metadata: { role: "admin" },
  };

  if (existing) {
    const { error } = await db.from("users").update(fields).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { action: "updated", email: emailAddress, id: existing.id, password };
  }

  const id = randomUUID();
  const { error } = await db.from("users").insert({ id, email: emailAddress, ...fields });
  if (error) throw new Error(error.message);
  return { action: "created", email: emailAddress, id, password };
}

async function deleteUserByEmail(db, emailAddress) {
  const { data: existing, error: lookupError } = await db
    .from("users")
    .select("id")
    .eq("email", emailAddress)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);

  if (!existing) {
    return { deleted: false, email: emailAddress };
  }

  // Related rows (profiles, applications, resumes, …) are removed by the
  // ON DELETE CASCADE constraints in db/mysql/schema.sql.
  const { error } = await db.from("users").delete().eq("id", existing.id);
  if (error) throw new Error(error.message);

  return { deleted: true, email: emailAddress, id: existing.id };
}

async function main() {
  const connection = await connect();
  const db = createDb(connection);

  try {
    if (action === "ensure-admin") {
      const result = await ensureAdmin(db, email, passwordArg);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (action === "delete-user") {
      const result = await deleteUserByEmail(db, email);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.error(`Unknown action: ${action}`);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
