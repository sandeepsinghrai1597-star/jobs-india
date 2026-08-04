"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function SaveJobButton({
  jobIdentifier,
  isInitiallySaved = false,
  isSessionPending = false,
  loginRedirectTo = "/login",
  compact = false,
}: {
  jobIdentifier: string;
  isInitiallySaved?: boolean;
  /**
   * True while the client-side personalization fetch is still in flight. Until
   * it resolves isSignedIn is false for everyone, so acting on a click in that
   * window would bounce a signed-in user to /login instead of saving.
   */
  isSessionPending?: boolean;
  loginRedirectTo?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(isInitiallySaved);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (isSessionPending) {
      return;
    }

    // Deliberately no `!isSignedIn` short-circuit. isSignedIn only reflects a
    // *successful* personalization fetch: that request aborts after 3s, and on
    // a slow response the provider settles with isLoading false and isSignedIn
    // false for a user who is in fact signed in. Redirecting on that would send
    // them to /login, which bounces them to their dashboard and silently drops
    // the save. The server is the only reliable authority, and it already
    // answers 401 with a redirectTo that the error branch below follows — so
    // let a genuinely signed-out click take that path instead.
    setIsSaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/jobs/${jobIdentifier}/save`, {
      method: "POST",
    });

    const result = (await response.json()) as {
      message?: string;
      saved?: boolean;
      redirectTo?: string;
    };

    if (!response.ok) {
      setError(result.message ?? "We could not save this job.");
      setIsSaving(false);

      // 401 carries its own redirectTo; loginRedirectTo is the caller-supplied
      // fallback so a signed-out click still lands on /login with the right next.
      const signInTarget =
        result.redirectTo ?? (response.status === 401 ? loginRedirectTo : null);

      if (signInTarget) {
        router.push(signInTarget);
      }

      return;
    }

    setIsSaved(Boolean(result.saved));
    setMessage(result.message ?? "Job saved.");
    setIsSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {!compact && error ? (
        <Alert variant="destructive">
          <AlertTitle>Save failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {!compact && message ? (
        <Alert>
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        variant="outline"
        className="rounded-full"
        onClick={handleSave}
        disabled={isSaving || isSessionPending}
        aria-label={compact ? (isSaved ? "Unsave job" : "Save job") : undefined}
        title={compact && message ? message : compact && error ? error : undefined}
      >
        {isSaving
          ? isSaved
            ? "Updating..."
            : "Saving..."
          : compact
            ? isSaved
              ? "Saved"
              : "Save"
            : isSaved
              ? "Unsave Job"
              : "Save Job"}
      </Button>
    </div>
  );
}
