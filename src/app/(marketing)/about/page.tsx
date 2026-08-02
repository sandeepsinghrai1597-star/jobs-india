import {
  BriefcaseBusiness,
  FileSearch,
  GraduationCap,
  Landmark,
  MessageSquareText,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { buildFaqSchema } from "@/lib/seo";
import { SchemaScript } from "@/components/shared/schema-script";

export const metadata = buildMetadata({
  title: "About JobPulse India — AI Career Platform for Indian Job Seekers",
  description:
    "JobPulse India is an AI-powered career platform built for Indian students, freshers, and job seekers. Discover jobs, build resumes, prepare for interviews, and get AI career guidance — all in one place.",
  path: "/about",
  keywords: [
    "about jobpulse india",
    "ai career platform india",
    "job search india",
    "resume builder india",
    "interview preparation india",
    "fresher jobs platform",
  ],
});

const faqs = [
  {
    question: "What is JobPulse India?",
    answer:
      "JobPulse India is an AI-powered career platform designed for Indian students, freshers, and job seekers. It combines job discovery, resume building, interview preparation, and an AI career agent into one mobile-first platform.",
  },
  {
    question: "Is JobPulse India free to use?",
    answer:
      "Yes. Job search, saving jobs, basic AI career chat, and the resume builder are all free. A Pro plan at ₹199/month unlocks ATS resume analysis, mock interview reports, WhatsApp alerts, and advanced roadmaps.",
  },
  {
    question: "What types of jobs are listed on JobPulse India?",
    answer:
      "JobPulse India lists government jobs, private sector openings, remote jobs, fresher-friendly roles, internships, and walk-in interviews across all major Indian cities and states.",
  },
  {
    question: "How does the AI resume analyzer work?",
    answer:
      "Upload your resume and the AI scores it for ATS compatibility, checks for missing keywords, and suggests role-specific improvements so recruiters are more likely to shortlist your profile.",
  },
  {
    question: "Can employers post jobs on JobPulse India?",
    answer:
      "Yes. Employers can post a single job for free, or choose the Basic (₹999/month) or Pro (₹2,999/month) plans for multiple postings, featured listings, applicant management, and hiring analytics.",
  },
];

const features = [
  {
    icon: BriefcaseBusiness,
    title: "Job Discovery",
    description:
      "150+ active listings across government, private, remote, fresher, and internship categories with smart filters for salary, city, experience, and more.",
  },
  {
    icon: FileSearch,
    title: "Resume Analyzer",
    description:
      "ATS scoring, keyword gap analysis, and recruiter-style improvement suggestions to help your resume get shortlisted faster.",
  },
  {
    icon: Sparkles,
    title: "Resume Builder",
    description:
      "Clean, role-ready resume templates with AI-assisted summaries and bullet points tailored to your target job.",
  },
  {
    icon: MessageSquareText,
    title: "Interview Prep",
    description:
      "Practice HR, technical, behavioral, and role-specific interview questions with AI scoring on communication and confidence.",
  },
  {
    icon: GraduationCap,
    title: "Learning Roadmaps",
    description:
      "30-day and 90-day career plans for 9+ career paths including data analyst, software developer, digital marketing, banking, and more.",
  },
  {
    icon: Zap,
    title: "AI Career Agent",
    description:
      "Ask anything — job search advice, salary guidance, resume tips, career path planning — and get answers built for India's job market.",
  },
];

const stats = [
  { label: "Active job listings", value: "150+" },
  { label: "Hiring companies", value: "120+" },
  { label: "Cities covered", value: "73+" },
  { label: "Career guides", value: "9+" },
];

const whoWeServe = [
  { icon: GraduationCap, label: "Freshers & students (10th pass to postgraduate)" },
  { icon: Target, label: "Career changers looking for new roles" },
  { icon: Landmark, label: "Government job aspirants across India" },
  { icon: Users, label: "Employers hiring across roles and cities" },
];

export default function AboutPage() {
  return (
    <>
      <SchemaScript data={buildFaqSchema(faqs)} />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Hero */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">About us</p>
          <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            India&apos;s AI Career Companion
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            JobPulse India is an AI-powered career platform built for Indian students, freshers, and job seekers
            who need more than a job board. We combine job discovery, resume tools, interview preparation, and an
            AI career agent into one mobile-first platform — so every candidate can move from search to shortlist faster.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-3xl font-bold text-primary">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Mission */}
        <section className="mt-10">
          <h2 className="font-heading text-2xl font-semibold text-slate-950">Our mission</h2>
          <p className="mt-4 leading-7 text-slate-600">
            Most job boards in India show listings and stop there. JobPulse India exists to fill the gap between
            discovery and employment — giving every candidate the tools they need to apply confidently, prepare
            thoroughly, and land roles that match their skills and goals.
          </p>
          <p className="mt-4 leading-7 text-slate-600">
            We focus specifically on the Indian job market: government exams, fresher roles, regional hiring, and
            the real career challenges that students from tier-2 and tier-3 cities face every day.
          </p>
        </section>

        {/* Who we serve */}
        <section className="mt-10">
          <h2 className="font-heading text-2xl font-semibold text-slate-950">Who we serve</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {whoWeServe.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <Icon className="size-5 shrink-0 text-primary" />
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Features */}
        <section className="mt-10">
          <h2 className="font-heading text-2xl font-semibold text-slate-950">What&apos;s inside the platform</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-[1.5rem] border border-slate-100 bg-white p-5">
                  <Icon className="size-5 text-primary" />
                  <p className="mt-3 font-semibold text-slate-950">{feature.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="font-heading text-2xl font-semibold text-slate-950">Frequently asked questions</h2>
          <div className="mt-6 space-y-5">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-slate-100 bg-white p-6">
                <p className="font-semibold text-slate-950">{faq.question}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact CTA */}
        <section className="mt-12 rounded-[2rem] border border-slate-100 bg-[linear-gradient(135deg,rgba(255,45,120,0.12),rgba(255,255,255,0.96)_55%,rgba(0,255,204,0.06))] p-8 text-center">
          <h2 className="font-heading text-2xl font-semibold text-slate-950">Get in touch</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            For support, employer onboarding, content partnerships, or platform feedback — reach us at{" "}
            <a href="mailto:support@jobpulseindia.in" className="font-semibold text-primary hover:underline">
              support@jobpulseindia.in
            </a>
          </p>
        </section>

      </div>
    </>
  );
}
