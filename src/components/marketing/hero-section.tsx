"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Brain, MapPin, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HeroStats {
  activeJobs: number;
  companies: number;
  cities: number;
}

interface HeroSectionProps {
  initialKeyword?: string;
  initialCity?: string;
  stats: HeroStats;
}

const keywordMaxLength = 100;
const cityMaxLength = 80;

function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function HeroSection({
  initialKeyword = "",
  initialCity = "",
  stats,
}: HeroSectionProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initialKeyword);
  const [city, setCity] = useState(initialCity);
  const [errors, setErrors] = useState<{ keyword?: string; city?: string }>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextKeyword = keyword.trim();
    const nextCity = city.trim();
    const nextErrors: { keyword?: string; city?: string } = {};

    if (nextKeyword.length > keywordMaxLength) {
      nextErrors.keyword = `Keyword must be ${keywordMaxLength} characters or fewer.`;
    }

    if (nextCity.length > cityMaxLength) {
      nextErrors.city = `City must be ${cityMaxLength} characters or fewer.`;
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const params = new URLSearchParams();
    if (nextKeyword) params.set("keyword", nextKeyword);
    if (nextCity) params.set("city", nextCity);

    const href = params.toString() ? `/jobs?${params.toString()}` : "/jobs";
    router.push(href);
  }

  return (
    <div className="relative w-full">
      <div className="w-full border-b border-slate-100 bg-[linear-gradient(90deg,rgba(255,45,120,0.2),rgba(0,255,204,0.12))] py-3 text-center text-slate-950">
        <p className="text-sm font-medium text-slate-800">
          Search live jobs and use AI career tools to move from discovery to applications faster.
        </p>
      </div>

      <section className="relative w-full overflow-hidden py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center space-y-8">
              <Badge
                variant="secondary"
                className="w-fit rounded-full border border-slate-200 bg-white px-4 py-2 text-primary shadow-sm hover:bg-slate-100"
              >
                AI-powered job search for candidates across India
              </Badge>

              <div className="space-y-4">
                <h1 className="font-heading text-4xl font-bold leading-[1.05] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  Search jobs and get{" "}
                  <span className="bg-gradient-to-r from-primary to-cyan-600 bg-clip-text text-transparent">
                    AI career support
                  </span>
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Browse current openings, filter by role and city, and use built-in tools for
                  resumes, interviews, and career guidance.
                </p>
              </div>

              <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 sm:p-5">
                <p className="font-medium text-slate-800">
                  Start with a broad search or leave both fields empty to explore every active job.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  asChild
                  size="lg"
                  className="px-8"
                >
                  <Link href="/signup">Register Now</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="px-8"
                >
                  <Link href="/jobs">
                    Explore Jobs
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="w-full space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="jp-panel-soft p-6">
                    <p className="text-3xl font-bold text-cyan-600">{formatCount(stats.activeJobs)}</p>
                    <p className="mt-2 text-sm font-medium text-slate-600">Active job listings</p>
                  </div>
                  <div className="jp-panel-soft p-6">
                    <p className="text-3xl font-bold text-primary">{formatCount(stats.companies)}</p>
                    <p className="mt-2 text-sm font-medium text-slate-600">Hiring companies</p>
                  </div>
                  <div className="jp-panel-soft p-6">
                    <p className="text-3xl font-bold text-slate-950">{formatCount(stats.cities)}</p>
                    <p className="mt-2 text-sm font-medium text-slate-600">Cities in current results</p>
                  </div>
                  <div className="jp-panel-soft p-6">
                    <p className="text-lg font-bold text-slate-950">Resume, interview, and AI guidance</p>
                    <p className="mt-2 text-sm font-medium text-slate-600">Career tools that support every search</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative -mt-4 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="jp-panel p-6 sm:p-8">
            <h2 className="mb-2 text-center text-2xl font-bold text-slate-950 sm:text-3xl">
              Find your next opportunity
            </h2>
            <p className="mb-6 text-center text-sm text-slate-600">
              Search by role, company, or skill and narrow by city when you need local results.
            </p>

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <label htmlFor="hero-keyword" className="sr-only">
                    Search by job title, company, or skill
                  </label>
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="hero-keyword"
                    name="keyword"
                    type="text"
                    value={keyword}
                    onChange={(event) => {
                      setKeyword(event.target.value);
                      if (errors.keyword) {
                        setErrors((current) => ({ ...current, keyword: undefined }));
                      }
                    }}
                    placeholder="Job title, keyword, company, or skill"
                    aria-invalid={errors.keyword ? "true" : "false"}
                    aria-describedby={errors.keyword ? "hero-keyword-error" : undefined}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-950 placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {errors.keyword ? (
                    <p id="hero-keyword-error" className="mt-2 text-sm text-red-600">
                      {errors.keyword}
                    </p>
                  ) : null}
                </div>
                <div className="relative">
                  <label htmlFor="hero-city" className="sr-only">
                    Search by city
                  </label>
                  <MapPin className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="hero-city"
                    name="city"
                    type="text"
                    value={city}
                    onChange={(event) => {
                      setCity(event.target.value);
                      if (errors.city) {
                        setErrors((current) => ({ ...current, city: undefined }));
                      }
                    }}
                    placeholder="City or remote"
                    aria-invalid={errors.city ? "true" : "false"}
                    aria-describedby={errors.city ? "hero-city-error" : undefined}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-950 placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {errors.city ? (
                    <p id="hero-city-error" className="mt-2 text-sm text-red-600">
                      {errors.city}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:gap-3">
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1"
                >
                  <Search className="mr-2 size-4" />
                  Find Jobs
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  <Link href="/ai-career-agent">
                    <Brain className="mr-2 size-4" />
                    AI Career Agent
                  </Link>
                </Button>
              </div>

              <p className="text-sm text-slate-500" aria-live="polite">
                Leave either field blank to keep the search broad.
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
