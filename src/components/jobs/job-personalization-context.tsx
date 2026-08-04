"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { JobMatchSummary } from "@/types";

interface ResumeOption {
  id: string;
  title: string;
  updatedAt: string;
}

interface JobInteractionState {
  isApplied: boolean;
  isSaved: boolean;
}

interface JobPersonalizationValue {
  isLoading: boolean;
  /**
   * True only when the personalization fetch actually answered. On timeout or
   * error isSignedIn stays false for everyone, so consumers must not read that
   * as "signed out" — a slow response would otherwise send a signed-in user to
   * /login and silently drop their action.
   */
  isSessionKnown: boolean;
  isSignedIn: boolean;
  matchSummaries: Record<string, JobMatchSummary>;
  resumeOptions: ResumeOption[];
  /**
   * Keyed by job slug, not id. Saved/applied rows reference `jobs.id`, which a
   * government or imported listing does not carry — slug is the identifier the
   * listing, the save route, and the apply route all agree on.
   */
  stateBySlug: Record<string, JobInteractionState>;
}

export interface PersonalizationJobRef {
  id: string;
  slug: string;
}

const JobPersonalizationContext = createContext<JobPersonalizationValue | null>(null);

export function JobPersonalizationProvider({
  children,
  jobs,
  includeMatches = false,
  includeResumes = false,
}: {
  children: ReactNode;
  jobs: PersonalizationJobRef[];
  includeMatches?: boolean;
  includeResumes?: boolean;
}) {
  const uniqueJobs = useMemo(() => {
    const bySlug = new Map<string, PersonalizationJobRef>();
    for (const job of jobs) {
      if (job?.slug) bySlug.set(job.slug, job);
    }
    return [...bySlug.values()];
  }, [jobs]);
  const emptyValue = useMemo<JobPersonalizationValue>(() => ({
    isLoading: false,
    isSessionKnown: false,
    isSignedIn: false,
    matchSummaries: {},
    resumeOptions: [],
    stateBySlug: {},
  }), []);
  const [loadedValue, setLoadedValue] = useState<JobPersonalizationValue>(() => ({
    isLoading: true,
    isSessionKnown: false,
    isSignedIn: false,
    matchSummaries: {},
    resumeOptions: [],
    stateBySlug: Object.fromEntries(
      uniqueJobs.map((job) => [job.slug, { isApplied: false, isSaved: false }]),
    ),
  }));

  useEffect(() => {
    if (uniqueJobs.length === 0) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams();

    for (const job of uniqueJobs) {
      params.append("slugs", job.slug);
      if (job.id) params.append("ids", job.id);
    }

    if (includeMatches) {
      params.set("includeMatches", "true");
    }

    if (includeResumes) {
      params.set("includeResumes", "true");
    }

    // Distinguishes "we gave up waiting" from "the provider unmounted". Only
    // the former should clear isLoading — consumers disable save/apply while
    // it is true, so a stuck flag would leave those buttons dead forever.
    let didTimeOut = false;

    async function loadPersonalization() {
      const timeout = window.setTimeout(() => {
        didTimeOut = true;
        controller.abort();
      }, 3000);

      try {
        const response = await fetch(`/api/jobs/personalization?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load personalization");
        }

        const result = (await response.json()) as JobPersonalizationValue;
        setLoadedValue({
          isLoading: false,
          isSessionKnown: true,
          isSignedIn: result.isSignedIn,
          matchSummaries: result.matchSummaries ?? {},
          resumeOptions: result.resumeOptions ?? [],
          stateBySlug:
            result.stateBySlug ??
            Object.fromEntries(
              uniqueJobs.map((job) => [job.slug, { isApplied: false, isSaved: false }]),
            ),
        });
      } catch (error) {
        if ((error as Error).name === "AbortError" && !didTimeOut) {
          return;
        }

        setLoadedValue((current) => ({
          ...current,
          isLoading: false,
        }));
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void loadPersonalization();

    return () => controller.abort();
  }, [includeMatches, includeResumes, uniqueJobs]);

  const value = uniqueJobs.length === 0 ? emptyValue : loadedValue;

  return (
    <JobPersonalizationContext.Provider value={value}>
      {children}
    </JobPersonalizationContext.Provider>
  );
}

export function useJobPersonalization() {
  const value = useContext(JobPersonalizationContext);

  if (!value) {
    throw new Error("useJobPersonalization must be used within JobPersonalizationProvider");
  }

  return value;
}
