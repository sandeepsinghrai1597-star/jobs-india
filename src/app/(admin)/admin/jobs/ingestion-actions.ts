"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/redirects";
import { assertAllowedJobSourceUrl, syncJobSource, type JobSourceRow } from "@/lib/jobs/ingestion";
import { runJobFetchScheduler } from "@/server/job-fetcher/scheduler";
import {
  buildJobSourceConfig,
  inferFetchMethod,
  inferInternalSourceType,
  parseJobSourceConfig,
  type JobSourceFetchMethod,
  type JobSourceUiType,
} from "@/lib/jobs/source-config";
import { buildPunjabSourcePackRows, PUNJAB_SOURCE_PACK } from "@/lib/jobs/punjab-source-pack";
import { buildTrustedSourcePackRows, TRUSTED_SOURCE_PACK } from "@/lib/jobs/trusted-source-pack";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { runSingleJobFetch } from "@/server/job-fetcher/scheduler";
import type { DbRow } from "@/lib/db/mysql";

async function getMutationClient() {
  return getSupabaseAdminClient() ?? (await createClient());
}

async function repairExistingSourceDefinitions(
  client: Awaited<ReturnType<typeof getMutationClient>>,
  rows: Array<Record<string, unknown>>,
) {
  for (const row of rows) {
    const name = typeof row.name === "string" ? row.name : "";
    const sourceUrl = typeof row.source_url === "string" ? row.source_url : "";
    if (!name || !sourceUrl) {
      continue;
    }

    const { data: existing } = await client
      .from("job_sources")
      .select("id, source_url")
      .eq("name", name)
      .maybeSingle();

    if (!existing?.id || existing.source_url === sourceUrl) {
      continue;
    }

    await client
      .from("job_sources")
      .update(row as never)
      .eq("id", existing.id);
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

function readReturnTo(formData: FormData, fallback: string) {
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  return returnTo.startsWith("/admin") ? returnTo : fallback;
}

function boolValue(formData: FormData, key: string) {
  return formData.getAll(key).map(String).includes("true");
}

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseSourceForm(formData: FormData) {
  const sourceType = (stringValue(formData, "sourceType") || "company-career-page") as JobSourceUiType;
  const fetchMethodInput = stringValue(formData, "fetchMethod");
  const fetchMethod = (fetchMethodInput || inferFetchMethod(sourceType)) as JobSourceFetchMethod;
  const fetchFrequencyMinutesRaw = Number.parseInt(stringValue(formData, "fetchFrequencyMinutes") || "1440", 10);
  const fetchFrequencyMinutes = Number.isFinite(fetchFrequencyMinutesRaw) ? fetchFrequencyMinutesRaw : 1440;

  return {
    name: stringValue(formData, "name"),
    sourceType,
    fetchMethod,
    sourceUrl: stringValue(formData, "sourceUrl"),
    companyName: stringValue(formData, "companyName"),
    industry: stringValue(formData, "industry"),
    defaultCity: stringValue(formData, "defaultCity"),
    defaultState: stringValue(formData, "defaultState"),
    notes: stringValue(formData, "notes"),
    allowAutoFetch: boolValue(formData, "allowAutoFetch"),
    isActive: boolValue(formData, "isActive"),
    fetchFrequencyMinutes,
  };
}

async function ensureUniqueCompanySlug(
  client: Awaited<ReturnType<typeof getMutationClient>>,
  baseSlug: string,
) {
  let current = baseSlug || "company";
  let attempt = 0;

  while (attempt < 20) {
    const { data } = await client.from("companies").select("id").eq("slug", current).maybeSingle();
    if (!data) return current;
    attempt += 1;
    current = `${baseSlug}-${attempt + 1}`;
  }

  return `${baseSlug}-${Date.now()}`;
}

async function ensureUniqueJobSlug(
  client: Awaited<ReturnType<typeof getMutationClient>>,
  baseSlug: string,
) {
  let current = baseSlug || "job";
  let attempt = 0;

  while (attempt < 40) {
    const { data } = await client.from("jobs").select("id").eq("slug", current).maybeSingle();
    if (!data) return current;
    attempt += 1;
    current = `${baseSlug}-${attempt + 1}`;
  }

  return `${baseSlug}-${Date.now()}`;
}

async function upsertCompany(
  client: Awaited<ReturnType<typeof getMutationClient>>,
  input: {
    companyName: string;
    companyWebsite?: string | null;
    industry?: string | null;
    city?: string | null;
    state?: string | null;
    verified?: boolean;
  },
) {
  const { data: existing } = await client
    .from("companies")
    .select("id")
    .eq("name", input.companyName)
    .maybeSingle();

  if (existing?.id) {
    await client
      .from("companies")
      .update({
        website: input.companyWebsite || null,
        industry: input.industry || null,
        city: input.city || null,
        state: input.state || null,
        verified: Boolean(input.verified),
        is_verified: Boolean(input.verified),
      })
      .eq("id", existing.id);

    return existing.id;
  }

  const slug = await ensureUniqueCompanySlug(client, slugify(input.companyName));
  const { data, error } = await client
    .from("companies")
    .insert({
      name: input.companyName,
      slug,
      website: input.companyWebsite || null,
      industry: input.industry || null,
      city: input.city || null,
      state: input.state || null,
      verified: Boolean(input.verified),
      is_verified: Boolean(input.verified),
    })
    .select("id")
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Unable to create company.");
  }

  return data.id;
}

async function syncSkills(
  client: Awaited<ReturnType<typeof getMutationClient>>,
  jobId: string,
  skills: string[],
) {
  const normalized = Array.from(new Set(skills.map((skill) => skill.trim()).filter(Boolean)));
  await client.from("job_skill_links").delete().eq("job_id", jobId);

  for (const skillName of normalized) {
    const skillSlug = slugify(skillName);
    const { data: existing } = await client.from("skills").select("id").eq("slug", skillSlug).maybeSingle();
    const skillId =
      existing?.id ??
      (
        await client
          .from("skills")
          .insert({ name: skillName, slug: skillSlug })
          .select("id")
          .maybeSingle()
      ).data?.id;

    if (skillId) {
      await client.from("job_skill_links").insert({ job_id: jobId, skill_id: skillId });
    }
  }
}

export async function createJobSourceAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();

  const parsed = parseSourceForm(formData);
  const returnTo = readReturnTo(formData, "/admin/job-sources");

  if (!parsed.name || !parsed.sourceUrl) {
    redirect(returnTo);
  }

  assertAllowedJobSourceUrl(parsed.sourceUrl);

  await client.from("job_sources").insert({
    name: parsed.name,
    source_type: inferInternalSourceType(parsed.sourceType),
    transport_type: parsed.fetchMethod,
    source_url: parsed.sourceUrl,
    status: parsed.isActive ? "active" : "paused",
    notes: parsed.notes || null,
    allow_auto_fetch: parsed.allowAutoFetch,
    config: buildJobSourceConfig(parsed),
    created_by: admin.id,
    updated_by: admin.id,
  } as never);

  revalidatePath("/admin/job-sources");
  revalidatePath("/admin/jobs/sources");
  redirect(returnTo);
}

