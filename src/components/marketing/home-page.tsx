import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileSearch,
  GraduationCap,
  Landmark,
  MessageSquareText,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { jobCategories, testimonials } from "@/lib/data/site";
import type { Job } from "@/types";
import { JobCard } from "@/components/jobs/job-card";
import { HeroSection } from "@/components/marketing/hero-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const toolCards = [
  {
    icon: FileSearch,
    title: "Resume Analyzer",
    description: "ATS score, missing keywords, and recruiter-style improvements.",
    href: "/resume-analyzer",
  },
  {
    icon: Sparkles,
    title: "Resume Builder",
    description: "Build clean, role-ready resumes for fresher and experienced jobs.",
    href: "/resume-builder",
  },
  {
    icon: MessageSquareText,
    title: "Interview Prep",
    description: "Practice HR, technical, behavioral, and fresher interview answers.",
    href: "/interview-preparation",
  },
];

const whyCards = [
  {
    icon: CheckCircle2,
    accent: "text-emerald-600",
    title: "Verified listings only",
    description: "Every government job links to the official notification. No spam, no unverified openings.",
  },
  {
    icon: Sparkles,
    accent: "text-sky-600",
    title: "AI tools built for India",
    description: "Resume analyzer, mock interviews, and career guidance trained on Indian job market data.",
  },
  {
    icon: GraduationCap,
    accent: "text-amber-600",
    title: "Fresher-first focus",
    description: "Designed for 0–3 year experience candidates — freshers, graduates, and career switchers.",
  },
  {
    icon: Landmark,
    accent: "text-rose-600",
    title: "150+ government jobs",
    description: "SSC, UPSC, Railways, Banking, Police, Defence — with eligibility, dates, and apply links.",
  },
];

const quickSearches = [
  { label: "Remote jobs", href: "/remote-jobs", icon: Search },
  { label: "Fresher jobs", href: "/fresher-jobs", icon: GraduationCap },
  { label: "Government jobs", href: "/government-jobs", icon: Landmark },
  { label: "Internships", href: "/internships", icon: Target },
];

interface HomePageStats {
  activeJobs: number;
  companies: number;
  cities: number;
}

export function HomePage({
  latestJobs = [],
  heroStats,
}: {
  latestJobs?: Job[];
  heroStats: HomePageStats;
}) {
  return (
    <div className="pb-16">
      <HeroSection stats={heroStats} />

      <section className="w-full py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full flex-col items-center text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Why candidates choose JobPulse India
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Built specifically for the Indian job market — freshers, government aspirants, and career switchers.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {whyCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm"
                >
                  <Icon className={`size-8 ${card.accent}`} />
                  <p className="mt-4 font-semibold text-slate-950">{card.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{card.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-transparent">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Fast paths</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">Start with the job type you need.</h2>
            </div>
            <Link href="/jobs" className="text-sm font-semibold text-primary hover:text-slate-950">
              Browse all jobs
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickSearches.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-16 items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow-lg"
                >
                  <span className="flex items-center gap-3 font-semibold text-slate-950">
                    <Icon className="size-5 text-primary" />
                    {item.label}
                  </span>
                  <ArrowRight className="size-4 text-slate-500" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Explore</p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-slate-950">Popular categories</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {jobCategories.map((category) => (
              <Badge key={category} variant="secondary" className="rounded-md border border-slate-200 bg-white px-3 py-1 text-slate-800 shadow-sm">
                {category}
              </Badge>
            ))}
          </div>
          <Button asChild variant="outline" className="rounded-lg">
            <Link href="/jobs">See all jobs</Link>
          </Button>
        </aside>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Latest jobs</p>
              <h2 className="mt-2 font-heading text-2xl font-semibold text-slate-950">
                Fresh opportunities for this week
              </h2>
            </div>
            <Link href="/jobs" className="text-sm font-semibold text-primary">
              View all jobs
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {latestJobs.length > 0 ? (
              latestJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))
            ) : (
                <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 md:col-span-2">
                  No active jobs yet. Check back soon or subscribe for alerts.
                </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Career toolkit</p>
              <h2 className="font-heading text-3xl font-semibold text-slate-950">
                More than a job board.
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                The best platforms combine search, resume quality, interview preparation, and a
                dashboard. JobPulse brings those workflows together for candidates and employers.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {toolCards.map((tool) => {
                const Icon = tool.icon;

                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="rounded-[1.5rem] border border-slate-100 bg-white p-5 transition hover:border-primary/40 hover:bg-slate-100 hover:shadow-md"
                  >
                    <Icon className="size-5 text-primary" />
                    <p className="mt-4 font-semibold text-slate-950">{tool.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{tool.description}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 rounded-[1.75rem] border border-slate-100 bg-[linear-gradient(135deg,rgba(255,45,120,0.14),rgba(255,255,255,0.96)_55%,rgba(0,255,204,0.05))] p-6 text-slate-950 shadow-xl shadow-slate-300/10 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600">
              <Building2 className="size-5" />
              <span className="text-sm font-semibold uppercase tracking-[0.16em]">For employers</span>
            </div>
            <h2 className="font-heading text-3xl font-semibold">Hire faster with verified candidate workflows.</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Post roles, review applicants, track shortlists, and monitor hiring performance from a
              focused employer dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-lg">
              <Link href="/employer/jobs/new">
                Post a job
                <BriefcaseBusiness className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-lg border-slate-300 text-slate-950 hover:bg-slate-100">
              <Link href="/pricing">View plans</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            "Save jobs and build a focused shortlist",
            "Track every application status from applied to offered",
            "Use AI tools only where they make the workflow faster",
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
              <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
              <p className="text-sm font-medium leading-6 text-slate-800">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">What candidates say</p>
          <h2 className="mt-2 font-heading text-2xl font-semibold text-slate-950">Trusted by job seekers across India</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-sm leading-6 text-slate-600">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-950">{t.name}</p>
                <p className="text-xs text-slate-500">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
