"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Filters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [jobType, setJobType] = useState(searchParams.get("jobType") ?? "");
  const [workMode, setWorkMode] = useState(searchParams.get("workMode") ?? "");
  const [education, setEducation] = useState(searchParams.get("education") ?? "");

  function apply() {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (city) params.set("city", city); else params.delete("city");
    if (jobType) params.set("jobType", jobType); else params.delete("jobType");
    if (workMode) params.set("workMode", workMode); else params.delete("workMode");
    if (education) params.set("education", education); else params.delete("education");
    params.delete("page");
    router.push(`/jobs?${params.toString()}`);
  }

  function clearAll() {
    router.push(`/jobs`);
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <h3 className="font-semibold">Filters</h3>
      <div className="mt-3 space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">City</label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Job type</label>
          <select value={jobType} onChange={(e) => setJobType(e.target.value)} className="mt-1 w-full rounded-md bg-white p-2">
            <option value="">Any</option>
            <option value="full-time">Full time</option>
            <option value="part-time">Part time</option>
            <option value="internship">Internship</option>
            <option value="freelance">Freelance</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Work mode</label>
          <select value={workMode} onChange={(e) => setWorkMode(e.target.value)} className="mt-1 w-full rounded-md bg-white p-2">
            <option value="">Any</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Education</label>
          <Input value={education} onChange={(e) => setEducation(e.target.value)} className="mt-1" />
        </div>

        <div className="flex gap-2">
          <Button onClick={apply} className="rounded-full">Apply</Button>
          <Button variant="ghost" onClick={clearAll} className="rounded-full">Clear</Button>
        </div>
      </div>
    </div>
  );
}
