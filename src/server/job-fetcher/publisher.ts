import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { enrichNormalizedJob } from "@/server/job-fetcher/ai-enrichment";
import type { JobSourceRecord } from "@/server/job-fetcher/types";

type EnrichedNormalizedJob = Awaited<ReturnType<typeof enrichNormalizedJob>>;

export type AutoPublishOutcome = {
  published: boolean;
  jobId?: string;
  slug?: string;
  reason?: string;
};

const DEFAULT_MIN_QUALITY_SCORE = 60;
const MIN_DESCRIPTION_LENGTH = 60;

export function isAutoPublishEnabled() {
  return process.env.JOB_FETCH_AUTO_PUBLISH !== "false";
}

function minQualityScore() {
  const raw = Number.parseInt(process.env.JOB_FETCH_AUTO_PUBLISH_MIN_QUALITY ?? "", 10);
  return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : DEFAULT_MIN_QUALITY_SCORE;
}

function todayIsoDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function mapSourceTypeToJobsEnum(sourceType: string) {
  return sourceType === "government_source" ? "official" : "partner";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function getPublishBlockReason(job: EnrichedNormalizedJob): string | null {
  if (!job.title?.trim()) return "Missing title.";
  if (!job.company_name?.trim()) return "Missing company name.";
  if (!job.description || job.description.trim().length < MIN_DESCRIPTION_LENGTH) {
    return "Description too short for automatic publishing.";
  }
  if (!job.apply_url && !job.source_url) return "No apply or source URL.";
  if (job.deadline && job.deadline < todayIsoDate()) return "Deadline already passed.";

  const quality = typeof job.quality_score === "number" ? job.quality_score : 0;
  if (quality < minQualityScore()) {
    return `Quality score ${quality} below auto-publish threshold ${minQualityScore()}.`;
  }

  return null;
}

async function ensureUniqueJobSlug(baseSlug: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("Supabase admin client is not configured.");

  let current = baseSlug || "job";
  let attempt = 0;

  while (attempt < 40) {
    const { data } = await admin.from("jobs").select("id").eq("slug", current).maybeSingle();
    if (!data) return current;
    attempt += 1;
    current = `${baseSlug}-${attempt + 1}`;
  }

  return `${baseSlug}-${Date.now()}`;
}

async function upsertCompany(job: EnrichedNormalizedJob, verified: boolean) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("Supabase admin client is not configured.");

  const companyName = job.company_name.trim();
  const { data } = await admin
    .from("companies")
    .select("id")
    .eq("name", companyName)
    .maybeSingle();
  const existing = data as { id?: string } | null;

  if (existing?.id) {
    return existing.id;
  }

  const baseSlug = slugify(companyName) || "company";
  let slug = baseSlug;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data } = await admin.from("companies").select("id").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${baseSlug}-${attempt + 2}`;
  }

  const { data: created, error } = await admin
    .from("companies")
    .insert({
      name: companyName,
      slug,
      industry: job.industry || null,
      city: job.city || null,
      state: job.state || null,
      verified,
      is_verified: verified,
    } as never)
    .select("id")
    .maybeSingle();
  const createdRow = created as { id?: string } | null;

  if (error || !createdRow?.id) {
    throw new Error(error?.message ?? "Unable to create company for auto-published job.");
  }

  return createdRow.id;
}

/**
 * Publishes a freshly normalized job straight to the public jobs board when it
 * clears the quality gates. Jobs that fail a gate stay in pending_review for
 * manual admin approval — nothing is dropped.
 */
export async function autoPublishNormalizedJob(input: {
  normalizedJobId: string;
  job: EnrichedNormalizedJob;
  source: JobSourceRecord;
}): Promise<AutoPublishOutcome> {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return { published: false, reason: "Supabase admin client is not configured." };
  }

  const blockReason = getPublishBlockReason(input.job);
  if (blockReason) {
    return { published: false, reason: blockReason };
  }

  const isGovernment = input.job.source_type === "government_source";
  const companyId = await upsertCompany(input.job, isGovernment);
  const slug = await ensureUniqueJobSlug(
    input.job.slug?.trim() ||
      slugify(`${input.job.title}-${input.job.company_name}-${input.job.city ?? "india"}`),
  );

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("jobs")
    .insert({
      company_id: companyId,
      normalized_job_id: input.normalizedJobId,
      title: input.job.title,
      slug,
      company_name: input.job.company_name,
      description: input.job.description,
      responsibilities: input.job.responsibilities ?? [],
      requirements: input.job.requirements ?? [],
      skills: input.job.skills ?? [],
      salary_min: input.job.salary_min ?? 0,
      salary_max: input.job.salary_max ?? 0,
      salary_type: input.job.salary_type ?? "yearly",
      city: input.job.city ?? "India",
      state: input.job.state ?? "India",
      country: input.job.country ?? "India",
      location: [input.job.city, input.job.state].filter(Boolean).join(", ") || "India",
      job_type: input.job.job_type ?? "full-time",
      work_mode: input.job.work_mode ?? "onsite",
      education_required: input.job.education_required ?? null,
      experience_min: input.job.experience_min ?? null,
      experience_max: input.job.experience_max ?? null,
      industry: input.job.industry ?? null,
      openings: input.job.openings ?? 1,
      status: "active",
      approval_status: "approved",
      no_candidate_payment: true,
      salary_disclosed: Boolean((input.job.salary_min ?? 0) > 0 || (input.job.salary_max ?? 0) > 0),
      government_source_verified: isGovernment,
      is_verified: isGovernment,
      application_url: input.job.apply_url ?? input.job.source_url,
      deadline: input.job.deadline ?? null,
      source_type: mapSourceTypeToJobsEnum(input.job.source_type),
      source_url: input.job.source_url ?? input.source.source_url,
      import_source: "automated_fetch",
      published_at: now,
      moderation_notes: `Auto-published by scheduled ingestion (quality ${input.job.quality_score ?? "n/a"}).`,
    } as never)
    .select("id, slug")
    .maybeSingle();
  const jobRow = data as { id?: string; slug?: string } | null;

  if (error || !jobRow?.id) {
    return { published: false, reason: error?.message ?? "Unable to insert auto-published job." };
  }

  await admin
    .from("normalized_jobs")
    .update({ status: "approved" } as never)
    .eq("id", input.normalizedJobId);

  return { published: true, jobId: jobRow.id, slug: jobRow.slug };
}
