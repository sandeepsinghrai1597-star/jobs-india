"use client";

import type { Job } from "@/types";
import { JobCard } from "@/components/jobs/job-card";
import { useJobPersonalization } from "@/components/jobs/job-personalization-context";

export function PersonalizedJobCardList({
  jobs,
  showMatches = false,
}: {
  jobs: Job[];
  showMatches?: boolean;
}) {
  const { isLoading, isSignedIn, matchSummaries, stateBySlug } = useJobPersonalization();

  return (
    <div className="grid gap-5">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          matchSummary={showMatches ? matchSummaries[job.id] ?? null : null}
          isSaved={stateBySlug[job.slug]?.isSaved ?? false}
          isApplied={stateBySlug[job.slug]?.isApplied ?? false}
          isSignedIn={isSignedIn}
          isSessionPending={isLoading}
        />
      ))}
    </div>
  );
}
