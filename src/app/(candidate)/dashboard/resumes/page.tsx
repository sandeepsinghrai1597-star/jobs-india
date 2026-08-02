import Link from "next/link";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildResumeDownloadHref } from "@/lib/resumes/storage";
import { createClient } from "@/lib/supabase/server";

export default async function CandidateResumesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let resumes: Array<{
    id: string;
    title: string;
    updated_at: string;
    storage_path: string | null;
    template_key: string | null;
  }> = [];

  if (user?.id) {
    const { data } = await supabase
      .from("resumes")
      .select("id, title, template_key, updated_at, storage_path")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    resumes = data ?? [];
  }

  return (
    <DashboardShell
      role="candidate"
      title="Resume library"
      description="Manage uploaded resumes, created resumes, ATS scores, and export/download actions."
    >
      <Card className="rounded-[1.75rem] border-slate-200 bg-slate-100 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-slate-950">Saved resumes</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Resume builder drafts are stored as structured JSON so you can keep refining and
              exporting them later.
            </p>
          </div>
          <Button asChild>
            <Link href="/resume-builder">Build resume</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 p-6 pt-0">
          {resumes.length > 0 ? (
            resumes.map((resume) => (
              <div
                key={resume.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800"
              >
                <p className="font-medium text-slate-950">{resume.title}</p>
                <p className="mt-1 text-slate-500">
                  Template: {resume.template_key ?? "fresher"}
                </p>
                <p className="mt-1 text-slate-500">Updated {resume.updated_at}</p>
                {resume.storage_path ? (
                  <Button asChild size="sm" variant="secondary" className="mt-3">
                    <a href={buildResumeDownloadHref({ resumeId: resume.id })} target="_blank" rel="noreferrer">
                      Download
                    </a>
                  </Button>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm leading-6 text-muted-foreground">
              No saved resumes yet. Start in the resume builder and your drafts will appear here.
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
