import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import {
  getGovernmentJobCategoryBySlug,
  governmentJobsDisclaimer,
} from "@/lib/data/government-jobs";
import {
  getGovernmentJobBySlug,
  getGovernmentJobsByCategory,
  getGovernmentSegments,
  getRelatedGovernmentJobs,
} from "@/lib/government-jobs/live";
import { SchemaScript } from "@/components/shared/schema-script";
import { WhatsAppAlertCTA } from "@/components/shared/whatsapp-alert-cta";
import { Card, CardContent } from "@/components/ui/card";

function appendYearOnce(title: string, suffix: string) {
  return /\b20\d{2}\b/.test(title) ? title : `${title} ${suffix}`;
}

function DetailGrid({
  items,
}: {
  items: Array<{ label: string; value: string }> | undefined;
}) {
  if (!items?.length) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
      <div className="grid divide-y divide-slate-200">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="grid gap-2 px-5 py-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-4">
            <p className="text-sm font-semibold text-slate-950">{item.label}</p>
            <p className="text-sm leading-6 text-slate-600">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BulletSections({
  sections,
}: {
  sections: Array<{ title: string; bullets: string[] }> | undefined;
}) {
  if (!sections?.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      {sections.map((section, sectionIndex) => (
        <div key={`${section.title}-${sectionIndex}`} className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-slate-950">{section.title}</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            {section.bullets.map((bullet, bulletIndex) => (
              <li key={`${bulletIndex}-${bullet}`}>- {bullet}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const GENERIC_LINK_LABELS = new Set([
  "click here",
  "click here to apply",
  "here",
  "open",
  "link",
  "download",
  "visit",
  "apply",
]);

function describeLinkFromHref(href: string) {
  let url: URL | null = null;
  try {
    url = new URL(href);
  } catch {
    return "Official Link";
  }

  const path = `${url.pathname}${url.search}`.toLowerCase();
  if (/(apply|registration|register|onlineform|online-form|candidate|login)/.test(path)) {
    return `Apply Online (${url.hostname.replace(/^www\./, "")})`;
  }
  if (/(notification|advertisement|advt|\.pdf)/.test(path)) {
    return `Official Notification (${url.hostname.replace(/^www\./, "")})`;
  }
  if (/(result|merit)/.test(path)) {
    return `Result (${url.hostname.replace(/^www\./, "")})`;
  }
  if (/(admit|hallticket|hall-ticket)/.test(path)) {
    return `Admit Card (${url.hostname.replace(/^www\./, "")})`;
  }
  return `Official Website (${url.hostname.replace(/^www\./, "")})`;
}

function LinkList({
  links,
}: {
  links: Array<{ label: string; href: string }> | undefined;
}) {
  if (!links?.length) {
    return null;
  }

  const seenHrefs = new Set<string>();
  const cleanedLinks = links
    .filter((link) => {
      const href = link.href.trim();
      if (!href || seenHrefs.has(href)) {
        return false;
      }
      seenHrefs.add(href);
      return true;
    })
    .map((link) => ({
      href: link.href.trim(),
      label: GENERIC_LINK_LABELS.has(link.label.trim().toLowerCase())
        ? describeLinkFromHref(link.href.trim())
        : link.label.trim(),
    }));

  if (!cleanedLinks.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      {cleanedLinks.map((link, index) => (
        <a
          key={`${link.href}-${index}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="flex items-center justify-between rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
        >
          <span>{link.label}</span>
          <span>Open</span>
        </a>
      ))}
    </div>
  );
}

export async function generateStaticParams() {
  const segments = await getGovernmentSegments();
  return segments.map((segment) => ({ segment }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ segment: string }>;
}) {
  const { segment } = await params;
  const category = getGovernmentJobCategoryBySlug(segment);

  if (category) {
    const jobs = await getGovernmentJobsByCategory(category.slug);

    return buildMetadata({
      title: `${category.name} Government Jobs 2026`,
      description: `${category.intro} Check eligibility, age limit, application fee, last date, selection process, and official links.`,
      path: `/government-jobs/${category.slug}`,
      keywords: [...category.keywords, ...jobs.map((job) => job.title)],
    });
  }

  const job = await getGovernmentJobBySlug(segment);

  if (!job) {
    return buildMetadata({
      title: "Government job page not found",
      description: "The requested government jobs page could not be found.",
      path: `/government-jobs/${segment}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `${appendYearOnce(job.title, "2026")}: Eligibility, Last Date, Apply Link`,
    description: `${job.title} notification with department, eligibility, age limit, application fee, official notification link, apply link, syllabus, selection process, and important dates.`,
    path: `/government-jobs/${job.slug}`,
    keywords: [job.title, job.department, job.category, `${job.category} jobs`, `${job.state} government jobs`],
  });
}

export default async function GovernmentJobsDynamicPage({
  params,
}: {
  params: Promise<{ segment: string }>;
}) {
  const { segment } = await params;
  const category = getGovernmentJobCategoryBySlug(segment);

  if (category) {
    const items = await getGovernmentJobsByCategory(category.slug);

    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
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
              {
                "@type": "ListItem",
                position: 3,
                name: category.name,
                item: `/government-jobs/${category.slug}`,
              },
            ],
          }}
        />
        <SchemaScript
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.slice(0, 3).map((job) => ({
              "@type": "Question",
              name: `What should candidates check before applying for ${job.title}?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `${job.title} candidates should confirm eligibility, age limit, application fee, important dates, and the official notification on the department website before applying.`,
              },
            })),
          }}
        />

        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Government Job Category
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight">
            {category.name} Government Jobs 2026
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            {category.intro} This page is built for government-job-style browsing with quick internal links to official notification pages, application links, and exam-oriented details.
          </p>
          <p className="mt-6 rounded-2xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {governmentJobsDisclaimer}
          </p>
        </div>

        <section className="mt-10 grid gap-6">
          {items.map((job) => (
            <Card key={job.id} className="rounded-[1.75rem] border-slate-200 bg-white backdrop-blur">
              <CardContent className="space-y-5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                      {job.department}
                    </p>
                    <h2 className="mt-2 font-heading text-2xl font-semibold">{job.title}</h2>
                  </div>
                  <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-muted-foreground">
                    {job.state}
                  </span>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{job.summary}</p>
                <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                  <p>Eligibility: {job.eligibility}</p>
                  <p>Age limit: {job.ageLimit}</p>
                  <p>Application fee: {job.applicationFee}</p>
                  <p>Last date: {job.lastDate}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm font-semibold">
                  <Link href={`/government-jobs/${job.slug}`} className="text-primary">
                    Read full details
                  </Link>
                  <a href={job.officialNotificationLink} target="_blank" rel="noreferrer" className="text-muted-foreground">
                    Official notification
                  </a>
                  <a href={job.applyLink} target="_blank" rel="noreferrer" className="text-muted-foreground">
                    Apply link
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    );
  }

  const job = await getGovernmentJobBySlug(segment);
  if (!job) notFound();

  const relatedJobs = await getRelatedGovernmentJobs(job.slug, job.categorySlug ?? "");

  const jobPostingSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.summary ?? job.title,
    validThrough: job.lastDate ?? undefined,
    employmentType: "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: job.department,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.state,
        addressCountry: "IN",
      },
    },
    ...(job.openings ? { totalJobOpenings: Number(job.openings) || undefined } : {}),
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SchemaScript data={jobPostingSchema} />
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
            {
              "@type": "ListItem",
              position: 3,
              name: job.category,
              item: `/government-jobs/${job.categorySlug}`,
            },
            {
              "@type": "ListItem",
              position: 4,
              name: job.title,
              item: `/government-jobs/${job.slug}`,
            },
          ],
        }}
      />
      <SchemaScript
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: (job.faq ?? []).map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }}
      />

      <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-8">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/government-jobs/${job.categorySlug}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary"
              >
                {job.category}
              </Link>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                {job.state}
              </span>
            </div>
            <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight text-slate-950">{job.title}</h1>
            <p className="mt-4 text-base leading-7 text-slate-600">{job.summary}</p>
            {job.shortInformation ? (
              <div className="mt-6 rounded-[1.5rem] border border-sky-200 bg-sky-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Short Information</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{job.shortInformation}</p>
              </div>
            ) : null}
            <p className="mt-6 rounded-2xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              {governmentJobsDisclaimer}
            </p>
          </section>

          <Card className="rounded-[2rem] border-slate-200 bg-slate-50 shadow-sm">
            <CardContent className="grid gap-4 p-8 sm:grid-cols-2">
              <p><span className="font-semibold text-slate-950">Department:</span> {job.department}</p>
              <p><span className="font-semibold text-slate-950">Category:</span> {job.category}</p>
              <p><span className="font-semibold text-slate-950">State:</span> {job.state}</p>
              <p><span className="font-semibold text-slate-950">Eligibility:</span> {job.eligibility}</p>
              <p><span className="font-semibold text-slate-950">Age limit:</span> {job.ageLimit}</p>
              <p><span className="font-semibold text-slate-950">Application fee:</span> {job.applicationFee}</p>
              <p><span className="font-semibold text-slate-950">Last date:</span> {job.lastDate}</p>
              <p><span className="font-semibold text-slate-950">Openings:</span> {job.openings ?? "Check notification"}</p>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
            <CardContent className="space-y-8 p-8">
              {job.overview?.length ? (
                <section className="space-y-4">
                  <h2 className="font-heading text-2xl font-semibold text-slate-950">Overview</h2>
                  <DetailGrid items={job.overview} />
                </section>
              ) : null}

              {(job.importantDates ?? []).length > 0 ? (
                <section className="space-y-4">
                  <h2 className="font-heading text-2xl font-semibold text-slate-950">Important Dates</h2>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <ul className="space-y-2 text-sm leading-6 text-slate-600">
                      {(job.importantDates ?? []).map((item, index) => (
                        <li key={`${index}-${item}`}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              ) : null}

              {job.feeDetails?.length ? (
                <section className="space-y-4">
                  <h2 className="font-heading text-2xl font-semibold text-slate-950">Application Fee</h2>
                  <DetailGrid items={job.feeDetails} />
                </section>
              ) : null}

              {job.ageDetails?.length ? (
                <section className="space-y-4">
                  <h2 className="font-heading text-2xl font-semibold text-slate-950">Age Limit</h2>
                  <DetailGrid items={job.ageDetails} />
                </section>
              ) : null}

              {job.vacancyDetails?.length ? (
                <section className="space-y-4">
                  <h2 className="font-heading text-2xl font-semibold text-slate-950">Vacancy Details</h2>
                  <DetailGrid items={job.vacancyDetails} />
                </section>
              ) : null}

              {job.educationDetails?.length ? (
                <section className="space-y-4">
                  <h2 className="font-heading text-2xl font-semibold text-slate-950">Educational Qualification</h2>
                  <DetailGrid items={job.educationDetails} />
                </section>
              ) : null}

              {job.salaryDetails?.length ? (
                <section className="space-y-4">
                  <h2 className="font-heading text-2xl font-semibold text-slate-950">Salary Structure</h2>
                  <DetailGrid items={job.salaryDetails} />
                </section>
              ) : null}

              <section className="space-y-3">
                <h2 className="font-heading text-2xl font-semibold text-slate-950">Official Notification</h2>
                {job.officialNotificationLink ? (
                  <a
                    href={job.officialNotificationLink}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-sm font-semibold text-primary"
                  >
                    Visit official notification
                  </a>
                ) : (
                  <p className="text-sm text-slate-500">Verify the latest notification on the official website.</p>
                )}
              </section>
              <section className="space-y-3">
                <h2 className="font-heading text-2xl font-semibold text-slate-950">Apply Link</h2>
                {job.applyLink ? (
                  <a href={job.applyLink} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary">
                    Apply online
                  </a>
                ) : (
                  <p className="text-sm text-slate-500">Use the official website to confirm whether an online application link is available.</p>
                )}
              </section>
              {job.syllabus ? (
              <section className="space-y-3">
                <h2 className="font-heading text-2xl font-semibold text-slate-950">Syllabus</h2>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <p className="leading-7 text-slate-600">{job.syllabus}</p>
                </div>
              </section>
              ) : null}
              {job.selectionProcess ? (
              <section className="space-y-3">
                <h2 className="font-heading text-2xl font-semibold text-slate-950">Selection Process</h2>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <p className="leading-7 text-slate-600">{job.selectionProcess}</p>
                </div>
              </section>
              ) : null}

              {job.selectionSteps?.length ? (
                <section className="space-y-4">
                  <h2 className="font-heading text-2xl font-semibold text-slate-950">Selection Stages</h2>
                  <BulletSections sections={job.selectionSteps} />
                </section>
              ) : null}

              {job.documentsRequired?.length ? (
                <section className="space-y-4">
                  <h2 className="font-heading text-2xl font-semibold text-slate-950">Documents Required</h2>
                  <BulletSections sections={job.documentsRequired} />
                </section>
              ) : null}

              {job.howToApplySteps?.length ? (
                <section className="space-y-4">
                  <h2 className="font-heading text-2xl font-semibold text-slate-950">How To Apply</h2>
                  <BulletSections sections={job.howToApplySteps} />
                </section>
              ) : null}

              {job.importantLinks?.length ? (
                <section className="space-y-4">
                  <h2 className="font-heading text-2xl font-semibold text-slate-950">Important Links</h2>
                  <LinkList links={job.importantLinks} />
                </section>
              ) : null}

              <section className="space-y-3">
                <h2 className="font-heading text-2xl font-semibold text-slate-950">Source Reference</h2>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <p className="text-sm leading-6 text-slate-600">
                    This page is reconstructed from the JobPulse source listing and official links so candidates can review the complete job information in one place before leaving the site.
                  </p>
                  {job.sourceUrl ? (
                    <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-primary">
                      Open JobPulse source page
                    </a>
                  ) : null}
                </div>
              </section>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
            <CardContent className="space-y-5 p-8">
              <h2 className="font-heading text-2xl font-semibold text-slate-950">Frequently Asked Questions</h2>
              {(job.faq ?? []).length > 0 ? (
                (job.faq ?? []).map((item, index) => (
                  <div key={`${index}-${item.question}`} className="space-y-2 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-950">{item.question}</h3>
                    <p className="text-sm leading-6 text-slate-600">{item.answer}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Detailed FAQs will appear here when they are available from the source listing.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
            <CardContent className="space-y-4 p-6">
              <h2 className="font-heading text-2xl font-semibold text-slate-950">Quick Actions</h2>
              <div className="space-y-3 text-sm font-semibold">
                <a href={job.officialNotificationLink ?? job.officialUrl ?? "#"} target="_blank" rel="noreferrer" className="block text-primary">
                  Open official notification
                </a>
                <a href={job.applyLink ?? job.officialUrl ?? "#"} target="_blank" rel="noreferrer" className="block text-primary">
                  Open apply link
                </a>
                {job.sourceUrl ? (
                  <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="block text-primary">
                    Open source page
                  </a>
                ) : null}
                <Link href={`/government-jobs/${job.categorySlug}`} className="block text-primary">
                  Browse more {job.category} jobs
                </Link>
                <Link href="/government-jobs" className="block text-primary">
                  Back to Government Jobs Hub
                </Link>
              </div>
            </CardContent>
          </Card>

          {job.salary ? (
          <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
            <CardContent className="space-y-4 p-6">
              <h2 className="font-heading text-2xl font-semibold text-slate-950">Salary Snapshot</h2>
              <p className="text-sm leading-6 text-slate-600">{job.salary}</p>
            </CardContent>
          </Card>
          ) : null}

          <WhatsAppAlertCTA category={job.category} />

          {relatedJobs.length ? (
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-semibold text-slate-950">Related Government Jobs</h2>
              {relatedJobs.map((item) => (
                <Card key={item.id} className="rounded-[1.75rem] border-slate-200 bg-white shadow-sm">
                  <CardContent className="space-y-3 p-5">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                        {item.category}
                      </p>
                      <h3 className="mt-2 font-heading text-xl font-semibold text-slate-950">{item.title}</h3>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{item.summary}</p>
                    <Link href={`/government-jobs/${item.slug}`} className="text-sm font-semibold text-primary">
                      Read full details
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
