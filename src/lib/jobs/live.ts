import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getApprovedGovernmentJobs } from "@/lib/government-jobs/live";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { filterVisibleJobRows } from "@/lib/jobs/visibility";
import type { GovernmentJob, Job } from "@/types";
import type { DbRow } from "@/lib/db/mysql";

const NCS_HOME_URL = "https://www.ncs.gov.in/";
export const PUBLIC_JOBS_REVALIDATE_SECONDS = 300;


function extractSalaryBounds(value: string | undefined) {
  if (!value) {
    return { min: 0, max: 0 };
  }

  const matches = value.match(/\d[\d,]*/g) ?? [];
  const numbers = matches
    .map((entry) => Number.parseInt(entry.replace(/,/g, ""), 10))
    .filter((entry) => Number.isFinite(entry) && entry > 0);

  if (numbers.length === 0) {
    return { min: 0, max: 0 };
  }

  if (numbers.length === 1) {
    return { min: numbers[0]!, max: numbers[0]! };
  }

  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
  };
}

function initialsFromName(value: string) {
  return value
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function inferGovernmentJobType(job: GovernmentJob): Job["jobType"] {
  const haystack = `${job.title} ${job.summary}`.toLowerCase();

  if (/\b(apprentice|intern(ship)?)\b/.test(haystack)) {
    return "internship";
  }

  if (/\b(walk[\s-]?in)\b/.test(haystack)) {
    return "walk-in";
  }

  if (/\b(contract|outsource|temporary)\b/.test(haystack)) {
    return "contract";
  }

  if (/\b(part time|part-time)\b/.test(haystack)) {
    return "part-time";
  }

  return "full-time";
}

function inferGovernmentWorkMode(job: GovernmentJob): Job["workMode"] {
  const haystack = `${job.title} ${job.summary}`.toLowerCase();

  if (/\b(remote|online|work from home|wfh)\b/.test(haystack)) {
    return "remote";
  }

  if (/\b(hybrid)\b/.test(haystack)) {
    return "hybrid";
  }

  return "onsite";
}

function buildGovernmentJobSkills(job: GovernmentJob) {
  return Array.from(
    new Set(
      [
        "Government Job",
        job.category,
        job.categorySlug ? titleCase(job.categorySlug) : null,
        job.state !== "All India" ? job.state : null,
      ].filter((value): value is string => Boolean(value && value.trim())),
    ),
  );
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function governmentJobToPublicJob(job: GovernmentJob): Job {
  const salary = extractSalaryBounds(job.salary);
  const location = job.state === "All India" ? "All India, India" : `${job.state}, India`;
  const companyName = job.department || "Government Department";
  const nowIso = new Date().toISOString();

  return {
    id: job.id,
    slug: job.slug,
    categorySlug: job.categorySlug ?? "government-jobs",
    title: job.title,
    companyName,
    companyLogo: initialsFromName(companyName) || "GO",
    description: job.summary,
    responsibilities: [
      "Read the official notification carefully before applying.",
      ...(job.importantDates?.slice(0, 2).map((entry) => `Important date: ${entry}`) ?? []),
      ...(job.selectionProcess ? [`Selection process: ${job.selectionProcess}`] : []),
    ],
    requirements: [
      `Eligibility: ${job.eligibility}`,
      `Age limit: ${job.ageLimit}`,
      ...(job.applicationFee ? [`Application fee: ${job.applicationFee}`] : []),
    ],
    skills: buildGovernmentJobSkills(job),
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryType: "yearly",
    location,
    city: job.state,
    state: job.state,
    country: "India",
    workMode: inferGovernmentWorkMode(job),
    experienceRequired: "Check official notification",
    educationRequired: job.eligibility,
    jobType: inferGovernmentJobType(job),
    industry: "Government",
    openings: Number.parseInt(job.openings?.replace(/[^\d]/g, "") ?? "", 10) || 1,
    applicationDeadline: job.lastDate,
    recruiterContact: "",
    applicationUrl:
      job.applyLink ??
      job.officialApplyUrl ??
      job.officialUrl ??
      job.officialNotificationLink ??
      job.notificationUrl ??
      job.sourceUrl ??
      NCS_HOME_URL,
    // Use the source listing's own publication date. Stamping `now` here made
    // every government listing read "Posted today" on every request and, under
    // the default "latest" sort, permanently outrank real employer postings.
    createdAt: job.publishedAt ?? nowIso,
    updatedAt: job.publishedAt ?? nowIso,
    status: "active",
    featured: false,
    noCandidatePayment: true,
    salaryDisclosed: salary.max > 0,
    governmentSourceVerified: true,
    suspiciousFlags: [],
    isSuspicious: false,
    sourceUrl: job.sourceUrl ?? job.officialUrl ?? job.notificationUrl ?? undefined,
    sourceType: "official",
    sourceName: "JobPulse Government Import",
    importedAt: nowIso,
    officialVerified: true,
    publishedAt: job.publishedAt ?? null,
  };
}

function mergeJobs(primary: Job[], fallback: Job[]) {
  const bySlug = new Map<string, Job>();

  for (const job of primary) {
    bySlug.set(job.slug, job);
  }

  for (const job of fallback) {
    if (!bySlug.has(job.slug)) {
      bySlug.set(job.slug, job);
    }
  }

  return Array.from(bySlug.values());
}

function deriveUiCategorySlug(input: {
  title?: string;
  description?: string;
  skills?: string[];
  workMode?: string | null;
  jobType?: string | null;
  industry?: string | null;
  sourceType?: string | null;
  educationRequired?: string | null;
  experienceRequired?: string | null;
}) {
  const haystack = [
    input.title,
    input.description,
    input.industry,
    input.educationRequired,
    input.experienceRequired,
    ...(input.skills ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const isInternship =
    input.jobType === "internship" ||
    /\bintern(ship)?\b/.test(haystack);
  if (isInternship) return "internship-jobs";

  const isRemote =
    input.workMode === "remote" ||
    /\b(remote|work from home|wfh|online)\b/.test(haystack);
  if (isRemote) return "work-from-home-jobs";

  if (/\b(bank|banking|ibps|sbi|rbi|finance|loan|credit)\b/.test(haystack)) {
    return "banking-jobs";
  }

  if (/\b(hospital|health|healthcare|clinic|pharma|medical|nurse)\b/.test(haystack)) {
    return "healthcare-jobs";
  }

  if (/\b(government|govt|ssc|railway|rrb|defence|army|navy|air force|psc)\b/.test(haystack)) {
    return "government-jobs";
  }

  if (/\b(sales|business development|lead generation|crm|field sales|inside sales)\b/.test(haystack)) {
    return "sales-jobs";
  }

  if (
    /\b(software|developer|frontend|backend|full stack|qa|support engineer|it|tech|data|analyst|sql|python|javascript|react|power bi)\b/.test(
      haystack,
    )
  ) {
    return "it-jobs";
  }

  if (
    input.sourceType === "official" ||
    /\b(fresher|entry level|graduate|0-1 years|0-2 years)\b/.test(haystack)
  ) {
    return "fresher-jobs";
  }

  return "fresher-jobs";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function stripHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parseNcsDate(value: string) {
  const match = value.match(/(\d{1,2})(?:st|nd|rd|th)\s([A-Za-z]{3})'(\d{2})/);
  if (!match) return null;

  const [, day, mon, year] = match;
  const monthMap: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };

  const month = monthMap[mon];
  if (!month) return null;
  return `20${year}-${month}-${day.padStart(2, "0")}`;
}

function extractNcsListingsFromText(text: string) {
  const matches = text.match(
    /\b(?:JF|EVT)-[A-Z]{2}-[\s\S]{10,180}?(?:on|from)\s\d{1,2}(?:st|nd|rd|th)\s[A-Za-z]{3}'\d{2}(?:\sto\s\d{1,2}(?:st|nd|rd|th)\s[A-Za-z]{3}'\d{2})?/g,
  );

  return Array.from(new Set(matches ?? [])).slice(0, 40);
}

function normalizeNcsListing(listing: string, index: number): Job {
  const compact = listing.replace(/\s+/g, " ").trim();
  const title = compact
    .replace(/\bat\s+[A-Za-z\s&.'-]+,\s*[A-Za-z\s&.'-]+\s(?:on|from)\s.+$/i, "")
    .replace(/\son\s\d{1,2}(?:st|nd|rd|th)\s[A-Za-z]{3}'\d{2}.*$/i, "")
    .replace(/\sfrom\s\d{1,2}(?:st|nd|rd|th)\s[A-Za-z]{3}'\d{2}.*$/i, "")
    .trim();

  const locationMatch =
    compact.match(/\bat\s+([^,]+,\s*[^,]+)\s(?:on|from)\s/i) ??
    compact.match(/\bat\s+([^,]+)\s(?:on|from)\s/i);
  const location = locationMatch?.[1]?.trim() ?? "India";
  const [stateOrCity = "India", district = "India"] = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const dateMatch = compact.match(
    /\b(?:on|from)\s(\d{1,2}(?:st|nd|rd|th)\s[A-Za-z]{3}'\d{2})/,
  );
  const displayDate = dateMatch?.[1] ?? "Check official listing";

  return {
    id: `ncs-${slugify(title)}-${index}`,
    slug: `ncs-${slugify(title)}-${index}`,
    categorySlug: "fresher-jobs",
    title: title || `NCS Opportunity ${index + 1}`,
    companyName: "National Career Service",
    companyLogo: "NCS",
    description:
      "Imported from the National Career Service public feed. Verify the final details on the official NCS portal before applying or attending.",
    responsibilities: [
      "Check the official NCS listing for full participation and application requirements.",
    ],
    requirements: [
      "Verify eligibility, location, and timing on the official source before acting.",
    ],
    skills: ["Job Fair", "Placement Drive", "Official Source"],
    salaryMin: 0,
    salaryMax: 0,
    salaryType: "yearly",
    location,
    city: district === "India" ? stateOrCity : district,
    state: district === "India" ? "India" : stateOrCity,
    country: "India",
    workMode: compact.toLowerCase().includes("online") ? "remote" : "onsite",
    experienceRequired: "Check official listing",
    educationRequired: "Check official listing",
    jobType: compact.toLowerCase().includes("walkin") ? "walk-in" : "full-time",
    industry: "Government Employment Services",
    openings: 0,
    applicationDeadline: displayDate,
    recruiterContact: "support.ncs@gov.in",
    applicationUrl: NCS_HOME_URL,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "active",
    sourceUrl: NCS_HOME_URL,
    sourceType: "official",
    sourceName: "National Career Service",
    importedAt: new Date().toISOString(),
    officialVerified: true,
  };
}

export interface SupabaseJobRow {
  id: string;
  slug: string;
  category_slug: string | null;
  title: string;
  company_name: string;
  description: string;
  responsibilities: string[] | null;
  requirements: string[] | null;
  skills: string[] | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_type: "monthly" | "yearly" | "stipend" | null;
  city: string | null;
  state: string | null;
  country: string | null;
  job_type:
    | "full-time"
    | "part-time"
    | "contract"
    | "freelance"
    | "internship"
    | "walk-in"
    | null;
  work_mode: "remote" | "hybrid" | "onsite" | null;
  education_required: string | null;
  experience_required: string | null;
  experience_min?: number | null;
  experience_max?: number | null;
  industry: string | null;
  openings: number | null;
  recruiter_contact: string | null;
  status: "draft" | "pending" | "active" | "expired" | "rejected";
  approval_status?: "pending" | "approved" | "rejected" | null;
  no_candidate_payment?: boolean | null;
  salary_disclosed?: boolean | null;
  government_source_verified?: boolean | null;
  suspicious_flags?: string[] | null;
  is_suspicious?: boolean | null;
  moderation_notes?: string | null;
  is_featured?: boolean | null;
  application_url: string | null;
  apply_url?: string | null;
  deadline: string | null;
  expires_at?: string | null;
  source_type: "employer" | "admin" | "official" | "partner" | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
}

const JOB_PUBLIC_SELECT = [
  "id",
  "slug",
  "category_slug",
  "title",
  "company_name",
  "description",
  "responsibilities",
  "requirements",
  "skills",
  "salary_min",
  "salary_max",
  "salary_type",
  "city",
  "state",
  "country",
  "job_type",
  "work_mode",
  "education_required",
  "experience_required",
  "industry",
  "openings",
  "recruiter_contact",
  "status",
  "approval_status",
  "is_featured",
  "application_url",
  "apply_url",
  "deadline",
  "expires_at",
  "source_type",
  "source_url",
  // Without this, dbRowToJob always saw published_at as undefined, so posted
  // dates and the 24h/7d/30d filter silently fell back to created_at.
  "published_at",
  "created_at",
  "updated_at",
].join(", ");

const JOB_OFFICIAL_SELECT = [
  "id",
  "slug",
  "category_slug",
  "title",
  "company_name",
  "description",
  "responsibilities",
  "requirements",
  "skills",
  "salary_min",
  "salary_max",
  "salary_type",
  "city",
  "state",
  "country",
  "job_type",
  "work_mode",
  "education_required",
  "experience_required",
  "industry",
  "openings",
  "recruiter_contact",
  "status",
  "application_url",
  "apply_url",
  "deadline",
  "source_type",
  "source_url",
  "created_at",
  "updated_at",
].join(", ");

export function dbRowToJob(row: SupabaseJobRow): Job {
  const locationParts = [row.city, row.state].filter(Boolean);

  return {
    id: row.id,
    slug: row.slug,
    categorySlug: row.category_slug ?? undefined,
    title: row.title,
    companyName: row.company_name,
    companyLogo: row.company_name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase(),
    description: row.description,
    responsibilities: row.responsibilities ?? [],
    requirements: row.requirements ?? [],
    skills: row.skills ?? [],
    salaryMin: row.salary_min ?? 0,
    salaryMax: row.salary_max ?? 0,
    salaryType: row.salary_type ?? "yearly",
    location: locationParts.length ? locationParts.join(", ") : "India",
    city: row.city ?? "India",
    state: row.state ?? "India",
    country: row.country ?? "India",
    workMode: row.work_mode ?? "onsite",
    experienceRequired: row.experience_required ?? "Check official listing",
    experienceMin: row.experience_min ?? null,
    experienceMax: row.experience_max ?? null,
    educationRequired: row.education_required ?? "Check official listing",
    jobType: row.job_type ?? "full-time",
    industry: row.industry ?? "General",
    openings: row.openings ?? 0,
    applicationDeadline: row.deadline ?? "Check official listing",
    recruiterContact: row.recruiter_contact ?? "",
    applicationUrl: row.application_url ?? row.apply_url ?? row.source_url ?? NCS_HOME_URL,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    featured: row.is_featured ?? false,
    noCandidatePayment: row.no_candidate_payment ?? true,
    salaryDisclosed: row.salary_disclosed ?? true,
    governmentSourceVerified: row.government_source_verified ?? false,
    suspiciousFlags: row.suspicious_flags ?? [],
    isSuspicious: row.is_suspicious ?? false,
    moderationNotes: row.moderation_notes ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    sourceType: row.source_type ?? undefined,
    sourceName:
      row.source_type === "official"
        ? "Official Source"
        : row.source_type === "admin"
          ? "JobPulse India"
          : undefined,
    importedAt: row.updated_at,
    officialVerified: row.source_type === "official" || Boolean(row.government_source_verified),
    publishedAt: row.published_at ?? null,
  };
}

export function jobToDbRow(job: Job) {
  const parsedDeadline = parseNcsDate(job.applicationDeadline);
  const isoDeadline = /^\d{4}-\d{2}-\d{2}$/.test(job.applicationDeadline)
    ? job.applicationDeadline
    : null;

  return {
    slug: job.slug,
    category_slug:
      job.categorySlug ??
      deriveUiCategorySlug({
        title: job.title,
        description: job.description,
        skills: job.skills,
        workMode: job.workMode,
        jobType: job.jobType,
        industry: job.industry,
        sourceType: job.sourceType,
        educationRequired: job.educationRequired,
        experienceRequired: job.experienceRequired,
      }),
    title: job.title,
    company_name: job.companyName,
    description: job.description,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    skills: job.skills,
    salary_min: job.salaryMin,
    salary_max: job.salaryMax,
    salary_type: job.salaryType,
    city: job.city,
    state: job.state,
    country: job.country,
    job_type: job.jobType,
    work_mode: job.workMode,
    education_required: job.educationRequired,
    experience_required: job.experienceRequired,
    industry: job.industry,
    status: job.status,
    approval_status: "approved" as const,
    openings: job.openings,
    recruiter_contact: job.recruiterContact,
    application_url: job.applicationUrl,
    deadline: parsedDeadline ?? isoDeadline,
    source_type: job.sourceType ?? "official",
    source_url: job.sourceUrl ?? NCS_HOME_URL,
    updated_at: new Date().toISOString(),
  };
}

export async function loadOfficialJobsFromSupabase() {
  const admin = getSupabaseAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("jobs")
    .select(JOB_OFFICIAL_SELECT)
    .eq("source_type", "official")
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row: DbRow) => dbRowToJob(row as unknown as SupabaseJobRow));
}

async function persistOfficialJobs(jobs: Job[]) {
  const admin = getSupabaseAdminClient();
  if (!admin || jobs.length === 0) {
    return { persisted: 0, mode: "disabled" as const, error: null as string | null };
  }

  const rows = jobs.map(jobToDbRow) as Record<string, unknown>[];

  const { error } = await admin
    .from("jobs")
    .upsert(rows as never[], { onConflict: "slug" });

  if (error) {
    return {
      persisted: 0,
      mode: "supabase" as const,
      error: `${error.code ?? "SUPABASE_ERROR"}: ${error.message}`,
    };
  }

  return { persisted: jobs.length, mode: "supabase" as const, error: null as string | null };
}

export async function fetchNcsLiveJobs() {
  const response = await fetch(NCS_HOME_URL, {
    headers: {
      "User-Agent": "JobPulseIndia/1.0 (+https://jobpulseindia.in)",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`NCS fetch failed with status ${response.status}`);
  }

  const html = await response.text();
  const text = stripHtml(html);
  const listings = extractNcsListingsFromText(text);
  return listings.map(normalizeNcsListing);
}

export function dedupeJobs(input: Job[]) {
  const seen = new Set<string>();
  return input.filter((job) => {
    const key = `${job.title.toLowerCase()}|${job.companyName.toLowerCase()}|${job.location.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getPublishedJobsClient() {
  // Public job reads go through the same pooled MySQL connection as
  // privileged reads; row visibility is enforced by the query filters below
  // rather than by a separate anonymous role.
  return getSupabaseAdminClient();
}

const loadUnifiedJobs = unstable_cache(async () => {
  try {
    const governmentJobs = (await getApprovedGovernmentJobs()).map(governmentJobToPublicJob);
    const client = await getPublishedJobsClient();
    if (!client) {
      return governmentJobs;
    }

    const { data, error } = await client
      .from("jobs")
      .select(JOB_PUBLIC_SELECT)
      .eq("approval_status", "approved")
      .eq("status", "active")
      .order("is_featured", { ascending: false })
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !data) {
      return governmentJobs;
    }

    const publishedJobs = filterVisibleJobRows(data as unknown as SupabaseJobRow[]).map((row) => dbRowToJob(row));
    return mergeJobs(publishedJobs, governmentJobs);
  } catch (error) {
    console.error("Failed to load unified jobs", error);
    return (await getApprovedGovernmentJobs()).map(governmentJobToPublicJob);
  }
}, ["public-unified-jobs"], { revalidate: PUBLIC_JOBS_REVALIDATE_SECONDS });

export const getUnifiedJobs = cache(async () => loadUnifiedJobs());

export const getUnifiedJobBySlug = cache(async (slug: string) => {
  const allJobs = await getUnifiedJobs();
  return allJobs.find((job) => job.slug === slug);
});

export const getUnifiedJobByIdentifier = cache(async (identifier: string) => {
  const allJobs = await getUnifiedJobs();
  return allJobs.find((job) => job.id === identifier || job.slug === identifier);
});

export const getUnifiedSimilarJobs = cache(async (slug: string) => {
  const allJobs = await getUnifiedJobs();
  const current = allJobs.find((job) => job.slug === slug);
  if (!current) return [];

  return allJobs
    .filter(
      (job) =>
        job.slug !== slug &&
        (job.city === current.city ||
          job.industry === current.industry ||
          job.skills.some((skill) => current.skills.includes(skill))),
    )
    .slice(0, 3);
});

export async function syncOfficialSources() {
  const sources = [];

  try {
    const liveJobs = await fetchNcsLiveJobs();
    const persistence = await persistOfficialJobs(liveJobs);
    sources.push({
      sourceName: "National Career Service",
      sourceUrl: NCS_HOME_URL,
      imported: liveJobs.length,
      status: persistence.error ? "warning" : "ok",
      persisted: persistence.persisted,
      persistenceMode: persistence.mode,
      persistenceError: persistence.error,
    });

    return {
      jobs: liveJobs,
      sources,
      note: persistence.error
        ? "Official-source jobs were fetched successfully, but database persistence is not ready yet. Run the Supabase SQL migration to store them permanently."
        : "Official-source sync currently imports public NCS opportunities. Additional official adapters can be added next.",
    };
  } catch (error) {
    sources.push({
      sourceName: "National Career Service",
      sourceUrl: NCS_HOME_URL,
      imported: 0,
      status: "error",
      error:
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: unknown }).message)
            : JSON.stringify(error),
    });

    return {
      jobs: [],
      sources,
      note: "Official-source sync failed. Falling back to seeded jobs in the UI.",
    };
  }
}
