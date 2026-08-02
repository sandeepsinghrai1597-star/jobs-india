import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { careerGuides } from "@/lib/data/learning-roadmaps";
import { Card, CardContent } from "@/components/ui/card";

export default function CandidateRoadmapPage() {
  const featuredGuide = careerGuides[0];

  return (
    <DashboardShell
      role="candidate"
      title="Learning roadmap"
      description="Track skill-gap based weekly plans and recommended resources."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {featuredGuide.roadmap30Days.map((week) => (
          <Card
            key={week.label}
            className="rounded-[1.75rem] border-slate-200 bg-slate-100 backdrop-blur"
          >
            <CardContent className="space-y-3 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                {week.label}
              </p>
              <h2 className="font-heading text-2xl font-semibold">{week.focus}</h2>
              <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                {week.outcomes.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
