export type OpportunityType =
  | "Internship"
  | "Hackathon"
  | "Competition"
  | "Scholarship"
  | "Fellowship"
  | "Open Source";

export type OpportunityMode =
  | "Online"
  | "In-person"
  | "Hybrid"
  | "Remote"
  | "Unknown";

export interface OpportunityItem {
  id: string;
  title: string;
  organization: string;
  type: OpportunityType;
  mode: OpportunityMode;
  location: string;
  deadline_text: string;
  deadline_iso: string | null;
  eligibility: string;
  stipend_or_prize: string | null;
  link: string;
  evidence: string;
  keyword_matches: string[];
  fit_score: number; // 1-10
  why_it_fits: string;
  source_name: string;
  source_domain: string;
  extracted_at: string;
}

export interface UnderstandResult {
  categories: string[];
  keywords: string[];
  skills: string[];
  level: string;
  location_preference: string;
  search_queries: string[];
}

export interface SearchResultItem {
  position: number;
  title: string;
  snippet: string;
  url: string;
  site_name: string;
  date?: string;
}

export interface TriagedUrl {
  url: string;
  reason: string;
}

export interface SourceStatusItem {
  name: string;
  url: string;
  domain: string;
  category: string;
  jsHeavy?: boolean;
  status: "ok" | "thin" | "failed" | "unused";
  charCount?: number;
  opportunitiesFound: number;
}

export interface PageFetchResult {
  url: string;
  title: string;
  text: string;
  status: "ok" | "thin" | "failed";
  charCount: number;
  sourceName?: string;
}

export interface RadarRequest {
  lookingFor: string;
  profile: string;
  category?: string; // "All" or a specific category
}

export type PipelineStep =
  | "understanding"
  | "searching"
  | "triaging"
  | "fetching"
  | "extracting"
  | "ranking"
  | "done"
  | "error";

export interface PipelineSSEEvent {
  type: "step" | "understand" | "reading_page" | "sources_update" | "results" | "error" | "done";
  step?: PipelineStep;
  message?: string;
  progress?: number; // 0 to 100
  data?: unknown;
}
