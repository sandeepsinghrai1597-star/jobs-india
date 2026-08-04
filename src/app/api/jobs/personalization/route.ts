import { NextResponse } from "next/server";
import { getCachedOrComputeJobMatches } from "@/lib/candidate/job-match";
import { mapCandidateProfileRow } from "@/lib/candidate/profile";
import { getUnifiedJobs } from "@/lib/jobs/live";
import { createClient } from "@/lib/supabase/server";
import type { DbRow } from "@/lib/db/mysql";

const candidateProfileSelect =
  "id, user_id, full_name, phone, headline, bio, education, skills, experience, city, state, preferred_roles, expected_salary, preferred_job_types, language_preference, resume_url, verified, verification_status, verification_requested_at, verified_at, updated_at";

function splitParam(values: string[]) {
  return [
    ...new Set(
      values
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const includeResumes = url.searchParams.get("includeResumes") === "true";
  const includeMatches = url.searchParams.get("includeMatches") === "true";
  const jobIds = splitParam(url.searchParams.getAll("ids"));
  const jobSlugs = splitParam(url.searchParams.getAll("slugs"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const defaultStateBySlug = Object.fromEntries(
    jobSlugs.map((slug) => [slug, { isApplied: false, isSaved: false }]),
  );

  if (!user) {
    return NextResponse.json({
      isSignedIn: false,
      stateBySlug: defaultStateBySlug,
      resumeOptions: [],
      matchSummaries: {},
    });
  }

  // Saved/applied rows point at `jobs.id`, but a listing's id is only a jobs.id
  // when the listing came from that table — government and imported feeds carry
  // their own ids, and the save/apply routes persist those under a fresh uuid.
  // Slug is the one identifier both sides agree on, so resolve through it.
  const { data: persistedRows } =
    jobSlugs.length > 0
      ? await supabase.from("jobs").select("id, slug").in("slug", jobSlugs)
      : { data: [] };

  const slugByPersistedId = new Map<string, string>();
  for (const row of (persistedRows ?? []) as DbRow[]) {
    slugByPersistedId.set(String(row.id), String(row.slug));
  }
  const persistedIds = [...slugByPersistedId.keys()];

  const [savedResult, appliedResult, profileResult, resumesResult] = await Promise.all([
    persistedIds.length > 0
      ? supabase.from("saved_jobs").select("job_id").eq("user_id", user.id).in("job_id", persistedIds)
      : Promise.resolve({ data: [], error: null }),
    persistedIds.length > 0
      ? supabase.from("applications").select("job_id").eq("user_id", user.id).in("job_id", persistedIds)
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

  const savedSlugs = new Set(
    (savedResult.data ?? [])
      .map((row: DbRow) => slugByPersistedId.get(String(row.job_id)))
      .filter(Boolean),
  );
  const appliedSlugs = new Set(
    (appliedResult.data ?? [])
      .map((row: DbRow) => slugByPersistedId.get(String(row.job_id)))
      .filter(Boolean),
  );
  const stateBySlug = Object.fromEntries(
    jobSlugs.map((slug) => [
      slug,
      {
        isApplied: appliedSlugs.has(slug),
        isSaved: savedSlugs.has(slug),
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
    stateBySlug,
    resumeOptions: (resumesResult.data ?? []).map((resume: DbRow) => ({
      id: resume.id,
      title: resume.title,
      updatedAt: resume.updated_at,
    })),
    matchSummaries,
  });
}
