import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Terms and Conditions",
  description: "Core terms and usage boundaries for candidates, employers, and admins.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white backdrop-blur p-8">
        <h1 className="font-heading text-4xl font-semibold tracking-tight">Terms &amp; Conditions</h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Candidate advice is guidance and not a guarantee of selection. Government job seekers must verify official sources. Recruiters are responsible for accurate and lawful job postings.
        </p>
      </div>
    </div>
  );
}
