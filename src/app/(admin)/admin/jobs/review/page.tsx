import Link from "next/link";
import {
  approveJobAction,
  bulkReviewJobsAction,
  deleteJobAction,
  expireJobAction,
  markJobVerifiedAction,
  rejectJobAction,
  toggleFeaturedJobAction,
} from "@/app/(admin)/admin/actions";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getJobsReviewCounts,
  getJobsReviewPage,
  parseJobReviewTab,
  type AdminJobReviewTab,
} from "@/lib/admin/dashboard";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const tabLabels: Record<AdminJobReviewTab, string> = {
  pending: "Pending",
  active: "Active",
  rejected: "Rejected",
  flagged: "Flagged",
  expired: "Expired",
};

function buildReviewHref(tab: AdminJobReviewTab, q = "", page = 1) {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (q.trim()) params.set("q", q.trim());
  if (page > 1) params.set("page", String(page));
  return `/admin/jobs/review?${params.toString()}`;
}

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

function statusVariant(status: string) {
  if (["active", "approved", "verified"].includes(status)) return "default" as const;
  if (["pending"].includes(status)) return "secondary" as const;
  if (["rejected", "expired"].includes(status)) return "destructive" as const;
  return "outline" as const;
}

function parseValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminJobReviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tab = parseJobReviewTab(params.tab);
  const q = parseValue(params.q).trim();
  const pageValue = Number.parseInt(parseValue(params.page), 10);
  const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
  const [counts, jobs] = await Promise.all([
    getJobsReviewCounts(),
    getJobsReviewPage({ tab, q, page }),
  ]);

  const totalPages = Math.max(1, Math.ceil(jobs.total / jobs.pageSize));
  const currentPage = Math.min(jobs.page, totalPages);
  const returnTo = buildReviewHref(tab, q, currentPage);

  return (
    <DashboardShell
      role="admin"
      title="Job review queue"
      description="Moderate pending submissions, live listings, flagged risk cases, and expired inventory from one admin surface."
    >
      <div className="space-y-6">
        <Card className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5">
          <CardHeader className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(59,130,246,0.03)_60%,rgba(255,255,255,0.96)_100%)]">
            <CardTitle>Review lanes</CardTitle>
            <CardDescription>Switch between moderation states and work the queue with bulk actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-wrap gap-3">
              {(Object.keys(tabLabels) as AdminJobReviewTab[]).map((item) => (
                <Link
                  key={item}
                  href={buildReviewHref(item, q)}
                  className={`rounded-2xl border px-4 py-3 text-sm transition ${
                    item === tab
                      ? "border-slate-950 bg-slate-100 text-slate-950"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300 hover:bg-white"
                  }`}
                >
                  <span className="font-semibold">{tabLabels[item]}</span>
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${item === tab ? "bg-slate-100 text-slate-950" : "bg-slate-200 text-slate-700"}`}>
                    {counts[item]}
                  </span>
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <form action="/admin/jobs/review" className="flex flex-1 flex-wrap gap-3">
                <input type="hidden" name="tab" value={tab} />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search by role, company, city, or URL"
                  className="h-11 min-w-[280px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                />
                <Button type="submit" className="h-11 rounded-2xl bg-slate-100 px-5 text-slate-950 hover:bg-slate-800">
                  Search
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white">
                  <Link href={buildReviewHref(tab)}>Reset</Link>
                </Button>
              </form>

              <Button asChild variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white">
                <Link href="/admin/jobs/new">New job</Link>
              </Button>
            </div>

            <form id="bulk-review-form" action={bulkReviewJobsAction} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input type="hidden" name="returnTo" value={returnTo} />
              <Button name="bulkAction" value="approve" type="submit" className="rounded-xl">
                Approve selected
              </Button>
              <Button name="bulkAction" value="reject" type="submit" variant="outline" className="rounded-xl border-slate-300 bg-white">
                Reject selected
              </Button>
              <Button name="bulkAction" value="delete" type="submit" variant="destructive" className="rounded-xl">
                Delete selected
              </Button>
              <p className="text-sm text-slate-500">Use the checkboxes on each card to build a bulk selection.</p>
            </form>
          </CardContent>
        </Card>

        {jobs.rows.length === 0 ? (
          <Card className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50/80">
            <CardContent className="px-5 py-12 text-center">
              <p className="text-base font-semibold text-slate-900">No jobs in this lane</p>
              <p className="mt-2 text-sm text-slate-500">Try another tab or widen the search query.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.rows.map((job) => (
              <Card key={job.id} className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5">
                <CardContent className="space-y-5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <input
                        form="bulk-review-form"
                        type="checkbox"
                        name="jobIds"
                        value={job.id}
                        className="mt-1 size-4 rounded border-slate-300"
                      />
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold text-slate-950">{job.title}</h2>
                          <Badge variant={statusVariant(job.approval_status)}>{job.approval_status}</Badge>
                          <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                          {job.is_featured ? <Badge>Featured</Badge> : null}
                          {job.is_verified ? <Badge variant="secondary">Verified</Badge> : null}
                          {job.is_suspicious ? <Badge variant="outline">Flagged</Badge> : null}
                        </div>
                        <p className="text-base text-slate-700">{job.company_name}</p>
                        <p className="text-sm text-slate-500">{[job.city, job.state].filter(Boolean).join(", ") || "Location not set"}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline" className="rounded-xl">
                        <Link href={`/admin/jobs/review/${job.id}`}>Preview</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="rounded-xl">
                        <Link href={`/admin/jobs/review/${job.id}/edit`}>Edit</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Salary</p>
                      <p className="mt-2 text-sm text-slate-800">{formatSalary(job.salary_min, job.salary_max, job.salary_type)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Experience</p>
                      <p className="mt-2 text-sm text-slate-800">
                        {job.experience_required || [job.experience_min, job.experience_max].filter((value) => value != null).join(" - ") || "Not specified"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Created</p>
                      <p className="mt-2 text-sm text-slate-800">{formatDate(job.created_at)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Source</p>
                      <p className="mt-2 truncate text-sm text-slate-800">{job.source_url || "--"}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Apply URL</p>
                      <p className="mt-2 break-all text-sm text-slate-800">{job.application_url || "--"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Expiry</p>
                      <p className="mt-2 text-sm text-slate-800">{formatDate(job.expires_at)}</p>
                    </div>
                  </div>

                  {job.suspicious_flags.length > 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                      <p className="font-semibold">Risk signals</p>
                      <p className="mt-2">{job.suspicious_flags.join(", ")}</p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <form action={approveJobAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <Button size="sm" className="rounded-xl">Approve</Button>
                    </form>
                    <form action={rejectJobAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <Button size="sm" variant="destructive" className="rounded-xl">Reject</Button>
                    </form>
                    <form action={toggleFeaturedJobAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="nextValue" value={String(!job.is_featured)} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <Button size="sm" variant="outline" className="rounded-xl border-slate-300 bg-white">
                        {job.is_featured ? "Unfeature" : "Mark featured"}
                      </Button>
                    </form>
                    <form action={markJobVerifiedAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <Button size="sm" variant="outline" className="rounded-xl border-slate-300 bg-white">
                        Mark verified
                      </Button>
                    </form>
                    <form action={expireJobAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <Button size="sm" variant="outline" className="rounded-xl border-slate-300 bg-white">
                        Expire
                      </Button>
                    </form>
                    <form action={deleteJobAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <Button size="sm" variant="destructive" className="rounded-xl">
                        Delete
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex flex-col gap-3 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Page {currentPage} of {totalPages} with {jobs.total} matching jobs
              </p>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" className="rounded-xl border-slate-200 bg-white">
                  <Link
                    href={buildReviewHref(tab, q, Math.max(1, currentPage - 1))}
                    aria-disabled={currentPage === 1}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  >
                    Previous
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl border-slate-200 bg-white">
                  <Link
                    href={buildReviewHref(tab, q, Math.min(totalPages, currentPage + 1))}
                    aria-disabled={currentPage >= totalPages}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                  >
                    Next
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
