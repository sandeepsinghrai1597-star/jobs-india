"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, LockKeyhole } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ResumeOption {
  id: string;
  title: string;
  updatedAt: string;
}

export function VerifiedApplyPanel({
  jobIdentifier,
  jobSlug,
  applicationUrl,
  isSignedIn,
  isSessionKnown = true,
  isSessionPending = false,
  isInitiallyApplied = false,
  resumeOptions,
  autoStartApply = false,
}: {
  jobIdentifier: string;
  jobSlug: string;
  applicationUrl: string;
  isSignedIn: boolean;
  /** See JobPersonalizationValue — false means the fetch never answered. */
  isSessionKnown?: boolean;
  /** See SaveJobButton — isSignedIn is not trustworthy until this is false. */
  isSessionPending?: boolean;
  isInitiallyApplied?: boolean;
  resumeOptions: ResumeOption[];
  autoStartApply?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isApplied, setIsApplied] = useState(isInitiallyApplied);
  const [isApplying, setIsApplying] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string>(
    resumeOptions[0]?.id ?? "upload-new",
  );
  const [uploadedResumeId, setUploadedResumeId] = useState<string>("");
  const [uploadedResumeLabel, setUploadedResumeLabel] = useState<string>("");
  const [coverLetter, setCoverLetter] = useState("");
  const hasAutoOpenedRef = useRef(false);
  const hasPickedResumeRef = useRef(false);
  const newestResumeId = resumeOptions[0]?.id;

  // resumeOptions arrive from the personalization fetch, i.e. after first
  // render, so the useState initializer above always sees an empty list. Adopt
  // the newest saved resume once it shows up, unless the user picked already.
  useEffect(() => {
    if (hasPickedResumeRef.current || !newestResumeId) {
      return;
    }

    setSelectedResumeId((current) => (current === "upload-new" ? newestResumeId : current));
  }, [newestResumeId]);

  const needsUpload = selectedResumeId === "upload-new";
  const loginRedirectTo = `/login?next=${encodeURIComponent(`/jobs/${jobSlug}?apply=1`)}`;
  const canSubmit = useMemo(() => {
    if (isApplied || isApplying || isUploadingResume) {
      return false;
    }

    if (needsUpload) {
      return Boolean(uploadedResumeId);
    }

    return Boolean(selectedResumeId);
  }, [isApplied, isApplying, isUploadingResume, needsUpload, selectedResumeId, uploadedResumeId]);

  useEffect(() => {
    if (!autoStartApply || !isSignedIn || isApplied || hasAutoOpenedRef.current) {
      return;
    }

    hasAutoOpenedRef.current = true;
    setOpen(true);
  }, [autoStartApply, isApplied, isSignedIn]);

  async function handleResumeUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingResume(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.[^.]+$/, ""));

    const response = await fetch("/api/resumes/upload", {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as {
      message?: string;
      resume?: { id: string; title: string };
    };

    if (!response.ok || !result.resume?.id) {
      setError(result.message ?? "We could not upload this resume.");
      setIsUploadingResume(false);
      return;
    }

    hasPickedResumeRef.current = true;
    setUploadedResumeId(result.resume.id);
    setUploadedResumeLabel(result.resume?.title ?? file.name);
    setSelectedResumeId("upload-new");
    setMessage("Resume uploaded. You can submit the application now.");
    setIsUploadingResume(false);
  }

  async function handleApply() {
    if (!isSignedIn && isSessionKnown) {
      router.push(loginRedirectTo);
      return;
    }

    setIsApplying(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    if (!needsUpload && selectedResumeId) {
      formData.append("resumeId", selectedResumeId.replace(/^resume:/, ""));
    }
    if (needsUpload && uploadedResumeId) {
      formData.append("resumeId", uploadedResumeId);
    }
    if (coverLetter.trim()) {
      formData.append("coverLetter", coverLetter.trim());
    }

    const response = await fetch(`/api/jobs/${jobIdentifier}/apply`, {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as {
      message?: string;
      applied?: boolean;
      redirectTo?: string;
      applicationUrl?: string;
    };

    if (!response.ok) {
      setError(result.message ?? "Application failed.");
      setIsApplying(false);

      if (result.redirectTo) {
        router.push(result.redirectTo);
      }

      return;
    }

    setIsApplied(Boolean(result.applied));
    setMessage(result.message ?? "Application submitted.");
    setIsApplying(false);
    setOpen(false);
    router.refresh();

    if (result.applicationUrl || applicationUrl) {
      window.location.assign(result.applicationUrl ?? applicationUrl);
    }
  }

  return (
    <div className="space-y-3">
      {isSessionPending ? (
        <Alert>
          <FileUp className="size-4" />
          <AlertTitle>Checking your session</AlertTitle>
          <AlertDescription>
            One moment while we load your resumes and application status.
          </AlertDescription>
        </Alert>
      ) : !isSignedIn ? (
        <Alert>
          <LockKeyhole className="size-4" />
          <AlertTitle>Sign in required</AlertTitle>
          <AlertDescription>
            Sign in to save jobs, upload a resume, and submit your application.
          </AlertDescription>
        </Alert>
      ) : isApplied ? (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Already applied</AlertTitle>
          <AlertDescription>
            This job is already in your applications tracker.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <FileUp className="size-4" />
          <AlertTitle>Apply with your resume</AlertTitle>
          <AlertDescription>
            Choose a saved resume or upload a fresh one, then optionally add a cover letter.
          </AlertDescription>
        </Alert>
      )}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Application blocked</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {message ? (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Application update</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          className="rounded-full"
          onClick={() => {
            if (isSessionPending) {
              return;
            }

            // Only a confirmed signed-out visitor is sent to /login. If the
            // session is merely unknown, open the dialog and let the apply API
            // answer 401 with its own redirectTo.
            if (!isSignedIn && isSessionKnown) {
              router.push(loginRedirectTo);
              return;
            }

            setOpen(true);
          }}
          disabled={isApplied || isSessionPending}
        >
          {isApplied ? "Applied" : "Apply now"}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl rounded-[1.75rem] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Apply to this job</DialogTitle>
            <DialogDescription>
              Select a saved resume or upload a new one. Cover letter is optional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 pb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Resume</label>
              <Select
                value={selectedResumeId}
                onValueChange={(value) => {
                  hasPickedResumeRef.current = true;
                  setSelectedResumeId(value);
                }}
              >
                <SelectTrigger className="h-11 w-full rounded-xl bg-white">
                  <SelectValue placeholder="Select a resume" />
                </SelectTrigger>
                <SelectContent>
                  {resumeOptions.map((resume) => (
                    <SelectItem key={resume.id} value={resume.id}>
                      {resume.title}
                    </SelectItem>
                  ))}
                  <SelectItem value="upload-new">Upload new resume</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {needsUpload ? (
              <div className="space-y-2">
                <label htmlFor="resume-upload" className="text-sm font-medium text-slate-900">
                  Upload resume
                </label>
                <Input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="h-11 rounded-xl"
                  onChange={handleResumeUpload}
                  disabled={isUploadingResume}
                />
                <p className="text-xs text-muted-foreground">
                  PDF, DOC, or DOCX up to 5 MB.
                  {uploadedResumeLabel ? ` Ready: ${uploadedResumeLabel}` : ""}
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="cover-letter" className="text-sm font-medium text-slate-900">
                Cover letter (optional)
              </label>
              <Textarea
                id="cover-letter"
                value={coverLetter}
                onChange={(event) => setCoverLetter(event.target.value)}
                placeholder="Briefly explain why you are a strong fit."
                className="min-h-32 rounded-xl bg-white"
              />
            </div>
          </div>

          <DialogFooter className="rounded-b-[1.75rem]">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={!canSubmit}>
              {isApplying ? "Submitting..." : "Submit application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
