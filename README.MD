# CareerRadar

> Daily career intelligence dashboard — know exactly where you stand in today's job market.

CareerRadar pulls your GitHub profile, scrapes real job postings every morning, and uses Gemini Flash to score your profile against the market. Every day you get a match score, a skill gap report, and the top jobs you actually qualify for. Built by a job hunter, for job hunters.

![Dashboard Preview](docs/preview.png)

---

## The Problem

Job hunting is blind. You apply, hear nothing, and have no idea whether your profile matches what the market actually wants today — not six months ago, not in general, but *today*.

CareerRadar fixes that by running a daily analysis loop:

1. Reads your GitHub activity, languages, repos, and commit history via GraphQL
2. Scrapes fresh job postings from Simplify, Glassdoor, Otta, and Zing
3. Sends both to Gemini Flash 2.5 for intelligent matching
4. Shows you a score, your gaps, and your best-matching jobs on a dashboard

Check it every morning. Watch your score move as you build.

---

## Features

- **Daily profile scoring** — overall score plus per-role breakdown (ML Engineer, MLOps, DevOps, Backend)
- **Skill gap tracker** — ranked by how often each skill appears in today's market
- **Job matching** — top 10 jobs you match best, with reasons
- **Trend charts** — score history over time so you can see yourself improving
- **Skill heatmap** — what skills are trending in job postings this week
- **Configurable targets** — set your roles, locations, and seniority from the UI
- **Tiered scraping** — JSearch RapidAPI → Apify → direct scrapers, auto-fallback when quotas exhaust
- **Zero AI cost** — runs on Gemini Flash 2.5 free tier (1,500 req/day)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + SWR + Inline CSS (Bloomberg Terminal aesthetic) |
| Backend | FastAPI + APScheduler |
| Database | Supabase (PostgreSQL) |
| AI Assessment | Gemini Flash 2.5 (free tier) |
| Job Scraping | JSearch RapidAPI + Apify + Playwright |
| GitHub Ingestion | GitHub GraphQL API v4 |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A free [Supabase](https://supabase.com) account
- A free [Google AI Studio](https://aistudio.google.com) API key
- A GitHub Personal Access Token (read:user, public_repo)

### 1. Clone the repo

```bash
git clone https://github.com/CosmicAlgo/careerradar
cd careerradar
```

### 2. Set up the database

In your Supabase project, go to SQL Editor and run the schema from [`docs/schema.sql`](docs/schema.sql).

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in your keys — see `.env.example` for all required variables. The only keys you *need* to get started are:

```
GITHUB_TOKEN=ghp_...
GITHUB_USERNAME=your-username
GOOGLE_AI_API_KEY=AIza...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Everything else is optional and enables additional job sources.

### 4. Run locally

```bash
bash start.sh
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API docs: http://localhost:8000/docs

### 5. Trigger your first sync

Hit the **SYNC** button on the dashboard, or call the API directly:

```bash
curl -X POST http://localhost:8000/api/score/refresh
```

The pipeline runs automatically every day at 06:00 UTC after that.

---

## Deployment

### Backend → Railway

1. Push repo to GitHub
2. New project on [railway.app](https://railway.app) → Deploy from GitHub repo
3. Set root directory to `/backend`
4. Add all env vars from your `.env` in the Railway dashboard
5. Deploy

### Frontend → Vercel

1. Import repo on [vercel.com](https://vercel.com)
2. Set root directory to `/frontend`
3. Add `NEXT_PUBLIC_BACKEND_URL` pointing to your Railway backend URL
4. Deploy

Full self-hosting guide: [`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md)

---

## How I Built This

I built CareerRadar because I was applying for ML Engineer roles in the UK and had no systematic way to know whether my GitHub profile matched what companies were actually hiring for. I was applying blind.

The architecture went through a few iterations. The core insight was that the problem has two data sources — your profile and the market — and the intelligence layer just needs to compare them daily. GitHub's GraphQL API gives everything about your profile in one query. Job boards are messier, which is why the tiered scraping approach with automatic fallback was necessary.

I chose Gemini Flash 2.5 over the Anthropic or OpenAI APIs specifically because it's free at the scale needed here (~5,000 tokens/day), has JSON response mode, and is fast enough for a daily cron job. The assessment prompt is designed to return structured JSON matching the `AssessmentResult` schema directly, which keeps the pipeline deterministic.

The frontend uses a Bloomberg terminal aesthetic — dense, monospace, dark — because this is a data tool and should feel like one. SWR handles all data fetching so tab transitions are instant and the sync button triggers a cascade refetch automatically.

---

## Roadmap

- [ ] Email digest — daily score summary to your inbox
- [ ] CV/resume upload and matching
- [ ] Multi-user support with Supabase Auth
- [ ] Slack/Discord bot integration
- [ ] Interview tracker — log applications, track responses
- [ ] Salary benchmarking by role and location

---

## Contributing

PRs welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup instructions.

If CareerRadar helps your job search, consider starring the repo or [sponsoring on GitHub](https://github.com/sponsors/CosmicAlgo).

---

## Licence

MIT — use it, fork it, build on it.

---

*Built by [Rahul Surya](https://github.com/CosmicAlgo) — MSc HPC & Data Science, University of Edinburgh*