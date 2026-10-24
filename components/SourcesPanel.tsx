"use client";

import React, { useState } from "react";
import {
  Database,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
} from "lucide-react";
import { SourceStatusItem } from "@/lib/types";

interface SourcesPanelProps {
  sources: SourceStatusItem[];
  isOpen: boolean;
  onToggle: () => void;
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({
  sources,
  isOpen,
  onToggle,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>("All");

  const categories = [
    "All",
    "Internships",
    "Hackathons",
    "Competitions",
    "Scholarships",
    "Fellowships",
    "Open Source",
  ];

  const filteredSources =
    filterCategory === "All"
      ? sources
      : sources.filter((s) => s.category === filterCategory);

  const okCount = sources.filter((s) => s.status === "ok").length;
  const thinCount = sources.filter((s) => s.status === "thin").length;
  const failedCount = sources.filter((s) => s.status === "failed").length;
  const unusedCount = sources.filter((s) => s.status === "unused").length;

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden mb-8 transition">
      {/* Header bar / Toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Trusted Indian & Global Sources Panel
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                {sources.length} Portals
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {okCount} OK (&ge;500 chars)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {thinCount} Thin (&lt;500 chars)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {failedCount} Failed
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                {unusedCount} Idle
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          <span>{isOpen ? "Collapse" : "Inspect Sources"}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Note about jsHeavy */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 mb-4">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold">Note on Client-Side Rendering:</span> Sources labeled{" "}
              <span className="font-mono px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-[10px]">
                jsHeavy
              </span>{" "}
              (e.g., Unstop, Devfolio, Kaggle) render their opportunity listings via client-side JavaScript.
              In TinyFish Fetch, these may return thin text (&lt;500 characters) when fetched as static HTML. In future versions,
              they can be processed seamlessly via TinyFish Agent API or Browser API with headless browser execution.
            </div>
          </div>

          {/* Category Filter for Sources */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  filterCategory === cat
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sources Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSources.map((source) => {
              // Status dot configuration
              let statusDot = (
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" title="Not used in this search" />
              );
              let statusText = "Not used";
              let statusColor = "text-slate-400";

              if (source.status === "ok") {
                statusDot = (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" title="OK (>= 500 characters fetched)" />
                );
                statusText = `OK (${source.charCount || 0} chars)`;
                statusColor = "text-emerald-600 dark:text-emerald-400";
              } else if (source.status === "thin") {
                statusDot = (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs shadow-amber-500/50" title="Thin content (< 500 chars)" />
                );
                statusText = `Thin (${source.charCount || 0} chars)`;
                statusColor = "text-amber-600 dark:text-amber-400";
              } else if (source.status === "failed") {
                statusDot = (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" title="Fetch failed or blocked" />
                );
                statusText = "Failed";
                statusColor = "text-red-600 dark:text-red-400";
              }

              return (
                <div
                  key={source.domain}
                  className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        {statusDot}
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {source.name}
                        </h4>
                      </div>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        title={`Open ${source.name}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="truncate">{source.domain}</span>
                      <span>&bull;</span>
                      <span className="text-slate-600 dark:text-slate-300 font-medium">{source.category}</span>
                    </div>

                    {source.jsHeavy && (
                      <span className="inline-block mt-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                        jsHeavy
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                    <span className={`font-semibold ${statusColor}`}>{statusText}</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {source.opportunitiesFound} found
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
