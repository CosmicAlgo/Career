# Contributing to CareerRadar

Thanks for your interest in contributing. CareerRadar is a small open source project built by a student — contributions of any size are genuinely appreciated.

---

## What We Need Help With

Roughly in priority order:

- **Scraper reliability** — Glassdoor, Otta, and Zing scrapers need battle-testing and selector updates as job boards change their HTML
- **More job sources** — additional UK-relevant job boards (Otta, Cord, Hired, etc.)
- **Email digest** — daily score summary via SendGrid or Resend
- **CV/resume matching** — upload a PDF CV and score it against job requirements
- **Tests** — backend has no test coverage yet, pytest + httpx for FastAPI routes
- **Docs** — SELF_HOSTING.md needs writing, API docs need expanding
- **Bug fixes** — check open issues

---

## Getting Started

### 1. Fork and clone

```bash
git clone https://github.com/CosmicAlgo/careerradar
cd careerradar
```

### 2. Set up environment

```bash
cp .env.example .env
# Fill in your keys — at minimum GITHUB_TOKEN, GOOGLE_AI_API_KEY, and Supabase keys
```

### 3. Run the database schema

In your Supabase project SQL editor, run `docs/schema.sql`.

### 4. Start locally

```bash
bash start.sh
```

Backend: http://localhost:8000/docs
Frontend: http://localhost:3000

---

## Making Changes

### Branch naming

```
feat/your-feature-name
fix/what-you-are-fixing
docs/what-you-are-documenting
```

### Commit style

Use conventional commits:

```
feat: add email digest for daily score summary
fix: resolve datetime serialization in snapshot writer
docs: add self-hosting guide
refactor: migrate data fetching to SWR
```

### Before opening a PR

- Make sure `bash start.sh` runs without errors
- Make sure the frontend builds: `cd frontend && npm run build`
- Make sure no secrets are in your commits — Gitleaks will block the PR if so
- Add a short description of what you changed and why

---

## Project Structure

```
careerradar/
├── backend/
│   ├── ingestion/      # GitHub GraphQL client
│   ├── scrapers/       # Job board scrapers (tiered)
│   ├── assessment/     # Gemini / Claude AI clients
│   ├── pipeline/       # Daily orchestration runner
│   ├── database/       # Supabase queries
│   └── api/            # FastAPI routes
├── frontend/
│   ├── app/            # Next.js App Router pages
│   ├── components/     # Reusable UI components
│   └── lib/            # API client and types
└── docs/               # Schema, guides, architecture
```

---

## Code Style

- **Python:** follow PEP 8, use type hints, use Pydantic v2 models for all data structures
- **TypeScript:** strict mode off but avoid `any` where possible, use the types in `lib/types.ts`
- **No new dependencies** without discussion — keep the stack lean

---

## Questions

Open a GitHub Discussion or email rahulsurya021@outlook.com.
