"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/redirects";
import {
  normalizeCsvHeader,
  normalizeJobType,
  normalizeSalaryType,
  normalizeWorkMode,
  parseCsv,
  parseDelimitedList,
  parseInteger,
  slugify,
} from "@/lib/jobs/admin";
import { adminManagedJobSchema } from "@/lib/validation/schemas";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminJobCreateFormState = {
  fieldErrors?: Partial<Record<string, string>>;
  message?: string;
};

export type AdminJobUpdateFormState = AdminJobCreateFormState;

type CsvRecord = Record<string, string>;

type CsvImportPreviewRow = {
  rowNumber: number;
  title: string;
  companyName: string;
  city: string;
  status: "valid" | "invalid";
  errors: string[];
  duplicate: boolean;
};

type CsvImportSummary = {
  totalRows: number;
  previewRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
};

export type AdminJobsCsvPreviewState = {
  fileName?: string;
  headerErrors?: string[];
  message?: string;
  payload?: string;
  rows?: CsvImportPreviewRow[];
  summary?: CsvImportSummary;
};

export type AdminJobsCsvImportState = {
  message?: string;
  importedCount?: number;
  skippedCount?: number;
  summary?: CsvImportSummary;
};

async function getMutationClient() {
  return getSupabaseAdminClient() ?? (await createClient());
}

function getReturnTo(formData: FormData, fallbackSection = "jobs") {
  const returnTo = formData.get("returnTo");
  if (typeof returnTo === "string" && returnTo.startsWith("/admin")) {
    return returnTo;
  }

  return `/admin?section=${fallbackSection}`;
}

async function logAdminAction(
  client: Awaited<ReturnType<typeof getMutationClient>>,
  adminUserId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown>,
) {
  await client.from("admin_logs").insert({
    admin_user_id: adminUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

async function setAuthUserBanMetadata(userId: string, isBanned: boolean) {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return false;

  const { data, error: getError } = await adminClient.auth.admin.getUserById(userId);
  if (getError) {
    console.error("[admin] unable to read auth user before ban update", getError);
    return false;
  }

  const appMetadata =
    data.user?.app_metadata && typeof data.user.app_metadata === "object" ? data.user.app_metadata : {};
  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...appMetadata,
      is_banned: isBanned,
    },
  });

  if (updateError) {
    console.error("[admin] unable to update auth user ban metadata", updateError);
    return false;
  }

  return true;
}

async function setUserBanned(
  client: Awaited<ReturnType<typeof getMutationClient>>,
  userId: string,
  isBanned: boolean,
) {
  const { error } = await client.from("users").update({ is_banned: isBanned }).eq("id", userId);
  const authSynced = await setAuthUserBanMetadata(userId, isBanned);

  if (error) {
    console.error("[admin] unable to update users.is_banned", error);
  }

  if (error && !authSynced) {
    throw error;
  }
}

function revalidateJobSurfaces(slug?: string | null) {
  revalidatePath("/admin");
  revalidatePath("/admin/jobs/review");
  revalidatePath("/jobs");
  revalidatePath("/sitemap.xml");
  if (slug) {
    revalidatePath(`/jobs/${slug}`);
  }
}

async function ensureUniqueCompanySlug(
  client: Awaited<ReturnType<typeof getMutationClient>>,
  baseSlug: string,
) {
  let attempt = 0;
  let nextSlug = baseSlug || "company";

  while (attempt < 25) {
    const { data } = await client
      .from("companies")
      .select("id")
      .eq("slug", nextSlug)
      .maybeSingle();

    if (!data) {
      return nextSlug;
    }

    attempt += 1;
    nextSlug = `${baseSlug}-${attempt + 1}`;
  }

  return `${baseSlug}-${Date.now()}`;
}

async function ensureUniqueJobSlug(
  client: Awaited<ReturnType<typeof getMutationClient>>,
  baseSlug: string,
) {
  const normalizedBase = baseSlug || "job";
  let attempt = 0;
  let nextSlug = normalizedBase;

  while (attempt < 50) {
    const { data } = await client
      .from("jobs")
      .select("id")
      .eq("slug", nextSlug)
      .maybeSingle();

    if (!data) {
      return nextSlug;
    }

    attempt += 1;
    nextSlug = `${normalizedBase}-${attempt + 1}`;
  }

  return `${normalizedBase}-${Date.now()}`;
}

