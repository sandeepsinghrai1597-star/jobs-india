import { NextResponse } from "next/server";
import { getMysqlPool } from "@/lib/db/mysql";

export const dynamic = "force-dynamic";

/**
 * Deployment health check.
 *
 * This exists because a missing `MYSQL_*` env set does not take the site down —
 * the job pages silently fall back to the bundled JSON snapshot and keep
 * rendering, while auth, admin, and ingestion are all dead. That failure mode is
 * invisible from the homepage, so it needs somewhere explicit to surface.
 *
 * Returns 200 when the app can reach its database, 503 when it cannot. No
 * credentials or connection details are ever included in the response.
 */

type CheckResult = { ok: boolean; detail: string };

async function checkDatabase(): Promise<CheckResult> {
  const pool = getMysqlPool();

  if (!pool) {
    return {
      ok: false,
      detail: "MYSQL_* environment variables are not set. Auth, admin, and job ingestion are disabled.",
    };
  }

  try {
    const connection = await pool.getConnection();
    try {
      await connection.query("SELECT 1");
      return { ok: true, detail: "Connected." };
    } finally {
      connection.release();
    }
  } catch (error) {
    return {
      ok: false,
      detail: `Database unreachable: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}

function checkEnv(name: string, description: string): CheckResult {
  return process.env[name]
    ? { ok: true, detail: "Set." }
    : { ok: false, detail: `${name} is not set. ${description}` };
}

export async function GET() {
  const database = await checkDatabase();
  const checks = {
    database,
    sessionSecret: checkEnv("AUTH_JWT_SECRET", "Login sessions cannot be signed."),
    cronSecret: checkEnv("CRON_SECRET", "Scheduled job fetching refuses to run."),
    siteUrl: checkEnv("NEXT_PUBLIC_SITE_URL", "Canonical URLs and sitemap entries fall back to a default origin."),
  };

  // Only the database is fatal; the rest degrade specific features.
  const ok = database.ok;
  const failing = Object.entries(checks)
    .filter(([, result]) => !result.ok)
    .map(([name]) => name);

  return NextResponse.json(
    {
      ok,
      status: ok ? "healthy" : "degraded",
      checkedAt: new Date().toISOString(),
      failing,
      checks,
    },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
