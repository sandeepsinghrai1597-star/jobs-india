import Link from "next/link";
import { notFound } from "next/navigation";
import { careerGuides, getCareerGuideBySlug } from "@/lib/data/learning-roadmaps";
import { buildMetadata } from "@/lib/seo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getCareerGuideBySlug(slug);

  if (!guide) {
    return buildMetadata({
      title: "Career guide not found",
      description: "The requested career guide could not be found.",
      path: `/career-guide/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: guide.title,
    description: guide.summary,
    path: `/career-guide/${guide.slug}`,
    keywords: [...guide.skills, ...guide.jobsToApplyFor],
  });
}

export function generateStaticParams() {
  return careerGuides.map((guide) => ({
    slug: guide.slug,
  }));
}

function RoadmapCard({
  label,
  focus,
  outcomes,
}: {
  label: string;
  focus: string;
  outcomes: string[];
}) {
  return (
    <Card className="rounded-[1.75rem] border border-slate-200 bg-slate-50 shadow-sm">
      <CardContent className="space-y-3 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
          {label}
        </p>
        <h2 className="font-heading text-2xl font-semibold text-slate-950">{focus}</h2>
        <ul className="space-y-2 text-sm leading-6 text-slate-600">
          {outcomes.map((outcome) => (
            <li key={outcome}>- {outcome}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default async function CareerGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getCareerGuideBySlug(slug);

  if (!guide) notFound();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-4">
              <Badge className="rounded-full bg-sky-600 px-3 py-1 text-slate-950">
                {guide.targetRole}
              </Badge>
              <div className="space-y-3">
                <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {guide.title}
                </h1>
                <p className="max-w-3xl text-lg leading-8 text-slate-600">{guide.summary}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Role overview
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{guide.roleOverview}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Salary range
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{guide.salaryRange}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border border-slate-200 bg-slate-100 text-slate-950 shadow-sm">
          <CardContent className="space-y-5 p-6 sm:p-8">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Skills required
              </p>
              <h2 className="font-heading text-2xl font-semibold">Core stack to focus on</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {guide.skills.map((skill) => (
                <Badge key={skill} variant="outline" className="rounded-full border-slate-300 text-slate-950">
                  {skill}
                </Badge>
              ))}
            </div>
            <Link
              href="/learning-roadmap"
              className="inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-50"
            >
              Try the AI roadmap generator
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
            30-day roadmap
          </p>
          <h2 className="font-heading text-3xl font-semibold text-slate-950">
            First month momentum
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {guide.roadmap30Days.map((phase) => (
            <RoadmapCard key={phase.label} {...phase} />
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
            90-day roadmap
          </p>
          <h2 className="font-heading text-3xl font-semibold text-slate-950">
            What job-ready progress looks like
          </h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {guide.roadmap90Days.map((phase) => (
            <RoadmapCard key={phase.label} {...phase} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-5 p-6 sm:p-8">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                Projects to build
              </p>
              <h2 className="font-heading text-3xl font-semibold text-slate-950">
                Portfolio proof beats generic claims
              </h2>
            </div>
            <div className="space-y-4">
              {guide.projects.map((project) => (
                <div key={project.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-heading text-xl font-semibold text-slate-950">
                    {project.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{project.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-5 p-6 sm:p-8">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                Free learning resources
              </p>
              <h2 className="font-heading text-3xl font-semibold text-slate-950">
                Start learning without waiting
              </h2>
            </div>
            <div className="space-y-4">
              {guide.freeResources.map((resource) => (
                <a
                  key={resource.title}
                  href={resource.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition hover:border-sky-200 hover:bg-sky-50"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {resource.provider}
                  </p>
                  <h3 className="mt-2 font-heading text-xl font-semibold text-slate-950">
                    {resource.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{resource.description}</p>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-4 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
              Certifications
            </p>
            <ul className="space-y-3 text-sm leading-6 text-slate-600">
              {guide.certifications.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-4 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
              Jobs to apply for
            </p>
            <div className="flex flex-wrap gap-2">
              {guide.jobsToApplyFor.map((job) => (
                <Badge key={job} variant="outline" className="rounded-full border-slate-300 px-3 py-1 text-slate-700">
                  {job}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
            FAQs
          </p>
          <h2 className="font-heading text-3xl font-semibold text-slate-950">
            Common questions from learners
          </h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {guide.faqs.map((faq) => (
            <Card key={faq.question} className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
              <CardContent className="space-y-3 p-6">
                <h3 className="font-heading text-xl font-semibold text-slate-950">
                  {faq.question}
                </h3>
                <p className="text-sm leading-6 text-slate-600">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
