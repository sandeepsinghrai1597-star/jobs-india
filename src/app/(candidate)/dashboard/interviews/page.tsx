import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";

export default function CandidateInterviewsPage() {
  return (
    <DashboardShell
      role="candidate"
      title="Interview practice history"
      description="Review interview sessions, scores, better answers, and weak areas."
    >
      <Card className="rounded-[1.75rem] border-slate-200 bg-slate-100 backdrop-blur">
        <CardContent className="p-6 text-sm leading-6 text-muted-foreground">
          Session history is modeled for role, mode, questions, answers, report JSON, and cumulative score tracking.
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
