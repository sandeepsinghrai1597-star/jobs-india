import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { GovernmentJob } from "@/types";
import jobpulseImport from "@/lib/data/jobpulse-import.json";
import {
  getGovernmentJobBySlug as getStaticGovernmentJobBySlug,
  getGovernmentJobCategoryBySlug,
  getGovernmentJobsByCategory as getStaticGovernmentJobsByCategory,
  governmentJobCategories,
  governmentJobs as staticGovernmentJobs,
} from "@/lib/data/government-jobs";

type GovernmentJobRow = {
  id: string;
  slug: string;
  category_slug: string | null;
  title: string;
  department: string;
  category: string;
  state: string | null;
  eligibility: string | null;
  age_limit: string | null;
  fees: string | null;
  application_fee?: string | null;
  last_date: string | null;
  official_url: string | null;
  notification_url: string | null;
  official_apply_url?: string | null;
  source_url?: string | null;
  summary: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ImportedGovernmentJobRow = Omit<GovernmentJobRow, "id"> & {
  id?: string;
  fetch_key?: string | null;
};

type JobpulseImportJobRow = {
  id: string;
  fetch_key?: string | null;
  slug: string;
  title: string;
  department: string;
  category: string;
  category_slug: string | null;
  state: string | null;
  eligibility: string | null;
  age_limit: string | null;
  fees: string | null;
  application_fee?: string | null;
  last_date: string | null;
  official_url: string | null;
  notification_url: string | null;
  official_apply_url?: string | null;
  source_url?: string | null;
  summary: string | null;
  status?: string | null;
  openings?: string | null;
  salary?: string | null;
  syllabus?: string | null;
  selection_process?: string | null;
  important_dates?: string[] | null;
  faq?: Array<{ question: string; answer: string }> | null;
  metadata?: Record<string, unknown> | null;
};

function readMetadataString(record: Record<string, unknown> | null | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readMetadataStringList(record: Record<string, unknown> | null | undefined, key: string) {
  const value = record?.[key];
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);

  return normalized.length > 0 ? normalized : undefined;
}

function readMetadataFaq(record: Record<string, unknown> | null | undefined) {
  const value = record?.faq;
  if (!Array.isArray(value)) {
    return undefined;
  }

  const faq = value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const question = typeof entry.question === "string" ? entry.question.trim() : "";
      const answer = typeof entry.answer === "string" ? entry.answer.trim() : "";

      if (!question || !answer) {
        return null;
      }

      return { question, answer };
    })
    .filter((entry): entry is { question: string; answer: string } => Boolean(entry));

  return faq.length > 0 ? faq : undefined;
}

function readMetadataKeyValueList(record: Record<string, unknown> | null | undefined, key: string) {
  const value = record?.[key];
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const label = typeof entry.label === "string" ? entry.label.trim() : "";
      const itemValue = typeof entry.value === "string" ? entry.value.trim() : "";

      if (!label || !itemValue) {
        return null;
      }

      return { label, value: itemValue };
    })
    .filter((entry): entry is { label: string; value: string } => Boolean(entry));

  return items.length > 0 ? items : undefined;
}

function readMetadataLinkList(record: Record<string, unknown> | null | undefined, key: string) {
  const value = record?.[key];
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const label = typeof entry.label === "string" ? entry.label.trim() : "";
      const href = typeof entry.href === "string" ? entry.href.trim() : "";

      if (!label || !href) {
        return null;
      }

      return { label, href };
    })
    .filter((entry): entry is { label: string; href: string } => Boolean(entry));

  return items.length > 0 ? items : undefined;
}

function readMetadataSectionList(record: Record<string, unknown> | null | undefined, key: string) {
  const value = record?.[key];
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const title = typeof entry.title === "string" ? entry.title.trim() : "";
      const bullets = Array.isArray(entry.bullets)
        ? entry.bullets
            .map((bullet: unknown) => (typeof bullet === "string" ? bullet.trim() : ""))
            .filter(Boolean)
        : [];

      if (!title || bullets.length === 0) {
        return null;
      }

      return { title, bullets };
    })
    .filter((entry): entry is { title: string; bullets: string[] } => Boolean(entry));

  return items.length > 0 ? items : undefined;
}