async function upsertCompanyRecord(
  client: Awaited<ReturnType<typeof getMutationClient>>,
  input: {
    name: string;
    website?: string;
    description?: string;
    logoUrl?: string;
    industry?: string;
    city?: string;
    state?: string;
    verified?: boolean;
  },
) {
  const { data: existing } = await client
    .from("companies")
    .select("id, slug, verified, is_verified")
    .eq("name", input.name)
    .maybeSingle();

  if (existing?.id) {
    const shouldVerify = Boolean(existing.verified || existing.is_verified || input.verified);

    await client
      .from("companies")
      .update({
        website: input.website || null,
        description: input.description || null,
        logo_url: input.logoUrl || null,
        industry: input.industry || null,
        city: input.city || null,
        state: input.state || null,
        verified: shouldVerify,
        is_verified: shouldVerify,
      })
      .eq("id", existing.id);

    return existing.id;
  }

  const slug = await ensureUniqueCompanySlug(client, slugify(input.name));
  const { data, error } = await client
    .from("companies")
    .insert({
      name: input.name,
      slug,
      website: input.website || null,
      description: input.description || null,
      logo_url: input.logoUrl || null,
      industry: input.industry || null,
      city: input.city || null,
      state: input.state || null,
      verified: Boolean(input.verified),
      is_verified: Boolean(input.verified),
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
}

async function syncJobSkills(
  client: Awaited<ReturnType<typeof getMutationClient>>,
  jobId: string,
  skillNames: string[],
) {
  const normalized = Array.from(
    new Set(
      skillNames
        .map((skill) => skill.trim())
        .filter(Boolean),
    ),
  );

  await client.from("job_skill_links").delete().eq("job_id", jobId);

  if (normalized.length === 0) {
    return;
  }

  const insertedSkills = await Promise.all(
    normalized.map(async (name) => {
      const slug = slugify(name);
      const { data: existing } = await client
        .from("skills")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existing?.id) {
        return existing.id;
      }

      const { data, error } = await client
        .from("skills")
        .insert({ name, slug })
        .select("id")
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data?.id ?? null;
    }),
  );

  const skillIds = insertedSkills.filter((value): value is string => Boolean(value));

  if (skillIds.length > 0) {
    await client.from("job_skill_links").insert(
      skillIds.map((skillId) => ({
        job_id: jobId,
        skill_id: skillId,
      })),
    );
  }
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildExperienceRequired(input: {
  experienceRequired?: string;
  experienceMin?: number | null;
  experienceMax?: number | null;
}) {
  if (input.experienceRequired?.trim()) {
    return input.experienceRequired.trim();
  }

  if (input.experienceMin != null && input.experienceMax != null) {
    return `${input.experienceMin}-${input.experienceMax} years`;
  }

  if (input.experienceMin != null) {
    return `${input.experienceMin}+ years`;
  }

  if (input.experienceMax != null) {
    return `Up to ${input.experienceMax} years`;
  }

  return null;
}

async function assertValidCategorySlug(
  client: Awaited<ReturnType<typeof getMutationClient>>,
  categorySlug?: string,
) {
  if (!categorySlug) {
    return null;
  }

  const { data } = await client
    .from("job_categories")
    .select("slug")
    .eq("slug", categorySlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!data?.slug) {
    throw new Error(`Unknown job category: ${categorySlug}`);
  }

  return data.slug;
}

async function insertAdminManagedJob(
  client: Awaited<ReturnType<typeof getMutationClient>>,
  adminUserId: string,
  input: {
    categorySlug?: string;
    companyName: string;
    companyWebsite?: string;
    companyDescription?: string;
    companyLogoUrl?: string;
    companyVerified: boolean;
    title: string;
    description: string;
    responsibilities: string[];
    requirements: string[];
    skills: string[];
    city: string;
    state: string;
    country: string;
    workMode: "remote" | "hybrid" | "onsite";
    jobType: "full-time" | "part-time" | "contract" | "freelance" | "internship" | "walk-in";
    salaryType: "monthly" | "yearly" | "stipend";
    educationRequired: string;
    experienceRequired: string;
    experienceMin?: number | null;
    experienceMax?: number | null;
    industry: string;
    openings: number;
    deadline: string;
    salaryMin: number;
    salaryMax: number;
    applicationUrl?: string;
    sourceUrl?: string;
    sourceType: "employer" | "admin" | "official" | "partner";
    recruiterContact?: string;
    noCandidatePayment: boolean;
    salaryDisclosed: boolean;
    governmentSourceVerified: boolean;
    featured: boolean;
    verified: boolean;
    importSource?: string;
    importBatchId?: string;
  },
) {
  const categorySlug = await assertValidCategorySlug(client, input.categorySlug);
  const companyId = await upsertCompanyRecord(client, {
    name: input.companyName,
    website: input.companyWebsite,
    description: input.companyDescription,
    logoUrl: input.companyLogoUrl,
    industry: input.industry,
    city: input.city,
    state: input.state,
    verified: input.companyVerified,
  });
  const slug = await ensureUniqueJobSlug(
    client,
    slugify(`${input.title}-${input.companyName}-${input.city}`),
  );
  const experienceRequired = buildExperienceRequired({
    experienceRequired: input.experienceRequired,
    experienceMin: input.experienceMin,
    experienceMax: input.experienceMax,
  });

  const { data, error } = await client
    .from("jobs")
    .insert({
      company_id: companyId,
      category_slug: categorySlug,
      title: input.title,
      slug,
      company_name: input.companyName,
      description: input.description,
      responsibilities: input.responsibilities,
      requirements: input.requirements,
      skills: input.skills,
      salary_min: input.salaryMin,
      salary_max: input.salaryMax,
      salary_type: input.salaryType,
      city: input.city,
      state: input.state,
      country: input.country,
      location: [input.city, input.state].filter(Boolean).join(", "),
      job_type: input.jobType,
      work_mode: input.workMode,
      education_required: input.educationRequired || null,
      experience_required: experienceRequired,
      experience_min: input.experienceMin ?? null,
      experience_max: input.experienceMax ?? null,
      industry: input.industry || null,
      openings: input.openings,
      recruiter_contact: input.recruiterContact || null,
      status: "pending",
      approval_status: "pending",
      no_candidate_payment: input.noCandidatePayment,
      salary_disclosed: input.salaryDisclosed,
      government_source_verified: input.governmentSourceVerified,
      is_verified: input.verified,
      is_featured: input.featured,
      application_url: input.applicationUrl || null,
      deadline: input.deadline || null,
      source_type: input.sourceType,
      source_url: input.sourceUrl || null,
      import_source: input.importSource || null,
      import_batch_id: input.importBatchId || null,
    })
    .select("id, slug")
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Unable to create job.");
  }

  await syncJobSkills(client, data.id, input.skills);
  await logAdminAction(client, adminUserId, "create_job", "job", data.id, {
    slug: data.slug,
    importSource: input.importSource ?? "manual",
  });

  return data;
}

async function updateAdminManagedJob(
  client: Awaited<ReturnType<typeof getMutationClient>>,
  adminUserId: string,
  jobId: string,
  input: {
    categorySlug?: string;
    companyName: string;
    companyWebsite?: string;
    companyDescription?: string;
    companyLogoUrl?: string;
    companyVerified: boolean;
    title: string;
    description: string;
    responsibilities: string[];
    requirements: string[];
    skills: string[];
    city: string;
    state: string;
    country: string;
    workMode: "remote" | "hybrid" | "onsite";
    jobType: "full-time" | "part-time" | "contract" | "freelance" | "internship" | "walk-in";
    salaryType: "monthly" | "yearly" | "stipend";
    educationRequired: string;
    experienceRequired: string;
    experienceMin?: number | null;
    experienceMax?: number | null;
    industry: string;
    openings: number;
    deadline: string;
    salaryMin: number;
    salaryMax: number;
    applicationUrl?: string;
    sourceUrl?: string;
    sourceType: "employer" | "admin" | "official" | "partner";
    recruiterContact?: string;
    noCandidatePayment: boolean;
    salaryDisclosed: boolean;
    governmentSourceVerified: boolean;
    featured: boolean;
    verified: boolean;
  },
) {
  const { data: existing } = await client
    .from("jobs")
    .select("id, slug")
    .eq("id", jobId)
    .maybeSingle();

  if (!existing?.id) {
    throw new Error("Unable to find this job for editing.");
  }

  const categorySlug = await assertValidCategorySlug(client, input.categorySlug);
  const companyId = await upsertCompanyRecord(client, {
    name: input.companyName,
    website: input.companyWebsite,
    description: input.companyDescription,
    logoUrl: input.companyLogoUrl,
    industry: input.industry,
    city: input.city,
    state: input.state,
    verified: input.companyVerified,
  });
  const experienceRequired = buildExperienceRequired({
    experienceRequired: input.experienceRequired,
    experienceMin: input.experienceMin,
    experienceMax: input.experienceMax,
  });

  const { error } = await client
    .from("jobs")
    .update({
      company_id: companyId,
      category_slug: categorySlug,
      title: input.title,
      company_name: input.companyName,
      description: input.description,
      responsibilities: input.responsibilities,
      requirements: input.requirements,
      skills: input.skills,
      salary_min: input.salaryMin,
      salary_max: input.salaryMax,
      salary_type: input.salaryType,
      city: input.city,
      state: input.state,
      country: input.country,
      location: [input.city, input.state].filter(Boolean).join(", "),
      job_type: input.jobType,
      work_mode: input.workMode,
      education_required: input.educationRequired || null,
      experience_required: experienceRequired,
      experience_min: input.experienceMin ?? null,
      experience_max: input.experienceMax ?? null,
      industry: input.industry || null,
      openings: input.openings,
      recruiter_contact: input.recruiterContact || null,
      no_candidate_payment: input.noCandidatePayment,
      salary_disclosed: input.salaryDisclosed,
      government_source_verified: input.governmentSourceVerified,
      is_verified: input.verified,
      is_featured: input.featured,
      application_url: input.applicationUrl || null,
      apply_url: input.applicationUrl || null,
      deadline: input.deadline || null,
      expires_at: input.deadline || null,
      source_type: input.sourceType,
      source_url: input.sourceUrl || null,
    } as never)
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message);
  }

  await syncJobSkills(client, jobId, input.skills);
  await logAdminAction(client, adminUserId, "update_job", "job", jobId, {
    slug: existing.slug,
  });

  return existing;
}

