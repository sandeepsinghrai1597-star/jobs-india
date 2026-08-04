import { NextResponse } from "next/server";
import { recordAnalyticsEvent } from "@/lib/analytics/server";
import {
  buildResumeStoragePath,
  isAllowedResumeMimeType,
  isSafeResumeFileName,
  MAX_RESUME_FILE_SIZE_BYTES,
} from "@/lib/resumes/storage";
import { saveResumeFile } from "@/lib/resumes/file-store";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json(
      { message: "Please sign in to upload a resume." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const requestedTitle = String(formData.get("title") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Choose a resume file to upload." }, { status: 400 });
  }

  if (!isSafeResumeFileName(file.name)) {
    return NextResponse.json(
      { message: "Use a safe file name with letters, numbers, spaces, dots, dashes, or underscores." },
      { status: 400 },
    );
  }

  if (!isAllowedResumeMimeType(file.type)) {
    return NextResponse.json(
      { message: "Upload a PDF, DOC, or DOCX resume." },
      { status: 400 },
    );
  }

  if (file.size > MAX_RESUME_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { message: "Resume files must be 5 MB or smaller." },
      { status: 400 },
    );
  }

  const filePath = buildResumeStoragePath(user.id, file.name);
  const { error: uploadError } = await saveResumeFile({
    storagePath: filePath,
    userId: user.id,
    fileName: file.name,
    contentType: file.type,
    content: Buffer.from(await file.arrayBuffer()),
  });

  if (uploadError) {
    return NextResponse.json(
      { message: "We could not upload this resume right now." },
      { status: 500 },
    );
  }

  const title = requestedTitle || file.name.replace(/\.[^.]+$/, "") || "Uploaded resume";

  const { data: resume, error: insertError } = await supabase
    .from("resumes")
    .insert({
      user_id: user.id,
      title,
      // An uploaded file has no builder document, but content_json is NOT NULL.
      // Send it explicitly so the insert does not depend on the column default.
      content_json: {},
      storage_path: filePath,
      template_key: "uploaded",
    } as never)
    .select("id, title, storage_path, updated_at")
    .single();

  if (insertError || !resume?.id) {
    return NextResponse.json(
      { message: "Your resume uploaded, but we could not save it to your library." },
      { status: 500 },
    );
  }

  await recordAnalyticsEvent({
    userId: user.id,
    eventName: "resume_upload",
    eventData: {
      resumeId: resume.id,
      title,
      source: "job-application",
    },
  });

  return NextResponse.json({
    ok: true,
    resume: {
      id: resume.id,
      title: resume.title,
      storagePath: resume.storage_path,
      updatedAt: resume.updated_at,
    },
  });
}
