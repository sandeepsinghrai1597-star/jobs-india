import { createClient } from "@/lib/supabase/server";
import type { DbRow } from "@/lib/db/mysql";

export interface JobInteractionState {
  isApplied: boolean;
  isSaved: boolean;
}

/**
 * Resolves saved/applied state for a set of listings, keyed by **slug**.
 *
 * saved_jobs/applications reference `jobs.id`, but a listing's id is only a
 * jobs.id when it came from that table — government and imported feeds carry
 * their own ids, and the save/apply routes persist those under a freshly
 * generated uuid. Keying off the listing id therefore reported every such job
 * as unsaved, and because saving is a toggle, the next click silently removed
 * the row instead of adding one. Slug is the identifier every side agrees on.
 */
export async function getJobInteractionState(jobs: Array<{ slug: string }>) {
  const uniqueSlugs = [...new Set(jobs.map((job) => job?.slug).filter(Boolean))];
  const defaultState = new Map<string, JobInteractionState>(
    uniqueSlugs.map((slug) => [slug, { isApplied: false, isSaved: false }]),
  );

  if (uniqueSlugs.length === 0) {
    return {
      isSignedIn: false,
      stateBySlug: defaultState,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isSignedIn: false,
      stateBySlug: defaultState,
    };
  }

  const { data: persistedRows } = await supabase.from("jobs").select("id, slug").in("slug", uniqueSlugs);

  const slugByPersistedId = new Map<string, string>();
  for (const row of (persistedRows ?? []) as DbRow[]) {
    slugByPersistedId.set(String(row.id), String(row.slug));
  }
  const persistedIds = [...slugByPersistedId.keys()];

  if (persistedIds.length === 0) {
    return {
      isSignedIn: true,
      stateBySlug: defaultState,
    };
  }

  const [savedResult, appliedResult] = await Promise.all([
    supabase.from("saved_jobs").select("job_id").eq("user_id", user.id).in("job_id", persistedIds),
    supabase.from("applications").select("job_id").eq("user_id", user.id).in("job_id", persistedIds),
  ]);

  const savedSlugs = new Set(
    (savedResult.data ?? []).map((row: DbRow) => slugByPersistedId.get(String(row.job_id))),
  );
  const appliedSlugs = new Set(
    (appliedResult.data ?? []).map((row: DbRow) => slugByPersistedId.get(String(row.job_id))),
  );

  for (const slug of uniqueSlugs) {
    defaultState.set(slug, {
      isApplied: appliedSlugs.has(slug),
      isSaved: savedSlugs.has(slug),
    });
  }

  return {
    isSignedIn: true,
    stateBySlug: defaultState,
  };
}