function flattenFieldErrors(fieldErrors: Record<string, string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([, messages]) => Array.isArray(messages) && messages[0])
      .map(([field, messages]) => [field, messages?.[0] ?? "Invalid value."]),
  ) as Partial<Record<string, string>>;
}

function readBooleanField(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => String(value)).includes("true");
}

function buildJobPayloadFromFormData(formData: FormData) {
  return {
    categorySlug: String(formData.get("categorySlug") ?? "").trim() || undefined,
    companyName: String(formData.get("companyName") ?? "").trim(),
    companyWebsite: String(formData.get("companyWebsite") ?? "").trim(),
    companyDescription: String(formData.get("companyDescription") ?? "").trim(),
    companyLogoUrl: String(formData.get("companyLogoUrl") ?? "").trim(),
    companyVerified: readBooleanField(formData, "companyVerified"),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    responsibilities: parseDelimitedList(String(formData.get("responsibilities") ?? "")),
    requirements: parseDelimitedList(String(formData.get("requirements") ?? "")),
    skills: parseDelimitedList(String(formData.get("skills") ?? "")),
    city: String(formData.get("city") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim(),
    country: String(formData.get("country") ?? "India").trim() || "India",
    workMode: normalizeWorkMode(String(formData.get("workMode") ?? "")),
    jobType: normalizeJobType(String(formData.get("jobType") ?? "")),
    salaryType: normalizeSalaryType(String(formData.get("salaryType") ?? "")),
    educationRequired: String(formData.get("educationRequired") ?? "").trim(),
    experienceRequired: String(formData.get("experienceRequired") ?? "").trim(),
    experienceMin: parseOptionalInteger(String(formData.get("experienceMin") ?? "")),
    experienceMax: parseOptionalInteger(String(formData.get("experienceMax") ?? "")),
    industry: String(formData.get("industry") ?? "").trim(),
    openings: parseInteger(String(formData.get("openings") ?? "1"), 1),
    deadline: String(formData.get("deadline") ?? "").trim(),
    salaryMin: parseInteger(String(formData.get("salaryMin") ?? "0")),
    salaryMax: parseInteger(String(formData.get("salaryMax") ?? "0")),
    applicationUrl: String(formData.get("applicationUrl") ?? "").trim(),
    sourceUrl: String(formData.get("sourceUrl") ?? "").trim(),
    sourceType: String(formData.get("sourceType") ?? "admin").trim(),
    recruiterContact: String(formData.get("recruiterContact") ?? "").trim(),
    noCandidatePayment: readBooleanField(formData, "noCandidatePayment"),
    salaryDisclosed: readBooleanField(formData, "salaryDisclosed"),
    governmentSourceVerified: readBooleanField(formData, "governmentSourceVerified"),
    featured: readBooleanField(formData, "featured"),
    verified: readBooleanField(formData, "verified"),
  };
}

function csvRowsToRecords(rows: string[][]) {
  const [headerRow, ...bodyRows] = rows;
  const headers = (headerRow ?? []).map(normalizeCsvHeader);

  return bodyRows.map((row) =>
    headers.reduce<CsvRecord>((acc, header, index) => {
      acc[header] = row[index]?.trim() ?? "";
      return acc;
    }, {}),
  );
}

function readCsvValue(row: CsvRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function buildJobPayloadFromCsvRow(row: CsvRecord) {
  return adminManagedJobSchema.parse({
    categorySlug: readCsvValue(row, "category_slug") || undefined,
    companyName: readCsvValue(row, "company_name", "company"),
    companyWebsite: readCsvValue(row, "company_website", "website"),
    companyDescription: readCsvValue(row, "company_description"),
    companyLogoUrl: readCsvValue(row, "company_logo", "company_logo_url", "logo_url"),
    companyVerified: readCsvValue(row, "company_verified") === "true",
    title: readCsvValue(row, "title"),
    description: readCsvValue(row, "description"),
    responsibilities: parseDelimitedList(readCsvValue(row, "responsibilities"), /\||[\n,]/),
    requirements: parseDelimitedList(readCsvValue(row, "requirements"), /\||[\n,]/),
    skills: parseDelimitedList(readCsvValue(row, "skills"), /\||[\n,]/),
    city: readCsvValue(row, "city"),
    state: readCsvValue(row, "state"),
    country: readCsvValue(row, "country") || "India",
    workMode: normalizeWorkMode(readCsvValue(row, "work_mode")),
    jobType: normalizeJobType(readCsvValue(row, "job_type")),
    salaryType: normalizeSalaryType(readCsvValue(row, "salary_type")),
    educationRequired: readCsvValue(row, "education_required"),
    experienceRequired: readCsvValue(row, "experience_required"),
    experienceMin: parseOptionalInteger(readCsvValue(row, "experience_min")),
    experienceMax: parseOptionalInteger(readCsvValue(row, "experience_max")),
    industry: readCsvValue(row, "industry"),
    openings: parseInteger(readCsvValue(row, "openings") || "1", 1),
    deadline: readCsvValue(row, "deadline", "application_deadline"),
    salaryMin: parseInteger(readCsvValue(row, "salary_min") || "0"),
    salaryMax: parseInteger(readCsvValue(row, "salary_max") || "0"),
    applicationUrl: readCsvValue(row, "application_url", "apply_url"),
    sourceUrl: readCsvValue(row, "source_url"),
    sourceType: readCsvValue(row, "source_type") || "admin",
    recruiterContact: readCsvValue(row, "recruiter_contact"),
    noCandidatePayment: readCsvValue(row, "no_candidate_payment") !== "false",
    salaryDisclosed: readCsvValue(row, "salary_disclosed") !== "false",
    governmentSourceVerified: readCsvValue(row, "government_source_verified") === "true",
    featured: readCsvValue(row, "featured") === "true",
    verified: readCsvValue(row, "verified", "is_verified") === "true",
  });
}

const csvImportColumns = [
  "title",
  "company_name",
  "company_logo",
  "company_website",
  "city",
  "state",
  "salary_min",
  "salary_max",
  "salary_type",
  "experience_min",
  "experience_max",
  "education_required",
  "skills",
  "description",
  "responsibilities",
  "requirements",
  "apply_url",
  "source_url",
  "deadline",
  "job_type",
  "work_mode",
  "industry",
  "openings",
] as const;

const csvImportColumnSet = new Set<string>(csvImportColumns);

function buildJobDuplicateKey(input: {
  title: string;
  companyName: string;
  city: string;
}) {
  return [input.title, input.companyName, input.city]
    .map((value) => value.trim().toLowerCase())
    .join("::");
}

function collectCsvHeaderErrors(headerRow: string[]) {
  const normalizedHeaders = headerRow.map(normalizeCsvHeader).filter(Boolean);
  const counts = new Map<string, number>();

  for (const header of normalizedHeaders) {
    counts.set(header, (counts.get(header) ?? 0) + 1);
  }

  const missing = csvImportColumns.filter((column) => !counts.has(column));
  const unexpected = Array.from(new Set(normalizedHeaders.filter((header) => !csvImportColumnSet.has(header))));
  const duplicateHeaders = Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([header]) => header);
  const errors: string[] = [];

  if (missing.length > 0) {
    errors.push(`Missing required columns: ${missing.join(", ")}`);
  }

  if (unexpected.length > 0) {
    errors.push(`Unexpected columns: ${unexpected.join(", ")}`);
  }

  if (duplicateHeaders.length > 0) {
    errors.push(`Duplicate columns: ${duplicateHeaders.join(", ")}`);
  }

  return errors;
}

async function findExistingJobDuplicate(
  client: Awaited<ReturnType<typeof getMutationClient>>,
  input: {
    title: string;
    companyName: string;
    city: string;
  },
) {
  const { data, error } = await client
    .from("jobs")
    .select("id")
    .eq("title", input.title)
    .eq("company_name", input.companyName)
    .eq("city", input.city)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data && data.length > 0);
}