export async function updateJobSourceAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const sourceId = stringValue(formData, "sourceId");
  const parsed = parseSourceForm(formData);
  const returnTo = readReturnTo(formData, "/admin/job-sources");

  if (!sourceId || !parsed.name || !parsed.sourceUrl) {
    redirect(returnTo);
  }

  assertAllowedJobSourceUrl(parsed.sourceUrl);

  await client
    .from("job_sources")
    .update({
      name: parsed.name,
      source_type: inferInternalSourceType(parsed.sourceType),
      transport_type: parsed.fetchMethod,
      source_url: parsed.sourceUrl,
      status: parsed.isActive ? "active" : "paused",
      notes: parsed.notes || null,
      allow_auto_fetch: parsed.allowAutoFetch,
      config: buildJobSourceConfig(parsed),
      updated_by: admin.id,
    } as never)
    .eq("id", sourceId);

  revalidatePath("/admin/job-sources");
  revalidatePath("/admin/jobs/sources");
  redirect(returnTo);
}

export async function runJobSourceAction(formData: FormData) {
  await requireRole(["admin"]);
  const client = await getMutationClient();
  const sourceId = stringValue(formData, "sourceId");
  const returnTo = readReturnTo(formData, "/admin/job-sources");

  if (!sourceId) {
    redirect(returnTo);
  }

  const { data } = await client
    .from("job_sources")
    .select("id, name, source_type, transport_type, source_url, status, allow_auto_fetch, config, notes, last_fetched_at")
    .eq("id", sourceId)
    .maybeSingle();

  if (data) {
    try {
      await syncJobSource(data as JobSourceRow, "manual");
    } catch (error) {
      console.error("Manual job source fetch failed", error);
    }
  }

  revalidatePath("/admin/job-sources");
  revalidatePath("/admin/jobs/sources");
  revalidatePath("/admin/jobs/fetched");
  revalidatePath("/admin");
  redirect(returnTo);
}

export async function runDueJobSourcesAction(formData: FormData) {
  await requireRole(["admin"]);
  const returnTo = readReturnTo(formData, "/admin/job-sources");

  try {
    await runJobFetchScheduler("manual", { autoOnly: true });
  } catch (error) {
    console.error("Manual due-source scheduler failed", error);
  }

  revalidatePath("/admin/job-sources");
  revalidatePath("/admin/jobs/sources");
  revalidatePath("/admin/jobs/fetched");
  revalidatePath("/admin");
  redirect(returnTo);
}

