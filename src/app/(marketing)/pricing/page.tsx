import { getCurrentUser } from "@/lib/auth/current-user";
import { getPublicPlansForAudience } from "@/lib/payments/plans";
import { buildMetadata } from "@/lib/seo";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { SchemaScript } from "@/components/shared/schema-script";
import { SectionHeading } from "@/components/shared/section-heading";

const pricingFaq = [
  {
    q: "Will I be charged immediately when I upgrade?",
    a: "Yes, your card is charged at the moment you confirm the plan upgrade. You get instant access to all paid features.",
  },
  {
    q: "Can I cancel my subscription at any time?",
    a: "Yes. You can cancel any time from your dashboard. Your access continues until the end of the current billing period.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards (Visa, Mastercard, RuPay), UPI, and net banking via Razorpay.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — the Free tier is free forever. You can use the resume builder, browse jobs, and try the AI career agent before upgrading.",
  },
  {
    q: "Can employers post jobs for free?",
    a: "Yes. Employers get 1 free job post per month. Upgrade to post unlimited jobs, add featured listings, and access applicant analytics.",
  },
  {
    q: "Do student or fresher discounts exist?",
    a: "We offer periodic discounts. Follow our WhatsApp channel or newsletter for early-bird and student offers.",
  },
];

export const metadata = buildMetadata({
  title: "Pricing - Free & Pro Plans for Candidates and Employers | JobPulse India",
  description:
    "JobPulse India offers free job search and paid Pro plans. Candidates get AI resume and interview tools. Employers get job posts, featured listings, and analytics.",
  path: "/pricing",
  keywords: ["jobpulse pricing", "job portal plans india", "employer job posting price", "resume builder free india"],
});

export default async function PricingPage() {
  const user = await getCurrentUser();
  const candidatePlans = getPublicPlansForAudience("candidate");
  const employerPlans = getPublicPlansForAudience("employer");
  const paymentsEnabled = Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.MYSQL_HOST &&
      process.env.MYSQL_DATABASE,
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SchemaScript
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: pricingFaq.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }}
      />
      <SectionHeading
        eyebrow="Pricing"
        title="Pricing that mirrors how candidates and employers actually grow"
        description="Choose a lightweight free tier or unlock paid workflows for resume optimization, interviews, hiring reach, and analytics."
        as="h1"
      />
      <div className="mt-8">
        <PricingPlans
          candidatePlans={candidatePlans}
          employerPlans={employerPlans}
          currentRole={user?.role ?? null}
          currentPlan={user?.currentPlan ?? null}
          paymentsEnabled={paymentsEnabled}
        />
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-slate-950">Frequently asked questions</h2>
        <div className="mt-6 space-y-4">
          {pricingFaq.map((item) => (
            <div key={item.q} className="rounded-[1.5rem] border border-slate-100 bg-white p-5">
              <p className="font-semibold text-slate-950">{item.q}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
