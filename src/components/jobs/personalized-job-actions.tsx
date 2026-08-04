"use client";

import { ReportJobButton } from "@/components/jobs/report-job-button";
import { SaveJobButton } from "@/components/jobs/save-job-button";
import { VerifiedApplyPanel } from "@/components/jobs/verified-apply-panel";
import { Button } from "@/components/ui/button";
import { useJobPersonalization } from "@/components/jobs/job-personalization-context";
import { Share2 } from "lucide-react";

export function PersonalizedJobActions({
  jobSlug,
  applicationUrl,
  whatsappShareUrl,
  autoStartApply = false,
}: {
  jobSlug: string;
  applicationUrl: string;
  whatsappShareUrl: string;
  autoStartApply?: boolean;
}) {
  const { isLoading, isSessionKnown, isSignedIn, resumeOptions, stateBySlug } = useJobPersonalization();
  const interactionState = stateBySlug[jobSlug];

  return (
    <>
      <div id="job-apply-panel" className="flex flex-wrap gap-3">
        <VerifiedApplyPanel
          jobIdentifier={jobSlug}
          jobSlug={jobSlug}
          applicationUrl={applicationUrl}
          isSignedIn={isSignedIn}
          isSessionKnown={isSessionKnown}
          isSessionPending={isLoading}
          isInitiallyApplied={interactionState?.isApplied ?? false}
          resumeOptions={resumeOptions}
          autoStartApply={autoStartApply}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <SaveJobButton
          jobIdentifier={jobSlug}
          isInitiallySaved={interactionState?.isSaved ?? false}
          isSessionPending={isLoading}
          loginRedirectTo={`/login?next=${encodeURIComponent(`/jobs/${jobSlug}`)}`}
        />
        <ReportJobButton jobIdentifier={jobSlug} />
        <Button asChild variant="secondary" className="rounded-full">
          <a href={whatsappShareUrl} rel="nofollow noopener noreferrer" target="_blank">
            <Share2 className="size-4" />
            Share on WhatsApp
          </a>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading your saved jobs and application state...</p>
      ) : null}
    </>
  );
}