export async function rejectFetchedJobAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const itemId = String(formData.get("itemId") ?? "").trim();
  const reviewNotes = String(formData.get("reviewNotes") ?? "").trim();
  const returnTo = readReturnTo(formData, "/admin/jobs/fetched");

  if (itemId) {
    await client
      .from("job_ingestion_items")
      .update({
        review_status: "rejected",
        review_notes: reviewNotes || null,
        rejected_by: admin.id,
        rejected_at: new Date().toISOString(),
      } as never)
      .eq("id", itemId);
  }

  revalidatePath("/admin/jobs/fetched");
  redirect(returnTo);
}

export async function rejectNormalizedJobAction(formData: FormData) {
  await requireRole(["admin"]);
  const client = await getMutationClient();
  const normalizedJobId = String(formData.get("normalizedJobId") ?? "").trim();
  const returnTo = readReturnTo(formData, "/admin/jobs/fetched");

  if (normalizedJobId) {
    await client
      .from("normalized_jobs")
      .update({
        status: "rejected",
      } as never)
      .eq("id", normalizedJobId);
  }

  revalidatePath("/admin/jobs/fetched");
  revalidatePath("/admin/jobs/review");
  redirect(returnTo);
}

export async function approveFetchedJobAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const itemId = String(formData.get("itemId") ?? "").trim();
  const reviewNotes = String(formData.get("reviewNotes") ?? "").trim();
  const returnTo = readReturnTo(formData, "/admin/jobs/fetched");

  if (!itemId) {
    redirect(returnTo);
  }

  const { data: item } = await client
    .from("job_ingestion_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();

  if (!item) {
    redirect(returnTo);
  }

  const companyId = await upsertCompany(client, {
    companyName: String(item.company_name),
    companyWebsite: (item.company_website as string | null) ?? null,
    industry: (item.industry as string | null) ?? null,
    city: (item.city as string | null) ?? null,
    state: (item.state as string | null) ?? null,
    verified: item.source_type === "official",
  });

  const slug = await ensureUniqueJobSlug(
    client,
    slugify(`${item.title}-${item.company_name}-${item.city ?? "india"}`),
  );

  const now = new Date().toISOString();
  const { data: job, error } = await client
    .from("jobs")
    .insert({
      company_id: companyId,
      title: item.title,
      slug,
      company_name: item.company_name,
      description: item.description,
      responsibilities: item.responsibilities ?? [],
      requirements: item.requirements ?? [],
      skills: item.skills ?? [],
      salary_min: item.salary_min ?? 0,
      salary_max: item.salary_max ?? 0,
      salary_type: item.salary_type ?? "yearly",
      city: item.city ?? "India",
      state: item.state ?? "India",
      country: item.country ?? "India",
      location: [item.city, item.state].filter(Boolean).join(", ") || "India",
      job_type: item.job_type ?? "full-time",
      work_mode: item.work_mode ?? "onsite",
      education_required: item.education_required ?? null,
      experience_required: item.experience_required ?? null,
      experience_min: item.experience_min ?? null,
      experience_max: item.experience_max ?? null,
      industry: item.industry ?? null,
      openings: item.openings ?? 1,
      recruiter_contact: item.recruiter_contact ?? null,
      status: "active",
      approval_status: "approved",
      no_candidate_payment: true,
      salary_disclosed: Boolean((item.salary_min ?? 0) > 0 || (item.salary_max ?? 0) > 0),
      government_source_verified: item.source_type === "official",
      is_verified: item.source_type === "official",
      application_url: item.application_url ?? item.source_url,
      deadline: item.deadline ?? null,
      source_type: item.source_type,
      source_url: item.source_url,
      import_source: "automated_fetch",
      reviewed_at: now,
      reviewed_by: admin.id,
      approved_at: now,
      approved_by: admin.id,
      published_at: now,
      moderation_notes: reviewNotes || item.review_notes || null,
    } as never)
    .select("id, slug")
    .maybeSingle();

  if (error || !job?.id) {
    throw new Error(error?.message ?? "Unable to publish fetched job.");
  }

  await syncSkills(client, job.id, Array.isArray(item.skills) ? item.skills.map(String) : []);

  await client
    .from("job_ingestion_items")
    .update({
      review_status: "published",
      review_notes: reviewNotes || item.review_notes || null,
      approved_by: admin.id,
      approved_at: now,
      published_job_id: job.id,
      published_at: now,
    } as never)
    .eq("id", itemId);

  revalidatePath("/admin/jobs/fetched");
  revalidatePath("/admin/jobs/review");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${job.slug}`);
  redirect(returnTo);
}

export async function approveNormalizedJobAction(formData: FormData) {
  await requireRole(["admin"]);
  const client = await getMutationClient();
  const normalizedJobId = String(formData.get("normalizedJobId") ?? "").trim();
  const returnTo = readReturnTo(formData, "/admin/jobs/fetched");

  if (!normalizedJobId) {
    redirect(returnTo);
  }

  await client
    .from("normalized_jobs")
    .update({
      status: "approved",
    } as never)
    .eq("id", normalizedJobId);

  revalidatePath("/admin/jobs/fetched");
  revalidatePath("/admin/jobs/review");
  revalidatePath("/jobs");
  redirect(returnTo);
}

export async function updateJobSourceStatusAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const sourceId = stringValue(formData, "sourceId");
  const nextStatus = stringValue(formData, "nextStatus") || "paused";
  const returnTo = readReturnTo(formData, "/admin/job-sources");

  if (sourceId) {
    await client
      .from("job_sources")
      .update({
        status: nextStatus,
        updated_by: admin.id,
      } as never)
      .eq("id", sourceId);
  }

  revalidatePath("/admin/job-sources");
  revalidatePath("/admin/jobs/sources");
  redirect(returnTo);
}

export async function createJobSourceSampleAction() {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();

  const samples = [
    {
      name: "National Career Service RSS",
      source_type: "official",
      transport_type: "rss",
      source_url: "https://www.ncs.gov.in/jobfeed",
      status: "paused",
      allow_auto_fetch: false,
      config: buildJobSourceConfig({
        sourceType: "government-source",
        companyName: "National Career Service",
        industry: "Government",
        defaultCity: "New Delhi",
        defaultState: "Delhi",
        fetchFrequencyMinutes: 1440,
      }),
      notes: "Example official source. Replace with a working public feed before enabling.",
      created_by: admin.id,
      updated_by: admin.id,
    },
  ];

  await client.from("job_sources").upsert(samples as never[], { onConflict: "source_url" });
  revalidatePath("/admin/job-sources");
  revalidatePath("/admin/jobs/sources");
  redirect("/admin/job-sources");
}

export async function importTrustedSourcePackAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const returnTo = readReturnTo(formData, "/admin/job-sources");

  const rows = buildTrustedSourcePackRows(admin.id);
  await repairExistingSourceDefinitions(client, rows as Array<Record<string, unknown>>);
  await client.from("job_sources").upsert(rows as never[], { onConflict: "source_url" });

  console.info(`Imported trusted source pack with ${Math.min(TRUSTED_SOURCE_PACK.length, 100)} sources.`);

  revalidatePath("/admin/job-sources");
  revalidatePath("/admin/jobs/sources");
  revalidatePath("/admin/jobs/fetched");
  revalidatePath("/admin");
  redirect(returnTo);
}

export async function importPunjabSourcePackAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const client = await getMutationClient();
  const returnTo = readReturnTo(formData, "/admin/job-sources");

  const rows = buildPunjabSourcePackRows(admin.id);
  await repairExistingSourceDefinitions(client, rows as Array<Record<string, unknown>>);
  await client.from("job_sources").upsert(rows as never[], { onConflict: "source_url" });

  console.info(`Imported Punjab source pack with ${PUNJAB_SOURCE_PACK.length} sources.`);

  revalidatePath("/admin/job-sources");
  revalidatePath("/admin/jobs/sources");
  revalidatePath("/admin/jobs/fetched");
  revalidatePath("/admin");
  redirect(returnTo);
}

export async function runPunjabJobSourcesAction(formData: FormData) {
  await requireRole(["admin"]);
  const client = await getMutationClient();
  const returnTo = readReturnTo(formData, "/admin/job-sources");

  const { data } = await client
    .from("job_sources")
    .select("id, name, source_type, transport_type, source_url, status, allow_auto_fetch, config, notes, last_fetched_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  const punjabSourceIds = (data ?? [])
    .filter((source: DbRow) => {
      const config = parseJobSourceConfig({
        sourceType: source.source_type,
        transportType: source.transport_type,
        config: source.config,
      });

      return config.coverageRegion === "punjab";
    })
    .map((source: DbRow) => source.id);

  for (const sourceId of punjabSourceIds) {
    try {
      await runSingleJobFetch(sourceId, "manual");
    } catch (error) {
      console.error(`Punjab source fetch failed for ${sourceId}`, error);
    }
  }

  revalidatePath("/admin/job-sources");
  revalidatePath("/admin/jobs/sources");
  revalidatePath("/admin/jobs/fetched");
  revalidatePath("/admin");
  redirect(returnTo);
}