async function buildCsvImportPreview(
  client: Awaited<ReturnType<typeof getMutationClient>>,
  fileName: string,
  text: string,
): Promise<AdminJobsCsvPreviewState> {
  const rows = parseCsv(text);

  if (rows.length === 0) {
    return {
      fileName,
      message: "The CSV file is empty.",
    };
  }

  const [headerRow, ...bodyRows] = rows;
  const headerErrors = collectCsvHeaderErrors(headerRow ?? []);
  const records = csvRowsToRecords(rows);
  const duplicateCounts = new Map<string, number>();

  for (const record of records) {
    const duplicateKey = buildJobDuplicateKey({
      title: readCsvValue(record, "title"),
      companyName: readCsvValue(record, "company_name"),
      city: readCsvValue(record, "city"),
    });

    if (duplicateKey !== "::::") {
      duplicateCounts.set(duplicateKey, (duplicateCounts.get(duplicateKey) ?? 0) + 1);
    }
  }

  const previewRows: CsvImportPreviewRow[] = [];
  const validPayload: Array<ReturnType<typeof adminManagedJobSchema.parse>> = [];
  let invalidRows = 0;
  let duplicateRows = 0;

  for (const [index, record] of records.entries()) {
    const rowNumber = index + 2;
    const title = readCsvValue(record, "title");
    const companyName = readCsvValue(record, "company_name");
    const city = readCsvValue(record, "city");
    const errors: string[] = [];
    let parsedRow: ReturnType<typeof adminManagedJobSchema.parse> | null = null;

    const parsed = adminManagedJobSchema.safeParse({
      categorySlug: readCsvValue(record, "category_slug") || undefined,
      companyName,
      companyWebsite: readCsvValue(record, "company_website", "website"),
      companyDescription: readCsvValue(record, "company_description"),
      companyLogoUrl: readCsvValue(record, "company_logo", "company_logo_url", "logo_url"),
      companyVerified: readCsvValue(record, "company_verified") === "true",
      title,
      description: readCsvValue(record, "description"),
      responsibilities: parseDelimitedList(readCsvValue(record, "responsibilities"), /\||[\n,]/),
      requirements: parseDelimitedList(readCsvValue(record, "requirements"), /\||[\n,]/),
      skills: parseDelimitedList(readCsvValue(record, "skills"), /\||[\n,]/),
      city,
      state: readCsvValue(record, "state"),
      country: readCsvValue(record, "country") || "India",
      workMode: normalizeWorkMode(readCsvValue(record, "work_mode")),
      jobType: normalizeJobType(readCsvValue(record, "job_type")),
      salaryType: normalizeSalaryType(readCsvValue(record, "salary_type")),
      educationRequired: readCsvValue(record, "education_required"),
      experienceRequired: readCsvValue(record, "experience_required"),
      experienceMin: parseOptionalInteger(readCsvValue(record, "experience_min")),
      experienceMax: parseOptionalInteger(readCsvValue(record, "experience_max")),
      industry: readCsvValue(record, "industry"),
      openings: parseInteger(readCsvValue(record, "openings") || "1", 1),
      deadline: readCsvValue(record, "deadline", "application_deadline"),
      salaryMin: parseInteger(readCsvValue(record, "salary_min") || "0"),
      salaryMax: parseInteger(readCsvValue(record, "salary_max") || "0"),
      applicationUrl: readCsvValue(record, "application_url", "apply_url"),
      sourceUrl: readCsvValue(record, "source_url"),
      sourceType: readCsvValue(record, "source_type") || "admin",
      recruiterContact: readCsvValue(record, "recruiter_contact"),
      noCandidatePayment: readCsvValue(record, "no_candidate_payment") !== "false",
      salaryDisclosed: readCsvValue(record, "salary_disclosed") !== "false",
      governmentSourceVerified: readCsvValue(record, "government_source_verified") === "true",
      featured: readCsvValue(record, "featured") === "true",
      verified: readCsvValue(record, "verified", "is_verified") === "true",
    });

    if (!parsed.success) {
      errors.push(...parsed.error.issues.map((issue) => issue.message));
    } else {
      parsedRow = parsed.data;
      const duplicateKey = buildJobDuplicateKey({ title, companyName, city });
      const isDuplicateInFile = (duplicateCounts.get(duplicateKey) ?? 0) > 1;

      if (isDuplicateInFile) {
        errors.push("Duplicate title + company + city found in this CSV.");
      } else if (await findExistingJobDuplicate(client, { title, companyName, city })) {
        errors.push("Duplicate title + company + city already exists in jobs.");
      }
    }

    const duplicate = errors.some((error) => error.toLowerCase().includes("duplicate"));
    if (duplicate) {
      duplicateRows += 1;
    }

    if (errors.length > 0) {
      invalidRows += 1;
    } else if (parsedRow) {
      validPayload.push(parsedRow);
    }

    if (previewRows.length < 20) {
      previewRows.push({
        rowNumber,
        title,
        companyName,
        city,
        status: errors.length === 0 ? "valid" : "invalid",
        errors: Array.from(new Set(errors)),
        duplicate,
      });
    }
  }

  const summary: CsvImportSummary = {
    totalRows: bodyRows.length,
    previewRows: previewRows.length,
    validRows: validPayload.length,
    invalidRows,
    duplicateRows,
  };

  const message =
    headerErrors.length > 0
      ? "Fix the CSV headers before importing."
      : validPayload.length === 0
        ? "No valid rows are ready to import yet."
        : undefined;

  return {
    fileName,
    headerErrors,
    message,
    payload: headerErrors.length === 0 && validPayload.length > 0 ? JSON.stringify(validPayload) : undefined,
    rows: previewRows,
    summary,
  };
}

