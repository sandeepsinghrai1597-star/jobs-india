import { createClient } from "@/lib/supabase/server";
import type { DbRow } from "@/lib/db/mysql";

export interface JobInteractionState {
  isApplied: boolean;
  isSaved: boolean;
}

export async function getJobInteractionState(jobIds: string[]) {
  const uniqueJobIds = [...new Set(jobIds.filter(Boolean))];
  const defaultState = new Map<string, JobInteractionState>(
    uniqueJobIds.map((jobId) => [jobId, { isApplied: false, isSaved: false }]),
  );

  if (uniqueJobIds.length === 0) {
    return {
      isSignedIn: false,
      stateByJobId: defaultState,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isSignedIn: false,
      stateByJobId: defaultState,
    };
  }

  const [savedResult, appliedResult] = await Promise.all([
    supabase
      .from("saved_jobs")
      .select("job_id")
      .eq("user_id", user.id)
      .in("job_id", uniqueJobIds),
    supabase
      .from("applications")
      .select("job_id")
      .eq("user_id", user.id)
      .in("job_id", uniqueJobIds),
  ]);

  const savedIds = new Set((savedResult.data ?? []).map((row: DbRow) => row.job_id));
  const appliedIds = new Set((appliedResult.data ?? []).map((row: DbRow) => row.job_id));

  for (const jobId of uniqueJobIds) {
    defaultState.set(jobId, {
      isApplied: appliedIds.has(jobId),
      isSaved: savedIds.has(jobId),
    });
  }

  return {
    isSignedIn: true,
    stateByJobId: defaultState,
  };
}
