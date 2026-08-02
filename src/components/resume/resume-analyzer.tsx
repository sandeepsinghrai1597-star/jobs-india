"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSearch,
  FileText,
  Gauge,
  ListChecks,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ResumeAnalysisResult } from "@/lib/resume/analyzer";

const panelClass =
  "rounded-[24px] border border-slate-200 bg-white shadow-[0_4px_6px_-1px_rgb(0_0_0_/_0.05)]";
const inputClass =
  "h-11 rounded-md border-slate-200 bg-white text-slate-900 shadow-none placeholder:text-slate-500 focus-visible:border-blue-600 focus-visible:ring-4 focus-visible:ring-blue-100";
const textareaClass =
  "rounded-md border-slate-200 bg-white text-slate-900 shadow-none placeholder:text-slate-500 focus-visible:border-blue-600 focus-visible:ring-4 focus-visible:ring-blue-100";

const sampleResumeName = "sample-resume.pdf";
const sampleResumeText = `Aarav Sharma
Data Analyst
aarav.sharma@email.com | +91 98765 43210 | Bengaluru, Karnataka

Professional Summary
Detail-oriented data analyst with experience in Excel, SQL, dashboard reporting, stakeholder communication, and business insights. Skilled in turning raw data into clear recommendations that support business decisions.

Experience
Data Analyst Intern | Insight Metrics Pvt Ltd | Jan 2024 - Jun 2024
- Built weekly performance dashboards in Excel and Google Sheets for sales and support teams.
- Cleaned and validated large datasets before generating reports for business stakeholders.
- Used SQL queries to extract customer and transaction data for ad hoc analysis.

Projects
Customer Retention Dashboard
- Created an interactive dashboard to track churn trends and high-risk customer segments.
- Presented findings and recommendations to improve retention campaigns.

Education
B.Com in Business Analytics | Christ University | 2021 - 2024

Skills
SQL, Excel, Power BI, Google Sheets, Data Cleaning, Reporting, Communication`;

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1.5">
      <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
        {title}
      </h2>
      {description ? (
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      ) : null}
    </div>
  );
}

function ScoreCard({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-5 py-5">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{score}</p>
    </div>
  );
}

