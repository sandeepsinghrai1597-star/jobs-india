import Link from "next/link";
import { siteConfig } from "@/lib/data/site";

const footerColumns = [
  {
    title: "Discover",
    links: [
      { href: "/jobs", label: "All jobs" },
      { href: "/fresher-jobs", label: "Fresher jobs" },
      { href: "/remote-jobs", label: "Remote jobs" },
      { href: "/government-jobs", label: "Government jobs" },
      { href: "/internships", label: "Internships" },
    ],
  },
  {
    title: "Career tools",
    links: [
      { href: "/resume-builder", label: "Resume builder" },
      { href: "/resume-analyzer", label: "Resume analyzer" },
      { href: "/interview-preparation", label: "Interview prep" },
      { href: "/ai-career-agent", label: "AI career agent" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy-policy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-100 bg-[rgba(9,8,18,0.96)]">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.25fr_repeat(3,1fr)] lg:px-8">
        <div className="space-y-4">
          <p className="font-heading text-2xl font-semibold text-slate-950">{siteConfig.name}</p>
          <p className="max-w-sm text-sm leading-7 text-slate-600">
            A mobile-first career platform for India with job discovery, resumes, interview prep,
            and AI-guided decision support.
          </p>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
            Retro-futuristic recruitment
          </p>
        </div>

        {footerColumns.map((column) => (
          <div key={column.title} className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-800">
              {column.title}
            </h4>
            <ul className="space-y-3 text-sm text-slate-500">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>&copy; 2026 {siteConfig.name}. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/learning-roadmap" className="hover:text-cyan-300">
              Roadmaps
            </Link>
            <Link href="/blog" className="hover:text-cyan-300">
              Blog
            </Link>
            <Link href="/contact" className="hover:text-cyan-300">
              Contact
            </Link>
            <Link href="/terms" className="hover:text-cyan-300">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