function rowToGovernmentJob(row: GovernmentJobRow | ImportedGovernmentJobRow): GovernmentJob {
  const status = (row.status ?? "approved") as "pending_review" | "approved" | "rejected";
  const metadata = row.metadata ?? null;
  const fallbackId = "fetch_key" in row && typeof row.fetch_key === "string" ? row.fetch_key : row.slug;

  return {
    id: row.id ?? fallbackId,
    slug: row.slug,
    categorySlug: row.category_slug ?? undefined,
    title: row.title,
    department: row.department,
    category: row.category,
    state: row.state ?? "All India",
    eligibility: row.eligibility ?? "Verify on official website",
    ageLimit: row.age_limit ?? "Verify on official website",
    applicationFee: row.application_fee ?? row.fees ?? "Verify on official website",
    lastDate: row.last_date ?? "Check official notification",
    officialNotificationLink: row.notification_url ?? row.official_url ?? undefined,
    applyLink: row.official_apply_url ?? row.official_url ?? undefined,
    summary: row.summary ?? "Official government job update pending detailed editorial enrichment.",
    shortInformation: readMetadataString(metadata, "shortInformation"),
    notificationUrl: row.notification_url ?? undefined,
    officialUrl: row.official_url ?? undefined,
    officialApplyUrl: row.official_apply_url ?? undefined,
    sourceUrl: row.source_url ?? row.official_url ?? undefined,
    openings: readMetadataString(metadata, "openings") ?? readMetadataString(metadata, "vacancy"),
    salary: readMetadataString(metadata, "salary"),
    overview: readMetadataKeyValueList(metadata, "overview"),
    vacancyDetails: readMetadataKeyValueList(metadata, "vacancyDetails"),
    educationDetails: readMetadataKeyValueList(metadata, "educationDetails"),
    ageDetails: readMetadataKeyValueList(metadata, "ageDetails"),
    feeDetails: readMetadataKeyValueList(metadata, "feeDetails"),
    salaryDetails: readMetadataKeyValueList(metadata, "salaryDetails"),
    syllabus: readMetadataString(metadata, "syllabus"),
    selectionProcess: readMetadataString(metadata, "selectionProcess"),
    selectionSteps: readMetadataSectionList(metadata, "selectionSteps"),
    documentsRequired: readMetadataSectionList(metadata, "documentsRequired"),
    howToApplySteps: readMetadataSectionList(metadata, "howToApplySteps"),
    importantDates: readMetadataStringList(metadata, "importantDates"),
    importantLinks: readMetadataLinkList(metadata, "importantLinks"),
    faq: readMetadataFaq(metadata),
    publishedAt: readMetadataString(metadata, "publishedAt") ?? readMetadataString(metadata, "modifiedAt"),
    status,
  };
}

const INDIA_TIME_ZONE = "Asia/Kolkata";

