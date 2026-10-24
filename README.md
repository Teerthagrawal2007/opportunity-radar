# Opportunity Radar 📡🇮🇳

**Opportunity Radar** is a web application tailored for Indian college students that discovers **currently open and active** internships, hackathons, competitions, scholarships, fellowships, and open-source programs that directly match their profile, powered by **TinyFish Web Intelligence** and **Google Gemini Flash**.

---

## What the App Does

Most college students search for opportunities through static blog posts, outdated listing aggregators, or expired social media links. Opportunity Radar executes a live, end-to-end intelligence pipeline:

1. **Profile & Goal Understanding (Gemini Flash)**: Analyzes what the student is looking for (course, college year, skills, location preferences) and synthesizes high-intent search queries and keyword vectors.
2. **Multi-Source Web Search & Discovery (TinyFish Search)**: Executes concurrent geo-targeted queries across trusted Indian and global portals with an active date filter (last 60 days) and domain restrictions.
3. **AI Triaging**: Evaluates live search results, ruthlessly rejecting listicles ("top 10"), outdated archives, and tutorials to identify specific application pages.
4. **Resilient Content Extraction (TinyFish Fetch)**: Fetches page content across batches with automatic retries, in-memory caching (30-minute TTL), and concurrency control (max 4 parallel calls, 30 req/min compliance).
5. **Opportunity Extraction & Verification (Gemini Flash)**: Parses page text to extract verified deadlines, eligibility criteria, stipends/prizes, and quotes direct evidence from the page.
6. **Code-Level Validation & Ranking**: Eliminates expired opportunities, dedupes listings, and ranks them by personalized student fit score and nearest deadline.
7. **Real-time Streaming UI (SSE)**: Streams pipeline milestones, keyword chips, and source health status directly to the browser.

---

## ⚡ Setup in 4 Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Add Keys to `.env.local`
Create or edit `.env.local` in the project root:
```env
TINYFISH_API_KEY=your_tinyfish_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```
- **TINYFISH_API_KEY**: Get from [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys).
- **GEMINI_API_KEY**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey).
- **GEMINI_MODEL**: Defaults to `gemini-2.5-flash` (or `gemini-2.0-flash`).

### Step 3: Test All 20 Sources
Verify that your TinyFish API key is working and inspect the live status of all 20 trusted portals:
```bash
npm run test:sources
```
This script runs `scripts/test-sources.ts`, fetching each source with TinyFish Fetch and printing an informative terminal table with character counts and page snippets.

### Step 4: Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to start finding opportunities!

---

## 🌐 20 Trusted Sources Configured

All portals are defined in [`config/sources.ts`](./config/sources.ts):

| Category | Source Name | Portal URL | Notes |
|---|---|---|---|
| **Internships** | Internshala | https://internshala.com/internships/ | High volume |
| **Internships** | AICTE Internship Portal | https://internship.aicte-india.org/internships | Government portal |
| **Internships** | PM Internship Scheme | https://pminternship.mca.gov.in | Central Gov scheme |
| **Hackathons** | Devfolio | https://devfolio.co/hackathons | Premier Indian hackathons |
| **Hackathons** | Hack2skill | https://hack2skill.com/hackathons-listing | `jsHeavy` |
| **Hackathons** | HackCulture | https://www.hackculture.io | Active hackathons |
| **Hackathons** | MLH | https://www.mlh.com/events | Major League Hacking |
| **Hackathons** | lablab.ai | https://lablab.ai/ai-hackathons | Global AI challenges |
| **Hackathons** | DoraHacks | https://dorahacks.io/hackathon | `jsHeavy` Web3/AI hackathons |
| **Competitions** | Unstop | https://unstop.com/competitions | `jsHeavy` College competitions |
| **Competitions** | Kaggle | https://www.kaggle.com/competitions | `jsHeavy` Data Science & ML |
| **Competitions** | MyGov Innovate India | https://innovateindia.mygov.in/ | National challenges |
| **Scholarships** | Buddy4Study | https://www.buddy4study.com/online-application-form | `jsHeavy` Indian scholarships |
| **Scholarships** | National Scholarship Portal | https://scholarships.gov.in/Students | Indian Gov scholarships |
| **Scholarships** | DAAD India | https://www.daad.in/en/find-funding/scholarship-database/ | Higher education funding |
| **Fellowships** | IASc Summer Research Fellowship | https://webjapps.ias.ac.in/fellowship2027/index.html | Premier research fellowship |
| **Fellowships** | Teach For India | https://teachforindia.org/how-to-be-a-fellow | Leadership fellowship |
| **Open Source** | Google Summer of Code | https://developers.google.com/open-source/gsoc/timeline | GSoC open source program |
| **Open Source** | GirlScript Summer of Code | https://gssoc.girlscript.org | Indian student open-source |
| **Open Source** | Outreachy | https://www.outreachy.org/apply/project-selection/ | Remote diversity internships |

---

## 🛠️ How to Add or Remove Sources

To add a new portal or adjust an existing one, simply edit [`config/sources.ts`](./config/sources.ts):

```typescript
{
  name: "New Portal Name",
  url: "https://example.com/opportunities",
  domain: "example.com",
  category: "Internships", // "Internships" | "Hackathons" | "Competitions" | "Scholarships" | "Fellowships" | "Open Source"
  jsHeavy: false, // Set to true if portal requires heavy client-side JavaScript rendering
}
```

The app automatically includes your new source in:
1. Targeted TinyFish search domain lists (`include_domains`)
2. The direct listing fetch queue
3. The interactive Sources Panel in the UI
4. The test suite (`npm run test:sources`)

---

## 💡 Note on `jsHeavy` Sources & TinyFish Agent API

Certain modern platforms (such as Unstop, Devfolio, Kaggle, Buddy4Study, and DoraHacks) are Single Page Applications (SPAs) built with React, Vue, or Angular that fetch and render listings entirely in the browser using client-side JavaScript.

- When accessed via static HTTP fetch (`POST https://api.fetch.tinyfish.ai`), these sites may return **thin text (< 500 characters)** or empty placeholder skeletons.
- **Future Version Upgrade**: These `jsHeavy` sources are prime candidates for the **TinyFish Agent API** (`client.agent.run` or `client.agent.stream`) or the **TinyFish Browser API**, which run real headless Chrome sessions, wait for dynamic DOM elements to render, and execute goal-oriented extractions.

---

## 🛡️ Reliability & Guardrails

- **Rate Limiting**: Built-in concurrency queue (max 4 parallel calls) strictly adheres to the 30 requests/minute TinyFish limit.
- **Automatic Retries**: Intercepts `429` rate limit responses, waits 3 seconds, and retries once automatically.
- **Caching**: 30-minute in-memory cache on fetched pages eliminates duplicate API calls.
- **Strict Verification**: Zero hallucinated deadlines. If a deadline has passed, it is dropped completely; if unlisted, it is clearly flagged as *"Deadline not listed - check link"*.
- **Security**: All API keys remain strictly on the server (`app/api/radar/route.ts`). No secrets are exposed to the browser.
