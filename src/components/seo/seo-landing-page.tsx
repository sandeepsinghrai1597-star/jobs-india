import Link from "next/link";
import type { BlogPost, GovernmentJob, Job, SeoPageDefinition } from "@/types";
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildFaqSchema,
  buildJobPostingSchema,
  buildOrganizationSchema,
} from "@/lib/seo";
import { BreadcrumbsNav } from "@/components/seo/breadcrumbs";
import { FaqSection } from "@/components/seo/faq-section";
import { InternalLinksSection } from "@/components/seo/internal-links-section";
import { JobCard } from "@/components/jobs/job-card";
import { SchemaScript } from "@/components/shared/schema-script";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function SeoLandingPage({
  page,
  jobs,
  governmentJobListings,
  relatedCities,
  relatedCategories,
  relatedPosts,
}: {
  page: SeoPageDefinition;
  jobs: Job[];
  governmentJobListings: GovernmentJob[];
  relatedCities: Array<{ href: string; label: string }>;
  relatedCategories: Array<{ href: string; label: string }>;
  relatedPosts: BlogPost[];
}) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Jobs", href: "/jobs" },
    { label: page.h1 },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <SchemaScript data={buildOrganizationSchema()} />
      <SchemaScript
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Jobs", path: "/jobs" },
          { name: page.h1, path: `/${page.slug}` },
        ])}
      />
      <SchemaScript
        data={buildCollectionPageSchema({
          name: page.h1,
          description: page.description,
          path: `/${page.slug}`,
        })}
      />
      <SchemaScript data={buildFaqSchema(page.faqs)} />
      {jobs.slice(0, 3).map((job) => (
        <SchemaScript key={job.id} data={buildJobPostingSchema(job)} />
      ))}

      <BreadcrumbsNav items={breadcrumbItems} />

      <section className="rounded-[2rem] bg-gradient-to-br from-slate-100 via-slate-50 to-cyan-900 px-6 py-10 text-white shadow-2xl shadow-slate-300/20 md:px-10">
        <div className="space-y-5">
          <Badge className="w-fit rounded-full bg-slate-100 px-4 py-1 text-slate-950 hover:bg-slate-100">
            SEO Landing Page
          </Badge>
          <div className="space-y-4">
            <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
              {page.h1}
            </h1>
            <p className="max-w-4xl text-lg leading-8 text-slate-800">{page.intro}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-800">
            <span className="rounded-full border border-slate-200 px-4 py-2">
              {jobs.length} live job matches
            </span>
            {governmentJobListings.length > 0 && (
              <span className="rounded-full border border-slate-200 px-4 py-2">
                {governmentJobListings.length} government listings
              </span>
            )}
            <span className="rounded-full border border-slate-200 px-4 py-2">
              Updated daily
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-semibold text-slate-950">Active Job Listings</h2>
          <p className="text-sm leading-6 text-slate-500">
            Listings are filtered and updated automatically based on this page&apos;s search intent.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </section>

      {governmentJobListings.length ? (
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-semibold text-slate-950">Related Government Listings</h2>
            <p className="text-sm leading-6 text-slate-500">
              Official public-sector and government recruitment opportunities related to this search.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {governmentJobListings.map((job) => (
              <Card key={job.slug} className="rounded-[1.75rem] border-slate-100 bg-white shadow-sm">
                <CardContent className="space-y-3 p-6">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {job.department}
                    </p>
                    <h3 className="text-xl font-semibold text-slate-950">{job.title}</h3>
                  </div>
                  <p className="text-sm leading-6 text-slate-500">{job.summary}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-white px-3 py-1">{job.state}</span>
                    <span className="rounded-full bg-white px-3 py-1">Last date: {job.lastDate}</span>
                  </div>
                  <Link
                    href={`/government-jobs/${job.slug}`}
                    className="inline-flex text-sm font-semibold text-primary transition hover:text-primary/80"
                  >
                    View government job →
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <FaqSection faqs={page.faqs} />

      <div className="grid gap-6 xl:grid-cols-3">
        <InternalLinksSection
          title="Related City Links"
          description="Strengthen topical coverage with nearby and parallel city hiring hubs."
          links={relatedCities}
        />
        <InternalLinksSection
          title="Related Category Links"
          description="Move across fresher, qualification, role, and remote search intents without losing context."
          links={relatedCategories}
        />
        <InternalLinksSection
          title="Supporting Internal Links"
          description="Connect job seekers to broader content and deeper job discovery paths."
          links={[
            { href: "/jobs", label: "Browse all jobs" },
            { href: "/blog", label: "Read the blog" },
            { href: "/career-guide", label: "Explore career guides" },
            ...relatedPosts.map((post) => ({
              href: `/blog/${post.slug}`,
              label: post.title,
            })),
          ]}
        />
      </div>
    </div>
  );
}
