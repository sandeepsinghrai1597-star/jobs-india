import Link from "next/link";
import {
  createJobSourceAction,
  createJobSourceSampleAction,
  importPunjabSourcePackAction,
  importTrustedSourcePackAction,
  runDueJobSourcesAction,
  runPunjabJobSourcesAction,
  runJobSourceAction,
  updateJobSourceAction,
  updateJobSourceStatusAction,
} from "@/app/(admin)/admin/jobs/ingestion-actions";
import { PUNJAB_SOURCE_PACK } from "@/lib/jobs/punjab-source-pack";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  JOB_SOURCE_FETCH_METHOD_OPTIONS,
  JOB_SOURCE_FREQUENCY_OPTIONS,
  JOB_SOURCE_TYPE_OPTIONS,
  formatFrequencyLabel,
  parseJobSourceConfig,
} from "@/lib/jobs/source-config";
import { TRUSTED_SOURCE_PACK } from "@/lib/jobs/trusted-source-pack";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { DbRow } from "@/lib/db/mysql";

async function getClient() {
  return getSupabaseAdminClient() ?? (await createClient());
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Never"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function getStatusTone(status: string) {
  return status === "active" ? "default" : "outline";
}

export async function AdminJobSourcesPage() {
  const client = await getClient();
  const [{ data: sources }, { data: runs }] = await Promise.all([
    client
      .from("job_sources")
      .select("id, name, source_type, transport_type, source_url, status, allow_auto_fetch, notes, config, last_fetched_at, created_at")
      .order("created_at", { ascending: false }),
    client
      .from("job_fetch_runs")
      .select("id, source_id, status, trigger_type, started_at, completed_at, fetched_count, pending_review_count, duplicate_count, error_message")
      .order("started_at", { ascending: false })
      .limit(200),
  ]);

  const historyBySource = new Map<
    string,
    Array<{
      id: string;
      source_id: string;
      status: string;
      trigger_type: string;
      started_at: string;
      completed_at: string | null;
      fetched_count: number;
      pending_review_count: number;
      duplicate_count: number;
      error_message: string | null;
    }>
  >();

  for (const run of runs ?? []) {
    const existing = historyBySource.get(run.source_id) ?? [];
    existing.push(run);
    historyBySource.set(run.source_id, existing);
  }

  return (
    <DashboardShell
      role="admin"
      title="Job source management"
      description="Manage approved job sources, tune fetch cadence, inspect run history, and keep ingestion quality visible before anything reaches the public jobs feed."
    >
      <div className="space-y-6">
        <Card className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5">
          <CardHeader className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(59,130,246,0.03)_60%,rgba(255,255,255,0.96)_100%)]">
            <CardTitle>Add a source</CardTitle>
            <CardDescription>
              Register official company pages, government sources, employer feeds, RSS, APIs, or CSV imports. Unsupported third-party job boards remain blocked.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <form action={createJobSourceAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input type="hidden" name="returnTo" value="/admin/job-sources" />
              <input
                name="name"
                placeholder="Source name"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                required
              />
              <select
                name="sourceType"
                defaultValue="company-career-page"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
              >
                {JOB_SOURCE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                name="fetchMethod"
                defaultValue="html"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
              >
                {JOB_SOURCE_FETCH_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                name="fetchFrequencyMinutes"
                defaultValue="1440"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
              >
                {JOB_SOURCE_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input
                name="sourceUrl"
                placeholder="https://careers.company.com/jobs"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 md:col-span-2"
                required
              />
              <input
                name="companyName"
                placeholder="Company name"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
              />
              <input
                name="industry"
                placeholder="Industry"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
              />
              <input
                name="defaultCity"
                placeholder="Default city"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
              />
              <input
                name="defaultState"
                placeholder="Default state"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
              />
              <input
                name="notes"
                placeholder="Notes for reviewers"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 md:col-span-2"
              />
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700">
                <input type="hidden" name="isActive" value="false" />
                <input type="checkbox" name="isActive" value="true" defaultChecked className="size-4 rounded border-slate-300" />
                Active source
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700">
                <input type="hidden" name="allowAutoFetch" value="false" />
                <input type="checkbox" name="allowAutoFetch" value="true" defaultChecked className="size-4 rounded border-slate-300" />
                Enable auto fetch
              </label>
              <Button type="submit" className="h-11 rounded-2xl bg-slate-100 text-slate-950 hover:bg-slate-800 md:col-span-2 xl:col-span-4">
                Save source
              </Button>
            </form>

            <form action={createJobSourceSampleAction}>
              <Button type="submit" variant="outline" className="rounded-2xl border-slate-200 bg-white">
                Add sample source template
              </Button>
            </form>

            <form action={importTrustedSourcePackAction}>
              <input type="hidden" name="returnTo" value="/admin/job-sources" />
              <Button type="submit" variant="outline" className="rounded-2xl border-slate-200 bg-white">
                Import trusted source pack ({Math.min(TRUSTED_SOURCE_PACK.length, 100)})
              </Button>
            </form>

            <form action={importPunjabSourcePackAction}>
              <input type="hidden" name="returnTo" value="/admin/job-sources" />
              <Button type="submit" variant="outline" className="rounded-2xl border-slate-200 bg-white">
                Import Punjab source pack ({PUNJAB_SOURCE_PACK.length})
              </Button>
            </form>

            <form action={runPunjabJobSourcesAction}>
              <input type="hidden" name="returnTo" value="/admin/job-sources" />
              <Button type="submit" variant="outline" className="rounded-2xl border-slate-200 bg-white">
                Run Punjab pipeline now
              </Button>
            </form>

            <form action={runDueJobSourcesAction}>
              <input type="hidden" name="returnTo" value="/admin/job-sources" />
              <Button type="submit" variant="outline" className="rounded-2xl border-slate-200 bg-white">
                Run all due sources
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
          <Card className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5">
            <CardHeader>
              <CardTitle>Registered sources</CardTitle>
              <CardDescription>Each source shows fetch cadence, latest health, and review funnel output.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {(sources ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  No sources added yet.
                </div>
              ) : (
                (sources ?? []).map((source: DbRow) => {
                  const config = parseJobSourceConfig({
                    sourceType: source.source_type,
                    transportType: source.transport_type,
                    config: source.config,
                  });
                  const history = historyBySource.get(source.id) ?? [];
                  const lastRun = history[0] ?? null;
                  const lastErrorRun = history.find((run) => Boolean(run.error_message)) ?? null;
                  const totals = history.reduce(
                    (acc, run) => ({
                      found: acc.found + run.fetched_count,
                      newJobs: acc.newJobs + run.pending_review_count,
                      duplicates: acc.duplicates + run.duplicate_count,
                    }),
                    { found: 0, newJobs: 0, duplicates: 0 },
                  );

                  return (
                    <div key={source.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-semibold text-slate-950">{source.name}</h2>
                            <Badge variant={getStatusTone(source.status)}>{source.status}</Badge>
                            <Badge variant="secondary">
                              {JOB_SOURCE_TYPE_OPTIONS.find((option) => option.value === config.sourceType)?.label ?? "Source"}
                            </Badge>
                            <Badge variant="outline">
                              {JOB_SOURCE_FETCH_METHOD_OPTIONS.find((option) => option.value === source.transport_type)?.label ?? source.transport_type}
                            </Badge>
                            {config.coverageRegion ? <Badge variant="secondary">{config.coverageRegion}</Badge> : null}
                            {source.allow_auto_fetch ? <Badge>Auto fetch</Badge> : <Badge variant="outline">Manual only</Badge>}
                          </div>
                          <p className="break-all text-sm text-slate-600">{source.source_url}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>Frequency: {formatFrequencyLabel(config.fetchFrequencyMinutes)}</span>
                            <span>Last fetched: {formatDate(source.last_fetched_at)}</span>
                            <span>Last error: {lastErrorRun?.error_message ?? "No recent errors"}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                            <span>Company: {config.companyName ?? "Not set"}</span>
                            <span>Industry: {config.industry ?? "Not set"}</span>
                            <span>
                              Default location: {[config.defaultCity, config.defaultState].filter(Boolean).join(", ") || "Not set"}
                            </span>
                            {config.locationKeywords.length > 0 ? (
                              <span>Scope keywords: {config.locationKeywords.slice(0, 5).join(", ")}{config.locationKeywords.length > 5 ? "..." : ""}</span>
                            ) : null}
                          </div>
                          {source.notes ? <p className="text-sm text-slate-500">{source.notes}</p> : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <form action={runJobSourceAction}>
                            <input type="hidden" name="sourceId" value={source.id} />
                            <input type="hidden" name="returnTo" value="/admin/job-sources" />
                            <Button size="sm" className="rounded-xl">Run manual fetch</Button>
                          </form>
                          <form action={updateJobSourceStatusAction}>
                            <input type="hidden" name="sourceId" value={source.id} />
                            <input type="hidden" name="nextStatus" value={source.status === "active" ? "paused" : "active"} />
                            <input type="hidden" name="returnTo" value="/admin/job-sources" />
                            <Button size="sm" variant="outline" className="rounded-xl border-slate-300 bg-white">
                              {source.status === "active" ? "Disable source" : "Enable source"}
                            </Button>
                          </form>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Last run</p>
                          <p className="mt-2 text-sm font-medium text-slate-800">{lastRun ? formatDate(lastRun.started_at) : "Never"}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Jobs found</p>
                          <p className="mt-2 text-sm font-medium text-slate-800">
                            {lastRun ? formatCount(lastRun.fetched_count) : "0"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">New jobs</p>
                          <p className="mt-2 text-sm font-medium text-slate-800">
                            {lastRun ? formatCount(lastRun.pending_review_count) : "0"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Duplicates</p>
                          <p className="mt-2 text-sm font-medium text-slate-800">
                            {lastRun ? formatCount(lastRun.duplicate_count) : "0"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total found</p>
                          <p className="mt-2 text-sm font-medium text-slate-800">{formatCount(totals.found)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total new / dupes</p>
                          <p className="mt-2 text-sm font-medium text-slate-800">
                            {formatCount(totals.newJobs)} / {formatCount(totals.duplicates)}
                          </p>
                        </div>
                      </div>

                      <details className="mt-4 rounded-2xl border border-slate-200 bg-white">
                        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-900">
                          Edit source
                        </summary>
                        <div className="border-t border-slate-200 p-4">
                          <form action={updateJobSourceAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <input type="hidden" name="sourceId" value={source.id} />
                            <input type="hidden" name="returnTo" value="/admin/job-sources" />
                            <input
                              name="name"
                              defaultValue={source.name}
                              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                              required
                            />
                            <select
                              name="sourceType"
                              defaultValue={config.sourceType}
                              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                            >
                              {JOB_SOURCE_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <select
                              name="fetchMethod"
                              defaultValue={source.transport_type}
                              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                            >
                              {JOB_SOURCE_FETCH_METHOD_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <select
                              name="fetchFrequencyMinutes"
                              defaultValue={String(config.fetchFrequencyMinutes)}
                              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                            >
                              {JOB_SOURCE_FREQUENCY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <input
                              name="sourceUrl"
                              defaultValue={source.source_url}
                              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 md:col-span-2"
                              required
                            />
                            <input
                              name="companyName"
                              defaultValue={config.companyName ?? ""}
                              placeholder="Company name"
                              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                            />
                            <input
                              name="industry"
                              defaultValue={config.industry ?? ""}
                              placeholder="Industry"
                              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                            />
                            <input
                              name="defaultCity"
                              defaultValue={config.defaultCity ?? ""}
                              placeholder="Default city"
                              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                            />
                            <input
                              name="defaultState"
                              defaultValue={config.defaultState ?? ""}
                              placeholder="Default state"
                              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                            />
                            <input
                              name="notes"
                              defaultValue={source.notes ?? ""}
                              placeholder="Notes"
                              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 md:col-span-2"
                            />
                            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700">
                              <input type="hidden" name="isActive" value="false" />
                              <input type="checkbox" name="isActive" value="true" defaultChecked={source.status === "active"} className="size-4 rounded border-slate-300" />
                              Active source
                            </label>
                            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700">
                              <input type="hidden" name="allowAutoFetch" value="false" />
                              <input type="checkbox" name="allowAutoFetch" value="true" defaultChecked={source.allow_auto_fetch} className="size-4 rounded border-slate-300" />
                              Enable auto fetch
                            </label>
                            <Button type="submit" className="h-11 rounded-2xl bg-slate-100 text-slate-950 hover:bg-slate-800 md:col-span-2 xl:col-span-4">
                              Save changes
                            </Button>
                          </form>
                        </div>
                      </details>

                      <details className="mt-3 rounded-2xl border border-slate-200 bg-white">
                        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-900">
                          View fetch history
                        </summary>
                        <div className="border-t border-slate-200 p-4">
                          {history.length === 0 ? (
                            <p className="text-sm text-slate-500">No fetch history yet.</p>
                          ) : (
                            <div className="space-y-3">
                              {history.slice(0, 8).map((run) => (
                                <div key={run.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant={run.status === "failed" ? "destructive" : run.status === "success" ? "default" : "secondary"}>
                                      {run.status}
                                    </Badge>
                                    <Badge variant="outline">{run.trigger_type}</Badge>
                                    <span className="text-sm text-slate-600">{formatDate(run.started_at)}</span>
                                  </div>
                                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                                      Jobs found: {formatCount(run.fetched_count)}
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                                      New jobs: {formatCount(run.pending_review_count)}
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                                      Duplicates: {formatCount(run.duplicate_count)}
                                    </div>
                                  </div>
                                  {run.error_message ? (
                                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                                      {run.error_message}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5">
            <CardHeader>
              <CardTitle>Pipeline rules</CardTitle>
              <CardDescription>The ingestion flow stays review-first, traceable, and policy-safe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-5 text-sm text-slate-600">
              <p>1. Only approved company pages, employer feeds, public APIs, RSS feeds, CSV imports, and government sources are allowed.</p>
              <p>2. Fetch frequency is stored per source and the cron runner skips sources that were fetched too recently.</p>
              <p>3. Every fetched job lands in the review queue before publishing.</p>
              <p>4. Duplicate detection runs against both live jobs and previously fetched ingestion items.</p>
              <p>5. Run history preserves jobs found, new jobs, duplicates, and the latest error trail for each source.</p>
              <p>6. The trusted source pack imports official government sites plus trusted company career pages, capped at 100 records.</p>
              <p>7. The Punjab source pack tags Punjab-specific feeds and applies Punjab location filtering on broad feeds before they enter review.</p>
              <Button asChild variant="outline" className="mt-3 rounded-2xl border-slate-200 bg-white">
                <Link href="/admin/jobs/fetched">Open fetched queue</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
