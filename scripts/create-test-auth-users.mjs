/**
 * Creates (or resets) the demo candidate and employer accounts in MySQL.
 *
 *   npm run create:test-users
 */

import bcrypt from "bcryptjs";
import { connect, createDb, loadEnvFiles, randomUUID } from "./lib/mysql-client.mjs";

loadEnvFiles();

const testUsers = [
  {
    email: "candidate.demo@jobpulse.test",
    password: "JobPulse123",
    name: "Demo Candidate",
    phone: "+91 9876543210",
    role: "candidate",
  },
  {
    email: "employer.demo@jobpulse.test",
    password: "JobPulse123",
    name: "Demo Employer",
    phone: "+91 9876543211",
    role: "employer",
  },
];

async function createOrUpdateUser(db, user) {
  const { data: existing, error: lookupError } = await db
    .from("users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);

  const passwordHash = await bcrypt.hash(user.password, 10);
  const fields = {
    name: user.name,
    phone: user.phone,
    role: user.role,
    password_hash: passwordHash,
    email_verified: true,
    is_banned: false,
    app_metadata: { role: user.role },
  };

  if (existing) {
    const { error } = await db.from("users").update(fields).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { action: "updated", email: user.email, id: existing.id };
  }

  const id = randomUUID();
  const { error } = await db.from("users").insert({ id, email: user.email, ...fields });
  if (error) throw new Error(error.message);
  return { action: "created", email: user.email, id };
}

async function main() {
  const connection = await connect();
  const db = createDb(connection);

  try {
    for (const user of testUsers) {
      const result = await createOrUpdateUser(db, user);
      console.log(`${result.action}: ${result.email}`);
    }

    console.log("");
    console.log("Test logins (password: JobPulse123)");
    for (const user of testUsers) {
      console.log(`  ${user.role.padEnd(9)} ${user.email}`);
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
