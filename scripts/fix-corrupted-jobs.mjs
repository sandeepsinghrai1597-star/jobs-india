/**
 * Clears bad apply/source URLs and prose that leaked into location columns.
 *
 *   npm run cleanup:corrupted-jobs
 *
 * Rows are scanned in the script rather than filtered in SQL: the same
 * predicates below decide what to clear, so a single pass keeps the two in
 * step and avoids duplicating the patterns as LIKE clauses.
 */

import { connect, createDb, loadEnvFiles } from "./lib/mysql-client.mjs";

loadEnvFiles();

const invalidUrlPatterns = [
  "grok.com",
  "/apply/data-scientist",
  "hkrn-cnc-operator",
  "pgimer-recruitment",
  "sgpgi-non-teaching",
];

const proseLocationPatterns = [
  /\bhistory,\s*culture,\s*festivals\b/i,
  /\b(click here|read more|apply online|official notification)\b/i,
];

function isBadUrl(value) {
  if (!value) return false;
  const lowered = String(value).toLowerCase();
  return invalidUrlPatterns.some((pattern) => lowered.includes(pattern));
}

function isBadLocation(value) {
  if (!value) return false;
  const trimmed = String(value).replace(/\s+/g, " ").trim();
  return trimmed.split(/\s+/).length > 5 || proseLocationPatterns.some((pattern) => pattern.test(trimmed));
}

async function cleanupTable(db, { table, urlColumns, locationColumns, columns }) {
  const { data, error } = await db.from(table).select(columns);
  if (error) throw new Error(error.message);

  let updated = 0;

  for (const row of data ?? []) {
    const patch = {};

    for (const column of urlColumns) {
      if (isBadUrl(row[column])) patch[column] = null;
    }
    for (const column of locationColumns) {
      if (isBadLocation(row[column])) patch[column] = null;
    }

    if (Object.keys(patch).length > 0) {
      const { error: updateError } = await db.from(table).update(patch).eq("id", row.id);
      if (updateError) throw new Error(updateError.message);
      updated += 1;
      console.log(`Cleaned ${table}/${row.slug ?? row.id}: ${row.title}`);
    }
  }

  return updated;
}

async function main() {
  const connection = await connect();
  const db = createDb(connection);

  try {
    const jobsUpdated = await cleanupTable(db, {
      table: "jobs",
      columns: "id, slug, title, application_url, source_url, city, state",
      urlColumns: ["application_url", "source_url"],
      locationColumns: ["city", "state"],
    });

    const governmentJobsUpdated = await cleanupTable(db, {
      table: "government_jobs",
      columns: "id, slug, title, notification_url, official_apply_url, source_url, state",
      urlColumns: ["notification_url", "official_apply_url", "source_url"],
      locationColumns: ["state"],
    });

    console.log(`Done. Updated ${jobsUpdated} jobs and ${governmentJobsUpdated} government jobs.`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
