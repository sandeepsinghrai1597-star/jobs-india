import { NextResponse } from "next/server";
import { recordAnalyticsEvent } from "@/lib/analytics/server";
import { createClient } from "@/lib/supabase/server";
import { resumeBuilderSchema } from "@/lib/resume/schema";
import type { DbRow } from "@/lib/db/mysql";

async function getResumeSummaries(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("id, title, template_key, storage_path, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item: DbRow) => ({
    id: item.id,
    title: item.title,
    templateKey: item.template_key ?? "fresher",
    hasFile: Boolean(item.storage_path),
    updatedAt: item.updated_at,
  }));
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ resumes: [] });
  }

  try {
    const resumes = await getResumeSummaries(user.id);
    return NextResponse.json({ resumes });
  } catch {
    return NextResponse.json({ message: "Could not load resumes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json(
      { message: "Sign in to save resumes to your account." },
      { status: 401 },
    );
  }

  const body = await request.json();
  const parsed = resumeBuilderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Resume data is incomplete.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const isNewResume = !payload.id;
  const resumeValues = {
    user_id: user.id,
    title: payload.title,
    template_key: payload.templateKey,
    content_json: payload,
    updated_at: new Date().toISOString(),
  };

  try {
    if (payload.id) {
      const { error } = await supabase
        .from("resumes")
        .update(resumeValues)
        .eq("id", payload.id)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }
    } else {
      const { data, error } = await supabase
        .from("resumes")
        .insert(resumeValues)
        .select("id")
        .single();

      if (error || !data) {
        throw error ?? new Error("Resume was not created.");
      }

      payload.id = data.id;
    }

    if (isNewResume) {
      await recordAnalyticsEvent({
        userId: user.id,
        eventName: "resume_upload",
        eventData: {
          resumeId: payload.id ?? null,
          title: payload.title,
          templateKey: payload.templateKey,
        },
      });
    }

    const resumes = await getResumeSummaries(user.id);

    return NextResponse.json({
      resume: {
        id: payload.id,
        updatedAt: resumeValues.updated_at,
      },
      resumes,
    });
  } catch {
    return NextResponse.json({ message: "Could not save resume." }, { status: 500 });
  }
}
