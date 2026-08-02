import Link from "next/link";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

export default async function CandidateApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let applications: Array<{
    id: string;
    status: string;
    applied_at: string;
    jobs: {
      slug: string;
      title: string;
      company_name: string;
      city: string | null;
      state: string | null;
    } | null;
  }> = [];

  if (user) {
    const { data: profile } = await supabase
      .from("candidate_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.id) {
      const { data } = await supabase
        .from("applications")
        .select(
          "id, status, applied_at, jobs:job_id (slug, title, company_name, city, state)",
        )
        .eq("candidate_id", profile.id)
        .order("applied_at", { ascending: false });

      applications = (data as typeof applications | null) ?? [];
    }
  }

  return (
    <DashboardShell
      role="candidate"
      title="Applications tracker"
      description="Track applications, status movement, and the jobs you have already submitted."
    >
      <div className="grid gap-4">
        {applications.length > 0 ? (
          applications.map((application) => (
            <Card key={application.id} className="rounded-[1.75rem] border-slate-200 bg-slate-100 backdrop-blur">
              <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-slate-900">
                    {application.jobs?.title ?? "Job unavailable"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {application.jobs?.company_name ?? "Unknown company"}
                    {application.jobs?.city ? ` • ${application.jobs.city}` : ""}
                    {application.jobs?.state ? `, ${application.jobs.state}` : ""}
                  </p>
                  <p className="text-xs uppercase tracking-[0.16em] text-primary">
                    {application.status}
                  </p>
                </div>
                {application.jobs?.slug ? (
                  <Link
                    href={`/jobs/${application.jobs.slug}`}
                    className="text-sm font-semibold text-primary"
                  >
                    View job
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          ))
        ) : (
            <Card className="rounded-[1.75rem] border-slate-200 bg-slate-100 backdrop-blur">
              <CardContent className="p-6 text-sm leading-6 text-muted-foreground">
              No applications yet. Start applying from job detail pages and your tracker will show
              updates here.
              </CardContent>
            </Card>
          )}
      </div>
    </DashboardShell>
  );
}
