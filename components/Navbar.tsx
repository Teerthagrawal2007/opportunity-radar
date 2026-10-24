"use client";

import React from "react";
import { Radar, Moon, Sun, Database } from "lucide-react";

interface NavbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSources: () => void;
  totalSourcesCount: number;
  isMounted?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  onToggleDarkMode,
  onOpenSources,
  totalSourcesCount,
  isMounted = false,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 overflow-hidden">
            <div className="absolute inset-0 border border-white/20 rounded-xl animate-pulse-ring" />
            <Radar className="w-5 h-5 animate-spin" style={{ animationDuration: "12s" }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                Opportunity<span className="text-indigo-600 dark:text-indigo-400">Radar</span>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                🇮🇳 India Edition
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Live Opportunities for College Students
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Sources button */}
          <button
            onClick={onOpenSources}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            title="View status of all trusted portals"
          >
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            <span>{totalSourcesCount} Sources</span>
          </button>

          {/* Dark Mode toggle with isMounted check to prevent hydration mismatch */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:border-slate-700 transition"
            aria-label="Toggle theme"
          >
            {!isMounted ? (
              <span className="w-4 h-4 block" />
            ) : darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
