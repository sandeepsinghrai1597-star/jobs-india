import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPublicJobWindow } from "@/lib/jobs/visibility";

const EXPIRY_SYNC_INTERVAL_MS = 5 * 60 * 1000;

let lastExpirySyncAt = 0;

function isMissingColumnError(error: { message?: string; details?: string; hint?: string } | null, column: string) {
  if (!error) return false;
  const text = [error.message, error.details, error.hint].filter(Boolean).join(" ");
  return text.includes(`'${column}'`) || text.includes(`"${column}"`) || text.includes(` ${column} `);
}

export type ExpiredJobSyncResult = {
  expiredIds: string[];
  skipped: boolean;
};

export async function syncExpiredJobs(input?: {
  force?: boolean;
  now?: Date;
}): Promise<ExpiredJobSyncResult> {
  const now = input?.now ?? new Date();
  const nowMs = now.getTime();

  if (!input?.force && nowMs - lastExpirySyncAt < EXPIRY_SYNC_INTERVAL_MS) {
    return {
      expiredIds: [],
      skipped: true,
    };
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return {
      expiredIds: [],
      skipped: true,
    };
  }

  lastExpirySyncAt = nowMs;

  const { todayDate, todayStartIso } = getPublicJobWindow(now);
  const expiredAt = now.toISOString();
  const payload = {
    status: "expired",
    is_featured: false,
    expires_at: expiredAt,
    updated_at: expiredAt,
  } as never;
  const payloadWithoutExpiresAt = {
    status: "expired",
    is_featured: false,
    updated_at: expiredAt,
  } as never;

  let deadlineResult = await client
    .from("jobs")
    .update(payload)
    .eq("status", "active")
    .not("deadline", "is", null)
    .lt("deadline", todayDate)
    .select("id");

  let expiryResult = await client
    .from("jobs")
    .update(payload)
    .eq("status", "active")
    .not("expires_at", "is", null)
    .lt("expires_at", todayStartIso)
    .select("id");

  if (isMissingColumnError(deadlineResult.error, "expires_at")) {
    deadlineResult = await client
      .from("jobs")
      .update(payloadWithoutExpiresAt)
      .eq("status", "active")
      .not("deadline", "is", null)
      .lt("deadline", todayDate)
      .select("id");
  }

  if (isMissingColumnError(expiryResult.error, "expires_at")) {
    expiryResult = {
      data: [],
      error: null,
      count: null,
      status: 200,
    };
  }

  if (deadlineResult.error || expiryResult.error) {
    lastExpirySyncAt = 0;
    throw new Error(deadlineResult.error?.message ?? expiryResult.error?.message ?? "Failed to sync expired jobs.");
  }

  const expiredIds = Array.from(
    new Set(
      [deadlineResult.data ?? [], expiryResult.data ?? []]
        .flat()
        .map((row) => String((row as { id: string }).id)),
    ),
  );

  return {
    expiredIds,
    skipped: false,
  };
}
