"use client";

import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Download,
  FileText,
  GraduationCap,
  Languages,
  LoaderCircle,
  Plus,
  Save,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  ResumeBuilderData,
  ResumeTemplateKey,
  SavedResumeSummary,
} from "@/lib/resume/schema";
import { resumeTemplateCatalog } from "@/lib/resume/templates";

type ResumeSectionItem = ResumeBuilderData["education"][number];

const sectionIcons = {
  education: GraduationCap,
  experience: BriefcaseBusiness,
  projects: FileText,
  certifications: Target,
  languages: Languages,
  achievements: Trophy,
} as const;

const panelClass =
  "rounded-[24px] border border-[color:var(--rb-border)] bg-[color:var(--rb-surface)] shadow-[var(--rb-shadow-sm)]";
const inputClass =
  "h-11 rounded-xl border-[color:var(--rb-border)] bg-white text-[color:var(--rb-text)] shadow-none placeholder:text-[color:var(--rb-text-soft)] focus-visible:border-[color:var(--rb-primary)] focus-visible:ring-4 focus-visible:ring-[color:var(--rb-focus)]";
const textareaClass =
  "min-h-28 rounded-xl border-[color:var(--rb-border)] bg-white text-[color:var(--rb-text)] shadow-none placeholder:text-[color:var(--rb-text-soft)] focus-visible:border-[color:var(--rb-primary)] focus-visible:ring-4 focus-visible:ring-[color:var(--rb-focus)]";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function splitCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(value: string[]) {
  return value.join("\n");
}

function SectionShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={`${panelClass} px-6 py-6 sm:px-7`}>
      <div className="flex flex-col gap-3 border-b border-[color:var(--rb-border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h2 className="text-[15px] font-semibold tracking-tight text-[color:var(--rb-text)]">
            {title}
          </h2>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-[color:var(--rb-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="pt-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <label className="block text-[13px] font-semibold text-[color:var(--rb-text)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function PreviewSection({
  title,
  content,
}: {
  title: string;
  content: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="border-b border-slate-200 pb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          {title}
        </h3>
      </div>
      {content}
    </section>
  );
}

function ResumePreview({ resume }: { resume: ResumeBuilderData }) {
  const links = [
    resume.basics.website,
    resume.basics.linkedin,
    resume.basics.github,
    resume.basics.portfolio,
  ].filter(Boolean);

  return (
    <div className="resume-sheet mx-auto w-full max-w-[840px] rounded-[28px] border border-slate-200 bg-white p-10 shadow-[var(--rb-shadow-md)] print:rounded-none print:border-none print:shadow-none sm:p-12">
      <header className="border-b-[1.5px] border-slate-800 pb-6">
        <h2 className="text-[28px] font-bold tracking-tight text-slate-900">
          {resume.basics.fullName}
        </h2>
        <p className="mt-2 text-[15px] text-slate-700">{resume.basics.headline}</p>
        <p className="mt-3 text-[13px] text-slate-600">
          {[resume.basics.email, resume.basics.phone, resume.basics.location]
            .filter(Boolean)
            .join(" | ")}
        </p>
        {links.length > 0 ? (
          <p className="mt-1 text-[13px] text-slate-500">{links.join(" | ")}</p>
        ) : null}
      </header>

      <div className="mt-7 space-y-7">
        <PreviewSection
          title="Professional Summary"
          content={<p className="text-[13px] leading-[1.65] text-slate-700">{resume.summary}</p>}
        />

        {resume.atsKeywords.length > 0 ? (
          <PreviewSection
            title="ATS Keywords"
            content={
              <div className="flex flex-wrap gap-2">
                {resume.atsKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            }
          />
        ) : null}

        {(["experience", "projects", "education", "certifications", "achievements"] as const).map(
          (sectionKey) =>
            resume[sectionKey].length > 0 ? (
              <PreviewSection
                key={sectionKey}
                title={sectionKey}
                content={
                  <div className="space-y-4">
                    {resume[sectionKey].map((item) => (
                      <article key={item.id || item.title} className="space-y-2.5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h4 className="text-[14px] font-semibold text-slate-900">
                              {item.title}
                            </h4>
                            {item.subtitle ? (
                              <p className="text-[13px] text-slate-600">
                                {[item.subtitle, item.location].filter(Boolean).join(" | ")}
                              </p>
                            ) : null}
                          </div>
                          <p className="text-[12px] text-slate-500">
                            {[item.startDate, item.endDate, item.score]
                              .filter(Boolean)
                              .join(" | ")}
                          </p>
                        </div>
                        {item.bullets.length > 0 ? (
                          <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-[1.6] text-slate-700">
                            {item.bullets.map((bullet, index) => (
                              <li key={`${item.id}-${index}`}>{bullet}</li>
                            ))}
                          </ul>
                        ) : null}
                      </article>
                    ))}
                  </div>
                }
              />
            ) : null,
        )}

        {resume.skills.some((group) => group.items.length > 0) ? (
          <PreviewSection
            title="Skills"
            content={
              <div className="space-y-2.5 text-[13px] leading-[1.65] text-slate-700">
                {resume.skills.map((group) =>
                  group.items.length > 0 ? (
                    <p key={group.id || group.title}>
                      <span className="font-semibold text-slate-900">{group.title}:</span>{" "}
                      {group.items.join(", ")}
                    </p>
                  ) : null,
                )}
              </div>
            }
          />
        ) : null}

        {resume.languages.length > 0 ? (
          <PreviewSection
            title="Languages"
            content={
              <div className="flex flex-wrap gap-3 text-[13px] text-slate-700">
                {resume.languages.map((language) => (
                  <span key={language.id || language.name}>
                    {language.name} ({language.proficiency})
                  </span>
                ))}
              </div>
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function ListEditor({
  title,
  items,
  onChange,
  onAdd,
}: {
  title: string;
  items: ResumeSectionItem[];
  onChange: (next: ResumeSectionItem[]) => void;
  onAdd: () => void;
}) {
  return (
    <SectionShell
      title={title}
      description="Keep entries concise, factual, and scannable. Use one bullet per outcome."
      action={
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl border-[color:var(--rb-border)] bg-white px-4 text-[color:var(--rb-text)] hover:bg-slate-50"
          onClick={onAdd}
        >
          <Plus />
          Add item
        </Button>
      }
    >
      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={item.id || `${title}-${index}`}
            className="rounded-[20px] border border-[color:var(--rb-border)] bg-[color:var(--rb-surface-muted)] p-5"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title">
                <Input
                  className={inputClass}
                  value={item.title}
                  onChange={(event) =>
                    onChange(
                      items.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, title: event.target.value } : entry,
                      ),
                    )
                  }
                  placeholder="Title"
                />
              </Field>
              <Field label="Subtitle / organization">
                <Input
                  className={inputClass}
                  value={item.subtitle}
                  onChange={(event) =>
                    onChange(
                      items.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, subtitle: event.target.value } : entry,
                      ),
                    )
                  }
                  placeholder="Organization"
                />
              </Field>
              <Field label="Location">
                <Input
                  className={inputClass}
                  value={item.location}
                  onChange={(event) =>
                    onChange(
                      items.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, location: event.target.value } : entry,
                      ),
                    )
                  }
                  placeholder="City, State"
                />
              </Field>
              <Field label="Score / metric">
                <Input
                  className={inputClass}
                  value={item.score}
                  onChange={(event) =>
                    onChange(
                      items.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, score: event.target.value } : entry,
                      ),
                    )
                  }
                  placeholder="CGPA, %, award, or KPI"
                />
              </Field>
              <Field label="Start date">
                <Input
                  className={inputClass}
                  value={item.startDate}
                  onChange={(event) =>
                    onChange(
                      items.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, startDate: event.target.value } : entry,
                      ),
                    )
                  }
                  placeholder="Jan 2024"
                />
              </Field>
              <Field label="End date">
                <Input
                  className={inputClass}
                  value={item.endDate}
                  onChange={(event) =>
                    onChange(
                      items.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, endDate: event.target.value } : entry,
                      ),
                    )
                  }
                  placeholder="Present"
                />
              </Field>
            </div>

            <div className="mt-4 space-y-2.5">
              <label className="block text-[13px] font-semibold text-[color:var(--rb-text)]">
                Bullet points
              </label>
              <Textarea
                className={textareaClass}
                value={joinLines(item.bullets)}
                onChange={(event) =>
                  onChange(
                    items.map((entry, entryIndex) =>
                      entryIndex === index
                        ? {
                            ...entry,
                            bullets: event.target.value
                              .split("\n")
                              .map((line) => line.trim())
                              .filter(Boolean),
                          }
                        : entry,
                    ),
                  )
                }
                placeholder="One bullet per line"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                className="h-9 rounded-lg px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => onChange(items.filter((_, entryIndex) => entryIndex !== index))}
              >
                Remove entry
              </Button>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function ResumeBuilder({
  initialResume,
  initialSavedResumes,
  canSave,
}: {
  initialResume: ResumeBuilderData;
  initialSavedResumes: SavedResumeSummary[];
  canSave: boolean;
}) {
  const [resume, setResume] = useState(initialResume);
  const [savedResumes, setSavedResumes] = useState(initialSavedResumes);
  const [status, setStatus] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAiWorking, setIsAiWorking] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const templateDetails = useMemo(
    () => resumeTemplateCatalog[resume.templateKey],
    [resume.templateKey],
  );

  async function callAi(
    action:
      | "generate-summary"
      | "improve-bullets"
      | "tailor-role"
      | "add-ats-keywords",
  ) {
    setIsAiWorking(true);
    setStatus("");

    try {
      const response = await fetch("/api/ai/resume-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          role: resume.targetRole,
          experienceLevel: resume.yearsOfExperience,
          jobDescription,
          summary: resume.summary,
          bullets: resume.experience.flatMap((item) => item.bullets).slice(0, 8),
          skills: resume.skills.flatMap((group) => group.items),
          achievements: resume.achievements.flatMap((item) => item.bullets),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "AI request failed.");
      }

      setResume((current) => ({
        ...current,
        summary: data.summary ?? current.summary,
        atsKeywords: Array.isArray(data.ats_keywords)
          ? data.ats_keywords
          : current.atsKeywords,
        experience:
          Array.isArray(data.improved_bullets) && data.improved_bullets.length > 0
            ? current.experience.map((item, index) =>
                index === 0 ? { ...item, bullets: data.improved_bullets } : item,
              )
            : current.experience,
      }));

      setStatus(data.note ?? "AI suggestions applied.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "AI request failed.");
    } finally {
      setIsAiWorking(false);
    }
  }

  async function saveResume() {
    if (!canSave) {
      setStatus("Sign in as a candidate to save this resume to your account.");
      return;
    }

    setIsSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resume),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Could not save resume.");
      }

      setResume((current) => ({
        ...current,
        id: data.resume.id,
        updatedAt: data.resume.updatedAt,
      }));
      setSavedResumes(data.resumes);
      setStatus("Resume saved successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save resume.");
    } finally {
      setIsSaving(false);
    }
  }

  async function exportDocument(format: "pdf" | "docx") {
    if (format === "docx") {
      setIsExportingDocx(true);
    }

    setStatus("");

    try {
      const response = await fetch("/api/resumes/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, resume }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message ?? `Could not export ${format.toUpperCase()}.`);
      }

      if (format === "pdf") {
        const html = await response.text();
        const printWindow = window.open("", "_blank", "noopener,noreferrer");

        if (!printWindow) {
          throw new Error("Allow popups to open the print-friendly preview.");
        }

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 300);
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${
          resume.title.replaceAll(/\s+/g, "-").toLowerCase() || "resume"
        }.docx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }

      setStatus(format === "pdf" ? "Print-friendly preview opened." : "DOCX downloaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Export failed.");
    } finally {
      if (format === "docx") {
        setIsExportingDocx(false);
      }
    }
  }

  function switchTemplate(nextTemplate: ResumeTemplateKey) {
    const template = structuredClone(resumeTemplateCatalog[nextTemplate].starter);
    setResume((current) => ({
      ...template,
      id: current.id,
      basics: {
        ...template.basics,
        fullName: current.basics.fullName || template.basics.fullName,
        email: current.basics.email || template.basics.email,
        phone: current.basics.phone || template.basics.phone,
        location: current.basics.location || template.basics.location,
        linkedin: current.basics.linkedin,
        github: current.basics.github,
        portfolio: current.basics.portfolio,
        website: current.basics.website,
      },
    }));
    setStatus(`Template switched to ${resumeTemplateCatalog[nextTemplate].label}.`);
  }

  return (
    <div className="resume-builder-app">
      <div className="grid gap-0 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="border-b border-[color:var(--rb-border)] bg-[color:var(--rb-pane)] xl:border-b-0 xl:border-r">
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[color:var(--rb-primary)]">
                  Workspace
                </p>
                <h1 className="text-[28px] font-semibold tracking-tight text-[color:var(--rb-text)]">
                  Build a polished, recruiter-ready resume
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-[color:var(--rb-text-muted)]">
                  Edit your resume section by section, use AI where it adds value, and keep the
                  live preview aligned with a clean printable page.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  className="h-11 rounded-xl bg-[color:var(--rb-primary)] px-5 text-slate-950 shadow-none hover:bg-[color:var(--rb-primary-strong)]"
                  onClick={saveResume}
                  disabled={isSaving}
                >
                  {isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
                  Save resume
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-[color:var(--rb-border)] bg-white px-5 text-[color:var(--rb-text)] shadow-none hover:bg-slate-50"
                  onClick={() => exportDocument("pdf")}
                >
                  <Download />
                  Export PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-[color:var(--rb-border)] bg-white px-5 text-[color:var(--rb-text)] shadow-none hover:bg-slate-50"
                  onClick={() => exportDocument("docx")}
                  disabled={isExportingDocx}
                >
                  {isExportingDocx ? <LoaderCircle className="animate-spin" /> : <FileText />}
                  Export DOCX
                </Button>
              </div>
            </div>

            {status ? (
              <div className="mb-8 rounded-[20px] border border-[color:var(--rb-border)] bg-[color:var(--rb-info-bg)] px-5 py-4 text-sm leading-6 text-[color:var(--rb-text-muted)]">
                {status}
              </div>
            ) : null}

            <div className="space-y-8">
              <SectionShell
                title="Resume setup"
                description="Choose the right template, define the target role, and establish the core direction before writing the details."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Resume title">
                    <Input
                      className={inputClass}
                      value={resume.title}
                      onChange={(event) =>
                        setResume((current) => ({ ...current, title: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Target role">
                    <Input
                      className={inputClass}
                      value={resume.targetRole}
                      onChange={(event) =>
                        setResume((current) => ({
                          ...current,
                          targetRole: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Experience level">
                    <Input
                      className={inputClass}
                      value={resume.yearsOfExperience}
                      onChange={(event) =>
                        setResume((current) => ({
                          ...current,
                          yearsOfExperience: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Template">
                    <Select
                      value={resume.templateKey}
                      onValueChange={(value) => switchTemplate(value as ResumeTemplateKey)}
                    >
                      <SelectTrigger className={`${inputClass} w-full justify-between`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(resumeTemplateCatalog).map(([key, template]) => (
                          <SelectItem key={key} value={key}>
                            {template.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="mt-5 rounded-[20px] border border-[color:var(--rb-border)] bg-[color:var(--rb-surface-muted)] px-5 py-4">
                  <p className="text-sm font-semibold text-[color:var(--rb-text)]">
                    {templateDetails.label}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--rb-text-muted)]">
                    {templateDetails.description}
                  </p>
                </div>
              </SectionShell>

              <SectionShell
                title="Contact and summary"
                description="Lead with clarity. This section should establish credibility within the first few seconds of scanning."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Full name">
                    <Input
                      className={inputClass}
                      value={resume.basics.fullName}
                      onChange={(event) =>
                        setResume((current) => ({
                          ...current,
                          basics: { ...current.basics, fullName: event.target.value },
                        }))
                      }
                      placeholder="Full name"
                    />
                  </Field>
                  <Field label="Headline">
                    <Input
                      className={inputClass}
                      value={resume.basics.headline}
                      onChange={(event) =>
                        setResume((current) => ({
                          ...current,
                          basics: { ...current.basics, headline: event.target.value },
                        }))
                      }
                      placeholder="Professional headline"
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      className={inputClass}
                      value={resume.basics.email}
                      onChange={(event) =>
                        setResume((current) => ({
                          ...current,
                          basics: { ...current.basics, email: event.target.value },
                        }))
                      }
                      placeholder="you@example.com"
                    />
                  </Field>
                  <Field label="Phone">
                    <Input
                      className={inputClass}
                      value={resume.basics.phone}
                      onChange={(event) =>
                        setResume((current) => ({
                          ...current,
                          basics: { ...current.basics, phone: event.target.value },
                        }))
                      }
                      placeholder="+91 98765 43210"
                    />
                  </Field>
                  <Field label="Location">
                    <Input
                      className={inputClass}
                      value={resume.basics.location}
                      onChange={(event) =>
                        setResume((current) => ({
                          ...current,
                          basics: { ...current.basics, location: event.target.value },
                        }))
                      }
                      placeholder="City, State"
                    />
                  </Field>
                  <Field label="Website">
                    <Input
                      className={inputClass}
                      value={resume.basics.website}
                      onChange={(event) =>
                        setResume((current) => ({
                          ...current,
                          basics: { ...current.basics, website: event.target.value },
                        }))
                      }
                      placeholder="Personal website"
                    />
                  </Field>
                  <Field label="LinkedIn URL">
                    <Input
                      className={inputClass}
                      value={resume.basics.linkedin}
                      onChange={(event) =>
                        setResume((current) => ({
                          ...current,
                          basics: { ...current.basics, linkedin: event.target.value },
                        }))
                      }
                      placeholder="LinkedIn profile"
                    />
                  </Field>
                  <Field label="GitHub URL">
                    <Input
                      className={inputClass}
                      value={resume.basics.github}
                      onChange={(event) =>
                        setResume((current) => ({
                          ...current,
                          basics: { ...current.basics, github: event.target.value },
                        }))
                      }
                      placeholder="GitHub profile"
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Portfolio URL">
                      <Input
                        className={inputClass}
                        value={resume.basics.portfolio}
                        onChange={(event) =>
                          setResume((current) => ({
                            ...current,
                            basics: { ...current.basics, portfolio: event.target.value },
                          }))
                        }
                        placeholder="Portfolio link"
                      />
                    </Field>
                  </div>
                </div>

                <div className="mt-6 space-y-2.5">
                  <label className="block text-[13px] font-semibold text-[color:var(--rb-text)]">
                    Professional summary
                  </label>
                  <Textarea
                    className={`${textareaClass} min-h-36`}
                    value={resume.summary}
                    onChange={(event) =>
                      setResume((current) => ({ ...current, summary: event.target.value }))
                    }
                  />
                </div>

                <div className="mt-6 space-y-2.5">
                  <label className="block text-[13px] font-semibold text-[color:var(--rb-text)]">
                    ATS keywords
                  </label>
                  <Input
                    className={inputClass}
                    value={resume.atsKeywords.join(", ")}
                    onChange={(event) =>
                      setResume((current) => ({
                        ...current,
                        atsKeywords: splitCommaList(event.target.value),
                      }))
                    }
                    placeholder="React, SQL, stakeholder management, compliance..."
                  />
                </div>
              </SectionShell>

              <SectionShell
                title="AI assistant"
                description="Use AI selectively to strengthen summaries, refine bullet points, tailor for a target role, and surface useful ATS language."
              >
                <div className="rounded-[20px] border border-[color:var(--rb-border)] bg-[color:var(--rb-info-bg)] px-5 py-5">
                  <div className="space-y-3">
                    <label className="block text-[13px] font-semibold text-[color:var(--rb-text)]">
                      Target job description
                    </label>
                    <Textarea
                      className={`${textareaClass} min-h-32 bg-white`}
                      value={jobDescription}
                      onChange={(event) => setJobDescription(event.target.value)}
                      placeholder="Paste the job description to help tailor your summary and experience bullets"
                    />
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        className="h-10 rounded-xl bg-[color:var(--rb-primary)] px-4 text-slate-950 shadow-none hover:bg-[color:var(--rb-primary-strong)]"
                        onClick={() => callAi("generate-summary")}
                        disabled={isAiWorking}
                      >
                        {isAiWorking ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          <Sparkles />
                        )}
                        Generate summary
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-xl border-[color:var(--rb-border)] bg-white px-4 text-[color:var(--rb-text)] shadow-none hover:bg-slate-50"
                        onClick={() => callAi("improve-bullets")}
                        disabled={isAiWorking}
                      >
                        Improve bullet points
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-xl border-[color:var(--rb-border)] bg-white px-4 text-[color:var(--rb-text)] shadow-none hover:bg-slate-50"
                        onClick={() => callAi("tailor-role")}
                        disabled={isAiWorking}
                      >
                        Tailor for role
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-xl border-[color:var(--rb-border)] bg-white px-4 text-[color:var(--rb-text)] shadow-none hover:bg-slate-50"
                        onClick={() => callAi("add-ats-keywords")}
                        disabled={isAiWorking}
                      >
                        Add ATS keywords
                      </Button>
                    </div>
                  </div>
                </div>
              </SectionShell>

              <div className="space-y-5">
                <Tabs defaultValue="experience" className="space-y-5">
                  <TabsList
                    variant="line"
                    className="h-auto w-full flex-wrap justify-start gap-2 rounded-[22px] border border-[color:var(--rb-border)] bg-white p-2"
                  >
                    {(
                      [
                        ["experience", "Experience"],
                        ["education", "Education"],
                        ["skills", "Skills"],
                        ["projects", "Projects"],
                        ["certifications", "Certifications"],
                        ["languages", "Languages"],
                        ["achievements", "Achievements"],
                      ] as const
                    ).map(([key, label]) => {
                      const Icon = sectionIcons[key as keyof typeof sectionIcons] ?? FileText;
                      return (
                        <TabsTrigger
                          key={key}
                          value={key}
                          className="gap-2 rounded-xl px-4 py-2.5 text-[color:var(--rb-text-muted)] data-active:border data-active:border-[color:var(--rb-border)] data-active:bg-[color:var(--rb-surface)] data-active:text-[color:var(--rb-text)]"
                        >
                          <Icon className="size-4" />
                          {label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  <TabsContent value="experience">
                    <ListEditor
                      title="Experience"
                      items={resume.experience}
                      onChange={(next) =>
                        setResume((current) => ({ ...current, experience: next }))
                      }
                      onAdd={() =>
                        setResume((current) => ({
                          ...current,
                          experience: [
                            ...current.experience,
                            {
                              id: createId("experience"),
                              title: "",
                              subtitle: "",
                              location: "",
                              startDate: "",
                              endDate: "",
                              score: "",
                              bullets: [],
                            },
                          ],
                        }))
                      }
                    />
                  </TabsContent>

                  <TabsContent value="education">
                    <ListEditor
                      title="Education"
                      items={resume.education}
                      onChange={(next) =>
                        setResume((current) => ({ ...current, education: next }))
                      }
                      onAdd={() =>
                        setResume((current) => ({
                          ...current,
                          education: [
                            ...current.education,
                            {
                              id: createId("education"),
                              title: "",
                              subtitle: "",
                              location: "",
                              startDate: "",
                              endDate: "",
                              score: "",
                              bullets: [],
                            },
                          ],
                        }))
                      }
                    />
                  </TabsContent>

                  <TabsContent value="projects">
                    <ListEditor
                      title="Projects"
                      items={resume.projects}
                      onChange={(next) =>
                        setResume((current) => ({ ...current, projects: next }))
                      }
                      onAdd={() =>
                        setResume((current) => ({
                          ...current,
                          projects: [
                            ...current.projects,
                            {
                              id: createId("project"),
                              title: "",
                              subtitle: "",
                              location: "",
                              startDate: "",
                              endDate: "",
                              score: "",
                              bullets: [],
                            },
                          ],
                        }))
                      }
                    />
                  </TabsContent>

                  <TabsContent value="certifications">
                    <ListEditor
                      title="Certifications"
                      items={resume.certifications}
                      onChange={(next) =>
                        setResume((current) => ({ ...current, certifications: next }))
                      }
                      onAdd={() =>
                        setResume((current) => ({
                          ...current,
                          certifications: [
                            ...current.certifications,
                            {
                              id: createId("certification"),
                              title: "",
                              subtitle: "",
                              location: "",
                              startDate: "",
                              endDate: "",
                              score: "",
                              bullets: [],
                            },
                          ],
                        }))
                      }
                    />
                  </TabsContent>

                  <TabsContent value="achievements">
                    <ListEditor
                      title="Achievements"
                      items={resume.achievements}
                      onChange={(next) =>
                        setResume((current) => ({ ...current, achievements: next }))
                      }
                      onAdd={() =>
                        setResume((current) => ({
                          ...current,
                          achievements: [
                            ...current.achievements,
                            {
                              id: createId("achievement"),
                              title: "",
                              subtitle: "",
                              location: "",
                              startDate: "",
                              endDate: "",
                              score: "",
                              bullets: [],
                            },
                          ],
                        }))
                      }
                    />
                  </TabsContent>

                  <TabsContent value="skills">
                    <SectionShell
                      title="Skills"
                      description="Organize related skills into clear groups so the resume reads fast and feels structured."
                      action={
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-xl border-[color:var(--rb-border)] bg-white px-4 text-[color:var(--rb-text)] hover:bg-slate-50"
                          onClick={() =>
                            setResume((current) => ({
                              ...current,
                              skills: [
                                ...current.skills,
                                { id: createId("skills"), title: "", items: [] },
                              ],
                            }))
                          }
                        >
                          <Plus />
                          Add group
                        </Button>
                      }
                    >
                      <div className="space-y-4">
                        {resume.skills.map((group, index) => (
                          <div
                            key={group.id || index}
                            className="rounded-[20px] border border-[color:var(--rb-border)] bg-[color:var(--rb-surface-muted)] p-5"
                          >
                            <Field label="Skill category">
                              <Input
                                className={inputClass}
                                value={group.title}
                                onChange={(event) =>
                                  setResume((current) => ({
                                    ...current,
                                    skills: current.skills.map((entry, entryIndex) =>
                                      entryIndex === index
                                        ? { ...entry, title: event.target.value }
                                        : entry,
                                    ),
                                  }))
                                }
                                placeholder="Technical skills, tools, soft skills..."
                              />
                            </Field>
                            <div className="mt-4">
                              <Field label="Skills">
                                <Input
                                  className={inputClass}
                                  value={group.items.join(", ")}
                                  onChange={(event) =>
                                    setResume((current) => ({
                                      ...current,
                                      skills: current.skills.map((entry, entryIndex) =>
                                        entryIndex === index
                                          ? {
                                              ...entry,
                                              items: splitCommaList(event.target.value),
                                            }
                                          : entry,
                                      ),
                                    }))
                                  }
                                  placeholder="Comma-separated skills"
                                />
                              </Field>
                            </div>
                          </div>
                        ))}
                      </div>
                    </SectionShell>
                  </TabsContent>

                  <TabsContent value="languages">
                    <SectionShell
                      title="Languages"
                      description="List relevant languages and proficiency levels for customer-facing, global, or regional roles."
                      action={
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-xl border-[color:var(--rb-border)] bg-white px-4 text-[color:var(--rb-text)] hover:bg-slate-50"
                          onClick={() =>
                            setResume((current) => ({
                              ...current,
                              languages: [
                                ...current.languages,
                                { id: createId("language"), name: "", proficiency: "" },
                              ],
                            }))
                          }
                        >
                          <Plus />
                          Add language
                        </Button>
                      }
                    >
                      <div className="space-y-4">
                        {resume.languages.map((language, index) => (
                          <div
                            key={language.id || index}
                            className="grid gap-4 rounded-[20px] border border-[color:var(--rb-border)] bg-[color:var(--rb-surface-muted)] p-5 md:grid-cols-[1fr_0.8fr_auto]"
                          >
                            <Field label="Language">
                              <Input
                                className={inputClass}
                                value={language.name}
                                onChange={(event) =>
                                  setResume((current) => ({
                                    ...current,
                                    languages: current.languages.map((entry, entryIndex) =>
                                      entryIndex === index
                                        ? { ...entry, name: event.target.value }
                                        : entry,
                                    ),
                                  }))
                                }
                                placeholder="Language"
                              />
                            </Field>
                            <Field label="Proficiency">
                              <Input
                                className={inputClass}
                                value={language.proficiency}
                                onChange={(event) =>
                                  setResume((current) => ({
                                    ...current,
                                    languages: current.languages.map((entry, entryIndex) =>
                                      entryIndex === index
                                        ? { ...entry, proficiency: event.target.value }
                                        : entry,
                                    ),
                                  }))
                                }
                                placeholder="Professional / Fluent"
                              />
                            </Field>
                            <div className="flex items-end justify-start md:justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-10 rounded-lg px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() =>
                                  setResume((current) => ({
                                    ...current,
                                    languages: current.languages.filter(
                                      (_, entryIndex) => entryIndex !== index,
                                    ),
                                  }))
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </SectionShell>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>

        <aside className="bg-[color:var(--rb-bg)]">
          <div className="sticky top-0 mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
            <div className={`${panelClass} px-6 py-5`}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <h2 className="text-[15px] font-semibold text-[color:var(--rb-text)]">
                    Live preview
                  </h2>
                  <p className="text-sm leading-6 text-[color:var(--rb-text-muted)]">
                    The layout below is designed to feel like a printed resume page with calm
                    spacing and recruiter-friendly typography.
                  </p>
                </div>
                <div className="rounded-full border border-[color:var(--rb-border)] bg-[color:var(--rb-surface-muted)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--rb-text-soft)]">
                  A4-style canvas
                </div>
              </div>
            </div>

            {savedResumes.length > 0 ? (
              <div className={`${panelClass} px-6 py-5`}>
                <div className="mb-4 space-y-1">
                  <h2 className="text-[15px] font-semibold text-[color:var(--rb-text)]">
                    Saved drafts
                  </h2>
                  <p className="text-sm leading-6 text-[color:var(--rb-text-muted)]">
                    Re-open a saved version without leaving the workspace.
                  </p>
                </div>
                <div className="space-y-3">
                  {savedResumes.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full rounded-[18px] border border-[color:var(--rb-border)] bg-[color:var(--rb-surface-muted)] px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white"
                      onClick={async () => {
                        const response = await fetch(`/api/resumes/${item.id}`, {
                          cache: "no-store",
                        });
                        const data = await response.json();
                        if (response.ok) {
                          setResume(data.resume);
                          setStatus(`Loaded ${item.title}.`);
                        } else {
                          setStatus(data.message ?? "Could not load resume.");
                        }
                      }}
                    >
                      <p className="font-medium text-[color:var(--rb-text)]">{item.title}</p>
                      <p className="mt-1 text-sm text-[color:var(--rb-text-muted)]">
                        {resumeTemplateCatalog[item.templateKey].label} template
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-[28px] bg-transparent print:bg-white">
              <ResumePreview resume={resume} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
