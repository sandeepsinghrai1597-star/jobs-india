import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  FileText,
  Heart,
  MessageCircle,
  Pencil,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { SaveJobButton } from "@/components/jobs/save-job-button";
import { getJobInteractionState } from "@/lib/jobs/interactions";
import { dbRowToJob, type SupabaseJobRow } from "@/lib/jobs/live";
import { getDiscoveredJobsForCandidate } from "@/lib/candidate/matching";
import {
  calculateProfileCompletion,
  getEmptyCandidateProfile,
  mapCandidateProfileRow,
} from "@/lib/candidate/profile";
import { searchUnifiedJobs } from "@/lib/jobs/search";
import { buildMetadata } from "@/lib/seo";
import { buildResumeDownloadHref } from "@/lib/resumes/storage";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DbRow } from "@/lib/db/mysql";

export const metadata = buildMetadata({
  title: "Candidate Dashboard",
  description: "Track resumes, applications, saved jobs, interviews, and AI recommendations.",
  path: "/dashboard",
});

const profileSelect = `
  id,
  user_id,
  full_name,
  phone,
  headline,
  bio,
  education,
  skills,
  experience,
  city,
  state,
  preferred_roles,
  expected_salary,
  preferred_job_types,
  language_preference,
  resume_url,
  verified,
  verification_status,
  verification_requested_at,
  verified_at,
  updated_at
`;

const jobSelect = `
  id,
  slug,
  category_slug,
  title,
  company_name,
  description,
  responsibilities,
  requirements,
  skills,
  salary_min,
  salary_max,
  salary_type,
  city,
  state,
  country,
  job_type,
  work_mode,
  education_required,
  experience_required,
  industry,
  status,
  application_url,
  deadline,
  source_type,
  source_url,
  created_at,
  updated_at
`;

const applicationStatuses = [
  "applied",
  "viewed",
  "shortlisted",
  "interview",
  "rejected",
  "offered",
] as const;

type ApplicationStatus = (typeof applicationStatuses)[number];

type ApplicationRow = {
  id: string;
  status: ApplicationStatus;
  applied_at: string;
  updated_at: string;
  jobs: {
    slug: string;
    title: string;
    company_name: string;
    city: string | null;
    state: string | null;
  } | null;
};

type ResumeRow = {
  id: string;
  title: string;
  storage_path: string | null;
  ats_score: number | null;
  updated_at: string;
};

type ResumeAnalysisRow = {
  score: number | null;
  match_score: number | null;
  missing_keywords: string[];
  created_at: string;
};

