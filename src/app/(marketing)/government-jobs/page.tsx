import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import {
  governmentJobCategories,
  governmentJobsDisclaimer,
} from "@/lib/data/government-jobs";
import { classifyGovernmentUpdate, getApprovedGovernmentJobs } from "@/lib/government-jobs/live";
import { SchemaScript } from "@/components/shared/schema-script";
import { SectionHeading } from "@/components/shared/section-heading";
import { WhatsAppAlertCTA } from "@/components/shared/whatsapp-alert-cta";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = buildMetadata({
  title: "Government Jobs Hub 2026",
  description:
    "Explore SSC, UPSC, banking, railways, defence, police, teaching, and state government jobs with official links, eligibility, fees, and last dates.",
  path: "/government-jobs",
  keywords: [
    "government jobs 2026",
    "latest govt jobs",
    "ssc jobs",
    "upsc jobs",
    "bank jobs",
    "railway jobs",
  ],
});

const faq = [
  {
    question: "How should candidates use this government jobs hub?",
    answer:
      "Use it to compare eligibility, age limit, fees, and last dates quickly, then verify every detail on the official website before applying.",
  },
  {
    question: "Which categories are covered on this page?",
    answer:
      "This hub covers SSC, UPSC, Banking, Railways, Defence, Police, Teaching, State Government, Haryana Jobs, Punjab Jobs, Delhi Jobs, Rajasthan Jobs, and UP Jobs.",
  },
  {
    question: "Does this page include official notification and apply links?",
    answer:
      "Yes, every government job detail page is designed to highlight the official notification link and the apply link prominently.",
  },
];

