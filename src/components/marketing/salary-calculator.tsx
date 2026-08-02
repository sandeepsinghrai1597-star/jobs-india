"use client";

import { useState, useTransition } from "react";
import { BriefcaseBusiness, Loader2, MapPin, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { Job } from "@/types";
import type { SalaryCalculatorResult } from "@/lib/salary/calculator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const starterRoles = [
  "Software Engineer",
  "Data Analyst",
  "Digital Marketing Executive",
  "Sales Executive",
];

function SalaryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function SuggestedJobCard({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="block rounded-[1.5rem] border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-heading text-lg font-semibold text-slate-950">{job.title}</h4>
          <p className="mt-1 text-sm text-slate-600">{job.companyName}</p>
        </div>
        <Badge variant="outline" className="rounded-full capitalize">
          {job.workMode}
        </Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
        <span className="inline-flex items-center gap-2">
          <MapPin className="size-4" />
          {job.location}
        </span>
        <span className="inline-flex items-center gap-2">
          <BriefcaseBusiness className="size-4" />
          {job.experienceRequired}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {job.skills.slice(0, 4).map((skill) => (
          <Badge key={skill} variant="secondary" className="rounded-full px-3 py-1">
            {skill}
          </Badge>
        ))}
      </div>
    </Link>
  );
}

export function SalaryCalculator() {
  const [jobRole, setJobRole] = useState("Data Analyst");
  const [city, setCity] = useState("Delhi");
  const [experience, setExperience] = useState("1");
  const [skills, setSkills] = useState("SQL, Excel, Power BI");
  const [education, setEducation] = useState("BCA");
  const [result, setResult] = useState<SalaryCalculatorResult | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/ai/salary", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jobRole,
              city,
              experience,
              skills,
              education,
            }),
          });

          const data = (await response.json()) as SalaryCalculatorResult | { error?: string };
          if (!response.ok) {
            throw new Error("error" in data && data.error ? data.error : "Salary estimate failed.");
          }

          setResult(data as SalaryCalculatorResult);
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : "Unable to estimate salary right now.",
          );
        }
      })();
    });
  }

  function loadRole(role: string) {
    setJobRole(role);
  }

  return (
    <div className="space-y-8">
      <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
                Salary calculator
              </p>
              <h2 className="font-heading text-3xl font-semibold text-slate-950">
                Estimate your likely salary band
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Enter a role, city, experience, skills, and education. We use
                `salary_data` where available, and fall back to an AI estimate when
                market rows are missing.
              </p>
            </div>

            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Job role</label>
                <Input
                  value={jobRole}
                  onChange={(event) => setJobRole(event.target.value)}
                  placeholder="Software Engineer"
                  className="h-11 rounded-xl border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">City</label>
                <Input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Delhi"
                  className="h-11 rounded-xl border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Experience</label>
                <Input
                  value={experience}
                  onChange={(event) => setExperience(event.target.value)}
                  placeholder="2"
                  className="h-11 rounded-xl border-slate-300"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Skills</label>
                <Textarea
                  value={skills}
                  onChange={(event) => setSkills(event.target.value)}
                  placeholder="SQL, Excel, Power BI"
                  className="min-h-24 rounded-xl border-slate-300"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Education</label>
                <Input
                  value={education}
                  onChange={(event) => setEducation(event.target.value)}
                  placeholder="BCA"
                  className="h-11 rounded-xl border-slate-300"
                />
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <Button
                  type="submit"
                  className="h-11 rounded-xl px-5"
                  disabled={isPending || !jobRole.trim()}
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Calculate salary
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-xl px-5">
                  <Link href="/jobs">Browse jobs</Link>
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap gap-2">
              {starterRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => loadRole(role)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  {role}
                </button>
              ))}
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>

          <div className="rounded-[1.75rem] bg-gradient-to-br from-slate-100 via-sky-900 to-cyan-700 p-6 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">
              What you get
            </p>
            <div className="mt-6 space-y-4">
              <div className="rounded-[1.5rem] bg-slate-100 p-4 backdrop-blur">
                <p className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
                  <TrendingUp className="size-4" />
                  Expected salary range
                </p>
                <p className="mt-3 text-2xl font-semibold">Entry, average, and high pay view</p>
              </div>
              <div className="rounded-[1.5rem] bg-slate-100 p-4 backdrop-blur">
                <p className="text-sm leading-6 text-blue-50">
                  See which skills tend to lift salary, compare similar roles, and jump
                  straight into suggested jobs.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-300 bg-black/10 p-4">
                <p className="text-sm leading-6 text-cyan-50">
                  Salary estimates are approximate and may vary by company, city,
                  skills, and market condition.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {result ? (
        <div className="space-y-8">
          <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-950 hover:bg-slate-100">
                      {result.sourceLabel}
                    </Badge>
                    {result.matchedSalaryRecords > 0 ? (
                      <Badge variant="outline" className="rounded-full px-3 py-1">
                        {result.matchedSalaryRecords} salary records matched
                      </Badge>
                    ) : null}
                  </div>
                  <h3 className="font-heading text-3xl font-semibold text-slate-950">
                    Expected salary range
                  </h3>
                  <p className="text-lg text-slate-700">{result.expectedSalaryRange}</p>
                </div>
                {result.estimateNote ? (
                  <p className="max-w-md text-sm leading-6 text-slate-500">{result.estimateNote}</p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <SalaryMetric label="Entry-level salary" value={result.entryLevelSalary} />
                <SalaryMetric label="Average salary" value={result.averageSalary} />
                <SalaryMetric label="High salary" value={result.highSalary} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <h4 className="font-heading text-xl font-semibold text-slate-950">
                    Skills that increase salary
                  </h4>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.skillsThatIncreaseSalary.length > 0 ? (
                      result.skillsThatIncreaseSalary.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="rounded-full bg-white px-3 py-1 text-slate-800"
                        >
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No salary driver suggestions yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <h4 className="font-heading text-xl font-semibold text-slate-950">
                    Similar roles
                  </h4>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.similarRoles.length > 0 ? (
                      result.similarRoles.map((role) => (
                        <Badge
                          key={role}
                          variant="outline"
                          className="rounded-full border-slate-300 bg-white px-3 py-1 text-slate-700"
                        >
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No related roles found yet.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm leading-6 text-amber-900">{result.disclaimer}</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-heading text-3xl font-semibold text-slate-950">Suggested jobs</h3>
              <p className="text-sm leading-6 text-slate-600">
                These roles are the closest active matches for your salary search.
              </p>
            </div>

            {result.suggestedJobs.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-3">
                {result.suggestedJobs.map((job) => (
                  <SuggestedJobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <Card className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                <CardContent className="p-6 text-sm leading-6 text-slate-600">
                  No strong suggested jobs were found for this combination yet. Try a broader
                  city or role name.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
