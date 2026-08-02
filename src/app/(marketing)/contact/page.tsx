import { Mail, MessageSquare, Building2, Clock } from "lucide-react";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Contact JobPulse India — Support, Employers & Partnerships",
  description:
    "Contact JobPulse India for candidate support, employer onboarding, content partnerships, and platform feedback. We respond within 24 hours.",
  path: "/contact",
  keywords: ["contact jobpulse india", "jobpulse support", "employer onboarding india"],
});

const contactCards = [
  {
    icon: MessageSquare,
    title: "Candidate support",
    description: "Questions about job applications, resume tools, interview prep, or your account.",
    email: "support@jobpulseindia.in",
    label: "Email support",
  },
  {
    icon: Building2,
    title: "Employer & recruiter",
    description: "Post jobs, manage applicants, upgrade your plan, or get onboarding help.",
    email: "employers@jobpulseindia.in",
    label: "Email employers team",
  },
  {
    icon: Mail,
    title: "Partnerships & content",
    description: "Blog collaborations, affiliate partnerships, press enquiries, and integrations.",
    email: "hello@jobpulseindia.com",
    label: "Email partnerships",
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">

      {/* Header */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Contact us</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-slate-950">
          We&apos;re here to help
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          Reach the JobPulse India team for support, employer onboarding, content partnerships, and platform feedback.
        </p>
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
          <Clock className="size-4 text-emerald-400" />
          <span>We typically respond within <span className="font-semibold text-slate-950">24 hours</span> on working days.</span>
        </div>
      </div>

      {/* Contact cards */}
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {contactCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-[1.75rem] border border-slate-100 bg-white p-6">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <p className="mt-4 font-semibold text-slate-950">{card.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{card.description}</p>
              <a
                href={`mailto:${card.email}`}
                className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
              >
                {card.label} →
              </a>
            </div>
          );
        })}
      </div>

      {/* General email fallback */}
      <div className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">
          Not sure which team to contact? Email us at{" "}
          <a href="mailto:hello@jobpulseindia.com" className="font-semibold text-slate-950 hover:text-primary">
            hello@jobpulseindia.com
          </a>{" "}
          and we&apos;ll route your message to the right person.
        </p>
      </div>

    </div>
  );
}
