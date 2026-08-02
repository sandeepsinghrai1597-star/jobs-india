import Link from "next/link";
import { careerGuides } from "@/lib/data/learning-roadmaps";
import { buildMetadata } from "@/lib/seo";
import { LearningRoadmapGenerator } from "@/components/marketing/learning-roadmap-generator";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = buildMetadata({
  title: "Learning Roadmap",
  description:
    "Generate AI career roadmaps and explore structured 30-day and 90-day guides for popular career paths.",
  path: "/learning-roadmap",
});

export default function LearningRoadmapPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <SectionHeading
            eyebrow="Learning Roadmap"
            title="Choose a career path and turn it into a weekly plan"
            description="This section combines SEO-friendly career guides with an AI roadmap generator so learners can move from curiosity to concrete action."
            as="h1"
          />
          <div className="flex flex-wrap gap-2">
            {careerGuides.map((guide) => (
              <Badge key={guide.slug} variant="outline" className="rounded-full border-slate-300 bg-white px-3 py-1 text-slate-800">
                {guide.targetRole}
              </Badge>
            ))}
          </div>
        </div>
        <Card className="rounded-[2rem] border border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardContent className="space-y-4 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Included in every AI result
            </p>
            <ul className="space-y-3 text-sm leading-6 text-slate-800">
              <li>✓ Skills required</li>
              <li>✓ Weekly plan</li>
              <li>✓ Projects to build</li>
              <li>✓ Resume keywords</li>
              <li>✓ Interview topics</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <LearningRoadmapGenerator />

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Career guide library
          </p>
          <h2 className="font-heading text-3xl font-semibold text-slate-950">
            Start with a guide, then personalize it with AI
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {careerGuides.map((guide) => (
            <Link key={guide.slug} href={`/career-guide/${guide.slug}`}>
              <Card className="h-full rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                <CardContent className="space-y-4 p-6">
                  <div className="space-y-3">
                    <Badge variant="outline" className="rounded-full border-slate-300 bg-white text-cyan-700">
                      {guide.duration}
                    </Badge>
                    <h3 className="font-heading text-2xl font-semibold text-slate-950">{guide.title}</h3>
                    <p className="text-sm leading-6 text-slate-500">{guide.summary}</p>
                  </div>
                  <p className="text-sm font-medium text-slate-600">{guide.salaryRange}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
