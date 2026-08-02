import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import {
  approveGovernmentJobAction,
  approveJobAction,
  banEmployerFromReportAction,
  createAdminJobAction,
  createBlogPostAction,
  createGovernmentJobAction,
  createInternshipAction,
  createSeoPageAction,
  markEmployerVerifiedAction,
  rejectGovernmentJobAction,
  rejectJobAction,
  removeFakeJobAction,
  reviewReportAction,
  toggleFeaturedJobAction,
  toggleUserBanAction,
} from "@/app/(admin)/admin/actions";
import {
  type AdminQueryState,
  type AdminSearchParams,
  type AdminSection,
  getAdminOverview,
  getAiUsagePage,
  getAnalyticsPage,
  getApplicationsPage,
  getBlogPostsPage,
  getCandidatesPage,
  getCompaniesPage,
  getEmployersPage,
  getGovernmentJobsPage,
  getInternshipsPage,
  getJobCategoryOptions,
  getJobsPage,
  getPaymentsPage,
  getReportsPage,
  getSeoPagesPage,
  getUsersPage,
  getWhatsappPage,
  parseAdminQueryState,
} from "@/lib/admin/dashboard";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildResumeDownloadHref } from "@/lib/resumes/storage";

const sectionConfig: Array<{
  id: AdminSection;
  label: string;
  subtitle: string;
}> = [
  { id: "jobs", label: "Jobs", subtitle: "Manual intake, CSV imports, approvals, and featured placement" },
  { id: "users", label: "Users", subtitle: "Role control, bans, and account hygiene" },
  { id: "candidates", label: "Candidates", subtitle: "Verification and profile quality" },
  { id: "employers", label: "Employers", subtitle: "Trust, recruiter approval, and verification" },
  { id: "companies", label: "Companies", subtitle: "Brand records and verified orgs" },
  { id: "applications", label: "Applications", subtitle: "Pipeline health and candidate flow" },
  { id: "government-jobs", label: "Government jobs", subtitle: "Official updates and publishing" },
  { id: "internships", label: "Internships", subtitle: "Early-career listings and stipend quality" },
  { id: "blog", label: "Blog posts", subtitle: "Editorial publishing and search visibility" },
  { id: "seo", label: "SEO pages", subtitle: "Landing pages, indexation, and local growth" },
  { id: "payments", label: "Payments", subtitle: "Plans, transactions, and subscription state" },
  { id: "reports", label: "Reports", subtitle: "Fake-job escalation and triage" },
  { id: "whatsapp", label: "WhatsApp", subtitle: "Opt-ins, categories, and distribution quality" },
  { id: "ai-usage", label: "AI usage logs", subtitle: "Resume analysis and interview usage" },
  { id: "analytics", label: "Analytics", subtitle: "Events, sessions, and engagement patterns" },
];

function buildAdminHref(state: AdminQueryState, overrides: Partial<AdminQueryState>) {
  const nextState: AdminQueryState = { ...state, ...overrides };
  const params = new URLSearchParams();

  params.set("section", nextState.section);
  if (nextState.q) params.set("q", nextState.q);
  if (nextState.status) params.set("status", nextState.status);
  if (nextState.page > 1) params.set("page", String(nextState.page));

  return `/admin?${params.toString()}`;
}

function formatDate(value: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusVariant(status: string) {
  const normalized = status.toLowerCase();
  if (["approved", "active", "verified", "resolved", "paid", "published"].includes(normalized)) {
    return "default" as const;
  }
  if (["pending", "reviewing", "draft", "created", "viewed", "shortlisted"].includes(normalized)) {
    return "secondary" as const;
  }
  if (["rejected", "failed", "cancelled", "dismissed", "banned", "expired"].includes(normalized)) {
    return "destructive" as const;
  }
  return "outline" as const;
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-10 text-center">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function FilterBar({
  state,
  placeholder,
  options,
}: {
  state: AdminQueryState;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <form action="/admin" className="grid gap-3 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 p-4 lg:grid-cols-[minmax(0,1fr)_200px_auto_auto]">
      <input type="hidden" name="section" value={state.section} />
      <input
        name="q"
        defaultValue={state.q}
        placeholder={placeholder}
        className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none ring-0 transition focus:border-sky-400"
      />
      <select
        name="status"
        defaultValue={state.status}
        className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
      >
        <option value="">All statuses</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Button type="submit" className="h-11 rounded-2xl bg-slate-100 px-5 text-slate-950 hover:bg-slate-800">
        Apply
      </Button>
      <Button asChild variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-950">
        <Link href={buildAdminHref(state, { q: "", status: "", page: 1 })}>Reset</Link>
      </Button>
    </form>
  );
}

function Pagination({
  state,
  total,
  pageSize,
}: {
  state: AdminQueryState;
  total: number;
  pageSize: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(state.page, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <p>
        Page {currentPage} of {totalPages} with {total} matching records
      </p>
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          className="rounded-xl border-slate-200 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-950"
        >
          <Link
            href={buildAdminHref(state, { page: Math.max(1, currentPage - 1) })}
            aria-disabled={currentPage === 1}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
          >
            Previous
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="rounded-xl border-slate-200 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-950"
        >
          <Link
            href={buildAdminHref(state, { page: Math.min(totalPages, currentPage + 1) })}
            aria-disabled={currentPage >= totalPages}
            className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
          >
            Next
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-[1.75rem] border border-slate-200/80 bg-white text-slate-700 shadow-xl shadow-slate-900/5 [&_td]:border-slate-200 [&_td]:text-slate-700 [&_th]:text-slate-700 [&_tr]:border-slate-200">
      <CardHeader className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(59,130,246,0.03)_60%,rgba(255,255,255,0.96)_100%)]">
        <CardTitle className="text-lg text-slate-950">{title}</CardTitle>
        <CardDescription className="max-w-3xl leading-6 text-slate-600">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-5">{children}</CardContent>
    </Card>
  );
}

function InlineAction({
  action,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
}) {
  return <form action={action}>{children}</form>;
}

