import { NextResponse } from "next/server";
import { getCachedOrComputeJobMatches } from "@/lib/candidate/job-match";
import { mapCandidateProfileRow } from "@/lib/candidate/profile";
import { getUnifiedJobs } from "@/lib/jobs/live";
import { createClient } from "@/lib/supabase/server";
import type { DbRow } from "@/lib/db/mysql";

const candidateProfileSelect =
  "id, user_id, full_name, phone, headline, bio, education, skills, experience, city, state, preferred_roles, expected_salary, preferred_job_types, language_preference, resume_url, verified, verification_status, verification_requested_at, verified_at, updated_at";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawIds = url.searchParams.getAll("ids");
  const includeResumes = url.searchParams.get("includeResumes") === "true";
  const includeMatches = url.searchParams.get("includeMatches") === "true";
  const jobIds = [...new Set(rawIds.flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean))];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const defaultStateByJobId = Object.fromEntries(
    jobIds.map((jobId) => [jobId, { isApplied: false, isSaved: false }]),
  );

  if (!user) {
    return NextResponse.json({
      isSignedIn: false,
      stateByJobId: defaultStateByJobId,
      resumeOptions: [],
      matchSummaries: {},
    });
  }

  const [savedResult, appliedResult, profileResult, resumesResult] = await Promise.all([
    jobIds.length > 0
      ? supabase.from("saved_jobs").select("job_id").eq("user_id", user.id).in("job_id", jobIds)
      : Promise.resolve({ data: [], error: null }),
    jobIds.length > 0
      ? supabase.from("applications").select("job_id").eq("user_id", user.id).in("job_id", jobIds)
      : Promise.resolve({ data: [], error: null }),
    includeMatches
      ? supabase.from("candidate_profiles").select(candidateProfileSelect).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    includeResumes
      ? supabase
          .from("resumes")
          .select("id, title, storage_path, updated_at")
          .eq("user_id", user.id)
          .not("storage_path", "is", null)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const savedIds = new Set((savedResult.data ?? []).map((row: DbRow) => row.job_id));
  const appliedIds = new Set((appliedResult.data ?? []).map((row: DbRow) => row.job_id));
  const stateByJobId = Object.fromEntries(
    jobIds.map((jobId) => [
      jobId,
      {
        isApplied: appliedIds.has(jobId),
        isSaved: savedIds.has(jobId),
      },
    ]),
  );

  let matchSummaries: Record<string, Awaited<ReturnType<typeof getCachedOrComputeJobMatches>> extends Map<string, infer TValue> ? TValue : never> = {};

  if (includeMatches && profileResult.data && jobIds.length > 0) {
    const profile = mapCandidateProfileRow(profileResult.data);
    const jobs = (await getUnifiedJobs()).filter((job) => jobIds.includes(job.id));
    const summaries = await getCachedOrComputeJobMatches({
      supabase,
      profile,
      jobs,
    });

    matchSummaries = Object.fromEntries(summaries.entries());
  }

  return NextResponse.json({
    isSignedIn: true,
    stateByJobId,
    resumeOptions: (resumesResult.data ?? []).map((resume: DbRow) => ({
      id: resume.id,
      title: resume.title,
      updatedAt: resume.updated_at,
    })),
    matchSummaries,
  });
}
