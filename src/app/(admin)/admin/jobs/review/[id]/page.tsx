import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function formatDate(value: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

function formatSalary(min: number | null, max: number | null, type: string | null) {
  if ((min ?? 0) <= 0 && (max ?? 0) <= 0) return "Not disclosed";
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  return `${formatter.format(min ?? 0)} - ${formatter.format(max ?? 0)}${type ? ` / ${type}` : ""}`;
}

export default async function AdminJobPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = getSupabaseAdminClient();
  const { id } = await params;

  if (!admin) {
    notFound();
  }

  const { data } = await admin
    .from("jobs")
    .select(
      "id, slug, title, company_name, description, responsibilities, requirements, skills, city, state, salary_min, salary_max, salary_type, experience_required, education_required, source_url, application_url, created_at, status, approval_status, is_featured, is_verified, suspicious_flags, moderation_notes, published_at",
    )
    .eq("id", id)
    .maybeSingle();

  const job = data as {
    id: string;
    slug: string;
    title: string;
    company_name: string;
    description: string;
    responsibilities: string[] | null;
    requirements: string[] | null;
    skills: string[] | null;
    city: string | null;
    state: string | null;
    salary_min: number | null;
    salary_max: number | null;
    salary_type: string | null;
    experience_required: string | null;
    education_required: string | null;
    source_url: string | null;
    application_url: string | null;
    created_at: string;
    status: string;
    approval_status: string;
    is_featured: boolean;
    is_verified: boolean;
    suspicious_flags: string[] | null;
    moderation_notes: string | null;
    published_at: string | null;
  } | null;

  if (!job) {
    notFound();
  }

  const isPublic = job.status === "active" && job.approval_status === "approved";

  return (
    <DashboardShell
      role="admin"
      title="Job preview"
      description="Review the listing content exactly as moderation sees it before sending it live."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white">
            <Link href="/admin/jobs/review">Back to review queue</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white">
            <Link href={`/admin/jobs/review/${job.id}/edit`}>Edit job</Link>
          </Button>
          {isPublic ? (
            <Button asChild className="rounded-2xl">
              <Link href={`/jobs/${job.slug}`} target="_blank">Open public page</Link>
            </Button>
          ) : null}
        </div>

        <Card className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5">
          <CardHeader className="border-b border-slate-200/80">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-2xl text-slate-950">{job.title}</CardTitle>
              <Badge>{job.approval_status}</Badge>
              <Badge variant="outline">{job.status}</Badge>
              {job.is_featured ? <Badge variant="secondary">Featured</Badge> : null}
              {job.is_verified ? <Badge variant="secondary">Verified</Badge> : null}
            </div>
            <p className="text-sm text-slate-600">{job.company_name}</p>
            <p className="text-sm text-slate-500">{[job.city, job.state].filter(Boolean).join(", ") || "Location not set"}</p>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Salary</p>
                <p className="mt-2 text-sm text-slate-800">{formatSalary(job.salary_min, job.salary_max, job.salary_type)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Experience</p>
                <p className="mt-2 text-sm text-slate-800">{job.experience_required || "--"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Education</p>
                <p className="mt-2 text-sm text-slate-800">{job.education_required || "--"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Created</p>
                <p className="mt-2 text-sm text-slate-800">{formatDate(job.created_at)}</p>
                <p className="mt-1 text-xs text-slate-500">Published: {formatDate(job.published_at)}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Source URL</p>
                <p className="mt-2 break-all text-sm text-slate-800">{job.source_url || "--"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Apply URL</p>
                <p className="mt-2 break-all text-sm text-slate-800">{job.application_url || "--"}</p>
              </div>
            </div>

            {job.suspicious_flags && job.suspicious_flags.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-semibold">Risk signals</p>
                <p className="mt-2">{job.suspicious_flags.join(", ")}</p>
              </div>
            ) : null}

            {job.moderation_notes ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
                <p className="font-semibold">Moderation notes</p>
                <p className="mt-2 whitespace-pre-wrap">{job.moderation_notes}</p>
              </div>
            ) : null}

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-950">Description</h2>
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{job.description}</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-950">Responsibilities</h2>
              <ul className="space-y-2 text-sm text-slate-700">
                {(job.responsibilities ?? []).map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-950">Requirements</h2>
              <ul className="space-y-2 text-sm text-slate-700">
                {(job.requirements ?? []).map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-950">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {(job.skills ?? []).map((item) => (
                  <Badge key={item} variant="secondary">{item}</Badge>
                ))}
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
