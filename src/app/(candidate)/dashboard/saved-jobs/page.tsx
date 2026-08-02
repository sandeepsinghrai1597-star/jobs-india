import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { JobCard } from "@/components/jobs/job-card";
import { getJobInteractionState } from "@/lib/jobs/interactions";
import { dbRowToJob, type SupabaseJobRow } from "@/lib/jobs/live";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import type { DbRow } from "@/lib/db/mysql";

export default async function CandidateSavedJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let savedJobs: ReturnType<typeof dbRowToJob>[] = [];

  if (user) {
    const { data } = await supabase
      .from("saved_jobs")
      .select(
        "jobs:job_id (id, slug, category_slug, title, company_name, description, responsibilities, requirements, skills, salary_min, salary_max, salary_type, city, state, country, job_type, work_mode, education_required, experience_required, industry, status, application_url, deadline, source_type, source_url, created_at, updated_at)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    savedJobs =
      data
        ?.map((item: DbRow) => item.jobs)
        .filter(Boolean)
        .map((job: DbRow) => dbRowToJob(job as unknown as SupabaseJobRow)) ?? [];
  }

  const interactions = await getJobInteractionState(savedJobs.map((job) => job.id));

  return (
    <DashboardShell
      role="candidate"
      title="Saved jobs"
      description="A focused shortlist for roles you want to revisit before applying."
    >
      {savedJobs.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {savedJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isSaved={interactions.stateByJobId.get(job.id)?.isSaved ?? true}
              isApplied={interactions.stateByJobId.get(job.id)?.isApplied ?? false}
              isSignedIn={interactions.isSignedIn}
            />
          ))}
        </div>
      ) : (
        <Card className="rounded-[1.75rem] border-slate-200 bg-slate-100 backdrop-blur">
          <CardContent className="p-6 text-sm leading-6 text-muted-foreground">
            You have not saved any jobs yet. Browse jobs and save strong matches to build your
            shortlist.
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}
