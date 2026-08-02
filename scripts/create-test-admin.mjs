/**
 * Creates (or resets) the demo admin account in the MySQL database.
 *
 *   node scripts/create-test-admin.mjs
 */

import bcrypt from "bcryptjs";
import { connect, createDb, loadEnvFiles, randomUUID } from "./lib/mysql-client.mjs";

loadEnvFiles();

const adminUser = {
  email: "admin.demo@jobpulse.test",
  password: "JobPulse123",
  name: "Demo Admin",
  phone: "+91 9876543212",
};

async function main() {
  const connection = await connect();
  const db = createDb(connection);

  try {
    const { data: existing, error: lookupError } = await db
      .from("users")
      .select("id")
      .eq("email", adminUser.email)
      .maybeSingle();

    if (lookupError) throw new Error(lookupError.message);

    const passwordHash = await bcrypt.hash(adminUser.password, 10);
    const appMetadata = { role: "admin" };

    if (existing) {
      const { error } = await db
        .from("users")
        .update({
          name: adminUser.name,
          phone: adminUser.phone,
          role: "admin",
          password_hash: passwordHash,
          email_verified: true,
          is_banned: false,
          app_metadata: appMetadata,
        })
        .eq("id", existing.id);

      if (error) throw new Error(error.message);
      console.log(`updated: ${adminUser.email}`);
      console.log(`id: ${existing.id}`);
    } else {
      const id = randomUUID();
      const { error } = await db.from("users").insert({
        id,
        name: adminUser.name,
        email: adminUser.email,
        phone: adminUser.phone,
        role: "admin",
        password_hash: passwordHash,
        email_verified: true,
        is_banned: false,
        app_metadata: appMetadata,
      });

      if (error) throw new Error(error.message);
      console.log(`created: ${adminUser.email}`);
      console.log(`id: ${id}`);
    }

    console.log("");
    console.log("Admin login:");
    console.log(`  email: ${adminUser.email}`);
    console.log(`  password: ${adminUser.password}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
