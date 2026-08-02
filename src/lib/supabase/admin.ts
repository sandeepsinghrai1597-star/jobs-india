import "server-only";
import { createMysqlDataClient, getMysqlPool, type MysqlQueryBuilder } from "@/lib/db/mysql";
import { createAuthAdminApi } from "@/lib/db/auth";

/**
 * Privileged data client (formerly the Supabase service-role client), now
 * backed by Hostinger MySQL. Callers must keep handling `null`, which
 * signals that database env vars are missing.
 *
 * Safe outside a request scope (cron jobs, scripts) — unlike the
 * cookie-bound server client, this reads no request state.
 */

export interface AdminDataClient {
  from(table: string): MysqlQueryBuilder;
  auth: { admin: ReturnType<typeof createAuthAdminApi> };
}

let adminClient: AdminDataClient | null = null;

export function getSupabaseAdminClient(): AdminDataClient | null {
  if (!getMysqlPool()) {
    return null;
  }

  if (!adminClient) {
    const data = createMysqlDataClient();
    adminClient = {
      from: (table: string) => data.from(table),
      auth: { admin: createAuthAdminApi() },
    };
  }

  return adminClient;
}

/** Alias for new code that shouldn't reference the old vendor name. */
export const getAdminDataClient = getSupabaseAdminClient;
