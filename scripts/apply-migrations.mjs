#!/usr/bin/env node
/**
 * Applies every .sql file in db/mysql/migrations in filename order.
 *
 * `scripts/setup-mysql.mjs` only runs `CREATE TABLE IF NOT EXISTS`, so it can
 * create a database from scratch but never alters one that already exists.
 * Column additions live here instead.
 *
 * Each migration is written to be safely re-runnable, so this is idempotent.
 *
 * Usage (reads .env.local then .env):
 *   node scripts/apply-migrations.mjs
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { loadEnvFiles } from "./lib/mysql-client.mjs";

loadEnvFiles([".env.local", ".env"]);

async function main() {
  const { MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD } = process.env;

  if (!MYSQL_HOST || !MYSQL_DATABASE || !MYSQL_USER || !MYSQL_PASSWORD) {
    console.error(
      "Missing database configuration. Set MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER and MYSQL_PASSWORD (see .env.example).",
    );
    process.exit(1);
  }

  const dir = path.join(process.cwd(), "db", "mysql", "migrations");
  const files = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();

  if (files.length === 0) {
    console.log("No migrations found.");
    return;
  }

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
    for (const file of files) {
      const sql = await readFile(path.join(dir, file), "utf8");
      await connection.query(sql);
      console.log(`Applied ${file}.`);
    }
  } finally {
    await connection.end();
  }

  console.log("Migrations complete.");
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
