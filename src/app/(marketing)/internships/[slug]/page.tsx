import { notFound } from "next/navigation";
import { Building2, CalendarClock, Clock3, IndianRupee, MapPin } from "lucide-react";
import { buildInternshipCitySlug, formatDeadline, getInternshipBySlug, getSimilarInternships } from "@/lib/internships";
import { buildMetadata } from "@/lib/seo";
import { InternshipCard } from "@/components/internships/internship-card";
import { SchemaScript } from "@/components/shared/schema-script";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export async function generateStaticParams() {
  return [
    "marketing-intern-bangalore",
    "frontend-intern-remote",
    "data-analytics-intern-delhi",
    "hr-operations-intern-mumbai",
    "product-design-intern-bangalore",
    "content-writing-intern-remote",
  ].map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const internship = getInternshipBySlug(slug);

  if (!internship) {
    return buildMetadata({
      title: "Internship not found",
      description: "The requested internship could not be found.",
      path: `/internships/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `${internship.title} at ${internship.company}`,
    description: `${internship.title} internship in ${internship.location}. ${internship.stipend}, ${internship.duration}, apply before ${formatDeadline(internship.deadline)}.`,
    path: `/internships/${internship.slug}`,
    keywords: [
      internship.title,
      internship.company,
      internship.city,
      internship.industry,
      ...internship.skills,
    ],
  });
}

export default async function InternshipDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const internship = getInternshipBySlug(slug);

  if (!internship) notFound();

  const similarInternships = getSimilarInternships(internship);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SchemaScript
        data={{
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: internship.title,
          description: internship.description,
          employmentType: "INTERN",
          validThrough: internship.deadline,
          hiringOrganization: {
            "@type": "Organization",
            name: internship.company,
          },
          jobLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: internship.city,
              addressRegion: internship.state,
              addressCountry: internship.country,
            },
          },
          applicantLocationRequirements:
            internship.workMode === "remote"
              ? {
                  "@type": "Country",
                  name: "India",
                }
              : undefined,
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "INR",
            value: {
              "@type": "QuantitativeValue",
              minValue: internship.stipendMin,
              maxValue: internship.stipendMax,
              unitText: "MONTH",
            },
          },
        }}
      />
      <SchemaScript
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Internships",
              item: "/internships",
            },
            internship.city.toLowerCase() !== "remote"
              ? {
                  "@type": "ListItem",
                  position: 2,
                  name: `Internships in ${internship.city}`,
                  item: `/${buildInternshipCitySlug(internship.city)}`,
                }
              : null,
            {
              "@type": "ListItem",
              position: internship.city.toLowerCase() !== "remote" ? 3 : 2,
              name: internship.title,
              item: `/internships/${internship.slug}`,
            },
          ].filter(Boolean),
        }}
      />

      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-8">
          <div className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm backdrop-blur">
            <div className="flex flex-wrap gap-2">
              {internship.isPaid ? <Badge className="rounded-full">Paid internship</Badge> : null}
              <Badge variant="outline" className="rounded-full capitalize">
                {internship.workMode}
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                {internship.industry}
              </Badge>
            </div>
            <div className="space-y-3">
              <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-900">
                {internship.title}
              </h1>
              <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                <p className="flex items-center gap-2">
                  <Building2 className="size-4" />
                  {internship.company}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="size-4" />
                  {internship.location}
                </p>
                <p className="flex items-center gap-2">
                  <IndianRupee className="size-4" />
                  {internship.stipend}
                </p>
                <p className="flex items-center gap-2">
                  <Clock3 className="size-4" />
                  {internship.duration}
                </p>
                <p className="flex items-center gap-2 sm:col-span-2">
                  <CalendarClock className="size-4" />
                  Apply by {formatDeadline(internship.deadline)}
                </p>
              </div>
            </div>
            <p className="max-w-3xl leading-7 text-muted-foreground">{internship.summary}</p>
            {internship.applyUrl ? (
              <Button asChild className="rounded-full">
                <a href={internship.applyUrl} target="_blank" rel="noreferrer">
                  Apply now
                </a>
              </Button>
            ) : (
              <Button className="rounded-full" disabled>
                Apply link coming soon
              </Button>
            )}
          </div>

          <Card className="rounded-[2rem] border-slate-200 bg-white backdrop-blur">
            <CardContent className="space-y-8 p-8">
              <section className="space-y-3">
                <h2 className="font-heading text-2xl font-semibold">About this internship</h2>
                <p className="leading-7 text-muted-foreground">{internship.description}</p>
              </section>
              <section className="space-y-3">
                <h2 className="font-heading text-2xl font-semibold">Responsibilities</h2>
                <ul className="space-y-2 text-muted-foreground">
                  {internship.responsibilities.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </section>
              <section className="space-y-3">
                <h2 className="font-heading text-2xl font-semibold">Requirements</h2>
                <ul className="space-y-2 text-muted-foreground">
                  {internship.requirements.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </section>
              <section className="space-y-3">
                <h2 className="font-heading text-2xl font-semibold">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {internship.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="rounded-full">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </section>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2rem] border-slate-200 bg-white backdrop-blur">
            <CardContent className="space-y-4 p-6">
              <h2 className="font-semibold">Quick facts</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Role: {internship.title}</p>
                <p>Company: {internship.company}</p>
                <p>Industry: {internship.industry}</p>
                <p>Deadline: {formatDeadline(internship.deadline)}</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="font-heading text-2xl font-semibold">Similar internships</h2>
            {similarInternships.map((item) => (
              <InternshipCard key={item.id} internship={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
