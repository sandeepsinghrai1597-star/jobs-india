import "server-only";
import { createServerDataClient, type ServerDataClient } from "@/lib/db/server-client";

/**
 * Request-scoped data + auth client, backed by Hostinger MySQL.
 * Kept at this path and name so existing server components, actions, and
 * route handlers continue to work unchanged.
 */
export async function createClient(): Promise<ServerDataClient> {
  return createServerDataClient();
}
