export interface OpportunitySource {
  name: string;
  url: string;
  domain: string;
  category: "Internships" | "Hackathons" | "Competitions" | "Scholarships" | "Fellowships" | "Open Source";
  jsHeavy?: boolean;
}

export const TRUSTED_SOURCES: OpportunitySource[] = [
  // Internships
  {
    name: "Internshala",
    url: "https://internshala.com/internships/",
    domain: "internshala.com",
    category: "Internships",
  },
  {
    name: "AICTE Internship Portal",
    url: "https://internship.aicte-india.org/internships",
    domain: "internship.aicte-india.org",
    category: "Internships",
  },
  {
    name: "PM Internship Scheme",
    url: "https://pminternship.mca.gov.in",
    domain: "pminternship.mca.gov.in",
    category: "Internships",
  },

  // Hackathons
  {
    name: "Devfolio",
    url: "https://devfolio.co/hackathons",
    domain: "devfolio.co",
    category: "Hackathons",
  },
  {
    name: "Hack2skill",
    url: "https://hack2skill.com/hackathons-listing",
    domain: "hack2skill.com",
    category: "Hackathons",
    jsHeavy: true,
  },
  {
    name: "HackCulture",
    url: "https://www.hackculture.io",
    domain: "hackculture.io",
    category: "Hackathons",
  },
  {
    name: "MLH",
    url: "https://www.mlh.com/events",
    domain: "mlh.com",
    category: "Hackathons",
  },
  {
    name: "lablab.ai",
    url: "https://lablab.ai/ai-hackathons",
    domain: "lablab.ai",
    category: "Hackathons",
  },
  {
    name: "DoraHacks",
    url: "https://dorahacks.io/hackathon",
    domain: "dorahacks.io",
    category: "Hackathons",
    jsHeavy: true,
  },

  // Competitions
  {
    name: "Unstop",
    url: "https://unstop.com/competitions",
    domain: "unstop.com",
    category: "Competitions",
    jsHeavy: true,
  },
  {
    name: "Kaggle",
    url: "https://www.kaggle.com/competitions",
    domain: "kaggle.com",
    category: "Competitions",
    jsHeavy: true,
  },
  {
    name: "MyGov Innovate India",
    url: "https://innovateindia.mygov.in/",
    domain: "innovateindia.mygov.in",
    category: "Competitions",
  },

  // Scholarships
  {
    name: "Buddy4Study",
    url: "https://www.buddy4study.com/online-application-form",
    domain: "buddy4study.com",
    category: "Scholarships",
    jsHeavy: true,
  },
  {
    name: "National Scholarship Portal",
    url: "https://scholarships.gov.in/Students",
    domain: "scholarships.gov.in",
    category: "Scholarships",
  },
  {
    name: "DAAD India",
    url: "https://www.daad.in/en/find-funding/scholarship-database/",
    domain: "daad.in",
    category: "Scholarships",
  },

  // Fellowships
  {
    name: "IASc Summer Research Fellowship",
    url: "https://webjapps.ias.ac.in/fellowship2027/index.html",
    domain: "ias.ac.in",
    category: "Fellowships",
  },
  {
    name: "Teach For India",
    url: "https://teachforindia.org/how-to-be-a-fellow",
    domain: "teachforindia.org",
    category: "Fellowships",
  },

  // Open Source
  {
    name: "Google Summer of Code",
    url: "https://developers.google.com/open-source/gsoc/timeline",
    domain: "developers.google.com",
    category: "Open Source",
  },
  {
    name: "GirlScript Summer of Code",
    url: "https://gssoc.girlscript.org",
    domain: "gssoc.girlscript.org",
    category: "Open Source",
  },
  {
    name: "Outreachy",
    url: "https://www.outreachy.org/apply/project-selection/",
    domain: "outreachy.org",
    category: "Open Source",
  },
];

export const ALL_CATEGORIES = [
  "Internships",
  "Hackathons",
  "Competitions",
  "Scholarships",
  "Fellowships",
  "Open Source",
] as const;

export type OpportunityCategory = (typeof ALL_CATEGORIES)[number];

export function getSourcesForCategories(categories: string[]): OpportunitySource[] {
  if (categories.includes("All") || categories.length === 0) {
    return TRUSTED_SOURCES;
  }
  return TRUSTED_SOURCES.filter((s) => categories.includes(s.category));
}

export function getDomainsForCategories(categories: string[]): string[] {
  const sources = getSourcesForCategories(categories);
  return Array.from(new Set(sources.map((s) => s.domain)));
}

export function getSourceByDomain(domain: string): OpportunitySource | undefined {
  return TRUSTED_SOURCES.find((s) => domain.toLowerCase().includes(s.domain.toLowerCase()) || s.domain.toLowerCase().includes(domain.toLowerCase()));
}
