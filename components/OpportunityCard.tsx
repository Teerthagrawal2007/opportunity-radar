"use client";

import React, { useState } from "react";
import {
  ExternalLink,
  Calendar,
  MapPin,
  Building2,
  Award,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { OpportunityItem, OpportunityType } from "@/lib/types";

interface OpportunityCardProps {
  item: OpportunityItem;
}

const TYPE_STYLES: Record<
  OpportunityType,
  { bg: string; text: string; border: string }
> = {
  Internship: {
    bg: "bg-indigo-50 dark:bg-indigo-950/70",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  Hackathon: {
    bg: "bg-violet-50 dark:bg-violet-950/70",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-800",
  },
  Competition: {
    bg: "bg-amber-50 dark:bg-amber-950/70",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  Scholarship: {
    bg: "bg-emerald-50 dark:bg-emerald-950/70",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  Fellowship: {
    bg: "bg-sky-50 dark:bg-sky-950/70",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-800",
  },
  "Open Source": {
    bg: "bg-rose-50 dark:bg-rose-950/70",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
  },
};

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ item }) => {
  const [showEvidence, setShowEvidence] = useState(false);

  const typeStyle = TYPE_STYLES[item.type] || TYPE_STYLES.Internship;

  // Deadline calculation
  let isClosingSoon = false;
  let daysRemaining: number | null = null;
  if (item.deadline_iso) {
    const deadlineDate = new Date(item.deadline_iso);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 7) {
      isClosingSoon = true;
    }
  }

  // Fit score styling (green 8-10, amber 5-7, grey <5)
  const fitScoreColor =
    item.fit_score >= 8
      ? "text-emerald-600 dark:text-emerald-400 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60"
      : item.fit_score >= 5
      ? "text-amber-600 dark:text-amber-400 border-amber-500 bg-amber-50 dark:bg-amber-950/60"
      : "text-slate-500 dark:text-slate-400 border-slate-400 bg-slate-50 dark:bg-slate-800";

  return (
    <div className="group relative flex flex-col justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-800/80 transition-all duration-300">
      <div>
        {/* Top Badges Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Type badge */}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
            >
              {item.type}
            </span>

            {/* Mode badge */}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {item.mode}
            </span>

            {/* Stipend or Prize badge */}
            {item.stipend_or_prize && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Award className="w-3 h-3 text-emerald-500" />
                <span>{item.stipend_or_prize}</span>
              </span>
            )}
          </div>

          {/* Fit Score Circle */}
          <div
            className={`shrink-0 flex flex-col items-center justify-center w-11 h-11 rounded-full border-2 font-bold text-xs shadow-xs transition-transform group-hover:scale-105 ${fitScoreColor}`}
            title={`Fit Score: ${item.fit_score}/10 based on skills, course level, and preferences`}
          >
            <span className="text-sm font-extrabold">{item.fit_score}</span>
            <span className="text-[9px] -mt-1 font-medium opacity-80">/10</span>
          </div>
        </div>

        {/* Title and Organization */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
          {item.title}
        </h3>

        <div className="flex items-center gap-2 mt-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{item.organization}</span>
          <span className="text-slate-300 dark:text-slate-700">&bull;</span>
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{item.location}</span>
        </div>

        {/* Deadline Information */}
        <div className="mt-3 flex items-center gap-2">
          {item.deadline_iso ? (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                isClosingSoon
                  ? "bg-red-50 dark:bg-red-950/70 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 animate-pulse"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {isClosingSoon && daysRemaining !== null
                  ? daysRemaining <= 0
                    ? "Closes Today!"
                    : `Closes in ${daysRemaining} day${daysRemaining > 1 ? "s" : ""} (${item.deadline_text})`
                  : `Deadline: ${item.deadline_text}`}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Deadline not listed - check link</span>
            </span>
          )}
        </div>

        {/* Eligibility */}
        {item.eligibility && (
          <div className="mt-3 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <GraduationCap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-relaxed">{item.eligibility}</span>
          </div>
        )}

        {/* Why it fits (in italics) */}
        {item.why_it_fits && (
          <p className="mt-3 text-xs italic text-indigo-900 dark:text-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-100/70 dark:border-indigo-900/40 leading-relaxed">
            &ldquo;{item.why_it_fits}&rdquo;
          </p>
        )}

        {/* Matched Keywords */}
        {item.keyword_matches && item.keyword_matches.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.keyword_matches.map((kw, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                #{kw}
              </span>
            ))}
          </div>
        )}

        {/* Evidence Toggle */}
        {item.evidence && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowEvidence(!showEvidence)}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition"
            >
              <span>{showEvidence ? "Hide page evidence" : "Show verification quote"}</span>
              {showEvidence ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showEvidence && (
              <div className="mt-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 italic font-mono">
                &ldquo;{item.evidence}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer / Apply Action */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
          via <span className="font-semibold text-slate-600 dark:text-slate-300">{item.source_name}</span>
        </span>

        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 shadow-sm shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all shrink-0"
        >
          <span>Apply / View</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
