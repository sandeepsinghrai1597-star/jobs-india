"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { learningRoadmapCareers } from "@/lib/data/learning-roadmaps";
import type { RoadmapGeneratorResult } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const suggestionButtons = [...learningRoadmapCareers];

export function LearningRoadmapGenerator({
  initialCareer,
}: {
  initialCareer?: string;
}) {
  const [career, setCareer] = useState(initialCareer ?? "AI Agent Developer");
  const [result, setResult] = useState<RoadmapGeneratorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate(submittedCareer: string) {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/roadmap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetCareer: submittedCareer,
        }),
      });

      if (!response.ok) {
        throw new Error("Roadmap generation failed.");
      }

      const data = (await response.json()) as RoadmapGeneratorResult;
      setResult(data);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to generate roadmap right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-semibold text-slate-950">
              AI roadmap generator
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Enter a target career and get skills required, a weekly plan, project
              ideas, resume keywords, and interview topics.
            </p>
          </div>
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void handleGenerate(career);
            }}
          >
            <Input
              value={career}
              onChange={(event) => setCareer(event.target.value)}
              placeholder="Enter target career"
              className="h-11 rounded-xl border-slate-300 px-4 text-sm"
            />
            <Button type="submit" className="h-11 rounded-xl px-5" disabled={isLoading || !career.trim()}>
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Generate roadmap
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {suggestionButtons.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setCareer(item);
                  void handleGenerate(item);
                }}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
              >
                {item}
              </button>
            ))}
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>

      {result ? (
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
                  Generated roadmap
                </p>
                <h3 className="font-heading text-3xl font-semibold text-slate-950">
                  {result.targetCareer}
                </h3>
                {result.note ? (
                  <p className="text-sm leading-6 text-slate-500">{result.note}</p>
                ) : null}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Skills required
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.skillsRequired.map((skill) => (
                    <Badge key={skill} variant="outline" className="rounded-full border-slate-300 px-3 py-1 text-slate-700">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {result.weeklyPlan.map((week) => (
                  <div key={week.week} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      {week.week}
                    </p>
                    <h4 className="mt-2 font-heading text-xl font-semibold text-slate-950">
                      {week.focus}
                    </h4>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                      {week.tasks.map((task) => (
                        <li key={task}>- {task}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <CardContent className="space-y-4 p-6">
                <h4 className="font-heading text-xl font-semibold text-slate-950">
                  Projects
                </h4>
                <ul className="space-y-2 text-sm leading-6 text-slate-600">
                  {result.projects.map((project, index) => (
                    <li key={`${project}-${index}`}>- {project}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <CardContent className="space-y-4 p-6">
                <h4 className="font-heading text-xl font-semibold text-slate-950">
                  Resume keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.resumeKeywords.map((keyword, index) => (
                    <Badge key={`${keyword}-${index}`} className="rounded-full bg-slate-100 px-3 py-1 text-slate-950">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <CardContent className="space-y-4 p-6">
                <h4 className="font-heading text-xl font-semibold text-slate-950">
                  Interview topics
                </h4>
                <ul className="space-y-2 text-sm leading-6 text-slate-600">
                  {result.interviewTopics.map((topic, index) => (
                    <li key={`${topic}-${index}`}>- {topic}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
