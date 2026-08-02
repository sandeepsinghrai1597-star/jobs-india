"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobPersonalization } from "@/components/jobs/job-personalization-context";

export function PersonalizedJobMatch({ jobId }: { jobId: string }) {
  const { isLoading, isSignedIn, matchSummaries } = useJobPersonalization();
  const currentMatchSummary = matchSummaries[jobId] ?? null;

  if (isLoading) {
    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex gap-3">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-32 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Sign in as a candidate to load your saved jobs, application status, and personalized match score.
      </div>
    );
  }

  if (!currentMatchSummary) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Complete your candidate profile to see a personalized match score for this job.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-slate-800">
      <div className="flex flex-wrap items-center gap-3">
        <Badge className="rounded-full bg-sky-600 text-slate-950">
          <Sparkles className="size-3.5" />
          {currentMatchSummary.matchScore}% match
        </Badge>
        <Badge variant="secondary" className="rounded-full">
          {currentMatchSummary.recommendation}
        </Badge>
      </div>
      <p className="text-sm leading-6">{currentMatchSummary.reason}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-4">
          <p className="text-sm font-semibold text-slate-950">Matching skills</p>
          <p className="mt-2 text-sm leading-6">
            {currentMatchSummary.matchingSkills.length > 0
              ? currentMatchSummary.matchingSkills.join(", ")
              : "No direct skill overlap detected yet."}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-sm font-semibold text-slate-950">Missing skills</p>
          <p className="mt-2 text-sm leading-6">
            {currentMatchSummary.missingSkills.length > 0
              ? currentMatchSummary.missingSkills.join(", ")
              : "No major skill gaps found for this role."}
          </p>
        </div>
      </div>
    </div>
  );
}