export async function createAdminJobAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const returnTo = getReturnTo(formData, "jobs");

  const parsed = adminManagedJobSchema.safeParse(buildJobPayloadFromFormData(formData));
  if (!parsed.success) {
    redirect(returnTo);
  }

  await insertAdminManagedJob(client, admin.id, parsed.data);

  revalidateJobSurfaces();
  redirect(returnTo);
}

export async function createAdminJobFormAction(
  _previousState: AdminJobCreateFormState,
  formData: FormData,
): Promise<AdminJobCreateFormState> {
  const admin = await requireRole(["admin"]);
  const parsed = adminManagedJobSchema.safeParse(buildJobPayloadFromFormData(formData));

  if (!parsed.success) {
    return {
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
      message: parsed.error.issues[0]?.message ?? "Please correct the highlighted fields.",
    };
  }

  try {
    const client = await getMutationClient();
    await insertAdminManagedJob(client, admin.id, parsed.data);
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Unable to create the job right now.",
    };
  }

  revalidateJobSurfaces();
  redirect("/admin?section=jobs&status=pending");
}

export async function updateAdminJobFormAction(
  jobId: string,
  _previousState: AdminJobUpdateFormState,
  formData: FormData,
): Promise<AdminJobUpdateFormState> {
  const admin = await requireRole(["admin"]);
  const parsed = adminManagedJobSchema.safeParse(buildJobPayloadFromFormData(formData));

  if (!parsed.success) {
    return {
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
      message: parsed.error.issues[0]?.message ?? "Please correct the highlighted fields.",
    };
  }

  try {
    const client = await getMutationClient();
    const job = await updateAdminManagedJob(client, admin.id, jobId, parsed.data);
    revalidateJobSurfaces(job.slug);
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Unable to update the job right now.",
    };
  }

  redirect("/admin/jobs/review");
}

export async function previewJobsCsvImportAction(
  _previousState: AdminJobsCsvPreviewState,
  formData: FormData,
): Promise<AdminJobsCsvPreviewState> {
  const admin = await requireRole(["admin"]);
  void admin;

  const file = formData.get("csvFile");
  if (!(file instanceof File) || file.size === 0) {
    return {
      message: "Choose a CSV file to preview.",
    };
  }

  try {
    const client = await getMutationClient();
    const text = await file.text();
    return await buildCsvImportPreview(client, file.name, text);
  } catch (error) {
    return {
      fileName: file.name,
      message: error instanceof Error ? error.message : "We could not preview this CSV.",
    };
  }
}

