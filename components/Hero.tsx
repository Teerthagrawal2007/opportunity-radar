"use client";

import React from "react";
import {
  Radar,
  Sparkles,
  Search,
  BookOpen,
  Briefcase,
  Code,
  Trophy,
  GraduationCap,
  Users,
  Compass,
} from "lucide-react";
import { ALL_CATEGORIES } from "@/config/sources";

interface HeroProps {
  lookingFor: string;
  setLookingFor: (val: string) => void;
  profile: string;
  setProfile: (val: string) => void;
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  All: <Compass className="w-3.5 h-3.5" />,
  Internships: <Briefcase className="w-3.5 h-3.5" />,
  Hackathons: <Code className="w-3.5 h-3.5" />,
  Competitions: <Trophy className="w-3.5 h-3.5" />,
  Scholarships: <GraduationCap className="w-3.5 h-3.5" />,
  Fellowships: <BookOpen className="w-3.5 h-3.5" />,
  "Open Source": <Users className="w-3.5 h-3.5" />,
};

interface ExamplePreset {
  label: string;
  lookingFor: string;
  profile: string;
  category: string;
}

const EXAMPLES: ExamplePreset[] = [
  {
    label: "Paid AI/ML internship, 3rd year B.Tech",
    lookingFor: "Paid AI/ML engineering internship, remote or Bengaluru, with stipend",
    profile:
      "3rd year B.Tech Computer Science student at VIT Vellore. Skilled in Python, PyTorch, Scikit-learn, LLMs, and OpenCV. Built projects in computer vision and RAG chatbots. Available for summer 2027.",
    category: "Internships",
  },
  {
    label: "Hackathons for beginners in web dev",
    lookingFor: "Beginner-friendly online or hybrid hackathons with cash prizes and mentor support",
    profile:
      "2nd year BCA student in Mumbai. Proficient in HTML, CSS, JavaScript, React, and Node.js. Passionate about web3 and AI integrations, eager to participate in team hackathons.",
    category: "Hackathons",
  },
  {
    label: "Scholarships for engineering students",
    lookingFor: "Merit-cum-means scholarships and STEM funding schemes for undergraduate engineering students in India",
    profile:
      "2nd year B.E. Electrical Engineering student at a Tier-2 government college. 8.8 CGPA, family income < 4 LPA. Seeking financial grants, fee waivers, or fellowship stipends.",
    category: "Scholarships",
  },
];

export const Hero: React.FC<HeroProps> = ({
  lookingFor,
  setLookingFor,
  profile,
  setProfile,
  selectedCategory,
  setSelectedCategory,
  onSearch,
  isLoading,
}) => {
  const applyPreset = (preset: ExamplePreset) => {
    setLookingFor(preset.lookingFor);
    setProfile(preset.profile);
    setSelectedCategory(preset.category);
  };

  const categories = ["All", ...ALL_CATEGORIES];

  return (
    <section className="relative pt-8 pb-10 px-4 sm:px-6 lg:px-8">
      {/* Background ambient gradient glow */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center overflow-hidden pointer-events-none">
        <div className="w-[600px] h-[300px] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl transform -translate-y-12" />
      </div>

      <div className="max-w-4xl mx-auto text-center">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 mb-5 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Real-time Web Intelligence with TinyFish & Gemini Flash</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Opportunity <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 dark:from-indigo-400 dark:via-indigo-300 dark:to-violet-400">Radar</span>
        </h1>

        {/* Tagline */}
        <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-medium">
          Live opportunities from 20 trusted sources, matched to you
        </p>
      </div>

      {/* Main Search Card */}
      <div className="max-w-3xl mx-auto mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-5 sm:p-7 transition">
        {/* Category Chips */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 scale-[1.02]"
                      : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80"
                  }`}
                >
                  {CATEGORY_ICONS[cat] || null}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-4">
          {/* Input 1: What are you looking for? */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              What are you looking for?
            </label>
            <div className="relative">
              <input
                type="text"
                value={lookingFor}
                onChange={(e) => setLookingFor(e.target.value)}
                placeholder="e.g. Paid ML internship, remote, or AI hackathons with cash prizes"
                className="w-full px-4 py-2.5 sm:py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Input 2: About you */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              About you (Course, Year, College/City, Skills, Interests)
            </label>
            <textarea
              rows={3}
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              placeholder="e.g. 3rd year B.Tech CSE student at Anna University Chennai. Skills: Python, React, TensorFlow, SQL. Interested in autonomous systems and NLP."
              className="w-full px-4 py-2.5 sm:py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition resize-none"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Example Presets */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Try an example:
            </span>
            {EXAMPLES.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(ex)}
                disabled={isLoading}
                className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-100 dark:border-indigo-800/60 transition disabled:opacity-50"
              >
                &ldquo;{ex.label}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Find Opportunities Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onSearch}
            disabled={isLoading || !lookingFor.trim() || !profile.trim()}
            className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 group cursor-pointer text-sm sm:text-base"
          >
            {isLoading ? (
              <>
                <Radar className="w-5 h-5 animate-spin" />
                <span>Scanning Opportunities with Radar...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Find opportunities</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