function todayInIndia(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function normalizeLastDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export type GovernmentUpdateType = "recruitment" | "admit-card" | "result" | "answer-key";

export function classifyGovernmentUpdate(title: string): GovernmentUpdateType {
  const normalized = title.toLowerCase();
  if (/answer\s?key/.test(normalized)) return "answer-key";
  if (/(result|merit list|cut\s?off|scorecard|score card|final selection)/.test(normalized)) return "result";
  if (/(admit card|hall ticket|exam city|call letter|exam date|city slip|city details)/.test(normalized)) {
    return "admit-card";
  }
  return "recruitment";
}

export function isGovernmentJobActive(job: GovernmentJob, todayDate = todayInIndia()) {
  const lastDate = normalizeLastDate(job.lastDate);
  return lastDate === null || lastDate >= todayDate;
}

function sortGovernmentJobsByDeadline(jobs: GovernmentJob[]) {
  return [...jobs].sort((a, b) => {
    const aDate = normalizeLastDate(a.lastDate);
    const bDate = normalizeLastDate(b.lastDate);
    if (aDate && bDate) return aDate.localeCompare(bDate);
    if (aDate) return -1;
    if (bDate) return 1;
    return 0;
  });
}

const MIN_VISIBLE_GOVERNMENT_JOBS = 6;

function finalizeGovernmentJobs(jobs: GovernmentJob[], includeExpired: boolean) {
  if (includeExpired) {
    return sortGovernmentJobsByDeadline(jobs);
  }

  const todayDate = todayInIndia();
  const active = jobs.filter((job) => isGovernmentJobActive(job, todayDate));

  // Keep hub and feed pages populated while sources refill: top up with the
  // most recently expired listings (their passed deadlines stay visible).
  if (active.length < MIN_VISIBLE_GOVERNMENT_JOBS) {
    const expired = jobs
      .filter((job) => !isGovernmentJobActive(job, todayDate))
      .sort((a, b) => (normalizeLastDate(b.lastDate) ?? "").localeCompare(normalizeLastDate(a.lastDate) ?? ""));
    return [
      ...sortGovernmentJobsByDeadline(active),
      ...expired.slice(0, MIN_VISIBLE_GOVERNMENT_JOBS - active.length),
    ];
  }

  return sortGovernmentJobsByDeadline(active);
}

function mergeGovernmentJobs(primary: GovernmentJob[], fallback: GovernmentJob[]) {
  const bySlug = new Map<string, GovernmentJob>();

  // Insert fallback first so primary entries win when slugs collide.
  for (const job of [...fallback, ...primary]) {
    bySlug.set(job.slug, job);
  }

  return Array.from(bySlug.values());
}

const importedGovernmentJobs = (jobpulseImport as ImportedGovernmentJobRow[]).map(rowToGovernmentJob);

function rowFromJobpulseImport(row: JobpulseImportJobRow): ImportedGovernmentJobRow {
  return {
    id: row.id,
    fetch_key: row.fetch_key ?? null,
    slug: row.slug,
    title: row.title,
    department: row.department,
    category: row.category,
    category_slug: row.category_slug,
    state: row.state,
    eligibility: row.eligibility,
    age_limit: row.age_limit,
    fees: row.fees,
    application_fee: row.application_fee,
    last_date: row.last_date,
    official_url: row.official_url,
    notification_url: row.notification_url,
    official_apply_url: row.official_apply_url,
    source_url: row.source_url,
    summary: row.summary,
    status: row.status,
    metadata: {
      ...(row.metadata ?? {}),
      openings: row.openings ?? row.metadata?.openings ?? null,
      salary: row.salary ?? row.metadata?.salary ?? null,
      syllabus: row.syllabus ?? row.metadata?.syllabus ?? null,
      selectionProcess: row.selection_process ?? row.metadata?.selectionProcess ?? null,
      importantDates: row.important_dates ?? row.metadata?.importantDates ?? [],
      faq: row.faq ?? row.metadata?.faq ?? [],
    },
  };
}

let warnedAboutFallback = false;

/**
 * The bundled JSON snapshot keeps pages rendering when the database is
 * unreachable, which also makes a total outage look like a working site. Log it
 * once per process so the degraded state is at least discoverable in the host
 * logs; `/api/health` reports it explicitly.
 */
function warnFallback(reason: string) {
  if (warnedAboutFallback) return;
  warnedAboutFallback = true;
  console.error(
    `[government-jobs] Serving the bundled snapshot instead of live data: ${reason}. ` +
      "Check MYSQL_* environment variables — see /api/health.",
  );
}

/**
 * Government job listings are public data — no per-user filtering — so they are
 * read with the admin client only.
 *
 * The cookie-bound `createClient()` must NOT be used as a fallback here: it
 * calls `cookies()`, which throws inside `generateStaticParams`, `unstable_cache`,
 * and static rendering. That throw was being swallowed by the catch below, so
 * `/government-jobs/[segment]`, `/jobs/[slug]`, and `/api/sitemap` silently fell
 * back to the bundled snapshot and were forced to render dynamically. Both
 * clients hit the same MySQL pool, so the fallback bought nothing.
 */
function getGovernmentJobsClient() {
  return getSupabaseAdminClient();
}

export async function getApprovedGovernmentJobs(options?: { includeExpired?: boolean }) {
  const includeExpired = options?.includeExpired ?? false;
  try {
    const client = getGovernmentJobsClient();

    if (!client) {
      warnFallback("MYSQL_* environment variables are not set");
      return finalizeGovernmentJobs(mergeGovernmentJobs(importedGovernmentJobs, staticGovernmentJobs), includeExpired);
    }

    const importedResult = await client
      .from("jobpulse_import_jobs")
      .select(
        "id, fetch_key, slug, title, department, category, category_slug, state, eligibility, age_limit, fees, application_fee, last_date, official_url, notification_url, official_apply_url, source_url, summary, status, openings, salary, syllabus, selection_process, important_dates, faq, metadata",
      )
      .eq("status", "approved")
      .order("last_date", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: false });

    const importedRows = importedResult.error
      ? []
      : ((importedResult.data as JobpulseImportJobRow[] | null) ?? []).map(rowFromJobpulseImport);

    let data: GovernmentJobRow[] | null = null;
    let error: { message: string } | null = null;

    const primaryResult = await client
      .from("government_jobs")
      .select(
        "id, slug, category_slug, title, department, category, state, eligibility, age_limit, fees, application_fee, last_date, official_url, notification_url, official_apply_url, source_url, summary, status, metadata",
      )
      .eq("status", "approved")
      .order("last_date", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: false });

    if (primaryResult.error) {
      const fallbackResult = await client
        .from("government_jobs")
        .select(
          "id, slug, category_slug, title, department, category, state, eligibility, age_limit, fees, last_date, official_url, notification_url, summary",
        )
        .order("last_date", { ascending: true, nullsFirst: false });

      data = (fallbackResult.data as GovernmentJobRow[] | null) ?? null;
      error = fallbackResult.error ? { message: fallbackResult.error.message } : null;
    } else {
      data = (primaryResult.data as GovernmentJobRow[] | null) ?? null;
      error = null;
    }

    if (error || !data || data.length === 0) {
      if (importedRows.length === 0) {
        warnFallback(error ? `government_jobs query failed (${error.message})` : "no rows returned");
      }
      return finalizeGovernmentJobs(
        mergeGovernmentJobs(importedRows.map(rowToGovernmentJob), mergeGovernmentJobs(importedGovernmentJobs, staticGovernmentJobs)),
        includeExpired,
      );
    }

    return finalizeGovernmentJobs(
      mergeGovernmentJobs(
        importedRows.map(rowToGovernmentJob),
        mergeGovernmentJobs((data as GovernmentJobRow[]).map(rowToGovernmentJob), importedGovernmentJobs),
      ),
      includeExpired,
    );
  } catch (error) {
    warnFallback(error instanceof Error ? error.message : "database client unavailable");
    return finalizeGovernmentJobs(mergeGovernmentJobs(importedGovernmentJobs, staticGovernmentJobs), includeExpired);
  }
}

export async function getGovernmentJobBySlug(slug: string) {
  const jobs = await getApprovedGovernmentJobs({ includeExpired: true });
  return jobs.find((job) => job.slug === slug) ?? getStaticGovernmentJobBySlug(slug);
}

export async function getGovernmentJobsByCategory(categorySlug: string) {
  const jobs = await getApprovedGovernmentJobs();
  const filtered = jobs.filter((job) => job.categorySlug === categorySlug);
  return filtered.length > 0 ? filtered : getStaticGovernmentJobsByCategory(categorySlug);
}

export async function getRelatedGovernmentJobs(currentSlug: string, categorySlug: string) {
  const jobs = await getGovernmentJobsByCategory(categorySlug);
  return jobs.filter((job) => job.slug !== currentSlug).slice(0, 6);
}

export async function getGovernmentSegments() {
  const jobs = await getApprovedGovernmentJobs({ includeExpired: true });
  return [
    ...governmentJobCategories.map((category) => category.slug),
    ...jobs.map((job) => job.slug),
  ];
}

export { governmentJobCategories, getGovernmentJobCategoryBySlug };
