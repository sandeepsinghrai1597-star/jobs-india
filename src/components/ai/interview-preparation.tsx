"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

const ROLES = [
  "Data Analyst",
  "Software Developer",
  "Sales Executive",
  "Customer Support",
  "Digital Marketing",
  "Accountant",
  "Banking Fresher",
  "Teacher",
  "BPO",
  "HR Executive",
] as const;

const MODES = [
  "HR interview",
  "Technical interview",
  "Behavioral interview",
  "Fresher interview",
  "Role-specific interview",
] as const;

type InterviewMode = (typeof MODES)[number];
type InterviewRole = (typeof ROLES)[number];

type QuestionItem = {
  id: string;
  question: string;
  focus: string;
  idealThemes: string[];
  answer?: string;
  evaluation?: {
    communicationScore: number;
    technicalScore: number;
    confidenceScore: number;
    overallScore: number;
    weakAreas: string[];
    improvementTips: string[];
    betterAnswer: string;
    feedback: string;
  };
};

type FinalReport = {
  communicationScore: number;
  technicalScore: number;
  confidenceScore: number;
  overallScore: number;
  weakAreas: string[];
  suggestedPracticeQuestions: string[];
  overallFeedback: string;
};

type SessionResponse = {
  sessionId: string | null;
  stored: boolean;
  totalQuestions: number;
  currentQuestionIndex: number;
  isComplete: boolean;
  question: QuestionItem | null;
  evaluation?: QuestionItem["evaluation"];
  report?: FinalReport;
  questions?: QuestionItem[];
  message?: string;
};

const panelClass =
  "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]";