export async function commitJobsCsvImportAction(
  _previousState: AdminJobsCsvImportState,
  formData: FormData,
): Promise<AdminJobsCsvImportState> {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const payload = String(formData.get("payload") ?? "");
  const summaryText = String(formData.get("summary") ?? "");

  if (!payload) {
    return {
      message: "Preview a CSV with valid rows before importing.",
    };
  }

  let parsedSummary: CsvImportSummary | undefined;
  if (summaryText) {
    try {
      parsedSummary = JSON.parse(summaryText) as CsvImportSummary;
    } catch {
      parsedSummary = undefined;
    }
  }

  let importedCount = 0;
  let skippedCount = 0;

  try {
    const values = JSON.parse(payload) as unknown;
    if (!Array.isArray(values)) {
      throw new Error("The import payload is invalid.");
    }

    const batchId = crypto.randomUUID();

    for (const value of values) {
      const parsed = adminManagedJobSchema.safeParse(value);
      if (!parsed.success) {
        skippedCount += 1;
        continue;
      }

      const isDuplicate = await findExistingJobDuplicate(client, {
        title: parsed.data.title,
        companyName: parsed.data.companyName,
        city: parsed.data.city,
      });

      if (isDuplicate) {
        skippedCount += 1;
        continue;
      }

      await insertAdminManagedJob(client, admin.id, {
        ...parsed.data,
        importSource: "csv",
        importBatchId: batchId,
      });
      importedCount += 1;
    }

    await logAdminAction(client, admin.id, "import_jobs_csv", "job_import", null, {
      batchId,
      importedCount,
      skippedCount,
    });
    revalidateJobSurfaces();

    return {
      importedCount,
      skippedCount,
      summary: parsedSummary,
      message:
        importedCount > 0
          ? "Import complete. All created jobs are pending review."
          : "No jobs were imported. The rows may already exist or need fixes.",
    };
  } catch (error) {
    return {
      summary: parsedSummary,
      message: error instanceof Error ? error.message : "We could not import this CSV.",
    };
  }
}

export async function importJobsCsvAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const returnTo = getReturnTo(formData, "jobs");
  const file = formData.get("csvFile");

  if (!(file instanceof File) || file.size === 0) {
    redirect(returnTo);
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    redirect(returnTo);
  }

  const batchId = crypto.randomUUID();
  const records = csvRowsToRecords(rows);
  let importedCount = 0;

  for (const record of records) {
    const input = buildJobPayloadFromCsvRow(record);
    await insertAdminManagedJob(client, admin.id, {
      ...input,
      importSource: "csv",
      importBatchId: batchId,
    });
    importedCount += 1;
  }

  await logAdminAction(client, admin.id, "import_jobs_csv", "job_import", null, {
    batchId,
    importedCount,
    fileName: file.name,
  });

  revalidateJobSurfaces();
  redirect(returnTo);
}

export async function approveJobAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const jobId = String(formData.get("jobId") ?? "");
  const returnTo = getReturnTo(formData, "jobs");
  const reviewNotes = String(formData.get("reviewNotes") ?? "").trim();

  if (jobId) {
    const { data: job } = await client.from("jobs").select("slug").eq("id", jobId).maybeSingle();
    await client
      .from("jobs")
      .update({
        approval_status: "approved",
        status: "active",
        moderation_notes: reviewNotes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
        approved_at: new Date().toISOString(),
        approved_by: admin.id,
        published_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    await logAdminAction(client, admin.id, "approve_job", "job", jobId, {
      reviewNotes: reviewNotes || null,
    });
    revalidateJobSurfaces(job?.slug ?? null);
  }
  redirect(returnTo);
}

export async function rejectJobAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const jobId = String(formData.get("jobId") ?? "");
  const returnTo = getReturnTo(formData, "jobs");
  const reviewNotes = String(formData.get("reviewNotes") ?? "").trim();

  if (jobId) {
    const { data: job } = await client.from("jobs").select("slug").eq("id", jobId).maybeSingle();
    await client
      .from("jobs")
      .update({
        approval_status: "rejected",
        status: "rejected",
        is_featured: false,
        moderation_notes: reviewNotes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
        rejected_at: new Date().toISOString(),
        published_at: null,
      })
      .eq("id", jobId);

    await logAdminAction(client, admin.id, "reject_job", "job", jobId, {
      reviewNotes: reviewNotes || null,
    });
    revalidateJobSurfaces(job?.slug ?? null);
  }
  redirect(returnTo);
}

export async function toggleFeaturedJobAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const jobId = String(formData.get("jobId") ?? "");
  const shouldFeature = String(formData.get("nextValue") ?? "true") === "true";
  const returnTo = getReturnTo(formData, "jobs");

  if (jobId) {
    const { data: job } = await client.from("jobs").select("slug").eq("id", jobId).maybeSingle();
    await client.from("jobs").update({ is_featured: shouldFeature }).eq("id", jobId);
    await logAdminAction(client, admin.id, shouldFeature ? "feature_job" : "unfeature_job", "job", jobId, {
      featured: shouldFeature,
    });
    revalidateJobSurfaces(job?.slug ?? null);
  }
  redirect(returnTo);
}

export async function markJobVerifiedAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const jobId = String(formData.get("jobId") ?? "");
  const returnTo = getReturnTo(formData, "jobs");

  if (jobId) {
    const { data: job } = await client.from("jobs").select("slug").eq("id", jobId).maybeSingle();
    await client
      .from("jobs")
      .update({
        is_verified: true,
      } as never)
      .eq("id", jobId);
    await logAdminAction(client, admin.id, "mark_job_verified", "job", jobId, {});
    revalidateJobSurfaces(job?.slug ?? null);
  }

  redirect(returnTo);
}

