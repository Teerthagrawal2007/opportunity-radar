"use client";

import React from "react";
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  Globe,
  Tag,
} from "lucide-react";
import { PipelineStep, UnderstandResult } from "@/lib/types";

export interface PageReadingPill {
  url: string;
  sourceName: string;
  status: "ok" | "thin" | "failed";
  chars: number;
}

interface LiveProgressProps {
  currentStep: PipelineStep;
  progressPercent: number;
  statusMessage: string;
  understanding: UnderstandResult | null;
  readingPages: PageReadingPill[];
  isComplete: boolean;
}

const STEPS: Array<{ id: PipelineStep; label: string }> = [
  { id: "understanding", label: "Understanding you" },
  { id: "searching", label: "Searching trusted sites" },
  { id: "fetching", label: "Reading pages" },
  { id: "extracting", label: "Matching" },
  { id: "done", label: "Done" },
];

export const LiveProgress: React.FC<LiveProgressProps> = ({
  currentStep,
  progressPercent,
  statusMessage,
  understanding,
  readingPages,
  isComplete,
}) => {
  const getStepStatus = (stepId: PipelineStep) => {
    const stepOrder: PipelineStep[] = [
      "understanding",
      "searching",
      "triaging",
      "fetching",
      "extracting",
      "ranking",
      "done",
    ];

    const currentIdx = stepOrder.indexOf(currentStep);
    let targetIdx = stepOrder.indexOf(stepId);

    // Map triaging to searching, ranking to extracting
    if (stepId === "searching") targetIdx = 1;
    if (stepId === "fetching") targetIdx = 3;
    if (stepId === "extracting") targetIdx = 4;
    if (stepId === "done") targetIdx = 6;

    if (isComplete || currentIdx > targetIdx) {
      return "completed";
    }
    if (
      currentStep === stepId ||
      (stepId === "searching" && currentStep === "triaging") ||
      (stepId === "extracting" && currentStep === "ranking")
    ) {
      return "active";
    }
    return "pending";
  };

  return (
    <div className="max-w-3xl mx-auto my-6 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 shadow-lg shadow-indigo-500/5 transition">
      {/* Step Tracker Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-ping" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Live Radar Pipeline
          </h3>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
          {progressPercent}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-6 overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 to-violet-600 h-1.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps Row */}
      <div className="grid grid-cols-5 gap-1 sm:gap-2 mb-6">
        {STEPS.map((step, idx) => {
          const status = getStepStatus(step.id);
          return (
            <div key={step.id} className="flex flex-col items-center text-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all mb-1.5 ${
                  status === "completed"
                    ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                    : status === "active"
                    ? "bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/50 shadow-md shadow-indigo-600/30"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : status === "active" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span
                className={`text-[11px] sm:text-xs font-medium leading-tight line-clamp-2 ${
                  status === "active"
                    ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                    : status === "completed"
                    ? "text-slate-700 dark:text-slate-300"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active Message */}
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 mb-4">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        <span className="truncate">{statusMessage || "Scanning portals..."}</span>
      </div>

      {/* Extracted Keyword Chips (The user should SEE what the AI understood) */}
      {understanding && understanding.keywords && understanding.keywords.length > 0 && (
        <div className="mb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-2">
            <Tag className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              AI Understood Keywords:
            </span>
            <span className="text-[10px] text-slate-400">
              ({understanding.level} &bull; {understanding.location_preference})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {understanding.keywords.map((kw, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reading Page Pills */}
      {readingPages.length > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              Live Pages Inspected ({readingPages.length}):
            </span>
            <span className="text-[11px] text-slate-400">
              {readingPages.filter((p) => p.status === "ok").length} OK &bull;{" "}
              {readingPages.filter((p) => p.status === "thin").length} Thin &bull;{" "}
              {readingPages.filter((p) => p.status === "failed").length} Failed
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {readingPages.map((page, idx) => (
              <div
                key={idx}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition ${
                  page.status === "ok"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                    : page.status === "thin"
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                    : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60"
                }`}
                title={`${page.url} (${page.chars} chars)`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    page.status === "ok"
                      ? "bg-emerald-500"
                      : page.status === "thin"
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                />
                <span className="max-w-[140px] truncate">{page.sourceName}</span>
                <span className="text-[10px] opacity-75">({page.chars}c)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
