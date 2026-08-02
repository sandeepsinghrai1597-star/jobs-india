import { NextResponse } from "next/server";
import type { DbError } from "@/lib/db/mysql";
import { recordAnalyticsEvent } from "@/lib/analytics/server";
import { isCandidateVerified, mapCandidateProfileRow } from "@/lib/candidate/profile";
import { ensurePersistedJobByIdentifier } from "@/lib/jobs/persistence";
import { createClient } from "@/lib/supabase/server";

async function resolveCandidateProfileId(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: existingProfile, error: profileError } = await supabase
    .from("candidate_profiles")
    .select("id, user_id, full_name, phone, headline, bio, education, skills, experience, city, state, preferred_roles, expected_salary, preferred_job_types, language_preference, resume_url, verified, verification_status, verification_requested_at, verified_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    return {
      id: null,
      verified: false,
      message: "We could not load your candidate profile right now.",
    };
  }

  if (existingProfile?.id) {
    return {
      id: existingProfile.id as string,
      verified: isCandidateVerified(mapCandidateProfileRow(existingProfile as never)),
      message: null,
    };
  }

  const { data: createdProfile, error: createError } = await supabase
    .from("candidate_profiles")
    .insert({ user_id: userId } as never)
    .select("id")
    .single();

  if (createError || !createdProfile?.id) {
    return {
      id: null,
      verified: false,
      message: "We could not prepare your candidate profile for this application.",
    };
  }

  return {
    id: createdProfile.id as string,
    verified: false,
    message: null,
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: identifier } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { message: "Please sign in to apply.", redirectTo: `/login?next=/jobs/${identifier}` },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const selectedResumeId = String(formData.get("resumeId") ?? "").trim();
  const coverLetter = String(formData.get("coverLetter") ?? "").trim();

  const candidateProfile = await resolveCandidateProfileId(user.id, supabase);
  if (!candidateProfile.id) {
    return NextResponse.json(
      { message: candidateProfile.message ?? "Could not prepare your profile." },
      { status: 500 },
    );
  }

  if (!candidateProfile.verified) {
    return NextResponse.json(
      {
        message:
          "Complete candidate verification before applying. Add your profile details and resume, then request review.",
        redirectTo: "/dashboard/profile",
      },
      { status: 403 },
    );
  }

  let resumeId: string | null = null;
  let resumeStoragePath: string | null = null;

  if (selectedResumeId) {
    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .select("id, storage_path")
      .eq("id", selectedResumeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (resumeError || !resume?.id) {
      return NextResponse.json({ message: "The selected resume was not found." }, { status: 400 });
    }

    resumeId = resume.id as string;
    resumeStoragePath = resume.storage_path ?? null;
  }

  if (!resumeId || !resumeStoragePath) {
    return NextResponse.json(
      { message: "Select an uploaded resume before applying." },
      { status: 400 },
    );
  }

  const persistedJob = await ensurePersistedJobByIdentifier(identifier);

  if (!persistedJob.id || !persistedJob.job) {
    return NextResponse.json(
      { message: persistedJob.message ?? "We could not prepare this application." },
      { status: 404 },
    );
  }

  const { error } = await supabase.from("applications").insert({
    job_id: persistedJob.id,
    user_id: user.id,
    candidate_id: candidateProfile.id,
    resume_id: resumeId,
    resume_storage_path: resumeStoragePath,
    cover_letter: coverLetter || null,
  } as never);

  if (error) {
    // The adapter maps MySQL's ER_DUP_ENTRY onto 23505, so this still
    // detects a repeat application against the unique (job, candidate) index.
    const duplicateError = error as DbError;

    if (duplicateError.code === "23505") {
      return NextResponse.json({
        ok: true,
        alreadyApplied: true,
        applied: true,
        message: "You already applied for this job.",
        applicationUrl: persistedJob.job.applicationUrl,
      });
    }

    return NextResponse.json(
      { message: "We could not submit your application right now." },
      { status: 500 },
    );
  }

  await recordAnalyticsEvent({
    userId: user.id,
    candidateId: candidateProfile.id,
    jobId: persistedJob.id,
    eventName: "job_application",
    eventData: {
      jobIdentifier: identifier,
      jobSlug: persistedJob.job.slug,
      sourceType: persistedJob.job.sourceType ?? null,
      city: persistedJob.job.city,
    },
  });

  return NextResponse.json({
    ok: true,
    applied: true,
    message: "Application submitted successfully.",
    applicationUrl: persistedJob.job.applicationUrl,
  });
}