function SelectCard({
  label,
  active,
  onClick,
  description,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[22px] border px-4 py-4 text-left transition ${
        active
          ? "border-cyan-500 bg-cyan-50 shadow-[0_12px_30px_rgba(6,182,212,0.14)]"
          : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-slate-50"
      }`}
    >
      <p className="text-sm font-semibold text-slate-950">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </button>
  );
}

function BulletItems({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-slate-500">No items yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
          <span className="mt-2 h-2 w-2 rounded-full bg-cyan-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function InterviewPreparation() {
  const [selectedRole, setSelectedRole] = useState<InterviewRole>("Software Developer");
  const [selectedMode, setSelectedMode] = useState<InterviewMode>("HR interview");
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const askedQuestions = session?.questions ?? [];
  const progressValue = useMemo(() => {
    if (!session) return 0;
    return Math.round((session.currentQuestionIndex / session.totalQuestions) * 100);
  }, [session]);

  async function callInterviewApi(payload: Record<string, unknown>) {
    const response = await fetch("/api/ai/interview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as SessionResponse & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Interview request failed.");
    }

    return data;
  }

  function handleStart() {
    setError("");
    setAnswer("");

    startTransition(async () => {
      try {
        const data = await callInterviewApi({
          action: "start",
          role: selectedRole,
          mode: selectedMode,
        });

        setSession(data);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not start the interview right now.",
        );
      }
    });
  }

  function handleSubmitAnswer() {
    if (!session?.question) return;
    if (answer.trim().length < 20) {
      setError("Write a more complete answer so the AI can evaluate it properly.");
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        const data = await callInterviewApi({
          action: "answer",
          sessionId: session.sessionId,
          role: selectedRole,
          mode: selectedMode,
          questionId: session.question?.id,
          answer: answer.trim(),
          questions: session.questions ?? [],
        });

        setSession(data);
        setAnswer("");
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not submit the answer right now.",
        );
      }
    });
  }

  function handleRestart() {
    setSession(null);
    setAnswer("");
    setError("");
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className={`${panelClass} overflow-hidden`}>
          <CardContent className="p-0">
            <div className="bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.22),_transparent_46%),linear-gradient(135deg,#082f49_0%,#0f172a_45%,#164e63_100%)] px-6 py-8 text-slate-950 sm:px-8">
              <Badge className="rounded-full bg-white px-4 py-1 text-slate-950 hover:bg-slate-100">
                AI Mock Interview
              </Badge>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight">
                Simulate the interview before the real interview
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-cyan-50/90">
                Pick a role, choose the interview type, answer each question in your own words,
                and get a scored review with stronger sample answers and a final report.
              </p>
            </div>

            <div className="space-y-8 p-6 sm:p-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Target className="size-5 text-cyan-600" />
                  <h3 className="text-lg font-semibold text-slate-950">1. Select role</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ROLES.map((role) => (
                    <SelectCard
                      key={role}
                      label={role}
                      active={selectedRole === role}
                      onClick={() => setSelectedRole(role)}
                      description="Role-aware question selection and final feedback."
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MessageSquareText className="size-5 text-cyan-600" />
                  <h3 className="text-lg font-semibold text-slate-950">2. Select interview type</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {MODES.map((mode) => (
                    <SelectCard
                      key={mode}
                      label={mode}
                      active={selectedMode === mode}
                      onClick={() => setSelectedMode(mode)}
                      description="Questions adapt to tone, depth, and evaluation style."
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
                Session reports are saved to your interview history only when you are signed in.
              </div>

              {error ? (
                <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-800">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  size="lg"
                  onClick={handleStart}
                  disabled={isPending}
                  className="rounded-full bg-slate-100 px-6 text-slate-950 hover:bg-slate-800"
                >
                  {isPending ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
                  Start interview
                </Button>
                {session ? (
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={handleRestart}
                    disabled={isPending}
                    className="rounded-full"
                  >
                    Reset session
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className={panelClass}>
            <CardContent className="space-y-5 p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
                    Live Practice
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {session?.isComplete ? "Final report ready" : "Current interview round"}
                  </h3>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                  {selectedRole}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Progress</span>
                  <span>
                    {session?.currentQuestionIndex ?? 0}/{session?.totalQuestions ?? 3}
                  </span>
                </div>
                <Progress value={progressValue} className="h-2 bg-slate-100" />
              </div>

              {session?.question ? (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                    AI question
                  </p>
                  <p className="mt-3 text-lg font-semibold leading-8 text-slate-950">
                    {session.question.question}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Focus area: {session.question.focus}
                  </p>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <ShieldCheck className="mx-auto size-8 text-cyan-600" />
                  <p className="mt-4 text-base font-semibold text-slate-950">
                    Start a session to receive the first question
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    The module will generate interview questions, evaluate each answer, and produce
                    a final report with practice recommendations.
                  </p>
                </div>
              )}

              {!session?.isComplete && session?.question ? (
                <div className="space-y-4">
                  <Textarea
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder="Type your answer as if you are speaking to the interviewer. Mention examples, actions, and outcomes."
                    className="min-h-44 rounded-[22px] border-slate-200 bg-white text-base leading-7 shadow-none focus-visible:ring-cyan-100"
                  />
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleSubmitAnswer}
                    disabled={isPending}
                    className="rounded-full bg-cyan-600 px-6 text-slate-950 hover:bg-cyan-700"
                  >
                    {isPending ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
                    Submit answer
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {session?.evaluation ? (
            <Card className={panelClass}>
              <CardContent className="space-y-6 p-6 sm:p-7">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
                    Latest evaluation
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    Scores and better answer
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Communication", session.evaluation.communicationScore],
                    ["Technical", session.evaluation.technicalScore],
                    ["Confidence", session.evaluation.confidenceScore],
                    ["Overall", session.evaluation.overallScore],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <p className="text-sm text-slate-600">{label}</p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-5">
                    <div className="flex items-center gap-3">
                      <CircleAlert className="size-5 text-amber-600" />
                      <h4 className="text-base font-semibold text-slate-950">Weak areas</h4>
                    </div>
                    <div className="mt-4">
                      <BulletItems items={session.evaluation.weakAreas} />
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-5">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="size-5 text-emerald-600" />
                      <h4 className="text-base font-semibold text-slate-950">Improvement tips</h4>
                    </div>
                    <div className="mt-4">
                      <BulletItems items={session.evaluation.improvementTips} />
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-cyan-100 bg-cyan-50 px-5 py-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-800">
                    Better answer
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {session.evaluation.betterAnswer}
                  </p>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">
                    Feedback summary
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {session.evaluation.feedback}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {session?.report ? (
        <Card className={panelClass}>
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  Final report
                </p>
                <h3 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  Interview performance summary
                </h3>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950">
                Overall score {session.report.overallScore}/100
              </div>
            </div>

            {session.message ? (
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">
                {session.message}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Communication score", session.report.communicationScore],
                ["Technical score", session.report.technicalScore],
                ["Confidence score", session.report.confidenceScore],
                ["Overall score", session.report.overallScore],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-5"
                >
                  <p className="text-sm text-slate-600">{label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-5">
                <h4 className="text-base font-semibold text-slate-950">Weak areas</h4>
                <div className="mt-4">
                  <BulletItems items={session.report.weakAreas} />
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-5">
                <h4 className="text-base font-semibold text-slate-950">
                  Suggested practice questions
                </h4>
                <div className="mt-4">
                  <BulletItems items={session.report.suggestedPracticeQuestions} />
                </div>
              </div>

              <div className="rounded-[22px] border border-cyan-100 bg-cyan-50 px-5 py-5">
                <h4 className="text-base font-semibold text-slate-950">Overall feedback</h4>
                <p className="mt-4 text-sm leading-7 text-slate-700">
                  {session.report.overallFeedback}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {askedQuestions.length > 0 ? (
        <Card className={panelClass}>
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Session transcript
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Questions, answers, and review
              </h3>
            </div>

            <div className="space-y-5">
              {askedQuestions.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                    Question {index + 1}
                  </p>
                  <p className="mt-3 text-base font-semibold leading-7 text-slate-950">
                    {item.question}
                  </p>
                  {item.answer ? (
                    <>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Your answer
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">{item.answer}</p>
                    </>
                  ) : null}
                  {item.evaluation ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        `Communication ${item.evaluation.communicationScore}`,
                        `Technical ${item.evaluation.technicalScore}`,
                        `Confidence ${item.evaluation.confidenceScore}`,
                        `Overall ${item.evaluation.overallScore}`,
                      ].map((label) => (
                        <Badge
                          key={label}
                          variant="secondary"
                          className="rounded-full bg-white text-slate-700"
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
