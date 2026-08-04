import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Search, Sparkles } from "lucide-react";
import { JobsFilterDrawer } from "@/components/jobs/jobs-filter-drawer";
import { JobPersonalizationProvider } from "@/components/jobs/job-personalization-context";
import { PersonalizedJobCardList } from "@/components/jobs/personalized-job-card-list";
import { SchemaScript } from "@/components/shared/schema-script";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildCollectionPageSchema,
  buildMetadata,
} from "@/lib/seo";
import {
  parsePublicJobsQuery,
  searchPublicJobs,
  toJobsSearchParams,
  type JobsFacetOption,
  type PublicJobsFacets,
  type PublicJobsQuery,
} from "@/lib/jobs/public-search";

export const metadata = buildMetadata({
  title: "Latest Jobs in India - Freshers, Remote, Private & Government Jobs",
  absoluteTitle: "Latest Jobs in India - Freshers, Remote, Private & Government Jobs",
  description:
    "Browse the latest jobs in India across fresher, remote, private, and government categories with smart filters, verified listings, and fast search.",
  path: "/jobs",
  keywords: [
    "jobs in india",
    "latest jobs in india",
    "fresher jobs india",
    "remote jobs india",
    "private jobs india",
    "government jobs india",
    "work from home jobs india",
    "government jobs",
  ],
});

export const revalidate = 300;

const salaryOptions = [
  { value: "", label: "Any salary" },
  { value: "under-300k", label: "Under Rs 3 LPA" },
  { value: "300k-600k", label: "Rs 3 LPA to Rs 6 LPA" },
  { value: "600k-1200k", label: "Rs 6 LPA to Rs 12 LPA" },
  { value: "1200k-plus", label: "Above Rs 12 LPA" },
];

const experienceOptions = [
  { value: "", label: "Any experience" },
  { value: "fresher", label: "Fresher / entry level" },
  { value: "1-3", label: "1 to 3 years" },
  { value: "3-5", label: "3 to 5 years" },
  { value: "5-plus", label: "5+ years" },
];

