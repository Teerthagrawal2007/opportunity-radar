"use client";

import React from "react";
import { SearchX, RefreshCcw } from "lucide-react";

interface EmptyStateProps {
  onResetFilters?: () => void;
  hasFiltersActive?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onResetFilters,
  hasFiltersActive,
}) => {
  return (
    <div className="max-w-xl mx-auto my-12 text-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 shadow-xs">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
        <SearchX className="w-7 h-7" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
        No currently open opportunities match your search
      </h3>

      <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
        We checked trusted portals in real time, strictly filtering out expired cycles, listicles, and past dates.
        {hasFiltersActive
          ? " You have active type or closing-soon filters applied that might be hiding results."
          : " Try broadening your skills or choosing 'All' categories to discover related opportunities."}
      </p>

      {hasFiltersActive && onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-sm"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          <span>Reset Filters</span>
        </button>
      )}
    </div>
  );
};