export async function expireJobAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const jobId = String(formData.get("jobId") ?? "");
  const returnTo = getReturnTo(formData, "jobs");
  const expiredAt = new Date().toISOString();

  if (jobId) {
    const { data: job } = await client.from("jobs").select("slug").eq("id", jobId).maybeSingle();
    await client
      .from("jobs")
      .update({
        status: "expired",
        expires_at: expiredAt,
      } as never)
      .eq("id", jobId);
    await logAdminAction(client, admin.id, "expire_job", "job", jobId, {
      expiredAt,
    });
    revalidateJobSurfaces(job?.slug ?? null);
  }

  redirect(returnTo);
}

export async function deleteJobAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const jobId = String(formData.get("jobId") ?? "");
  const returnTo = getReturnTo(formData, "jobs");

  if (jobId) {
    const { data: job } = await client.from("jobs").select("slug").eq("id", jobId).maybeSingle();
    await client.from("jobs").delete().eq("id", jobId);
    await logAdminAction(client, admin.id, "delete_job", "job", jobId, {});
    revalidateJobSurfaces(job?.slug ?? null);
  }

  redirect(returnTo);
}

export async function bulkReviewJobsAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const returnTo = getReturnTo(formData, "jobs");
  const bulkAction = String(formData.get("bulkAction") ?? "").trim();
  const jobIds = Array.from(
    new Set(
      formData
        .getAll("jobIds")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  );

  if (jobIds.length === 0) {
    redirect(returnTo);
  }

  const { data: jobs } = await client.from("jobs").select("id, slug").in("id", jobIds);
  const slugs = ((jobs as Array<{ slug?: string | null }> | null) ?? [])
    .map((job) => job.slug ?? null)
    .filter((slug): slug is string => Boolean(slug));
  const now = new Date().toISOString();

  if (bulkAction === "approve") {
    await client
      .from("jobs")
      .update({
        approval_status: "approved",
        status: "active",
        reviewed_at: now,
        reviewed_by: admin.id,
        approved_at: now,
        approved_by: admin.id,
        published_at: now,
      } as never)
      .in("id", jobIds);
  } else if (bulkAction === "reject") {
    await client
      .from("jobs")
      .update({
        approval_status: "rejected",
        status: "rejected",
        is_featured: false,
        reviewed_at: now,
        reviewed_by: admin.id,
        rejected_at: now,
        published_at: null,
      } as never)
      .in("id", jobIds);
  } else if (bulkAction === "delete") {
    await client.from("jobs").delete().in("id", jobIds);
  } else {
    redirect(returnTo);
  }

  await logAdminAction(client, admin.id, `bulk_${bulkAction}_jobs`, "job", null, {
    jobIds,
    count: jobIds.length,
  });

  revalidateJobSurfaces();
  for (const slug of slugs) {
    revalidateJobSurfaces(slug);
  }

  redirect(returnTo);
}

export async function markEmployerVerifiedAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const employerId = String(formData.get("employerId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const returnTo = getReturnTo(formData, "employers");

  if (employerId) {
    await client
      .from("employer_profiles")
      .update({ verified: true, approval_status: "approved" })
      .eq("id", employerId);

    if (companyId) {
      await client.from("companies").update({ verified: true }).eq("id", companyId);
    }

    await logAdminAction(client, admin.id, "mark_employer_verified", "employer", employerId, {
      companyId: companyId || null,
    });
  }

  revalidatePath("/admin");
  redirect(returnTo);
}

export async function toggleUserBanAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const userId = String(formData.get("userId") ?? "");
  const nextValue = String(formData.get("nextValue") ?? "true") === "true";
  const returnTo = getReturnTo(formData, "users");

  if (userId) {
    await setUserBanned(client, userId, nextValue);
    await logAdminAction(client, admin.id, nextValue ? "ban_user" : "unban_user", "user", userId, {
      banned: nextValue,
    });
  }

  revalidatePath("/admin");
  redirect(returnTo);
}

export async function reviewReportAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const reportId = String(formData.get("reportId") ?? "");
  const status = String(formData.get("status") ?? "reviewing");
  const resolutionNotes = String(formData.get("resolutionNotes") ?? "").trim();
  const returnTo = getReturnTo(formData, "reports");

  if (reportId) {
    await client
      .from("job_reports")
      .update({
        status,
        reviewed_by: admin.id,
        resolution_notes: resolutionNotes || null,
      })
      .eq("id", reportId);
    await logAdminAction(client, admin.id, "review_job_report", "job_report", reportId, {
      status,
      resolutionNotes: resolutionNotes || null,
    });
  }

  revalidatePath("/admin");
  redirect(returnTo);
}

export async function removeFakeJobAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const jobId = String(formData.get("jobId") ?? "");
  const reportId = String(formData.get("reportId") ?? "");
  const returnTo = getReturnTo(formData, "reports");

  if (jobId) {
    await client.from("jobs").delete().eq("id", jobId);
    await logAdminAction(client, admin.id, "remove_fake_job", "job", jobId, {
      reportId: reportId || null,
    });
  }

  if (reportId) {
    await client
      .from("job_reports")
      .update({
        status: "resolved",
        reviewed_by: admin.id,
        resolution_notes: "Listing removed as fake or unsafe.",
      })
      .eq("id", reportId);
  }

  revalidatePath("/admin");
  redirect(returnTo);
}

export async function banEmployerFromReportAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const userId = String(formData.get("userId") ?? "");
  const reportId = String(formData.get("reportId") ?? "");
  const returnTo = getReturnTo(formData, "reports");

  if (userId) {
    await setUserBanned(client, userId, true);
    await logAdminAction(client, admin.id, "ban_employer_from_report", "user", userId, {
      reportId: reportId || null,
    });
  }

  if (reportId) {
    await client
      .from("job_reports")
      .update({
        status: "resolved",
        reviewed_by: admin.id,
        resolution_notes: "Employer banned after report review.",
      })
      .eq("id", reportId);
  }

  revalidatePath("/admin");
  redirect(returnTo);
}

