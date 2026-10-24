"use client";

import React from "react";
import { Clock, Filter, Search } from "lucide-react";

interface FiltersBarProps {
  selectedType: string;
  onSelectType: (type: string) => void;
  closingSoonOnly: boolean;
  onToggleClosingSoon: () => void;
  sortBy: "fit" | "deadline";
  onSelectSortBy: (sort: "fit" | "deadline") => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  totalCount: number;
  filteredCount: number;
}

const TYPE_OPTIONS: string[] = [
  "All Types",
  "Internship",
  "Hackathon",
  "Competition",
  "Scholarship",
  "Fellowship",
  "Open Source",
];

export const FiltersBar: React.FC<FiltersBarProps> = ({
  selectedType,
  onSelectType,
  closingSoonOnly,
  onToggleClosingSoon,
  sortBy,
  onSelectSortBy,
  searchQuery,
  onSearchQueryChange,
  totalCount,
  filteredCount,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-sm mb-6 transition">
      {/* Top row: search & count & closing soon toggle & sort */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-3.5">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Quick filter by title, company, or keyword..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Closing Soon Toggle */}
          <button
            type="button"
            onClick={onToggleClosingSoon}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              closingSoonOnly
                ? "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-300 border-red-300 dark:border-red-800 shadow-xs"
                : "bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${closingSoonOnly ? "text-red-500 animate-pulse" : "text-slate-400"}`} />
            <span>Closing soon (&le; 7 days)</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => onSelectSortBy("fit")}
              className={`px-3 py-1 rounded-lg transition ${
                sortBy === "fit"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Best Match
            </button>
            <button
              type="button"
              onClick={() => onSelectSortBy("deadline")}
              className={`px-3 py-1 rounded-lg transition ${
                sortBy === "deadline"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Nearest Deadline
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row: Type chips & results counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Type:
          </span>
          {TYPE_OPTIONS.map((type) => {
            const isSelected = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onSelectType(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/60"
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>

        {/* Counter */}
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-auto">
          Showing <span className="font-bold text-slate-900 dark:text-white">{filteredCount}</span> of {totalCount}
        </span>
      </div>
    </div>
  );
};