const postedDateOptions = [
  { value: "", label: "Any posted date" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

const sortOptions = [
  { value: "latest", label: "Latest" },
  { value: "salary-high", label: "Salary high to low" },
  { value: "deadline-soon", label: "Deadline soon" },
  { value: "featured-first", label: "Featured first" },
];

function activeFilterBadges(query: PublicJobsQuery) {
  const badges: string[] = [];

  if (query.keyword) badges.push(`Keyword: ${query.keyword}`);
  if (query.city) badges.push(`City: ${query.city}`);
  if (query.state) badges.push(`State: ${query.state}`);
  if (query.salary) badges.push(`Salary: ${salaryOptions.find((option) => option.value === query.salary)?.label ?? query.salary}`);
  if (query.experience) badges.push(`Experience: ${experienceOptions.find((option) => option.value === query.experience)?.label ?? query.experience}`);
  if (query.education) badges.push(`Education: ${query.education}`);
  if (query.jobType) badges.push(`Job type: ${query.jobType}`);
  if (query.workMode) badges.push(`Work mode: ${query.workMode}`);
  if (query.industry) badges.push(`Industry: ${query.industry}`);
  if (query.skills.length > 0) badges.push(`Skills: ${query.skills.join(", ")}`);
  if (query.postedDate) badges.push(`Posted: ${postedDateOptions.find((option) => option.value === query.postedDate)?.label ?? query.postedDate}`);
  if (query.verified) badges.push("Verified only");
  if (query.featured) badges.push("Featured only");
  if (query.remote) badges.push("Remote only");
  if (query.fresher) badges.push("Fresher friendly");

  return badges;
}

function hiddenQueryFields(
  query: PublicJobsQuery,
  exclude: Array<keyof PublicJobsQuery> = [],
) {
  const hidden: Array<{ name: string; value: string }> = [];
  const excluded = new Set<string>(exclude);

  if (!excluded.has("keyword") && query.keyword) hidden.push({ name: "keyword", value: query.keyword });
  if (!excluded.has("city") && query.city) hidden.push({ name: "city", value: query.city });
  if (!excluded.has("state") && query.state) hidden.push({ name: "state", value: query.state });
  if (!excluded.has("salary") && query.salary) hidden.push({ name: "salary", value: query.salary });
  if (!excluded.has("experience") && query.experience) hidden.push({ name: "experience", value: query.experience });
  if (!excluded.has("education") && query.education) hidden.push({ name: "education", value: query.education });
  if (!excluded.has("jobType") && query.jobType) hidden.push({ name: "jobType", value: query.jobType });
  if (!excluded.has("workMode") && query.workMode) hidden.push({ name: "workMode", value: query.workMode });
  if (!excluded.has("industry") && query.industry) hidden.push({ name: "industry", value: query.industry });
  if (!excluded.has("postedDate") && query.postedDate) hidden.push({ name: "postedDate", value: query.postedDate });
  if (!excluded.has("verified") && query.verified) hidden.push({ name: "verified", value: "true" });
  if (!excluded.has("featured") && query.featured) hidden.push({ name: "featured", value: "true" });
  if (!excluded.has("remote") && query.remote) hidden.push({ name: "remote", value: "true" });
  if (!excluded.has("fresher") && query.fresher) hidden.push({ name: "fresher", value: "true" });
  if (!excluded.has("sort") && query.sort !== "latest") hidden.push({ name: "sort", value: query.sort });

  if (!excluded.has("skills")) {
    for (const skill of query.skills) {
      hidden.push({ name: "skills", value: skill });
    }
  }

  return hidden.map((field, index) => (
    <input key={`${field.name}-${field.value}-${index}`} type="hidden" name={field.name} value={field.value} />
  ));
}

function Pagination({
  page,
  totalPages,
  query,
}: {
  page: number;
  totalPages: number;
  query: PublicJobsQuery;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  const visiblePages = pages.slice(start - 1, end);

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Jobs pagination">
      {page <= 1 ? (
        <Button variant="outline" className="rounded-full" disabled>
          Previous
        </Button>
      ) : (
        <Button asChild variant="outline" className="rounded-full">
          <Link href={`/jobs?${toJobsSearchParams({ ...query, page: page - 1 })}`}>Previous</Link>
        </Button>
      )}
      {visiblePages.map((item) => (
        <Button
          key={item}
          asChild
          variant={item === page ? "default" : "outline"}
          className="rounded-full"
        >
          <Link href={`/jobs?${toJobsSearchParams({ ...query, page: item })}`}>{item}</Link>
        </Button>
      ))}
      {page >= totalPages ? (
        <Button variant="outline" className="rounded-full" disabled>
          Next
        </Button>
      ) : (
        <Button asChild variant="outline" className="rounded-full">
          <Link href={`/jobs?${toJobsSearchParams({ ...query, page: page + 1 })}`}>Next</Link>
        </Button>
      )}
    </nav>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-950">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 [&_option]:bg-slate-100 [&_option]:text-slate-950"
      >
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function optionList(defaultLabel: string, values: JobsFacetOption[]) {
  return [
    { value: "", label: defaultLabel },
    ...values.map((option) => ({
      value: option.value,
      label: `${option.label} (${option.count})`,
    })),
  ];
}

function JobsFiltersPanel({
  query,
  facets,
}: {
  query: PublicJobsQuery;
  facets: PublicJobsFacets;
}) {
  return (
    <form action="/jobs" className="space-y-5">
      {hiddenQueryFields(query, [
        "salary",
        "experience",
        "education",
        "jobType",
        "workMode",
        "industry",
        "skills",
        "postedDate",
        "verified",
        "featured",
        "remote",
        "fresher",
        "page",
      ])}

      <FilterSelect label="Salary" name="salary" value={query.salary} options={salaryOptions} />
      <FilterSelect label="Experience" name="experience" value={query.experience} options={experienceOptions} />
      <FilterSelect
        label="Education"
        name="education"
        value={query.education}
        options={optionList("Any education", facets.education)}
      />
      <FilterSelect
        label="Job type"
        name="jobType"
        value={query.jobType}
        options={optionList("Any job type", facets.jobTypes)}
      />
      <FilterSelect
        label="Work mode"
        name="workMode"
        value={query.workMode}
        options={optionList("Any work mode", facets.workModes)}
      />
      <FilterSelect
        label="Industry"
        name="industry"
        value={query.industry}
        options={optionList("Any industry", facets.industries)}
      />
      <FilterSelect
        label="Posted date"
        name="postedDate"
        value={query.postedDate}
        options={postedDateOptions}
      />

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-950">Skills</p>
        <div className="flex flex-wrap gap-2">
          {facets.skills.map((skill) => (
            <label
              key={skill.value}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                query.skills.includes(skill.value)
                  ? "border-primary bg-primary/8 text-primary"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                name="skills"
                value={skill.value}
                defaultChecked={query.skills.includes(skill.value)}
                className="size-4 rounded border-slate-300"
              />
              <span>{skill.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { name: "verified", label: "Verified only", checked: query.verified },
          { name: "featured", label: "Featured only", checked: query.featured },
          { name: "remote", label: "Remote only", checked: query.remote },
          { name: "fresher", label: "Fresher only", checked: query.fresher },
        ].map((item) => (
          <label
            key={item.name}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600"
          >
            <input
              type="checkbox"
              name={item.name}
              value="true"
              defaultChecked={item.checked}
              className="size-4 rounded border-slate-300"
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="rounded-full">
          Apply filters
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/jobs">Clear all</Link>
        </Button>
      </div>
    </form>
  );
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parsePublicJobsQuery(params);
  const { results, total, page, totalPages, facets, relatedSearches, activeCount } =
    await searchPublicJobs(query);
  const badges = activeFilterBadges(query);
  const hasActiveJobs = activeCount > 0;
  const hasFilters = badges.length > 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SchemaScript
        data={buildCollectionPageSchema({
          name: "Public jobs in India",
          description: "Active public job listings with salary, trust, and location filters.",
          path: "/jobs",
        })}
      />

      <section className="relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm shadow-primary/10 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,_rgba(255,45,120,0.25),_transparent_55%),radial-gradient(circle_at_top_right,_rgba(0,255,204,0.18),_transparent_45%)]" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-slate-100 text-slate-950">Public jobs</Badge>
            <Badge variant="secondary" className="rounded-full">
              Active listings only
            </Badge>
          </div>

          <div className="mt-5 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Search active jobs with filters candidates actually use
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600">
                Browse public job openings by keyword, city, state, salary, experience, education, work mode,
                industry, skills, trust badges, and recency. This page only surfaces listings where the job
                status is <span className="font-semibold text-slate-950">active</span>.
              </p>
              <p className="max-w-3xl text-sm leading-6 text-slate-500">
                Featured listings, remote roles, fresher-friendly openings, and verified sources are all easy to
                isolate here, so candidates can move from broad discovery to shortlist-ready results faster.
              </p>
            </div>

            <Card className="rounded-[1.75rem] border-slate-100 bg-white shadow-none">
              <CardContent className="grid gap-4 p-6 text-sm text-slate-600 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Active jobs</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{activeCount}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Live filters</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{badges.length}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {hasActiveJobs ? "Popular skills" : "Inventory status"}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {hasActiveJobs
                      ? facets.skills.slice(0, 2).map((skill) => skill.label).join(", ")
                      : "No active jobs yet"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <form
            action="/jobs"
            className="relative mt-8 grid gap-3 rounded-[1.75rem] border border-slate-100 bg-white p-4 shadow-inner shadow-black/20 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto]"
          >
            {hiddenQueryFields(query, [
              "keyword",
              "city",
              "state",
              "page",
            ])}
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                name="keyword"
                defaultValue={query.keyword}
                placeholder="Job title, company, skill"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-950 shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <input
              type="text"
              name="city"
              defaultValue={query.city}
              placeholder="City"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            <input
              type="text"
              name="state"
              defaultValue={query.state}
              placeholder="State"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            <Button type="submit" className="h-12 rounded-2xl px-6">
              Search jobs
            </Button>
          </form>
        </div>
      </section>

      {badges.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <Badge key={badge} variant="secondary" className="rounded-full px-3 py-1">
              {badge}
            </Badge>
          ))}
        </div>
      ) : null}

      <section className="mt-8 grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">Filters</p>
                <p className="text-sm text-slate-500">Refine by salary, trust, and candidate fit.</p>
              </div>
            </div>
            <JobsFiltersPanel query={query} facets={facets} />
          </div>
        </aside>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-slate-800">
                <BriefcaseBusiness className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">{hasActiveJobs ? `${total} active jobs` : "No active jobs"}</p>
                <p className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="lg:hidden">
                <JobsFilterDrawer>
                  <JobsFiltersPanel query={query} facets={facets} />
                </JobsFilterDrawer>
              </div>

              <form action="/jobs" className="flex items-center gap-3">
                {hiddenQueryFields(query, ["sort", "page"])}
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <span>Sort by</span>
                  <select
                    name="sort"
                    defaultValue={query.sort}
                    className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-950 shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 [&_option]:bg-slate-100 [&_option]:text-slate-950"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button type="submit" variant="outline" className="rounded-full">
                  Update
                </Button>
              </form>
            </div>
          </div>

          {results.length === 0 ? (
            <Card className="rounded-[1.75rem] border-dashed border-slate-300 bg-white shadow-sm">
              <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Search className="size-6" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-slate-950">
                  {hasActiveJobs ? "No active jobs match these filters" : "No active jobs yet"}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                  {hasActiveJobs
                    ? "Try removing a few filters, broadening the keyword, or switching to a nearby city or state."
                    : "No active jobs yet. Check back soon or subscribe for alerts."}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {hasActiveJobs && hasFilters ? (
                    <Button asChild className="rounded-full">
                      <Link href="/jobs">Clear filters</Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href="/jobs?sort=latest">{hasActiveJobs ? "Browse latest jobs" : "Refresh jobs page"}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              <JobPersonalizationProvider
                jobs={results.map((job) => ({ id: job.id, slug: job.slug }))}
              >
                <PersonalizedJobCardList jobs={results} />
              </JobPersonalizationProvider>

              <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing {(page - 1) * 12 + 1} to {Math.min(page * 12, total)} of {total} active jobs.
                </p>
                <Pagination page={page} totalPages={totalPages} query={query} />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <Card className="rounded-[1.75rem] border-slate-100 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Related searches</h2>
                <p className="text-sm text-slate-500">Jump into common search paths candidates use from this page.</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {relatedSearches.map((item) => (
                <Button key={item.href} asChild variant="outline" className="rounded-full">
                  <Link href={item.href}>
                    {item.label}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ))}
              {!hasActiveJobs ? (
                <p className="text-sm text-slate-500">Related searches will appear here once active jobs are available.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-100 bg-white shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-slate-950">Search coverage on this page</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>Search fields cover keyword, city, and state so candidates can mix role intent with local discovery.</p>
              <p>Filters cover salary, experience, education, job type, work mode, industry, skills, posted date, verified, featured, remote, and fresher.</p>
              {hasActiveJobs ? (
                <p>
                  Sorting supports latest, salary high to low, deadline soon, and featured first across{" "}
                  <span className="font-semibold text-slate-950">{total}</span> filtered active jobs.
                </p>
              ) : (
                <p>This page will show coverage details after the first active jobs are published.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