function BulletList({
  items,
  emptyMessage,
}: {
  items: string[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-slate-500">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2 text-sm leading-6 text-slate-600">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-[0.42rem] h-1.5 w-1.5 rounded-full bg-blue-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function LoadingState() {
  return (
    <div className={`${panelClass} px-8 py-12`}>
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <div className="rounded-3xl bg-blue-50 p-4 text-blue-700">
          <LoaderCircle className="size-8 animate-spin" />
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
          Analyzing your resume against ATS algorithms...
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Extracting text, checking keywords, evaluating readability, and generating improvement
          suggestions.
        </p>
        <div className="mt-8 w-full space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="space-y-3 rounded-[18px] border border-slate-200 bg-slate-50 p-5">
              <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ResumeAnalyzer() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);

  async function handleAnalyze() {
    if (!file) {
      setError("Upload a PDF or DOCX resume to begin analysis.");
      return;
    }

    setIsAnalyzing(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("targetRole", targetRole);
      formData.append("jobDescription", jobDescription);

      const response = await fetch("/api/ai/resume-analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Could not analyze resume.");
      }

      setResult(data.analysis);
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Could not analyze the uploaded resume.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function useSampleResume() {
    const sampleFile = new File([sampleResumeText], sampleResumeName, {
      type: "application/pdf",
    });

    setFile(sampleFile);
    setTargetRole("Data Analyst");
    setJobDescription(
      "We are hiring a Data Analyst with strong SQL, Excel, dashboard reporting, data cleaning, stakeholder communication, and business insights experience. Candidates should present findings clearly and translate data into actionable recommendations.",
    );
    setError("");
  }

  function clearFile() {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid max-w-[1480px] gap-0 xl:grid-cols-[0.96fr_1.04fr]">
        <section className="border-b border-slate-200 bg-slate-100/70 xl:border-b-0 xl:border-r">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
            <div className="mb-8 space-y-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                Resume Analyzer
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Analyze ATS readiness before you apply
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Upload your resume, optionally add a job description, and get a recruiter-style
                analysis covering ATS score, keywords, missing skills, formatting, grammar, and
                stronger content suggestions.
              </p>
            </div>

            <div className="space-y-6">
              <div className={`${panelClass} px-6 py-6`}>
                <SectionTitle
                  title="Upload resume"
                  description="Supported formats: PDF and DOCX. Maximum size: 5 MB."
                />
                <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center transition hover:border-blue-600 hover:bg-slate-50">
                  <Upload className="size-8 text-blue-700" />
                  <p className="mt-4 text-sm font-semibold text-slate-900">
                    {file ? file.name : "Choose a resume file"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Drag and drop is optional. Click to upload a clean PDF or DOCX file.
                  </p>

                  {file ? (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-blue-700 hover:text-blue-800"
                        onClick={(event) => {
                          event.preventDefault();
                          fileInputRef.current?.click();
                        }}
                      >
                        <RefreshCw className="size-4" />
                        Replace file
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-slate-700"
                        onClick={(event) => {
                          event.preventDefault();
                          clearFile();
                        }}
                      >
                        <Trash2 className="size-4" />
                        Remove
                      </button>
                    </div>
                  ) : null}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(event) => {
                      const selectedFile = event.target.files?.[0] ?? null;
                      setFile(selectedFile);
                      setError("");
                    }}
                  />
                </label>

                <div className="mt-4">
                  <button
                    type="button"
                    className="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
                    onClick={useSampleResume}
                  >
                    Don&apos;t have a resume ready? Try a sample resume
                  </button>
                </div>
              </div>

              <div className={`${panelClass} px-6 py-6`}>
                <SectionTitle
                  title="Target role and job description"
                  description="Adding role context improves keyword matching and role-fit analysis."
                />
                <div className="mt-5 space-y-4">
                  <div className="space-y-2.5">
                    <label className="text-[13px] font-semibold text-slate-900">
                      Target role
                    </label>
                    <Input
                      className={inputClass}
                      value={targetRole}
                      onChange={(event) => setTargetRole(event.target.value)}
                      placeholder="Frontend Developer, Sales Executive, Data Analyst..."
                    />
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-[13px] font-semibold text-slate-900">
                      Job description
                    </label>
                    <Textarea
                      className={`${textareaClass} min-h-40`}
                      value={jobDescription}
                      onChange={(event) => setJobDescription(event.target.value)}
                      placeholder="Paste the job description to compare missing skills, missing keywords, and role match."
                    />
                  </div>

                  <div className="rounded-[20px] border border-slate-200 bg-blue-50 px-5 py-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          Ready to analyze
                        </p>
                        <p className="text-sm leading-6 text-slate-600">
                          {file
                            ? `Selected file: ${file.name}`
                            : "Upload a PDF or DOCX file first, then run the analyzer."}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Button
                          type="button"
                          size="lg"
                          className="h-12 min-w-[220px] rounded-md bg-blue-700 px-6 text-white shadow-none hover:bg-blue-900"
                          onClick={handleAnalyze}
                          disabled={isAnalyzing}
                        >
                          {isAnalyzing ? (
                            <LoaderCircle className="animate-spin" />
                          ) : (
                            <Sparkles />
                          )}
                          Analyze Resume
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${panelClass} px-6 py-6`}>
                <SectionTitle
                  title="What you will get"
                  description="The analyzer is structured to be useful for both ATS tuning and human review."
                />
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {[
                    "Overall score out of 100 with ATS, keyword, grammar, and formatting breakdown",
                    "Strengths, weaknesses, missing skills, and missing keywords",
                    "Improved summary and better resume bullet point suggestions",
                    "Optional job-description comparison with role match percentage",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {error ? (
                <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-800">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="mb-8 space-y-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                Analysis Output
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                ATS and recruiter review
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Structured insights designed to improve resume quality, keyword fit, and overall
                interview-readiness.
              </p>
            </div>

            {isAnalyzing ? (
              <LoadingState />
            ) : result ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div className={`${panelClass} px-6 py-6 xl:col-span-1`}>
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                        <Gauge className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600">Overall score</p>
                        <p className="text-4xl font-semibold tracking-tight text-slate-900">
                          {result.overall_score}
                          <span className="text-lg text-slate-500">/100</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <ScoreCard label="ATS score" score={result.ats_score} />
                  <ScoreCard label="Role match %" score={result.role_match_percentage} />
                  <ScoreCard label="Keyword score" score={result.keyword_score} />
                  <ScoreCard label="Grammar score" score={result.grammar_score} />
                  <ScoreCard label="Formatting score" score={result.formatting_score} />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className={`${panelClass} px-6 py-6`}>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="size-5 text-emerald-600" />
                      <SectionTitle title="Strengths" />
                    </div>
                    <div className="mt-5">
                      <BulletList
                        items={result.strengths}
                        emptyMessage="No strengths were identified yet."
                      />
                    </div>
                  </div>

                  <div className={`${panelClass} px-6 py-6`}>
                    <div className="flex items-center gap-3">
                      <AlertCircle className="size-5 text-amber-600" />
                      <SectionTitle title="Weaknesses" />
                    </div>
                    <div className="mt-5">
                      <BulletList
                        items={result.weaknesses}
                        emptyMessage="No clear weaknesses were identified."
                      />
                    </div>
                  </div>

                  <div className={`${panelClass} px-6 py-6`}>
                    <div className="flex items-center gap-3">
                      <FileSearch className="size-5 text-blue-700" />
                      <SectionTitle title="Missing skills" />
                    </div>
                    <div className="mt-5">
                      <BulletList
                        items={result.missing_skills}
                        emptyMessage="No missing skills surfaced from the comparison."
                      />
                    </div>
                  </div>

                  <div className={`${panelClass} px-6 py-6`}>
                    <div className="flex items-center gap-3">
                      <ListChecks className="size-5 text-blue-700" />
                      <SectionTitle title="Missing keywords" />
                    </div>
                    <div className="mt-5">
                      <BulletList
                        items={result.missing_keywords}
                        emptyMessage="No missing keywords surfaced from the comparison."
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className={`${panelClass} px-6 py-6`}>
                    <SectionTitle
                      title="Suggested improvements"
                      description="Actionable changes to raise ATS readability and role fit."
                    />
                    <div className="mt-5">
                      <BulletList
                        items={result.suggested_improvements}
                        emptyMessage="No specific improvements suggested."
                      />
                    </div>
                  </div>

                  <div className={`${panelClass} px-6 py-6`}>
                    <SectionTitle
                      title="Suggested skills"
                      description="Add these only if they honestly match your experience."
                    />
                    <div className="mt-5">
                      <BulletList
                        items={result.suggested_skills}
                        emptyMessage="No additional skills suggested."
                      />
                    </div>
                  </div>
                </div>

                <div className={`${panelClass} px-6 py-6`}>
                  <SectionTitle
                    title="Improved summary"
                    description={`Analyzed role: ${result.analyzed_role}`}
                  />
                  <div className="mt-5 rounded-[20px] border border-slate-200 bg-blue-50 px-5 py-5 text-sm leading-7 text-slate-600">
                    {result.improved_summary}
                  </div>
                </div>

                <div className={`${panelClass} px-6 py-6`}>
                  <SectionTitle
                    title="Better bullet points"
                    description="Use these as a starting point and adapt them to your real achievements."
                  />
                  <div className="mt-5">
                    <BulletList
                      items={result.improved_bullets}
                      emptyMessage="No bullet improvements suggested."
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className={`${panelClass} flex min-h-[720px] items-center justify-center px-8 py-12`}>
                <div className="mx-auto flex max-w-md flex-col items-center text-center">
                  <div className="relative">
                    <div className="rounded-[28px] bg-blue-50 p-5 text-blue-700">
                      <FileText className="size-10" />
                    </div>
                    <div className="absolute -right-3 -top-3 rounded-2xl bg-slate-100 p-2 text-slate-500">
                      <FileSearch className="size-5" />
                    </div>
                  </div>
                  <h2 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">
                    Upload a resume to generate your analysis
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Your ATS score, missing keywords, role match, and improvement suggestions will
                    appear here once the analysis is complete.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
