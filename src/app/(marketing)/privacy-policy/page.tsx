import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description: "Privacy commitments for candidate, employer, and analytics data on JobPulse India.",
  path: "/privacy-policy",
});

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-8 rounded-[2rem] border border-slate-200 bg-white p-8 backdrop-blur">
        <h1 className="font-heading text-4xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="text-lg leading-8 text-muted-foreground">
          JobPulse India collects only the information needed to provide job discovery, applications,
          resume tools, interview practice, employer workflows, account security, and platform analytics.
          We do not sell personal information.
        </p>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Information We Collect</h2>
          <p className="leading-7 text-muted-foreground">
            Candidates may provide name, email, phone number, profile details, resumes, job preferences,
            saved jobs, applications, and AI tool inputs. Employers may provide company profile details,
            recruiter contact information, job posts, applicant notes, and billing metadata. We also collect
            essential usage, device, and log data to keep the service secure and reliable.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">How We Use Data</h2>
          <p className="leading-7 text-muted-foreground">
            We use data to operate accounts, match candidates with relevant opportunities, process job
            applications, deliver AI resume and interview features, verify employers and job sources, send
            service notifications, prevent abuse, improve the product, and comply with legal obligations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Storage and Security</h2>
          <p className="leading-7 text-muted-foreground">
            Account and product data is stored with Supabase and related infrastructure providers. Data in
            transit is protected with TLS. Passwords are handled by Supabase Auth and are not stored by
            JobPulse India in plain text.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Cookies</h2>
          <p className="leading-7 text-muted-foreground">
            We use essential cookies for authentication, session management, security, and preferences.
            Analytics cookies or similar technologies may be used to understand aggregate product usage.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Your Choices</h2>
          <p className="leading-7 text-muted-foreground">
            You may update account information from your dashboard. To request account deletion,
            correction, or data export, contact us at{" "}
            <a className="font-medium text-primary underline-offset-4 hover:underline" href="mailto:hello@jobpulseindia.com">
              hello@jobpulseindia.com
            </a>
            . We will review requests and respond within a reasonable period.
          </p>
        </section>
      </div>
    </div>
  );
}