export default async function GovernmentJobsPage() {
  const approvedGovernmentJobs = await getApprovedGovernmentJobs();
  const recruitmentUpdates = approvedGovernmentJobs.filter(
    (job) => classifyGovernmentUpdate(job.title) === "recruitment",
  );
  const admitCardUpdates = approvedGovernmentJobs.filter(
    (job) => classifyGovernmentUpdate(job.title) === "admit-card",
  );
  const resultUpdates = approvedGovernmentJobs.filter((job) => {
    const type = classifyGovernmentUpdate(job.title);
    return type === "result" || type === "answer-key";
  });
  const featuredJobs = (recruitmentUpdates.length >= 6 ? recruitmentUpdates : approvedGovernmentJobs).slice(0, 6);

  const updateColumns = [
    { heading: "Latest Recruitment", items: recruitmentUpdates.slice(0, 10) },
    { heading: "Admit Card / Exam City", items: admitCardUpdates.slice(0, 10) },
    { heading: "Result / Answer Key", items: resultUpdates.slice(0, 10) },
  ].filter((column) => column.items.length > 0);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SchemaScript
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: "/",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Government Jobs",
              item: "/government-jobs",
            },
          ],
        }}
      />
      <SchemaScript
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }}
      />

      <div className="space-y-8 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm backdrop-blur">
        <SectionHeading
          eyebrow="Government Jobs Hub"
          title="Latest government job updates with official-link-first details"
          description="Browse government-job-style listings for SSC, UPSC, banking, railways, defence, police, teaching, and state-level recruitment pages with fast access to eligibility, application fee, age limit, important dates, and official notification links."
          as="h1"
        />
        <p className="rounded-2xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {governmentJobsDisclaimer}
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
            <p className="text-sm uppercase tracking-[0.18em] text-primary">Categories</p>
            <p className="mt-2 text-3xl font-semibold">{governmentJobCategories.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
            <p className="text-sm uppercase tracking-[0.18em] text-primary">Live Pages</p>
            <p className="mt-2 text-3xl font-semibold">{approvedGovernmentJobs.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
            <p className="text-sm uppercase tracking-[0.18em] text-primary">Focus</p>
            <p className="mt-2 text-lg font-medium">Official notification, apply link, dates, and FAQs</p>
          </div>
        </div>
      </div>

      <WhatsAppAlertCTA />

      {updateColumns.length > 0 && (
        <section className="mt-12">
          <SectionHeading
            eyebrow="Latest Updates"
            title="Recruitment, admit card, and result updates at a glance"
            description="Track every stage of a recruitment cycle — new notifications, admit card and exam city releases, and results with answer keys — from one hub."
          />
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {updateColumns.map((column) => (
              <Card key={column.heading} className="rounded-[1.75rem] border-slate-200 bg-white backdrop-blur">
                <CardContent className="space-y-4 p-6">
                  <h2 className="font-heading text-xl font-semibold">{column.heading}</h2>
                  <ul className="space-y-3 text-sm leading-6">
                    {column.items.map((job) => (
                      <li key={job.slug} className="border-b border-slate-100 pb-2 last:border-b-0">
                        <Link href={`/government-jobs/${job.slug}`} className="font-medium text-primary hover:underline">
                          {job.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">Last date: {job.lastDate}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <SectionHeading
          eyebrow="Browse Categories"
          title="Government job categories"
          description="Open a category page to see related notifications, SEO-friendly summaries, internal links, and quick navigation to job details."
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {governmentJobCategories.map((category) => {
            const count = approvedGovernmentJobs.filter((job) => job.categorySlug === category.slug).length;

            return (
              <Card key={category.slug} className="rounded-[1.75rem] border-slate-200 bg-white backdrop-blur">
                <CardContent className="space-y-4 p-6">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                      {count} page{count === 1 ? "" : "s"}
                    </p>
                    <h2 className="mt-2 font-heading text-2xl font-semibold">{category.name}</h2>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{category.intro}</p>
                  <Link href={`/government-jobs/${category.slug}`} className="text-sm font-semibold text-primary">
                    Explore {category.name} jobs
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading
          eyebrow="Featured Listings"
          title="Popular government jobs to track now"
          description="Each detail page includes eligibility, age limit, application fee, important dates, selection process, syllabus overview, and official links."
        />
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {featuredJobs.map((job) => (
            <Card key={job.id} className="rounded-[1.75rem] border-slate-200 bg-white backdrop-blur">
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                    {job.category}
                  </p>
                  <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-muted-foreground">
                    {job.state}
                  </span>
                </div>
                <div>
                  <h2 className="font-heading text-2xl font-semibold">{job.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{job.summary}</p>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <p>Department: {job.department}</p>
                  <p>Eligibility: {job.eligibility}</p>
                  <p>Age limit: {job.ageLimit}</p>
                  <p>Last date: {job.lastDate}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm font-semibold">
                  <Link href={`/government-jobs/${job.slug}`} className="text-primary">
                    View details
                  </Link>
                  <Link href={`/government-jobs/${job.categorySlug}`} className="text-muted-foreground">
                    More in {job.category}
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm backdrop-blur">
        <SectionHeading
          eyebrow="How To Use"
          title="Use category pages and detail pages together"
          description="The hub is organized for internal linking and SEO: category pages collect similar recruitments, and detail pages break down official notification links, apply links, syllabus, selection process, and important dates."
        />
        <div className="mt-6 space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            Start with broad pages such as{" "}
            <Link href="/government-jobs/ssc" className="font-semibold text-primary">
              SSC Jobs
            </Link>{" "}
            or{" "}
            <Link href="/government-jobs/upsc" className="font-semibold text-primary">
              UPSC Jobs
            </Link>{" "}
            to compare related opportunities.
          </p>
          <p>
            Then open listing pages like{" "}
            <Link href="/government-jobs/ssc-cgl-2026" className="font-semibold text-primary">
              SSC CGL 2026
            </Link>{" "}
            or{" "}
            <Link href="/government-jobs/ibps-po-2026" className="font-semibold text-primary">
              IBPS PO 2026
            </Link>{" "}
            for finer application details.
          </p>
          <p>{governmentJobsDisclaimer}</p>
        </div>
      </section>
    </div>
  );
}
