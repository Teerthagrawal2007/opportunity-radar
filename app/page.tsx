"use client";

import React, { useState, useMemo, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { LiveProgress, PageReadingPill } from "@/components/LiveProgress";
import { OpportunityCard } from "@/components/OpportunityCard";
import { FiltersBar } from "@/components/FiltersBar";
import { SourcesPanel } from "@/components/SourcesPanel";
import { ErrorBanner } from "@/components/ErrorBanner";
import { EmptyState } from "@/components/EmptyState";
import { TRUSTED_SOURCES } from "@/config/sources";
import {
  OpportunityItem,
  PipelineSSEEvent,
  PipelineStep,
  SourceStatusItem,
  UnderstandResult,
} from "@/lib/types";
import { useTheme } from "@/lib/useTheme";

export default function Home() {
  // Theme state managed safely via useSyncExternalStore
  const { isMounted, darkMode, toggleDarkMode } = useTheme();

  // Search input state
  const [lookingFor, setLookingFor] = useState<string>("");
  const [profile, setProfile] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Pipeline runtime state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<PipelineStep>("understanding");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [understanding, setUnderstanding] = useState<UnderstandResult | null>(null);
  const [readingPages, setReadingPages] = useState<PageReadingPill[]>([]);
  const [results, setResults] = useState<OpportunityItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Sources status list
  const [sources, setSources] = useState<SourceStatusItem[]>(() =>
    TRUSTED_SOURCES.map((s) => ({
      name: s.name,
      url: s.url,
      domain: s.domain,
      category: s.category,
      jsHeavy: s.jsHeavy,
      status: "unused",
      opportunitiesFound: 0,
    }))
  );
  const [sourcesPanelOpen, setSourcesPanelOpen] = useState<boolean>(false);

  // Filters state
  const [selectedType, setSelectedType] = useState<string>("All Types");
  const [closingSoonOnly, setClosingSoonOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"fit" | "deadline">("fit");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const resultsRef = useRef<HTMLDivElement | null>(null);

  // Perform Radar Search via SSE
  const handleSearch = async () => {
    if (!lookingFor.trim() || !profile.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    setErrorMessage(null);
    setResults([]);
    setUnderstanding(null);
    setReadingPages([]);
    setProgressPercent(5);
    setCurrentStep("understanding");
    setStatusMessage("Connecting to Opportunity Radar pipeline...");

    // Reset sources
    setSources(
      TRUSTED_SOURCES.map((s) => ({
        name: s.name,
        url: s.url,
        domain: s.domain,
        category: s.category,
        jsHeavy: s.jsHeavy,
        status: "unused",
        opportunitiesFound: 0,
      }))
    );

    try {
      const response = await fetch("/api/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lookingFor,
          profile,
          category: selectedCategory,
        }),
      });

      if (!response.ok) {
        let msg = "Failed to run Opportunity Radar search.";
        try {
          const errData = (await response.json()) as { error?: string };
          msg = errData.error || msg;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      if (!response.body) {
        throw new Error("No readable stream response received.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            const jsonStr = trimmed.replace(/^data:\s*/, "");
            try {
              const event: PipelineSSEEvent = JSON.parse(jsonStr);

              if (event.type === "step") {
                if (event.step) setCurrentStep(event.step);
                if (typeof event.progress === "number") setProgressPercent(event.progress);
                if (event.message) setStatusMessage(event.message);
              } else if (event.type === "understand") {
                setUnderstanding(event.data as UnderstandResult);
              } else if (event.type === "reading_page") {
                const pageData = event.data as PageReadingPill;
                setReadingPages((prev) => {
                  const filtered = prev.filter((p) => p.url !== pageData.url);
                  return [...filtered, pageData];
                });
              } else if (event.type === "sources_update") {
                if (Array.isArray(event.data)) {
                  setSources(event.data as SourceStatusItem[]);
                }
              } else if (event.type === "results") {
                if (Array.isArray(event.data)) {
                  setResults(event.data as OpportunityItem[]);
                }
              } else if (event.type === "error") {
                setErrorMessage(event.message || "An unexpected error occurred.");
                setIsLoading(false);
              } else if (event.type === "done") {
                setProgressPercent(100);
                setCurrentStep("done");
                setIsLoading(false);
              }
            } catch (parseErr) {
              console.warn("Failed to parse SSE line:", trimmed, parseErr);
            }
          }
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("Radar search failed:", errorMsg);
      let friendly = errorMsg || "Couldn't reach TinyFish";
      if (friendly.includes("401") || friendly.includes("key")) {
        friendly = "Your API key looks wrong. Please check your .env.local file.";
      } else if (friendly.includes("429")) {
        friendly = "Too many requests, wait a minute.";
      } else if (friendly.includes("402")) {
        friendly = "Daily free limit reached.";
      }
      setErrorMessage(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered and sorted results
  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      // Type filter
      if (selectedType !== "All Types" && item.type !== selectedType) {
        return false;
      }

      // Closing soon filter (<= 7 days)
      if (closingSoonOnly) {
        if (!item.deadline_iso) return false;
        const deadline = new Date(item.deadline_iso);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 7 || diffDays < 0) return false;
      }

      // Quick search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesOrg = item.organization.toLowerCase().includes(q);
        const matchesLocation = item.location.toLowerCase().includes(q);
        const matchesKeywords = item.keyword_matches.some((k) => k.toLowerCase().includes(q));
        if (!matchesTitle && !matchesOrg && !matchesLocation && !matchesKeywords) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "fit") {
        return b.fit_score - a.fit_score;
      }
      // sortBy === "deadline"
      if (a.deadline_iso && !b.deadline_iso) return -1;
      if (!a.deadline_iso && b.deadline_iso) return 1;
      if (a.deadline_iso && b.deadline_iso) {
        return a.deadline_iso.localeCompare(b.deadline_iso);
      }
      return 0;
    });
  }, [results, selectedType, closingSoonOnly, searchQuery, sortBy]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Navbar */}
      <Navbar
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onOpenSources={() => setSourcesPanelOpen((prev) => !prev)}
        totalSourcesCount={TRUSTED_SOURCES.length}
        isMounted={isMounted}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Section */}
        <Hero
          lookingFor={lookingFor}
          setLookingFor={setLookingFor}
          profile={profile}
          setProfile={setProfile}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          onSearch={handleSearch}
          isLoading={isLoading}
        />

        {/* Error Banner */}
        {errorMessage && (
          <ErrorBanner
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
            onRetry={handleSearch}
          />
        )}

        {/* Live Progress Tracker */}
        {(isLoading || (hasSearched && currentStep !== "understanding")) && (
          <LiveProgress
            currentStep={currentStep}
            progressPercent={progressPercent}
            statusMessage={statusMessage}
            understanding={understanding}
            readingPages={readingPages}
            isComplete={!isLoading && currentStep === "done"}
          />
        )}

        {/* Results Section */}
        <div ref={resultsRef} className="mt-8">
          {results.length > 0 && (
            <>
              {/* Filters Bar */}
              <FiltersBar
                selectedType={selectedType}
                onSelectType={setSelectedType}
                closingSoonOnly={closingSoonOnly}
                onToggleClosingSoon={() => setClosingSoonOnly((prev) => !prev)}
                sortBy={sortBy}
                onSelectSortBy={setSortBy}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                totalCount={results.length}
                filteredCount={filteredResults.length}
              />

              {/* Cards Grid */}
              {filteredResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                  {filteredResults.map((item) => (
                    <OpportunityCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  hasFiltersActive={
                    selectedType !== "All Types" || closingSoonOnly || searchQuery.trim().length > 0
                  }
                  onResetFilters={() => {
                    setSelectedType("All Types");
                    setClosingSoonOnly(false);
                    setSearchQuery("");
                  }}
                />
              )}
            </>
          )}

          {/* Empty state if search completed with 0 results */}
          {!isLoading && hasSearched && results.length === 0 && !errorMessage && (
            <EmptyState />
          )}
        </div>

        {/* Sources Panel */}
        <div className="mt-12">
          <SourcesPanel
            sources={sources}
            isOpen={sourcesPanelOpen}
            onToggle={() => setSourcesPanelOpen((prev) => !prev)}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-8 px-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-200">Opportunity Radar</span>
            <span>&bull;</span>
            <span>Live portal scanner for college students</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Powered by</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">TinyFish</span>
            <span>&amp;</span>
            <span className="font-semibold text-violet-600 dark:text-violet-400">Gemini Flash</span>
          </div>

          <div className="text-slate-400 dark:text-slate-500">
            Strictly real-time data &bull; Zero expired fallback
          </div>
        </div>
      </footer>
    </div>
  );
}
