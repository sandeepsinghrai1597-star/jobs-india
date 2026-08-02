import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { loadResumeFile } from "@/lib/resumes/file-store";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ResumeRecord = {
  id: string;
  user_id: string;
  storage_path: string | null;
};

type ApplicationRecord = {
  id: string;
  resume_id: string | null;
  resume_storage_path: string | null;
  candidate_profiles: { user_id: string | null } | null;
  jobs:
    | {
        employer_profiles: { user_id: string | null } | null;
      }
    | null;
};

async function loadResumeById(resumeId: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return { data: null, message: "Resume storage is not configured." };
  }

  const { data, error } = await admin
    .from("resumes")
    .select("id, user_id, storage_path")
    .eq("id", resumeId)
    .maybeSingle();

  if (error || !data) {
    return { data: null, message: "Resume not found." };
  }

  return { data: data as ResumeRecord, message: null };
}

async function loadApplicationById(applicationId: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return { data: null, message: "Resume storage is not configured." };
  }

  const { data, error } = await admin
    .from("applications")
    .select(
      "id, resume_id, resume_storage_path, candidate_profiles!applications_candidate_id_fkey(user_id), jobs!applications_job_id_fkey(employer_profiles!jobs_employer_id_fkey(user_id))",
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !data) {
    return { data: null, message: "Application resume not found." };
  }

  return { data: data as unknown as ApplicationRecord, message: null };
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ message: "Please sign in to access this resume." }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ message: "Resume storage is not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const resumeId = searchParams.get("resumeId")?.trim() ?? "";
  const applicationId = searchParams.get("applicationId")?.trim() ?? "";

  if (!resumeId && !applicationId) {
    return NextResponse.json({ message: "Provide a resume or application id." }, { status: 400 });
  }

  let storagePath: string | null = null;

  if (applicationId) {
    const applicationResult = await loadApplicationById(applicationId);
    if (!applicationResult.data) {
      return NextResponse.json({ message: applicationResult.message }, { status: 404 });
    }

    const application = applicationResult.data;
    const candidateUserId = application.candidate_profiles?.user_id ?? null;
    const employerUserId = application.jobs?.employer_profiles?.user_id ?? null;

    const isAllowed =
      currentUser.role === "admin" ||
      (currentUser.role === "candidate" && candidateUserId === currentUser.id) ||
      (currentUser.role === "employer" && employerUserId === currentUser.id);

    if (!isAllowed) {
      return NextResponse.json({ message: "You are not allowed to access this resume." }, { status: 403 });
    }

    storagePath = application.resume_storage_path;

    if (!storagePath && application.resume_id) {
      const resumeResult = await loadResumeById(application.resume_id);
      storagePath = resumeResult.data?.storage_path ?? null;
    }
  } else if (resumeId) {
    const resumeResult = await loadResumeById(resumeId);
    if (!resumeResult.data) {
      return NextResponse.json({ message: resumeResult.message }, { status: 404 });
    }

    const resume = resumeResult.data;
    const isAllowed =
      currentUser.role === "admin" ||
      (currentUser.role === "candidate" && resume.user_id === currentUser.id);

    if (!isAllowed) {
      return NextResponse.json({ message: "You are not allowed to access this resume." }, { status: 403 });
    }

    storagePath = resume.storage_path;
  }

  if (!storagePath) {
    return NextResponse.json({ message: "This resume file is unavailable." }, { status: 404 });
  }

  // Access was authorized above, so the bytes are streamed straight from the
  // database rather than handing out a public signed URL.
  const file = await loadResumeFile(storagePath);

  if (!file) {
    return NextResponse.json({ message: "We could not prepare this resume download." }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(file.content), {
    status: 200,
    headers: {
      "Content-Type": file.contentType || "application/octet-stream",
      "Content-Length": String(file.byteSize),
      "Content-Disposition": `attachment; filename="${file.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
