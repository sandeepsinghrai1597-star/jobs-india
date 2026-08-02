"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import { dashboardMetrics } from "@/lib/data/site";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type NavigationItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

const navigation: Record<UserRole, NavigationItem[]> = {
  candidate: [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/jobs", label: "Search", icon: Search },
    { href: "/dashboard/applications", label: "Apps", icon: BriefcaseBusiness },
    { href: "/dashboard/interviews", label: "Inbox", icon: Sparkles },
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  ],
  employer: [
    { href: "/employer", label: "Home", icon: Home },
    { href: "/employer/jobs", label: "Jobs", icon: BriefcaseBusiness },
    { href: "/employer/applicants", label: "Inbox", icon: UsersRound },
    { href: "/employer/analytics", label: "Signals", icon: BarChart3 },
    { href: "/employer/profile", label: "Profile", icon: Building2 },
  ],
  admin: [
    { href: "/admin", label: "Home", icon: Home },
    { href: "/admin/jobs", label: "Jobs", icon: BriefcaseBusiness },
    { href: "/admin/users", label: "Users", icon: UsersRound },
    { href: "/admin/seo", label: "SEO", icon: Search },
    { href: "/admin/payments", label: "Ops", icon: ShieldCheck },
  ],
};

const desktopNavigation: Record<UserRole, NavigationItem[]> = {
  candidate: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
    { href: "/dashboard/resumes", label: "Resumes", icon: FileText },
    { href: "/dashboard/applications", label: "Applications", icon: BriefcaseBusiness },
    { href: "/dashboard/interviews", label: "Interviews", icon: Sparkles },
    { href: "/dashboard/roadmap", label: "Roadmap", icon: BarChart3 },
  ],
  employer: [
    { href: "/employer", label: "Overview", icon: LayoutDashboard },
    { href: "/employer/profile", label: "Company", icon: Building2 },
    { href: "/employer/jobs", label: "Jobs", icon: BriefcaseBusiness },
    { href: "/employer/applicants", label: "Applicants", icon: UsersRound },
    { href: "/employer/analytics", label: "Analytics", icon: BarChart3 },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/jobs", label: "Jobs", icon: BriefcaseBusiness },
    { href: "/admin/job-sources", label: "Sources", icon: Building2 },
    { href: "/admin/users", label: "Users", icon: UsersRound },
    { href: "/admin/seo", label: "SEO", icon: Search },
    { href: "/admin/payments", label: "Payments", icon: ShieldCheck },
  ],
};

const roleResources: Record<UserRole, NavigationItem[]> = {
  candidate: [
    { href: "/resume-builder", label: "Resume builder", icon: FileText },
    { href: "/resume-analyzer", label: "Resume analyzer", icon: ShieldCheck },
    { href: "/ai-career-agent", label: "AI career agent", icon: Sparkles },
  ],
  employer: [
    { href: "/employer/jobs/new", label: "Post a job", icon: BriefcaseBusiness },
    { href: "/pricing", label: "Employer plans", icon: Sparkles },
    { href: "/contact", label: "Contact support", icon: ArrowUpRight },
  ],
  admin: [
    { href: "/admin/blog", label: "Blog", icon: FileText },
    { href: "/admin/government-jobs", label: "Govt jobs", icon: BriefcaseBusiness },
    { href: "/admin/internships", label: "Internships", icon: UsersRound },
  ],
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({
  role,
  title,
  description,
  children,
}: {
  role: UserRole;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const primaryCtaHref =
    role === "candidate" ? "/jobs" : role === "employer" ? "/employer/jobs/new" : "/admin/jobs";

  return (
    <div className="jp-shell jp-bottom-safe">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <div className="jp-panel flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-heading text-xl font-semibold text-primary jp-neon-text">JobPulse India</p>
            <p className="truncate text-xs uppercase tracking-[0.22em] text-slate-500">
              {roleLabel} workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {roleLabel}
            </Badge>
            <Link
              href="/auth/logout"
              className="inline-flex size-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:text-slate-950"
            >
              <LogOut className="size-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="jp-panel sticky top-24 overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-5">
                <p className="text-xs uppercase tracking-[0.22em] text-primary">{roleLabel} dashboard</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Mobile-native workflow layers, quick actions, and live navigation across your workspace.
                </p>
              </div>

              <div className="space-y-6 p-5">
                <nav className="space-y-2" aria-label={`${roleLabel} dashboard navigation`}>
                  {desktopNavigation[role].map((item) => {
                    const Icon = item.icon;
                    const active = isActive(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                          active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                        )}
                      >
                        <Icon className="size-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Quick links</p>
                  {roleResources[role].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600 transition hover:border-cyan-400/30 hover:text-slate-950"
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="size-4 text-primary" />
                          {item.label}
                        </span>
                        <ArrowUpRight className="size-4 text-slate-500" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <div className="jp-panel overflow-hidden">
              <div className="flex flex-col gap-5 bg-[linear-gradient(135deg,rgba(255,45,120,0.16),rgba(0,255,204,0.08)_54%,rgba(255,255,255,0.02)_100%)] px-5 py-6 sm:px-6">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-primary">Workspace overview</p>
                  <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    {title}
                  </h1>
                  <p className="max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={primaryCtaHref}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md transition hover:brightness-110"
                  >
                    <Sparkles className="size-4" />
                    {role === "candidate" ? "Find jobs" : role === "employer" ? "Post job" : "Review jobs"}
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                  >
                    <Home className="size-4" />
                    Return home
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardMetrics[role].map((metric) => (
                <Card key={metric.label} className="border-slate-100 bg-white shadow-sm">
                  <CardContent className="space-y-3 p-5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-primary">{metric.label}</p>
                    <p className="text-3xl font-semibold text-slate-950">{metric.value}</p>
                    <p className="text-sm text-slate-500">{metric.change}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {children}
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-[rgba(255,255,255,0.96)] px-3 py-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-2">
          {navigation[role].map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium uppercase tracking-[0.16em] transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-950",
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
