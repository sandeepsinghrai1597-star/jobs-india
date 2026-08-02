#!/usr/bin/env node
/**
 * Creates the JobPulse schema in the configured MySQL database and,
 * optionally, seeds an admin user.
 *
 * Usage (loads credentials from .env):
 *   node --env-file=.env scripts/setup-mysql.mjs
 *   node --env-file=.env scripts/setup-mysql.mjs --admin you@example.com --password 'SomePass123'
 */

import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key.startsWith("--")) {
      args[key.slice(2)] = argv[i + 1]?.startsWith("--") ? true : argv[++i];
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  const { MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD } = process.env;

  if (!MYSQL_HOST || !MYSQL_DATABASE || !MYSQL_USER || !MYSQL_PASSWORD) {
    console.error(
      "Missing database configuration. Set MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER and MYSQL_PASSWORD in .env.",
    );
    process.exit(1);
  }

  const schemaPath = path.join(process.cwd(), "db", "mysql", "schema.sql");
  const schema = await readFile(schemaPath, "utf8");

  const connection = await mysql.createConnection({
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT ?? 3306),
    database: MYSQL_DATABASE,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    multipleStatements: true,
  });

  console.log(`Connected to ${MYSQL_DATABASE} at ${MYSQL_HOST}.`);

  try {
    await connection.query(schema);
    console.log("Schema applied.");
  } catch (error) {
    // Re-running the script is expected; only duplicate-object errors are safe.
    if (error.code === "ER_DUP_KEYNAME" || error.code === "ER_TABLE_EXISTS_ERROR" || error.code === "ER_DUP_FIELDNAME") {
      console.log("Schema already present — nothing to change.");
    } else {
      throw error;
    }
  }

  const [tables] = await connection.query("SHOW TABLES");
  console.log(`Tables in database: ${tables.length}`);

  if (args.admin && args.password) {
    const email = String(args.admin).trim().toLowerCase();
    const passwordHash = await bcrypt.hash(String(args.password), 10);

    const [existing] = await connection.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);

    if (existing.length > 0) {
      await connection.query(
        "UPDATE users SET password_hash = ?, role = 'admin', app_metadata = ? WHERE email = ?",
        [passwordHash, JSON.stringify({ role: "admin" }), email],
      );
      console.log(`Updated existing user ${email} to admin with a new password.`);
    } else {
      await connection.query(
        `INSERT INTO users (id, name, email, role, password_hash, email_verified, app_metadata)
         VALUES (?, ?, ?, 'admin', ?, 1, ?)`,
        [randomUUID(), "Administrator", email, passwordHash, JSON.stringify({ role: "admin" })],
      );
      console.log(`Created admin user ${email}.`);
    }
  } else {
    console.log("No --admin/--password supplied; skipped admin user creation.");
  }

  await connection.end();
  console.log("Done.");
}

main().catch((error) => {
  console.error("Setup failed:", error.message);
  process.exit(1);
});
