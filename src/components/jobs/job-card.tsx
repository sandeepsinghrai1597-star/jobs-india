import Link from "next/link";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  GraduationCap,
  MapPin,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { Job, JobMatchSummary } from "@/types";
import { SaveJobButton } from "@/components/jobs/save-job-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function formatSalary(job: Job) {
  const MIN_VALID_SALARY = 1000;
  const hasValidMin = job.salaryMin >= MIN_VALID_SALARY;
  const hasValidMax = job.salaryMax >= MIN_VALID_SALARY;

  if (!hasValidMin && !hasValidMax) {
    return "As per pay scale";
  }

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  if (hasValidMin && hasValidMax) {
    return `${formatter.format(job.salaryMin)} – ${formatter.format(job.salaryMax)} / ${job.salaryType}`;
  }
  if (hasValidMax) {
    return `Up to ${formatter.format(job.salaryMax)} / ${job.salaryType}`;
  }
  return `From ${formatter.format(job.salaryMin)} / ${job.salaryType}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not specified";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(parsed));
}

function getDeadlineStatus(deadline: string | null | undefined) {
  if (!deadline) return null;
  const parsed = Date.parse(deadline);
  if (Number.isNaN(parsed)) return null;
  const diffDays = Math.ceil((parsed - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "Deadline passed", className: "bg-red-100 text-red-700 border-red-200" };
  if (diffDays <= 3) return { label: `${diffDays}d left`, className: "bg-red-100 text-red-700 border-red-200" };
  if (diffDays <= 7) return { label: `${diffDays}d left`, className: "bg-amber-100 text-amber-700 border-amber-200" };
  return null;
}

function formatPostedDate(job: Job) {
  const source = job.publishedAt ?? job.createdAt;
  const parsed = source ? Date.parse(source) : Number.NaN;

  if (Number.isNaN(parsed)) {
    return "Recently added";
  }

  const diffMs = Date.now() - parsed;
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.max(0, Math.floor(diffMs / dayMs));

  if (diffDays === 0) return "Posted today";
  if (diffDays === 1) return "Posted 1 day ago";
  if (diffDays < 30) return `Posted ${diffDays} days ago`;

  return `Posted on ${formatDate(source)}`;
}

export function JobCard({
  job,
  matchSummary = null,
  isSaved = false,
  isApplied = false,
  isSignedIn = false,
  isSessionPending = false,
}: {
  job: Job;
  matchSummary?: JobMatchSummary | null;
  isSaved?: boolean;
  isApplied?: boolean;
  isSignedIn?: boolean;
  /** See SaveJobButton — isSignedIn is not trustworthy until this is false. */
  isSessionPending?: boolean;
}) {
  const isImportedGovernmentListing =
    job.sourceType === "official" &&
    Boolean(job.sourceUrl?.includes("jobpulse.in"));
  const detailHref = isImportedGovernmentListing ? `/government-jobs/${job.slug}` : `/jobs/${job.slug}`;
  // While the session is still unknown isSignedIn is false for everyone, so the
  // signed-out branch would send an authenticated user to /login — which just
  // bounces them to their dashboard. Fall back to the detail page until we know.
  const applyHref = isSessionPending
    ? detailHref
    : isSignedIn
      ? `${detailHref}?apply=1#job-apply-panel`
      : `/login?next=${encodeURIComponent(`${detailHref}?apply=1`)}`;

  return (
    <Card className="rounded-[1.75rem] border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10">
      <CardHeader className="gap-5 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {job.featured ? (
                <Badge className="rounded-full bg-amber-500 text-slate-950">
                  <Sparkles className="size-3.5" />
                  Featured
                </Badge>
              ) : null}
              {matchSummary ? (
                <Badge className="rounded-full bg-sky-600 text-slate-950">
                  <Sparkles className="size-3.5" />
                  AI Match {matchSummary.matchScore}%
                </Badge>
              ) : null}
              {job.officialVerified ? (
                <Badge variant="secondary" className="rounded-full bg-emerald-50 text-emerald-700">
                  <BadgeCheck className="size-3.5" />
                  Verified
                </Badge>
              ) : null}
              <Badge variant="outline" className="rounded-full capitalize">
                {job.jobType}
              </Badge>
              <Badge variant="outline" className="rounded-full capitalize">
                {job.workMode}
              </Badge>
              {isApplied ? (
                <Badge className="rounded-full bg-emerald-600 text-white">Applied</Badge>
              ) : null}
            </div>

            <div className="space-y-2">
              <CardTitle className="text-xl text-slate-950">
                <Link href={detailHref} className="hover:text-primary">
                  {job.title}
                </Link>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                <p className="flex items-center gap-2">
                  <Building2 className="size-4" />
                  {job.companyName}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="size-4" />
                  {job.city === job.state ? job.city : `${job.city}, ${job.state}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-800">
            {job.companyLogo}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
          <p className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2">
            <Wallet className="size-4 text-slate-500" />
            {formatSalary(job)}
          </p>
          <p className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2">
            <BriefcaseBusiness className="size-4 text-slate-500" />
            {job.experienceRequired}
          </p>
          <p className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2">
            <GraduationCap className="size-4 text-slate-500" />
            {job.educationRequired}
          </p>
          <p className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2">
            <CalendarClock className="size-4 text-slate-500" />
            {formatPostedDate(job)}
          </p>
          <p className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 sm:col-span-2 xl:col-span-2">
            <CalendarClock className="size-4 text-slate-500" />
            Deadline: {formatDate(job.applicationDeadline)}
            {(() => {
              const status = getDeadlineStatus(job.applicationDeadline);
              return status ? (
                <span className={`ml-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${status.className}`}>
                  {status.label}
                </span>
              ) : null;
            })()}
          </p>
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-slate-600">{job.description}</p>

        <div className="flex flex-wrap gap-2">
          {job.skills.slice(0, 8).map((skill) => (
            <Badge key={skill} variant="secondary" className="rounded-full px-3 py-1">
              {skill}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t border-slate-100 bg-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {job.sourceName ? <span>Source: {job.sourceName}</span> : null}
          {job.sourceName && job.officialVerified ? <span>•</span> : null}
          {job.officialVerified ? <span>Officially verified source</span> : null}
        </div>

        <div className="flex w-full flex-wrap gap-3 sm:w-auto sm:justify-end">
          <SaveJobButton
            jobIdentifier={job.slug}
            isInitiallySaved={isSaved}
            isSessionPending={isSessionPending}
            loginRedirectTo={`/login?next=${encodeURIComponent(detailHref)}`}
            compact
          />
          {/* The apply target depends on the session, so keep it inert (a plain
              button, not a link) until personalization settles. */}
          {isSessionPending && !isImportedGovernmentListing ? (
            <Button className="rounded-full" variant={isApplied ? "outline" : "default"} disabled>
              Apply
            </Button>
          ) : (
            <Button asChild className="rounded-full" variant={isApplied ? "outline" : "default"}>
              <Link href={isImportedGovernmentListing ? detailHref : isApplied ? detailHref : applyHref}>
                {isImportedGovernmentListing ? "View details" : isApplied ? "View application" : "Apply"}
              </Link>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
