"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchBar() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [city, setCity] = useState("");

  return (
    <form
      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/70 md:grid-cols-[1fr_220px_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams();
        if (keyword) params.set("keyword", keyword);
        if (city) params.set("city", city);
        void trackAnalyticsEvent({
          eventName: "job_search",
          eventData: {
            keyword: keyword || null,
            city: city || null,
            source: "search_bar",
          },
        });
        router.push(`/jobs?${params.toString()}`);
      }}
    >
      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-primary" />
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Job title, skill, company"
          aria-label="Search jobs by title, skill, or company"
          className="h-12 rounded-lg border-slate-300 bg-white pl-10 text-slate-950 placeholder:text-slate-500 focus-visible:border-primary"
        />
      </div>
      <Input
        value={city}
        onChange={(event) => setCity(event.target.value)}
        placeholder="City or location"
        aria-label="City or location"
        className="h-12 rounded-lg border-slate-300 bg-white text-slate-950 placeholder:text-slate-500 focus-visible:border-primary"
      />
      <Button className="h-12 rounded-lg px-7 font-semibold shadow-sm">Find Jobs</Button>
    </form>
  );
}
