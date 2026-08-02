import type { ServerDataClient } from "@/lib/db/server-client";
import type { CandidateProfile, Job, JobMatchSummary } from "@/types";

type JobMatchScoreRow = {
  candidate_id: string;
  job_id: string;
  match_score: number;
  matching_skills: string[] | null;
  missing_skills: string[] | null;
  recommendation: string;
  reason: string;
  candidate_updated_at: string | null;
  job_updated_at: string | null;
};

const EDUCATION_RANKS: Array<{ rank: number; patterns: RegExp[] }> = [
  { rank: 5, patterns: [/\b(phd|doctorate|doctoral)\b/i] },
  { rank: 4, patterns: [/\b(master'?s|masters|m\.tech|mtech|mba|mca|m\.sc|msc|postgraduate|post graduate)\b/i] },
  { rank: 3, patterns: [/\b(bachelor'?s|b\.tech|btech|be\b|b\.e\b|bca|b\.sc|bsc|graduate|ug\b)\b/i] },
  { rank: 2, patterns: [/\b(diploma|polytechnic|associate)\b/i] },
  { rank: 1, patterns: [/\b(12th|higher secondary|intermediate|high school|school)\b/i] },
];

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeSkill(value: string) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function getEducationRank(value: string | null | undefined) {
  const source = value ?? "";

  for (const entry of EDUCATION_RANKS) {
    if (entry.patterns.some((pattern) => pattern.test(source))) {
      return entry.rank;
    }
  }

  return 0;
}

function extractYears(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (/\b(fresher|entry level|entry-level|no experience)\b/.test(normalized)) {
    return 0;
  }

  const matches = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/g)];
  if (matches.length > 0) {
    return Math.max(...matches.map((match) => Number.parseFloat(match[1] ?? "0")));
  }

  const fallbackNumbers = [...normalized.matchAll(/\b(\d+(?:\.\d+)?)\b/g)];
  if (fallbackNumbers.length > 0) {
    return Math.max(...fallbackNumbers.map((match) => Number.parseFloat(match[1] ?? "0")));
  }

  return null;
}

function getExperienceWindow(job: Job) {
  const min = typeof job.experienceMin === "number" ? job.experienceMin : null;
  const max = typeof job.experienceMax === "number" ? job.experienceMax : null;

  if (min != null || max != null) {
    return { min, max };
  }

  const normalized = normalizeText(job.experienceRequired);
  const rangeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*[-to]+\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    return {
      min: Number.parseFloat(rangeMatch[1] ?? "0"),
      max: Number.parseFloat(rangeMatch[2] ?? "0"),
    };
  }

  const singleMatch = normalized.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/);
  if (singleMatch) {
    return {
      min: Number.parseFloat(singleMatch[1] ?? "0"),
      max: null,
    };
  }

  if (/\b(fresher|entry level|entry-level|0[-\s]*1|0[-\s]*2)\b/.test(normalized)) {
    return { min: 0, max: 1 };
  }

  return { min: null, max: null };
}

function buildRecommendation(score: number) {
  if (score >= 85) return "Highly recommended";
  if (score >= 70) return "Recommended";
  if (score >= 50) return "Consider applying";
  return "Upskill before applying";
}

export function computeJobMatchSummary(
  profile: CandidateProfile & { id: string },
  job: Job,
): JobMatchSummary {
  const candidateSkills = new Map(
    uniqueValues(profile.skills.map(normalizeSkill)).map((skill) => [skill, skill]),
  );
  const jobSkills = uniqueValues(job.skills.map((skill) => skill.trim()).filter(Boolean));

  const matchingSkills = jobSkills.filter((skill) => candidateSkills.has(normalizeSkill(skill)));
  const missingSkills = jobSkills.filter((skill) => !candidateSkills.has(normalizeSkill(skill)));

  const skillScore =
    jobSkills.length > 0
      ? Math.round((matchingSkills.length / jobSkills.length) * 45)
      : 25;

  const candidateEducationRank = getEducationRank(profile.education);
  const jobEducationRank = getEducationRank(job.educationRequired);
  const educationScore =
    jobEducationRank === 0
      ? 8
      : candidateEducationRank >= jobEducationRank
        ? 15
        : candidateEducationRank === jobEducationRank - 1
          ? 8
          : 0;

  const candidateYears = extractYears(profile.experience);
  const experienceWindow = getExperienceWindow(job);
  let experienceScore = 10;

  if (candidateYears != null) {
    if (
      experienceWindow.min != null &&
      candidateYears < experienceWindow.min
    ) {
      const gap = experienceWindow.min - candidateYears;
      experienceScore = gap <= 1 ? 10 : gap <= 2 ? 5 : 0;
    } else if (
      experienceWindow.max != null &&
      candidateYears > experienceWindow.max
    ) {
      experienceScore = 14;
    } else if (
      experienceWindow.min != null ||
      experienceWindow.max != null
    ) {
      experienceScore = 20;
    }
  } else if (experienceWindow.min != null || experienceWindow.max != null) {
    experienceScore = 6;
  }

  const candidateCity = normalizeText(profile.city);
  const jobCity = normalizeText(job.city);
  const cityScore =
    job.workMode === "remote"
      ? 10
      : candidateCity && jobCity && (candidateCity.includes(jobCity) || jobCity.includes(candidateCity))
        ? 10
        : candidateCity
          ? 0
          : 4;

  let salaryScore = 5;
  if (profile.expectedSalary != null && (job.salaryMin > 0 || job.salaryMax > 0)) {
    if (
      (job.salaryMin > 0 && profile.expectedSalary < job.salaryMin) ||
      (job.salaryMax > 0 && profile.expectedSalary > job.salaryMax)
    ) {
      salaryScore = 0;
    } else {
      salaryScore = 10;
    }
  }

  const matchScore = Math.max(
    0,
    Math.min(100, skillScore + educationScore + experienceScore + cityScore + salaryScore),
  );

  const reasonParts = [
    `${matchingSkills.length} of ${jobSkills.length || 0} required skills match`,
    educationScore >= 15
      ? "education aligns well"
      : educationScore > 0
        ? "education is close to the requirement"
        : "education may need verification",
    experienceScore >= 20
      ? "experience fits the role range"
      : experienceScore >= 10
        ? "experience is partially aligned"
        : "experience is below the preferred range",
    cityScore >= 10
      ? job.workMode === "remote"
        ? "location is flexible because the role is remote"
        : "preferred city matches the job location"
      : "location does not match the preferred city",
    salaryScore >= 10
      ? "salary expectation fits the offered range"
      : profile.expectedSalary != null
        ? "salary expectation is outside the offered range"
        : "salary expectation is not set",
  ];

  if (missingSkills.length > 0) {
    reasonParts.push(`top missing skills: ${missingSkills.slice(0, 3).join(", ")}`);
  }

  return {
    jobId: job.id,
    candidateId: profile.id,
    matchScore,
    matchingSkills,
    missingSkills,
    recommendation: buildRecommendation(matchScore),
    reason: `${job.title}: ${reasonParts.join(". ")}.`,
  };
}

function mapRowToSummary(row: JobMatchScoreRow): JobMatchSummary {
  return {
    jobId: row.job_id,
    candidateId: row.candidate_id,
    matchScore: row.match_score,
    matchingSkills: row.matching_skills ?? [],
    missingSkills: row.missing_skills ?? [],
    recommendation: row.recommendation,
    reason: row.reason,
  };
}

export async function getCachedOrComputeJobMatches({
  supabase,
  profile,
  jobs,
}: {
  supabase: Pick<ServerDataClient, "from">;
  profile: CandidateProfile | null;
  jobs: Job[];
}) {
  const results = new Map<string, JobMatchSummary>();

  if (!profile?.id || jobs.length === 0) {
    return results;
  }

  const candidateUpdatedAt = profile.updatedAt ?? null;
  const jobIds = uniqueValues(jobs.map((job) => job.id));
  const { data } = (await supabase
    .from("job_match_scores")
    .select(
      "candidate_id, job_id, match_score, matching_skills, missing_skills, recommendation, reason, candidate_updated_at, job_updated_at",
    )
    .eq("candidate_id", profile.id)
    .in("job_id", jobIds)) as { data: JobMatchScoreRow[] | null };

  const cachedByJobId = new Map<string, JobMatchScoreRow>(
    (data ?? []).map((row: JobMatchScoreRow) => [row.job_id, row]),
  );
  const staleSummaries: JobMatchSummary[] = [];

  for (const job of jobs) {
    const cached = cachedByJobId.get(job.id);
    const jobUpdatedAt = job.updatedAt ?? null;
    const isFresh =
      cached &&
      cached.candidate_updated_at === candidateUpdatedAt &&
      cached.job_updated_at === jobUpdatedAt;

    if (isFresh) {
      results.set(job.id, mapRowToSummary(cached));
      continue;
    }

    const summary = computeJobMatchSummary(profile as CandidateProfile & { id: string }, job);
    results.set(job.id, summary);
    staleSummaries.push(summary);
  }

  if (staleSummaries.length > 0) {
    await supabase.from("job_match_scores").upsert(
      staleSummaries.map((summary) => {
        const job = jobs.find((item) => item.id === summary.jobId);

        return {
          candidate_id: summary.candidateId,
          job_id: summary.jobId,
          match_score: summary.matchScore,
          matching_skills: summary.matchingSkills,
          missing_skills: summary.missingSkills,
          recommendation: summary.recommendation,
          reason: summary.reason,
          candidate_updated_at: candidateUpdatedAt,
          job_updated_at: job?.updatedAt ?? null,
        };
      }),
      { onConflict: "candidate_id,job_id" },
    );
  }

  return results;
}