export async function createGovernmentJobAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const returnTo = getReturnTo(formData, "government-jobs");

  const title = String(formData.get("title") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  if (title && department && category) {
    const slugInput = String(formData.get("slug") ?? "").trim();
    const slug = slugInput || slugify(`${title}-${department}`);

    const { data } = await client
      .from("government_jobs")
      .insert({
        title,
        slug,
        department,
        category,
        category_slug: String(formData.get("categorySlug") ?? "").trim() || null,
        state: String(formData.get("state") ?? "").trim() || null,
        eligibility: String(formData.get("eligibility") ?? "").trim() || null,
        age_limit: String(formData.get("ageLimit") ?? "").trim() || null,
        fees: String(formData.get("applicationFee") ?? "").trim() || null,
        application_fee: String(formData.get("applicationFee") ?? "").trim() || null,
        last_date: String(formData.get("lastDate") ?? "").trim() || null,
        official_url: String(formData.get("officialUrl") ?? "").trim() || null,
        notification_url: String(formData.get("notificationUrl") ?? "").trim() || null,
        official_apply_url: String(formData.get("officialApplyUrl") ?? "").trim() || null,
        source_url:
          String(formData.get("sourceUrl") ?? "").trim() ||
          String(formData.get("notificationUrl") ?? "").trim() ||
          String(formData.get("officialUrl") ?? "").trim() ||
          null,
        summary: String(formData.get("summary") ?? "").trim() || null,
        status: "approved",
        approved_by: admin.id,
        approved_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    await logAdminAction(client, admin.id, "create_government_job", "government_job", data?.id ?? null, {
      title,
      slug,
    });
  }

  revalidatePath("/admin");
  redirect(returnTo);
}

export async function approveGovernmentJobAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const id = String(formData.get("id") ?? "").trim();
  const returnTo = getReturnTo(formData, "government-jobs");

  if (id) {
    await client
      .from("government_jobs")
      .update({
        status: "approved",
        approved_by: admin.id,
        approved_at: new Date().toISOString(),
        rejected_by: null,
        rejected_at: null,
      })
      .eq("id", id);
  }

  revalidatePath("/admin");
  revalidatePath("/government-jobs");
  redirect(returnTo);
}

export async function rejectGovernmentJobAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const id = String(formData.get("id") ?? "").trim();
  const returnTo = getReturnTo(formData, "government-jobs");

  if (id) {
    await client
      .from("government_jobs")
      .update({
        status: "rejected",
        rejected_by: admin.id,
        rejected_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  revalidatePath("/admin");
  redirect(returnTo);
}

export async function createInternshipAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const returnTo = getReturnTo(formData, "internships");

  const title = String(formData.get("title") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();

  if (title && company) {
    const slugInput = String(formData.get("slug") ?? "").trim();
    const slug = slugInput || slugify(`${title}-${company}`);
    const skills = String(formData.get("skills") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const { data } = await client
      .from("internships")
      .insert({
        title,
        slug,
        company,
        category_slug: String(formData.get("categorySlug") ?? "").trim() || null,
        stipend: String(formData.get("stipend") ?? "").trim() || null,
        duration: String(formData.get("duration") ?? "").trim() || null,
        location: String(formData.get("location") ?? "").trim() || null,
        work_mode: (String(formData.get("workMode") ?? "").trim() || null) as "remote" | "hybrid" | "onsite" | null,
        is_paid: String(formData.get("isPaid") ?? "") === "true",
        skills,
        apply_url: String(formData.get("applyUrl") ?? "").trim() || null,
        deadline: String(formData.get("deadline") ?? "").trim() || null,
      })
      .select("id")
      .maybeSingle();

    await logAdminAction(client, admin.id, "create_internship", "internship", data?.id ?? null, {
      title,
      slug,
    });
  }

  revalidatePath("/admin");
  redirect(returnTo);
}

export async function createBlogPostAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const returnTo = getReturnTo(formData, "blog");

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (title && content) {
    const slugInput = String(formData.get("slug") ?? "").trim();
    const slug = slugInput || slugify(title);
    const status = String(formData.get("status") ?? "draft").trim() || "draft";
    const keywords = String(formData.get("keywords") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const { data } = await client
      .from("blog_posts")
      .insert({
        title,
        slug,
        excerpt: String(formData.get("excerpt") ?? "").trim() || null,
        content,
        meta_title: String(formData.get("metaTitle") ?? "").trim() || null,
        meta_description: String(formData.get("metaDescription") ?? "").trim() || null,
        keywords,
        schema_type: String(formData.get("schemaType") ?? "Article").trim() || "Article",
        status: status as "draft" | "pending" | "active" | "expired" | "rejected",
        published_at: status === "active" ? new Date().toISOString() : null,
      })
      .select("id")
      .maybeSingle();

    await logAdminAction(client, admin.id, "create_blog_post", "blog_post", data?.id ?? null, {
      title,
      slug,
      status,
    });
  }

  revalidatePath("/admin");
  redirect(returnTo);
}

export async function createSeoPageAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const returnTo = getReturnTo(formData, "seo");

  const title = String(formData.get("title") ?? "").trim();
  const pageType = String(formData.get("pageType") ?? "").trim();

  if (title && pageType) {
    const slugInput = String(formData.get("slug") ?? "").trim();
    const slug = slugInput || slugify(`${pageType}-${title}`);
    const faqJson = String(formData.get("faqJson") ?? "").trim();
    let parsedFaq: Array<{ question?: string; answer?: string }> = [];

    if (faqJson) {
      try {
        const value = JSON.parse(faqJson);
        if (Array.isArray(value)) {
          parsedFaq = value;
        }
      } catch {
        parsedFaq = [];
      }
    }

    const { data } = await client
      .from("seo_pages")
      .insert({
        title,
        slug,
        page_type: pageType,
        meta_title: String(formData.get("metaTitle") ?? "").trim() || null,
        meta_description: String(formData.get("metaDescription") ?? "").trim() || null,
        city: String(formData.get("city") ?? "").trim() || null,
        state: String(formData.get("state") ?? "").trim() || null,
        category: String(formData.get("category") ?? "").trim() || null,
        content: String(formData.get("content") ?? "").trim() || null,
        indexable: String(formData.get("indexable") ?? "true") === "true",
        faq_json: parsedFaq,
      })
      .select("id")
      .maybeSingle();

    await logAdminAction(client, admin.id, "create_seo_page", "seo_page", data?.id ?? null, {
      title,
      slug,
      pageType,
    });
  }

  revalidatePath("/admin");
  redirect(returnTo);
}