type WhatsAppSubscriptionRow = {
  phone_number: string;
  city: string | null;
  category_slug: string | null;
  is_opted_in: boolean;
  status: string;
  updated_at: string;
};

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "Not updated yet";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatLocation(job: Pick<Job, "city" | "state" | "location">) {
  return job.location || [job.city, job.state].filter(Boolean).join(", ") || "India";
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Briefcase;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex min-h-44 flex-col items-start justify-center gap-4 rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-6">
      <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-slate-950">{title}</p>
        <p className="text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action ? (
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  title: string;
  icon: typeof Briefcase;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={`rounded-[1.75rem] border border-slate-100 bg-white shadow-sm backdrop-blur ${className}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Icon className="size-4" />
          </div>
          <CardTitle className="truncate text-lg text-slate-950">{title}</CardTitle>
        </div>
        {action ? (
          <Button asChild variant="ghost" size="sm" className="shrink-0 rounded-xl">
            <Link href={action.href}>
              {action.label}
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function CompactJobCard({
  job,
  isSaved = false,
  isSignedIn = false,
  showSaveAction = false,
}: {
  job: Job;
  isSaved?: boolean;
  isSignedIn?: boolean;
  showSaveAction?: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm transition hover:border-cyan-400/25 hover:shadow-[0_12px_28px_-22px_rgba(0,255,204,0.28)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full capitalize">
              {job.workMode}
            </Badge>
            <Badge variant="secondary" className="rounded-full capitalize">
              {job.jobType}
            </Badge>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-950">{job.title}</h3>
            <p className="text-sm text-slate-500">
              {job.companyName} • {formatLocation(job)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {job.skills.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="outline" className="rounded-full">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {showSaveAction ? (
            <SaveJobButton
              jobIdentifier={job.slug}
              isInitiallySaved={isSaved}
              isSignedIn={isSignedIn}
              loginRedirectTo={`/login?next=/jobs/${job.slug}`}
            />
          ) : null}
          <Button asChild size="sm" className="rounded-xl">
            <Link href={`/jobs/${job.slug}`}>
              Apply
              <Send className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default async function CandidateDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = getEmptyCandidateProfile();
  let savedJobs: Job[] = [];
  let applications: ApplicationRow[] = [];
  let resumes: ResumeRow[] = [];
  let latestAnalysis: ResumeAnalysisRow | null = null;
  let whatsappSubscription: WhatsAppSubscriptionRow | null = null;

  if (user) {
    const { data: profileData } = await supabase
      .from("candidate_profiles")
      .select(profileSelect)
      .eq("user_id", user.id)
      .maybeSingle();

    profile = mapCandidateProfileRow(profileData);

    const [savedJobsResult, resumesResult, analysisResult, whatsappResult] = await Promise.all([
      supabase
        .from("saved_jobs")
        .select(`jobs:job_id (${jobSelect})`)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("resumes")
        .select("id, title, storage_path, ats_score, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(3),
      supabase
        .from("resume_analyses")
        .select("score, match_score, missing_keywords, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("whatsapp_subscriptions")
        .select("phone_number, city, category_slug, is_opted_in, status, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    savedJobs =
      savedJobsResult.data
        ?.map((item: DbRow) => item.jobs)
        .filter(Boolean)
        .map((job: DbRow) => dbRowToJob(job as unknown as SupabaseJobRow)) ?? [];

    resumes = (resumesResult.data as ResumeRow[] | null) ?? [];
    latestAnalysis = (analysisResult.data as ResumeAnalysisRow | null) ?? null;
    whatsappSubscription = (whatsappResult.data as WhatsAppSubscriptionRow | null) ?? null;

    if (profile.id) {
      const { data } = await supabase
        .from("applications")
        .select("id, status, applied_at, updated_at, jobs:job_id (slug, title, company_name, city, state)")
        .eq("candidate_id", profile.id)
        .order("updated_at", { ascending: false })
        .limit(5);

      applications = (data as ApplicationRow[] | null) ?? [];
    }
  }

  const allJobs = await searchUnifiedJobs({});
  const discoveredJobs = getDiscoveredJobsForCandidate(profile, allJobs).slice(0, 3);
  const recommendedJobs = discoveredJobs.length > 0 ? discoveredJobs : allJobs.slice(0, 3);
  const recommendedInteractions = await getJobInteractionState(recommendedJobs.map((job) => job.id));
  const completion = calculateProfileCompletion(profile);
  const careerAgentMissingContext = [
    !profile.education ? "education" : "",
    profile.skills.length === 0 ? "skills" : "",
    !profile.city ? "city" : "",
    !profile.experience ? "experience" : "",
    profile.preferredRoles.length === 0 ? "preferred role" : "",
    !profile.expectedSalary ? "salary expectation" : "",
  ].filter(Boolean);
  const resumeScore = resumes[0]?.ats_score ?? latestAnalysis?.score ?? null;
  const applicationsByStatus = applicationStatuses.map((status) => ({
    status,
    count: applications.filter((application) => application.status === status).length,
  }));
  const profileTitle = profile.headline || profile.preferredRoles[0] || "Candidate";
  const profileLocation = [profile.city, profile.state].filter(Boolean).join(", ") || "India";
  const profileInitials =
    profile.fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "JP";
  const featuredApplications = applications.slice(0, 2);

  return (
    <DashboardShell
      role="candidate"
      title="Candidate dashboard"
      description="Manage profile strength, resumes, applications, saved jobs, alerts, and AI career tools from one place."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="space-y-6">
          <section className="jp-panel overflow-hidden border-[rgba(255,45,120,0.35)] p-5 sm:p-6">
            <div className="flex flex-col gap-5 text-center sm:text-left">
              <div className="mx-auto flex size-24 items-center justify-center rounded-full border border-[rgba(255,45,120,0.4)] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),rgba(255,45,120,0.12)_55%,rgba(255,255,255,0.85))] text-3xl font-bold text-slate-950 shadow-md sm:mx-0">
                {profileInitials}
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <h2 className="font-heading text-3xl font-semibold text-slate-950">
                    {profile.fullName || "Complete your profile"}
                  </h2>
                  <Badge className="rounded-full">{profileTitle}</Badge>
                </div>
                <p className="mx-auto max-w-xl text-sm leading-7 text-slate-600 sm:mx-0">
                  {profile.bio ||
                    "AI-driven job seeker profile optimized for faster discovery, stronger applications, and recruiter-ready positioning across India."}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-800 sm:justify-start">
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1">
                  {profileLocation}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                  Open to {profile.preferredJobTypes[0] || "Remote"}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-primary">
                  {profile.verified ? "Premium Member" : titleCase(profile.verificationStatus)}
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="flex-1">
                  <Link href="/dashboard/profile">
                    <Pencil className="size-4" />
                    Edit Profile
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/dashboard/resumes">View Resume</Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="jp-panel p-5 sm:p-6">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h3 className="font-heading text-2xl font-semibold text-primary jp-neon-text">
                  Application Pipeline
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Track your recruitment progress across {applications.length || 0} active applications.
                </p>
              </div>
              <div className="text-right text-xs uppercase tracking-[0.18em] text-slate-500">
                Sort by:
                <div className="mt-1 font-semibold text-primary">Recent</div>
              </div>
            </div>

            {featuredApplications.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {featuredApplications.map((application) => (
                  <Link
                    key={application.id}
                    href={application.jobs?.slug ? `/jobs/${application.jobs.slug}` : "/dashboard/applications"}
                    className="jp-panel-soft block border-slate-100 p-4 transition hover:border-primary/35"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-950">{application.jobs?.title ?? "Job unavailable"}</p>
                        <p className="text-sm text-slate-500">
                          {application.jobs?.company_name ?? "Unknown company"}
                          {application.jobs?.city ? ` • ${application.jobs.city}` : ""}
                        </p>
                      </div>
                      <Badge className="rounded-full">{titleCase(application.status)}</Badge>
                    </div>
                    <div className="mt-5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <span>Status: {titleCase(application.status)}</span>
                        <span>
                          {application.status === "offered"
                            ? "100%"
                            : application.status === "interview"
                              ? "75%"
                              : application.status === "shortlisted"
                                ? "60%"
                                : application.status === "viewed"
                                  ? "35%"
                                  : "20%"}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white">
                        <div
                          className="h-2 rounded-full bg-[linear-gradient(90deg,#00ffcc,#ff2d78)]"
                          style={{
                            width:
                              application.status === "offered"
                                ? "100%"
                                : application.status === "interview"
                                  ? "75%"
                                  : application.status === "shortlisted"
                                    ? "60%"
                                    : application.status === "viewed"
                                      ? "35%"
                                      : "20%",
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="No applications yet"
                description="Apply to roles from search or AI recommendations and your live pipeline will appear here."
                action={{ href: "/jobs", label: "Start applying" }}
              />
            )}
          </section>

          <section className="space-y-5">
            <div>
              <h3 className="font-heading text-2xl font-semibold text-slate-950">AI Talent Insights</h3>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="jp-panel p-5">
                <Badge variant="outline" className="border-primary/35 text-primary">
                  Market snapshot
                </Badge>
                <p className="mt-4 text-3xl font-semibold text-slate-950">
                  Your profile is at {Math.max(5, 100 - completion)}% readiness.
                </p>
                <div className="mt-5 flex items-end justify-between gap-4">
                  <div className="flex items-end gap-2">
                    {[32, 48, 42, 66, 54].map((value, index) => (
                      <span
                        key={value + index}
                        className={cn(
                          "w-4 rounded-t-md bg-primary/70",
                          index === 3 ? "shadow-md" : "",
                        )}
                        style={{ height: `${value}px` }}
                      />
                    ))}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-primary">
                      {profile.expectedSalary || "₹6L - ₹18L"}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Estimated market value
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-primary px-5 py-6 text-primary-foreground shadow-lg">
                <Badge variant="secondary" className="border-slate-300 bg-black/20 text-white">
                  Skill gap analysis
                </Badge>
                <p className="mt-4 text-3xl font-semibold">
                  Learn one key skill to unlock stronger matches.
                </p>
                <p className="mt-3 text-sm leading-7 text-black/75">
                  {careerAgentMissingContext.length > 0
                    ? `Focus next on ${careerAgentMissingContext.slice(0, 2).join(" and ")} to increase your application quality.`
                    : "Your profile already has strong context. Use the career agent to refine targeting and interview preparation."}
                </p>
                <Button asChild variant="secondary" className="mt-6 bg-black text-white hover:bg-black/85">
                  <Link href="/learning-roadmap">Explore Courses</Link>
                </Button>
              </div>
            </div>
          </section>

          <SectionCard
            title="Recommended jobs"
            icon={Sparkles}
            action={{ href: "/jobs", label: "Browse jobs" }}
          >
            {recommendedJobs.length > 0 ? (
              <div className="grid gap-3">
                {recommendedJobs.map((job) => (
                  <CompactJobCard
                    key={job.id}
                    job={job}
                    showSaveAction
                    isSaved={recommendedInteractions.stateByJobId.get(job.id)?.isSaved ?? false}
                    isSignedIn={recommendedInteractions.isSignedIn}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Briefcase}
                title="No recommendations yet"
                description="Add your city, skills, and preferred roles to unlock sharper matches."
                action={{ href: "/dashboard/profile", label: "Update profile" }}
              />
            )}
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Saved jobs"
              icon={Heart}
              action={{ href: "/dashboard/saved-jobs", label: "View all" }}
            >
              {savedJobs.length > 0 ? (
                <div className="space-y-3">
                  {savedJobs.map((job) => (
                    <CompactJobCard key={job.id} job={job} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Heart}
                  title="No saved jobs"
                  description="Save roles from recommendations or job search to build a focused shortlist."
                  action={{ href: "/jobs", label: "Find jobs" }}
                />
              )}
            </SectionCard>

            <SectionCard
              title="Application status"
              icon={CalendarCheck}
              action={{ href: "/dashboard/applications", label: "Open tracker" }}
            >
              <div className="grid gap-3">
                {applicationsByStatus.map(({ status, count }) => (
                  <div
                    key={status}
                    className="rounded-[1.25rem] border border-slate-100 bg-white px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-800">{titleCase(status)}</p>
                      <Badge className="rounded-full">{count === 1 ? "1 role" : `${count} roles`}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Resume"
            icon={FileText}
            action={{ href: "/dashboard/resumes", label: "Manage" }}
          >
            {resumes.length > 0 || profile.resumeUrl ? (
              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-slate-950">
                        {resumes[0]?.title ?? "Profile resume"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Updated {formatDate(resumes[0]?.updated_at ?? profile.updatedAt)}
                      </p>
                    </div>
                    <Badge variant={resumeScore ? "default" : "outline"} className="rounded-full">
                      {resumeScore ? `${resumeScore}/100` : "Not scored"}
                    </Badge>
                  </div>
                </div>
                {resumes[0]?.storage_path ? (
                  <Button asChild variant="outline" className="w-full rounded-xl">
                    <a
                      href={buildResumeDownloadHref({ resumeId: resumes[0].id })}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileText className="size-4" />
                      Download latest resume
                    </a>
                  </Button>
                ) : null}
                <Button asChild className="w-full rounded-xl">
                  <Link href="/resume-analyzer">
                    <Sparkles className="size-4" />
                    View resume score
                  </Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                icon={Upload}
                title="No resume uploaded"
                description="Upload or build a resume, then analyze it for ATS and recruiter readiness."
                action={{ href: "/dashboard/resumes", label: "Upload resume" }}
              />
            )}
          </SectionCard>

          <SectionCard title="AI career assistant" icon={Bot}>
            <p className="text-sm leading-6 text-muted-foreground">
              Get role suggestions, verified job matches, skill gaps, salary guidance, and a 7-day action plan.
            </p>
            <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
              <p className="text-sm font-medium text-slate-950">
                {careerAgentMissingContext.length > 0 ? "Missing context" : "Ready for AI guidance"}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {careerAgentMissingContext.length > 0
                  ? careerAgentMissingContext.join(", ")
                  : "Your profile has the required career-agent context."}
              </p>
            </div>
            <Button asChild className="w-full rounded-xl">
              <Link href="/ai-career-agent">
                <Bot className="size-4" />
                Open assistant
              </Link>
            </Button>
          </SectionCard>

          <SectionCard title="Interview prep" icon={MessageCircle}>
            <p className="text-sm leading-6 text-muted-foreground">
              Practice role-specific questions and review your answers before shortlisted interviews.
            </p>
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link href="/dashboard/interviews">
                <MessageCircle className="size-4" />
                Start practice
              </Link>
            </Button>
          </SectionCard>

          <SectionCard title="WhatsApp alerts" icon={Bell}>
            <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-950">
                    {whatsappSubscription?.is_opted_in ? "Alerts enabled" : "Alerts not enabled"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {whatsappSubscription?.phone_number ?? profile.phone ?? "Add a phone number"}
                  </p>
                </div>
                <Badge variant={whatsappSubscription?.is_opted_in ? "default" : "outline"} className="rounded-full">
                  {whatsappSubscription?.status ? titleCase(whatsappSubscription.status) : "Off"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {whatsappSubscription?.city
                  ? `Job alerts for ${whatsappSubscription.city}`
                  : "Choose city and category preferences to receive matching jobs."}
              </p>
            </div>
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link href="/dashboard/profile">
                <Bell className="size-4" />
                Manage alerts
              </Link>
            </Button>
          </SectionCard>

          <SectionCard
            title="Learning roadmap"
            icon={BookOpen}
            action={{ href: "/dashboard/roadmap", label: "View" }}
          >
            <div className="space-y-3">
              {[
                "Refresh resume keywords",
                "Close top skill gap",
                "Practice interview answers",
              ].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-[1.25rem] bg-slate-50 p-3.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-sm text-slate-800">{item}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Subscription" icon={Briefcase}>
            <div className="rounded-[1.5rem] border border-emerald-200 bg-[linear-gradient(180deg,#ecfdf5_0%,#dffaf0_100%)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-emerald-900">Free candidate plan</p>
                  <p className="text-sm leading-6 text-emerald-800">
                    Job search, saved jobs, applications, and core AI tools are active.
                  </p>
                </div>
                <Badge className="rounded-full bg-emerald-600 text-white">Active</Badge>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link href="/pricing">Compare plans</Link>
            </Button>
          </SectionCard>
        </div>
      </div>
    </DashboardShell>
  );
}

