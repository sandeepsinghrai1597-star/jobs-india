import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function FeaturePage({
  eyebrow,
  title,
  description,
  highlights,
  ctaHref,
  ctaLabel,
  secondaryHref,
  secondaryLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  ctaHref: string;
  ctaLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-14">
      <section className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 rounded-[2rem] bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-700 px-6 py-12 text-white shadow-2xl shadow-cyan-900/10 md:grid-cols-[1.1fr_0.9fr] md:px-10">
          <div className="space-y-6">
            <Badge className="w-fit rounded-full bg-white px-4 py-1 text-slate-950 hover:bg-slate-100">
              {eyebrow}
            </Badge>
            <div className="space-y-4">
              <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
                {title}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-blue-50/90">{description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full bg-white text-slate-900 hover:bg-slate-100">
                <Link href={ctaHref}>{ctaLabel}</Link>
              </Button>
              {secondaryHref && secondaryLabel ? (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href={secondaryHref}>{secondaryLabel}</Link>
                </Button>
              ) : null}
            </div>
          </div>
          <Card className="rounded-[1.75rem] border-white/20 bg-white/10 text-white backdrop-blur">
            <CardContent className="space-y-4 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">
                Included in this module
              </p>
              <div className="space-y-3">
                {highlights.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 text-cyan-200" />
                    <p className="text-sm leading-6 text-blue-50">{item}</p>
                  </div>
                ))}
              </div>
              <p className="flex items-center gap-2 pt-4 text-sm font-medium text-cyan-100">
                Built for Indian job seekers and recruiters
                <ArrowRight className="size-4" />
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
      {children ? (
        <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          {children}
        </section>
      ) : null}
    </div>
  );
}