function buildReturnTo(state: AdminQueryState) {
  return buildAdminHref(state, {});
}

function CreateFormCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </div>
  );
}

function TextInput(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 ${props.className ?? ""}`.trim()}
    />
  );
}

function TextArea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={`min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 ${props.className ?? ""}`.trim()}
    />
  );
}

function SelectInput(props: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={`h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 ${props.className ?? ""}`.trim()}
    />
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const state = parseAdminQueryState(await searchParams);

  const overviewPromise = getAdminOverview();
  const jobCategoriesPromise =
    state.section === "jobs" ? getJobCategoryOptions() : Promise.resolve([]);
  const sectionPromise = (() => {
    switch (state.section) {
      case "users":
        return getUsersPage(state);
      case "candidates":
        return getCandidatesPage(state);
      case "employers":
        return getEmployersPage(state);
      case "companies":
        return getCompaniesPage(state);
      case "jobs":
        return getJobsPage(state);
      case "applications":
        return getApplicationsPage(state);
      case "government-jobs":
        return getGovernmentJobsPage(state);
      case "internships":
        return getInternshipsPage(state);
      case "blog":
        return getBlogPostsPage(state);
      case "seo":
        return getSeoPagesPage(state);
      case "payments":
        return getPaymentsPage(state);
      case "reports":
        return getReportsPage(state);
      case "whatsapp":
        return getWhatsappPage(state);
      case "ai-usage":
        return getAiUsagePage(state);
      case "analytics":
        return getAnalyticsPage(state);
      default:
        return getJobsPage(state);
    }
  })();

  const [overview, sectionData, jobCategories] = await Promise.all([
    overviewPromise,
    sectionPromise,
    jobCategoriesPromise,
  ]);
  const returnTo = buildReturnTo(state);

  const activeSection = sectionConfig.find((section) => section.id === state.section) ?? sectionConfig[0];
  const usersData =
    state.section === "users" ? (sectionData as Awaited<ReturnType<typeof getUsersPage>>) : null;
  const candidatesData =
    state.section === "candidates"
      ? (sectionData as Awaited<ReturnType<typeof getCandidatesPage>>)
      : null;
  const employersData =
    state.section === "employers"
      ? (sectionData as Awaited<ReturnType<typeof getEmployersPage>>)
      : null;
  const companiesData =
    state.section === "companies"
      ? (sectionData as Awaited<ReturnType<typeof getCompaniesPage>>)
      : null;
  const jobsData =
    state.section === "jobs" ? (sectionData as Awaited<ReturnType<typeof getJobsPage>>) : null;
  const applicationsData =
    state.section === "applications"
      ? (sectionData as Awaited<ReturnType<typeof getApplicationsPage>>)
      : null;
  const governmentJobsData =
    state.section === "government-jobs"
      ? (sectionData as Awaited<ReturnType<typeof getGovernmentJobsPage>>)
      : null;
  const internshipsData =
    state.section === "internships"
      ? (sectionData as Awaited<ReturnType<typeof getInternshipsPage>>)
      : null;
  const blogData =
    state.section === "blog" ? (sectionData as Awaited<ReturnType<typeof getBlogPostsPage>>) : null;
  const seoData =
    state.section === "seo" ? (sectionData as Awaited<ReturnType<typeof getSeoPagesPage>>) : null;
  const paymentsData =
    state.section === "payments"
      ? (sectionData as Awaited<ReturnType<typeof getPaymentsPage>>)
      : null;
  const reportsData =
    state.section === "reports" ? (sectionData as Awaited<ReturnType<typeof getReportsPage>>) : null;
  const whatsappData =
    state.section === "whatsapp"
      ? (sectionData as Awaited<ReturnType<typeof getWhatsappPage>>)
      : null;
  const aiUsageData =
    state.section === "ai-usage"
      ? (sectionData as Awaited<ReturnType<typeof getAiUsagePage>>)
      : null;
  const analyticsData =
    state.section === "analytics"
      ? (sectionData as Awaited<ReturnType<typeof getAnalyticsPage>>)
      : null;

  return (
    <DashboardShell
      role="admin"
      title="Admin command center"
      description="Review trust and growth operations across jobs, employers, content, payments, AI systems, and platform analytics from one protected workspace."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overview.metrics.map((metric) => (
          <Card key={metric.label} className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5">
            <CardContent className="space-y-3 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">{metric.label}</p>
              <p className="text-4xl font-semibold tracking-tight text-slate-950">{metric.value}</p>
              <p className="text-sm leading-6 text-slate-500">{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionCard
        title="Quick Actions"
        description="Run important admin workflows directly from the dashboard."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-2xl bg-slate-100 px-5 text-slate-950 hover:bg-slate-800">
            <Link href={`/admin/run-due-job-sources?returnTo=${encodeURIComponent(returnTo)}`}>
              Fetch Due Job Sources
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-950">
            <Link href={`/admin/expire-stale-jobs?returnTo=${encodeURIComponent(returnTo)}`}>
              Expire Stale Jobs
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-950">
            <Link href="/admin/job-sources">Manage Job Sources</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-950">
            <Link href="/admin/jobs/fetched">Open Fetched Queue</Link>
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Management surfaces"
        description="Jump between moderation, trust, publishing, subscriptions, and telemetry without leaving `/admin`."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sectionConfig.map((section) => {
            const active = section.id === state.section;
            return (
              <Link
                key={section.id}
                href={buildAdminHref(state, { section: section.id, page: 1 })}
                className={`rounded-[1.5rem] border px-4 py-4 transition ${
                  active
                    ? "border-slate-900 bg-slate-100 text-slate-950 shadow-lg shadow-slate-900/10"
                    : "border-slate-200 bg-white text-slate-900 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{section.label}</p>
                    <p className={`mt-2 text-sm leading-6 ${active ? "text-slate-600" : "text-slate-500"}`}>
                      {section.subtitle}
                    </p>
                  </div>
                  <Badge variant={active ? "secondary" : "outline"} className={active ? "bg-slate-100 text-slate-950" : ""}>
                    {active ? "Open" : "View"}
                  </Badge>
                </div>
              </Link>
            );
          })}
        </div>
      </SectionCard>

      {state.section === "users" ? (
        <SectionCard title={activeSection.label} description={activeSection.subtitle}>
          <FilterBar
            state={state}
            placeholder="Search by name, email, or phone"
            options={[
              { value: "candidate", label: "Candidates" },
              { value: "employer", label: "Employers" },
              { value: "admin", label: "Admins" },
              { value: "banned", label: "Banned users" },
            ]}
          />
          {usersData?.rows.length === 0 ? (
            <EmptyState title="No users found" description="Try widening the search or removing the current role filter." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersData?.rows.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="align-top">
                        <div>
                          <p className="font-semibold text-slate-900">{user.name}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                          <p className="text-sm text-slate-500">{user.phone || "No phone"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>{formatDate(user.last_seen_at)}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_banned ? "destructive" : "default"}>
                          {user.is_banned ? "Banned" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <InlineAction action={toggleUserBanAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="nextValue" value={String(!user.is_banned)} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <Button size="sm" variant={user.is_banned ? "outline" : "destructive"}>
                            {user.is_banned ? "Unban user" : "Ban user"}
                          </Button>
                        </InlineAction>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {usersData ? <Pagination state={state} total={usersData.total} pageSize={usersData.pageSize} /> : null}
            </>
          )}
        </SectionCard>
      ) : null}

      {state.section === "candidates" ? (
        <SectionCard title={activeSection.label} description={activeSection.subtitle}>
          <FilterBar
            state={state}
            placeholder="Search candidates by name or location"
            options={[
              { value: "draft", label: "Draft" },
              { value: "pending", label: "Pending verification" },
              { value: "verified", label: "Verified" },
              { value: "rejected", label: "Rejected" },
            ]}
          />
          {candidatesData?.rows.length === 0 ? (
            <EmptyState title="No candidate profiles" description="Profiles matching this verification state will appear here." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Preferred roles</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidatesData?.rows.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{candidate.full_name || candidate.user_name || "Unnamed candidate"}</p>
                          <p className="text-sm text-slate-500">{candidate.user_email || candidate.phone || "No contact info"}</p>
                          <p className="text-sm text-slate-500">{[candidate.city, candidate.state].filter(Boolean).join(", ") || "Location not set"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{candidate.preferred_roles.slice(0, 3).join(", ") || "--"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(candidate.verification_status)}>
                          {candidate.verification_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(candidate.verification_requested_at)}</TableCell>
                      <TableCell>{formatDate(candidate.updated_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {candidatesData ? <Pagination state={state} total={candidatesData.total} pageSize={candidatesData.pageSize} /> : null}
            </>
          )}
        </SectionCard>
      ) : null}

      {state.section === "employers" ? (
        <SectionCard title={activeSection.label} description={activeSection.subtitle}>
          <FilterBar
            state={state}
            placeholder="Search employers by company, recruiter, or city"
            options={[
              { value: "pending", label: "Pending approval" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "verified", label: "Verified" },
            ]}
          />
          {employersData?.rows.length === 0 ? (
            <EmptyState title="No employers found" description="Once recruiters sign up or match the selected filter, they will show here." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employer</TableHead>
                    <TableHead>Recruiter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employersData?.rows.map((employer) => (
                    <TableRow key={employer.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{employer.company_name}</p>
                          <p className="text-sm text-slate-500">{employer.user_email || employer.website || "No contact email"}</p>
                          <p className="text-sm text-slate-500">{[employer.city, employer.state].filter(Boolean).join(", ") || "Location not set"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-800">{employer.recruiter_name || employer.user_name || "Unknown recruiter"}</p>
                        <p className="text-sm text-slate-500">{employer.recruiter_phone || "No phone"}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge variant={statusVariant(employer.approval_status)}>{employer.approval_status}</Badge>
                          {employer.verified ? <Badge>Verified</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(employer.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        {employer.verified ? (
                          <Badge>Verified</Badge>
                        ) : (
                          <InlineAction action={markEmployerVerifiedAction}>
                            <input type="hidden" name="employerId" value={employer.id} />
                            <input type="hidden" name="companyId" value={employer.company_id || ""} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <Button size="sm">Mark verified</Button>
                          </InlineAction>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {employersData ? <Pagination state={state} total={employersData.total} pageSize={employersData.pageSize} /> : null}
            </>
          )}
        </SectionCard>
      ) : null}

      {state.section === "companies" ? (
        <SectionCard title={activeSection.label} description={activeSection.subtitle}>
          <FilterBar
            state={state}
            placeholder="Search companies by name, sector, or location"
            options={[
              { value: "verified", label: "Verified" },
              { value: "unverified", label: "Unverified" },
            ]}
          />
          {companiesData?.rows.length === 0 ? (
            <EmptyState title="No companies found" description="Verified and unverified company records will appear here." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Footprint</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companiesData?.rows.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{company.name}</p>
                          <p className="text-sm text-slate-500">{company.website || `/${company.slug}`}</p>
                        </div>
                      </TableCell>
                      <TableCell>{company.industry || "--"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={company.verified ? "default" : "outline"}>
                            {company.verified ? "Verified" : "Unverified"}
                          </Badge>
                          <span className="text-sm text-slate-500">
                            {[company.city, company.state].filter(Boolean).join(", ") || company.size_range || "--"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{company.rating ?? "--"}</TableCell>
                      <TableCell>{formatDate(company.updated_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {companiesData ? <Pagination state={state} total={companiesData.total} pageSize={companiesData.pageSize} /> : null}
            </>
          )}
        </SectionCard>
      ) : null}

      {state.section === "jobs" ? (
        <SectionCard title={activeSection.label} description={activeSection.subtitle}>
          <div className="grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
            <form action={createAdminJobAction} className="space-y-4">
              <input type="hidden" name="returnTo" value={returnTo} />
              <CreateFormCard
                title="Manual job intake"
                description="Add a moderated listing manually. New jobs stay pending until an admin approves them."
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="job-title">Job title</label>
                  <TextInput id="job-title" name="title" placeholder="Senior React Developer" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="company-name">Company name</label>
                  <TextInput id="company-name" name="companyName" placeholder="Acme Labs" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="category-slug">Category</label>
                  <SelectInput id="category-slug" name="categorySlug" defaultValue="">
                    <option value="">Select a category</option>
                    {jobCategories.map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.name} ({category.job_family})
                      </option>
                    ))}
                  </SelectInput>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="job-industry">Industry</label>
                  <TextInput id="job-industry" name="industry" placeholder="Software" required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="job-description">Description</label>
                  <TextArea id="job-description" name="description" placeholder="Role overview, team context, and candidate expectations." required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="job-responsibilities">Responsibilities</label>
                  <TextArea id="job-responsibilities" name="responsibilities" placeholder="One per line or comma separated" required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="job-requirements">Requirements</label>
                  <TextArea id="job-requirements" name="requirements" placeholder="One per line or comma separated" required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="job-skills">Skills</label>
                  <TextArea id="job-skills" name="skills" placeholder="React, TypeScript, SQL" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="job-city">City</label>
                  <TextInput id="job-city" name="city" placeholder="Bengaluru" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="job-state">State</label>
                  <TextInput id="job-state" name="state" placeholder="Karnataka" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="job-country">Country</label>
                  <TextInput id="job-country" name="country" defaultValue="India" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="job-openings">Openings</label>
                  <TextInput id="job-openings" name="openings" type="number" min="1" defaultValue="1" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="job-work-mode">Work mode</label>
                  <SelectInput id="job-work-mode" name="workMode" defaultValue="onsite">
                    <option value="onsite">Onsite</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="remote">Remote</option>
                  </SelectInput>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="job-type">Job type</label>
                  <SelectInput id="job-type" name="jobType" defaultValue="full-time">
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="freelance">Freelance</option>
                    <option value="internship">Internship</option>
                    <option value="walk-in">Walk-in</option>
                  </SelectInput>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="salary-type">Salary type</label>
                  <SelectInput id="salary-type" name="salaryType" defaultValue="yearly">
                    <option value="yearly">Yearly</option>
                    <option value="monthly">Monthly</option>
                    <option value="stipend">Stipend</option>
                  </SelectInput>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="salary-min">Salary min</label>
                  <TextInput id="salary-min" name="salaryMin" type="number" min="0" defaultValue="0" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="salary-max">Salary max</label>
                  <TextInput id="salary-max" name="salaryMax" type="number" min="0" defaultValue="0" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="deadline">Application deadline</label>
                  <TextInput id="deadline" name="deadline" type="date" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="education-required">Education required</label>
                  <TextInput id="education-required" name="educationRequired" placeholder="BTech / MCA / Graduate" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="experience-required">Experience required</label>
                  <TextInput id="experience-required" name="experienceRequired" placeholder="2-4 years" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="application-url">Application URL</label>
                  <TextInput id="application-url" name="applicationUrl" type="url" placeholder="https://company.com/careers/job-123" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="source-url">Source URL</label>
                  <TextInput id="source-url" name="sourceUrl" type="url" placeholder="https://company.com/careers" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="company-website">Company website</label>
                  <TextInput id="company-website" name="companyWebsite" type="url" placeholder="https://company.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="company-logo-url">Company logo URL</label>
                  <TextInput id="company-logo-url" name="companyLogoUrl" type="url" placeholder="https://company.com/logo.png" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="company-description">Company description</label>
                  <TextArea id="company-description" name="companyDescription" placeholder="Optional company summary for internal records." />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="recruiter-contact">Recruiter contact</label>
                  <TextInput id="recruiter-contact" name="recruiterContact" placeholder="hiring@company.com or recruiter phone" />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="hidden" name="noCandidatePayment" value="true" />
                    <input type="checkbox" checked disabled readOnly />
                    No candidate payment required
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="hidden" name="salaryDisclosed" value="false" />
                    <input type="checkbox" name="salaryDisclosed" value="true" defaultChecked />
                    Salary disclosed
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="hidden" name="governmentSourceVerified" value="false" />
                    <input type="checkbox" name="governmentSourceVerified" value="true" />
                    Government or official source already verified
                  </label>
                </div>
              </CreateFormCard>
              <Button type="submit" className="rounded-2xl bg-slate-100 px-5 text-slate-950 hover:bg-slate-800">
                Add job to pending review
              </Button>
            </form>

            <div className="space-y-4">
              <CreateFormCard
                title="CSV import"
                description="Open the dedicated bulk import flow to validate columns, preview the first 20 rows, catch duplicates, and import only valid rows into pending review."
              >
                <div className="space-y-2 md:col-span-2 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                  <p className="font-semibold text-slate-900">Dedicated import flow</p>
                  <p>
                    Upload a CSV, validate the required headers, review row-level errors, detect duplicate
                    title + company + city combinations, and import only the valid rows.
                  </p>
                  <p>
                    Every imported job remains pending until an admin approves it. Companies are created
                    automatically when needed.
                  </p>
                </div>
              </CreateFormCard>
              <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-950">
                <Link href="/admin/jobs/import">Open CSV import page</Link>
              </Button>
            </div>
          </div>

          <FilterBar
            state={state}
            placeholder="Search jobs by role, company, or city"
            options={[
              { value: "pending", label: "Pending approval" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "active", label: "Active" },
              { value: "expired", label: "Expired" },
              { value: "featured", label: "Featured" },
            ]}
          />
          {jobsData?.rows.length === 0 ? (
            <EmptyState title="No jobs match this queue" description="Try another approval filter or search term." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead>Live status</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobsData?.rows.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{job.title}</p>
                          <p className="text-sm text-slate-500">{job.company_name}</p>
                          <p className="text-sm text-slate-500">{[job.city, job.state].filter(Boolean).join(", ") || "Location not set"}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {job.category_slug ? <Badge variant="outline">{job.category_slug}</Badge> : null}
                            {job.source_type ? <Badge variant="secondary">{job.source_type}</Badge> : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {job.job_type ? <Badge variant="outline">{job.job_type}</Badge> : null}
                          {job.work_mode ? <Badge variant="secondary">{job.work_mode}</Badge> : null}
                          {job.is_featured ? <Badge>Featured</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(job.approval_status)}>{job.approval_status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{formatDate(job.deadline)}</p>
                          <p className="text-xs text-slate-500">Published: {formatDate(job.published_at)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <InlineAction action={approveJobAction}>
                            <input type="hidden" name="jobId" value={job.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <Button size="sm">Approve job</Button>
                          </InlineAction>
                          <InlineAction action={rejectJobAction}>
                            <input type="hidden" name="jobId" value={job.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <Button size="sm" variant="destructive">
                              Reject job
                            </Button>
                          </InlineAction>
                          <InlineAction action={toggleFeaturedJobAction}>
                            <input type="hidden" name="jobId" value={job.id} />
                            <input type="hidden" name="nextValue" value={String(!job.is_featured)} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <Button size="sm" variant="outline">
                              {job.is_featured ? "Unfeature" : "Feature job"}
                            </Button>
                          </InlineAction>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {jobsData ? <Pagination state={state} total={jobsData.total} pageSize={jobsData.pageSize} /> : null}
            </>
          )}
        </SectionCard>
      ) : null}

      {state.section === "applications" ? (
        <SectionCard title={activeSection.label} description={activeSection.subtitle}>
          <FilterBar
            state={state}
            placeholder="Search by status or note keyword"
            options={[
              { value: "applied", label: "Applied" },
              { value: "viewed", label: "Viewed" },
              { value: "shortlisted", label: "Shortlisted" },
              { value: "interview", label: "Interview" },
              { value: "rejected", label: "Rejected" },
              { value: "offered", label: "Offered" },
            ]}
          />
          {applicationsData?.rows.length === 0 ? (
            <EmptyState title="No applications found" description="Application records matching the selected stage will show here." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Resume</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applicationsData?.rows.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{application.candidate_name || "Unnamed candidate"}</p>
                          <p className="text-sm text-slate-500">{[application.candidate_city, application.candidate_state].filter(Boolean).join(", ") || "Location not set"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-800">{application.job_title || "Unknown role"}</p>
                        <p className="text-sm text-slate-500">{application.company_name || "Unknown company"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(application.status)}>{application.status}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(application.applied_at)}</TableCell>
                      <TableCell>
                        {application.resume_storage_path || application.resume_id ? (
                          <a
                            className="text-sky-700 underline-offset-4 hover:underline"
                            href={buildResumeDownloadHref({ applicationId: application.id })}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open resume
                          </a>
                        ) : (
                          "--"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {applicationsData ? <Pagination state={state} total={applicationsData.total} pageSize={applicationsData.pageSize} /> : null}
            </>
          )}
        </SectionCard>
      ) : null}

      {state.section === "government-jobs" ? (
        <SectionCard title={activeSection.label} description={activeSection.subtitle}>
          <form action={createGovernmentJobAction} className="space-y-4">
            <input type="hidden" name="returnTo" value={returnTo} />
            <CreateFormCard
              title="Create government job"
              description="Publish a new official listing with clean source attribution and deadline metadata."
            >
              <TextInput name="title" placeholder="Title" required />
              <TextInput name="department" placeholder="Department" required />
              <TextInput name="category" placeholder="Category" required />
              <TextInput name="categorySlug" placeholder="Category slug" />
              <TextInput name="state" placeholder="State" />
              <TextInput name="eligibility" placeholder="Eligibility" />
              <TextInput name="ageLimit" placeholder="Age limit" />
              <TextInput name="applicationFee" placeholder="Application fee" />
              <TextInput name="slug" placeholder="Slug (optional)" />
              <TextInput name="lastDate" type="date" />
              <TextInput name="officialUrl" placeholder="Official URL" />
              <TextInput name="officialApplyUrl" placeholder="Official apply URL" />
              <TextInput name="sourceUrl" placeholder="Source page URL" />
              <TextInput name="notificationUrl" placeholder="Notification URL" className="md:col-span-2" />
              <TextArea name="summary" placeholder="Summary" className="md:col-span-2" />
            </CreateFormCard>
            <div className="flex justify-end">
              <Button type="submit" className="rounded-2xl px-5">Create government job</Button>
            </div>
          </form>
          <FilterBar
            state={state}
            placeholder="Search by title, department, or category"
            options={[
              { value: "pending_review", label: "Pending review" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
          />
          {governmentJobsData?.rows.length === 0 ? (
            <EmptyState title="No government jobs found" description="Add a new listing above or broaden the current search." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Listing</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last date</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {governmentJobsData?.rows.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{job.title}</p>
                          <p className="text-sm text-slate-500">{job.department}</p>
                          <p className="text-sm text-slate-500">{job.state || "All India"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{job.category}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {job.official_url ? (
                            <a className="block text-sky-700 underline-offset-4 hover:underline" href={job.official_url} target="_blank" rel="noreferrer">
                              Official source
                            </a>
                          ) : null}
                          {job.notification_url ? (
                            <a className="block text-slate-600 underline-offset-4 hover:underline" href={job.notification_url} target="_blank" rel="noreferrer">
                              Notification
                            </a>
                          ) : null}
                          {job.official_apply_url ? (
                            <a className="block text-slate-600 underline-offset-4 hover:underline" href={job.official_apply_url} target="_blank" rel="noreferrer">
                              Apply link
                            </a>
                          ) : null}
                          {!job.official_url && !job.notification_url && !job.official_apply_url ? "--" : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={job.status === "approved" ? "default" : job.status === "rejected" ? "destructive" : "secondary"}>
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(job.last_date)}</TableCell>
                      <TableCell>{formatDate(job.updated_at)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {job.status !== "approved" ? (
                            <form action={approveGovernmentJobAction}>
                              <input type="hidden" name="id" value={job.id} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <Button size="sm" className="rounded-xl">Approve</Button>
                            </form>
                          ) : null}
                          {job.status !== "rejected" ? (
                            <form action={rejectGovernmentJobAction}>
                              <input type="hidden" name="id" value={job.id} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <Button size="sm" variant="outline" className="rounded-xl">Reject</Button>
                            </form>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {governmentJobsData ? <Pagination state={state} total={governmentJobsData.total} pageSize={governmentJobsData.pageSize} /> : null}
            </>
          )}
        </SectionCard>
      ) : null}

      {state.section === "internships" ? (
        <SectionCard title={activeSection.label} description={activeSection.subtitle}>
          <form action={createInternshipAction} className="space-y-4">
            <input type="hidden" name="returnTo" value={returnTo} />
            <CreateFormCard
              title="Create internship"
              description="Add a polished internship listing with stipend, work mode, deadline, and application destination."
            >
              <TextInput name="title" placeholder="Title" required />
              <TextInput name="company" placeholder="Company" required />
              <TextInput name="slug" placeholder="Slug (optional)" />
              <TextInput name="categorySlug" placeholder="Category slug" />
              <TextInput name="stipend" placeholder="Stipend" />
              <TextInput name="duration" placeholder="Duration" />
              <TextInput name="location" placeholder="Location" />
              <SelectInput name="workMode" defaultValue="">
                <option value="">Work mode</option>
                <option value="onsite">Onsite</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </SelectInput>
              <SelectInput name="isPaid" defaultValue="true">
                <option value="true">Paid</option>
                <option value="false">Unpaid</option>
              </SelectInput>
              <TextInput name="deadline" type="date" />
              <TextInput name="applyUrl" placeholder="Apply URL" className="md:col-span-2" />
              <TextInput name="skills" placeholder="Skills, comma separated" className="md:col-span-2" />
            </CreateFormCard>
            <div className="flex justify-end">
              <Button type="submit" className="rounded-2xl px-5">Create internship</Button>
            </div>
          </form>
          <FilterBar
            state={state}
            placeholder="Search by role, company, or location"
            options={[
              { value: "paid", label: "Paid" },
              { value: "unpaid", label: "Unpaid" },
              { value: "remote", label: "Remote" },
              { value: "hybrid", label: "Hybrid" },
              { value: "onsite", label: "Onsite" },
            ]}
          />
          {internshipsData?.rows.length === 0 ? (
            <EmptyState title="No internships found" description="Create one above or remove the current filters." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Internship</TableHead>
                    <TableHead>Compensation</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {internshipsData?.rows.map((internship) => (
                    <TableRow key={internship.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{internship.title}</p>
                          <p className="text-sm text-slate-500">{internship.company}</p>
                          <p className="text-sm text-slate-500">{internship.location || "Location not set"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{internship.stipend || (internship.is_paid ? "Paid" : "Unpaid")}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {internship.work_mode ? <Badge variant="secondary">{internship.work_mode}</Badge> : null}
                          <Badge variant={internship.is_paid ? "default" : "outline"}>
                            {internship.is_paid ? "Paid" : "Unpaid"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(internship.deadline)}</TableCell>
                      <TableCell>{formatDate(internship.updated_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {internshipsData ? <Pagination state={state} total={internshipsData.total} pageSize={internshipsData.pageSize} /> : null}
            </>
          )}
        </SectionCard>
      ) : null}

      {state.section === "blog" ? (
        <SectionCard title={activeSection.label} description={activeSection.subtitle}>
          <form action={createBlogPostAction} className="space-y-4">
            <input type="hidden" name="returnTo" value={returnTo} />
            <CreateFormCard
              title="Create blog post"
              description="Launch editorial content with metadata, schema hints, and draft or publish control."
            >
              <TextInput name="title" placeholder="Title" required />
              <TextInput name="slug" placeholder="Slug (optional)" />
              <TextInput name="metaTitle" placeholder="Meta title" />
              <SelectInput name="status" defaultValue="draft">
                <option value="draft">Draft</option>
                <option value="active">Publish now</option>
              </SelectInput>
              <TextInput name="keywords" placeholder="Keywords, comma separated" className="md:col-span-2" />
              <TextInput name="metaDescription" placeholder="Meta description" className="md:col-span-2" />
              <TextArea name="excerpt" placeholder="Excerpt" className="md:col-span-2" />
              <TextArea name="content" placeholder="Content" required className="md:col-span-2 min-h-40" />
            </CreateFormCard>
            <div className="flex justify-end">
              <Button type="submit" className="rounded-2xl px-5">Create blog post</Button>
            </div>
          </form>
          <FilterBar
            state={state}
            placeholder="Search by title, slug, or meta title"
            options={[
              { value: "draft", label: "Draft" },
              { value: "active", label: "Published" },
              { value: "pending", label: "Pending" },
            ]}
          />
          {blogData?.rows.length === 0 ? (
            <EmptyState title="No blog posts found" description="Drafts and published articles will appear here." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Post</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Meta title</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blogData?.rows.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{post.title}</p>
                          <p className="text-sm text-slate-500">/{post.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(post.status)}>{post.status}</Badge>
                      </TableCell>
                      <TableCell>{post.meta_title || "--"}</TableCell>
                      <TableCell>{formatDate(post.published_at)}</TableCell>
                      <TableCell>{formatDate(post.updated_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {blogData ? <Pagination state={state} total={blogData.total} pageSize={blogData.pageSize} /> : null}
            </>
          )}
        </SectionCard>
      ) : null}

      {state.section === "seo" ? (
        <SectionCard title={activeSection.label} description={activeSection.subtitle}>
          <form action={createSeoPageAction} className="space-y-4">
            <input type="hidden" name="returnTo" value={returnTo} />
            <CreateFormCard
              title="Create SEO page"
              description="Build a curated search landing page with indexation control, locality, and optional FAQ blocks."
            >
              <TextInput name="title" placeholder="Title" required />
              <SelectInput name="pageType" defaultValue="city" required>
                <option value="city">City</option>
                <option value="category">Category</option>
                <option value="internship">Internship</option>
                <option value="fresher">Fresher</option>
              </SelectInput>
              <TextInput name="slug" placeholder="Slug (optional)" />
              <TextInput name="metaTitle" placeholder="Meta title" />
              <TextInput name="metaDescription" placeholder="Meta description" className="md:col-span-2" />
              <TextInput name="city" placeholder="City" />
              <TextInput name="state" placeholder="State" />
              <TextInput name="category" placeholder="Category" />
              <SelectInput name="indexable" defaultValue="true">
                <option value="true">Indexable</option>
                <option value="false">Noindex</option>
              </SelectInput>
              <TextArea name="content" placeholder="Page content" className="md:col-span-2 min-h-36" />
              <TextArea
                name="faqJson"
                placeholder='FAQ JSON, e.g. [{"question":"...","answer":"..."}]'
                className="md:col-span-2"
              />
            </CreateFormCard>
            <div className="flex justify-end">
              <Button type="submit" className="rounded-2xl px-5">Create SEO page</Button>
            </div>
          </form>
          <FilterBar
            state={state}
            placeholder="Search by page title, slug, or city"
            options={[
              { value: "city", label: "City pages" },
              { value: "category", label: "Category pages" },
              { value: "internship", label: "Internship pages" },
              { value: "fresher", label: "Fresher pages" },
              { value: "indexable", label: "Indexable" },
              { value: "noindex", label: "Noindex" },
            ]}
          />
          {seoData?.rows.length === 0 ? (
            <EmptyState title="No SEO pages found" description="Launch a page above or adjust the active filter." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Geo / category</TableHead>
                    <TableHead>Indexing</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seoData?.rows.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{page.title}</p>
                          <p className="text-sm text-slate-500">/{page.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{page.page_type}</Badge>
                      </TableCell>
                      <TableCell>{[page.city, page.state, page.category].filter(Boolean).join(" / ") || "--"}</TableCell>
                      <TableCell>
                        <Badge variant={page.indexable ? "default" : "secondary"}>
                          {page.indexable ? "Indexable" : "Noindex"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(page.updated_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {seoData ? <Pagination state={state} total={seoData.total} pageSize={seoData.pageSize} /> : null}
            </>
          )}
        </SectionCard>
      ) : null}

      {state.section === "payments" ? (
        <SectionCard title={activeSection.label} description={activeSection.subtitle}>
          <FilterBar
            state={state}
            placeholder="Search by plan, subscription, or payment id"
            options={[
              { value: "created", label: "Created" },
              { value: "paid", label: "Paid" },
              { value: "failed", label: "Failed" },
              { value: "refunded", label: "Refunded" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
          {paymentsData?.rows.length === 0 ? (
            <EmptyState title="No payments found" description="Payment records matching this status will appear here." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsData?.rows.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{payment.user_name || "Unknown user"}</p>
                          <p className="text-sm text-slate-500">{payment.user_email || "No email on file"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-800">{payment.plan}</p>
                        <p className="text-sm text-slate-500">{payment.subscription_type || "One-time"}</p>
                      </TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(payment.status)}>{payment.status}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(payment.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {paymentsData ? <Pagination state={state} total={paymentsData.total} pageSize={paymentsData.pageSize} /> : null}
            </>
          )}
        </SectionCard>
      ) : null}

      {state.section === "reports" ? (
        <SectionCard title={activeSection.label} description={activeSection.subtitle}>
          <FilterBar
            state={state}
            placeholder="Search by reason or report detail"
            options={[
              { value: "open", label: "Open" },
              { value: "reviewing", label: "Reviewing" },
              { value: "resolved", label: "Resolved" },
              { value: "dismissed", label: "Dismissed" },
            ]}
          />
          {reportsData?.rows.length === 0 ? (
            <EmptyState title="No reports found" description="Fake-job and spam reports will surface here for moderation." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reported job</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportsData?.rows.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{report.job_title || "Unknown job"}</p>
                          <p className="text-sm text-slate-500">{report.company_name || "Unknown company"}</p>
                          <p className="mt-1 text-sm text-slate-500">{report.details || "No additional details"}</p>
                          {report.resolution_notes ? (
                            <p className="mt-1 text-sm text-emerald-700">Resolution: {report.resolution_notes}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{report.reason}</TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-800">{report.reporter_name || "Anonymous"}</p>
                        <p className="text-sm text-slate-500">{report.reporter_email || "--"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(report.status)}>{report.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <InlineAction action={reviewReportAction}>
                            <input type="hidden" name="reportId" value={report.id} />
                            <input type="hidden" name="status" value="reviewing" />
                            <input type="hidden" name="resolutionNotes" value="Under manual review." />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <Button size="sm" variant="outline">Review</Button>
                          </InlineAction>
                          <InlineAction action={reviewReportAction}>
                            <input type="hidden" name="reportId" value={report.id} />
                            <input type="hidden" name="status" value="resolved" />
                            <input type="hidden" name="resolutionNotes" value="Report approved." />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <Button size="sm">Approve report</Button>
                          </InlineAction>
                          <InlineAction action={reviewReportAction}>
                            <input type="hidden" name="reportId" value={report.id} />
                            <input type="hidden" name="status" value="dismissed" />
                            <input type="hidden" name="resolutionNotes" value="Report rejected after review." />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <Button size="sm" variant="destructive">Reject report</Button>
                          </InlineAction>
                          {report.job_id ? (
                            <InlineAction action={removeFakeJobAction}>
                              <input type="hidden" name="jobId" value={report.job_id} />
                              <input type="hidden" name="reportId" value={report.id} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <Button size="sm" variant="destructive">Remove fake job</Button>
                            </InlineAction>
                          ) : null}
                          {report.employer_user_id ? (
                            <InlineAction action={banEmployerFromReportAction}>
                              <input type="hidden" name="userId" value={report.employer_user_id} />
                              <input type="hidden" name="reportId" value={report.id} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <Button size="sm" variant="outline">Ban employer</Button>
                            </InlineAction>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {reportsData ? <Pagination state={state} total={reportsData.total} pageSize={reportsData.pageSize} /> : null}
            </>
          )}
        </SectionCard>
      ) : null}

      {state.section === "whatsapp" ? (
        <SectionCard title={activeSection.label} description={activeSection.subtitle}>
          <FilterBar
            state={state}
            placeholder="Search by phone, city, or category"
            options={[
              { value: "active", label: "Active" },
              { value: "paused", label: "Paused" },
              { value: "unsubscribed", label: "Unsubscribed" },
            ]}
          />
          {whatsappData?.rows.length === 0 ? (
            <EmptyState title="No subscriptions found" description="Opt-ins and opt-outs for WhatsApp alerts will appear here." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whatsappData?.rows.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{subscription.user_name || "Anonymous"}</p>
                          <p className="text-sm text-slate-500">{subscription.user_email || "--"}</p>
                          <p className="text-sm text-slate-500">{subscription.city || "City not set"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{subscription.phone_number}</TableCell>
                      <TableCell>{subscription.category_slug || "All jobs"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge variant={statusVariant(subscription.status)}>{subscription.status}</Badge>
                          <Badge variant={subscription.is_opted_in ? "default" : "outline"}>
                            {subscription.is_opted_in ? "Opted in" : "Opted out"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(subscription.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {whatsappData ? <Pagination state={state} total={whatsappData.total} pageSize={whatsappData.pageSize} /> : null}
            </>
          )}
        </SectionCard>
      ) : null}

      {state.section === "ai-usage" ? (
        <SectionCard title={activeSection.label} description={activeSection.subtitle}>
          <FilterBar
            state={state}
            placeholder="Search by user, feature, or AI workflow"
            options={[
              { value: "resume-analysis", label: "Resume analysis" },
              { value: "interview-session", label: "Interview sessions" },
            ]}
          />
          {aiUsageData?.rows.length === 0 ? (
            <EmptyState title="No AI usage logs found" description="Recent resume and interview AI usage will appear here." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiUsageData?.rows.map((log) => (
                    <TableRow key={`${log.kind}-${log.id}`}>
                      <TableCell className="font-medium text-slate-900">{log.actor}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.kind}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-800">{log.subject}</p>
                        <p className="text-sm text-slate-500">{log.detail}</p>
                      </TableCell>
                      <TableCell>{log.score ?? "--"}</TableCell>
                      <TableCell>{formatDate(log.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {aiUsageData ? <Pagination state={state} total={aiUsageData.total} pageSize={aiUsageData.pageSize} /> : null}
            </>
          )}
        </SectionCard>
      ) : null}

      {state.section === "analytics" ? (
          <SectionCard title={activeSection.label} description={activeSection.subtitle}>
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {analyticsData
                  ? [
                      ["Total users", analyticsData.summary.totalUsers.toLocaleString("en-IN")],
                      ["Total jobs", analyticsData.summary.totalJobs.toLocaleString("en-IN")],
                      ["Total applications", analyticsData.summary.totalApplications.toLocaleString("en-IN")],
                      ["Revenue", formatCurrency(analyticsData.summary.revenue)],
                      ["AI usage", analyticsData.summary.aiUsage.toLocaleString("en-IN")],
                      [
                        "WhatsApp subscriptions",
                        analyticsData.summary.whatsappSubscriptions.toLocaleString("en-IN"),
                      ],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">{label}</p>
                        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
                      </div>
                    ))
                  : null}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Top cities</p>
                  <div className="mt-4 space-y-3">
                    {analyticsData?.summary.topCities.length === 0 ? (
                      <p className="text-sm text-slate-500">No city data yet.</p>
                    ) : (
                      analyticsData?.summary.topCities.map((item) => (
                        <div key={item.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <span className="font-medium text-slate-800">{item.name}</span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Top roles</p>
                  <div className="mt-4 space-y-3">
                    {analyticsData?.summary.topRoles.length === 0 ? (
                      <p className="text-sm text-slate-500">No role data yet.</p>
                    ) : (
                      analyticsData?.summary.topRoles.map((item) => (
                        <div key={item.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <span className="font-medium text-slate-800">{item.name}</span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Top events</p>
                  <div className="mt-4 space-y-3">
                    {analyticsData?.summary.topEvents.length === 0 ? (
                      <p className="text-sm text-slate-500">No analytics events yet.</p>
                    ) : (
                      analyticsData?.summary.topEvents.map((item) => (
                        <div key={item.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <span className="font-medium text-slate-800">{item.name}</span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <FilterBar
                  state={state}
                placeholder="Search by event name or session id"
                options={(analyticsData?.summary.topEvents ?? []).map((item) => ({
                  value: item.name,
                  label: item.name,
                }))}
              />
              {analyticsData?.table.rows.length === 0 ? (
                <EmptyState title="No analytics events found" description="Event ingestion data will show here as users move through the app." />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead>Detail</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsData?.table.rows.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <Badge variant="outline">{event.event_name}</Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-800">{event.user_name || "Anonymous"}</p>
                              <p className="text-sm text-slate-500">{event.user_email || "--"}</p>
                            </div>
                          </TableCell>
                          <TableCell>{event.session_id || "--"}</TableCell>
                          <TableCell className="max-w-[320px] truncate text-slate-500">{event.detail}</TableCell>
                          <TableCell>{formatDate(event.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {analyticsData ? <Pagination state={state} total={analyticsData.table.total} pageSize={analyticsData.table.pageSize} /> : null}
                </>
              )}
            </div>
          </div>
        </SectionCard>
      ) : null}
    </DashboardShell>
  );
}
