import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness } from "lucide-react";
import { siteConfig } from "@/lib/data/site";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="jp-shell flex min-h-screen items-start justify-center overflow-hidden px-4 py-6 sm:px-6 sm:py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,45,120,0.16),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(0,255,204,0.08),_transparent_30%)]" />

      <div className="relative w-full max-w-md space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 transition hover:border-primary/40 hover:text-slate-950"
        >
          <ArrowLeft className="size-4 text-primary" />
          Return Home
        </Link>

        <div className="space-y-5 text-center sm:text-left">
          <div className="mx-auto flex size-14 items-center justify-center rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,45,120,0.18),rgba(0,255,204,0.08))] text-primary shadow-sm sm:mx-0">
            <BriefcaseBusiness className="size-7" />
          </div>
          <div>
            <p className="font-heading text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              {siteConfig.name}
            </p>
            <p className="mt-2 text-base text-slate-600">{siteConfig.tagline}</p>
          </div>
        </div>

        <div className="jp-panel px-6 py-7 sm:px-8 sm:py-8">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              {/* The page title is the h1 — these pages previously had no
                  heading element at all, leaving them without a document
                  outline for screen readers and search engines. */}
              <h1 className="font-heading text-2xl font-semibold text-primary jp-neon-text">{title}</h1>
              <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Secure Access</span>
            </div>
            <p className="text-sm leading-7 text-slate-600">{description}</p>
          </div>
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
