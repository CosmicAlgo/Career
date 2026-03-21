# Changelog

All notable changes to CareerRadar are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-03-21

### Added

#### Core Features
- **Dashboard with real-time scoring** — Overall profile score plus per-role breakdowns (ML Engineer, MLOps, DevOps, Backend, Data Engineer, Platform Engineer)
- **Skill gap analysis** — Identifies missing skills ranked by market frequency
- **Job matching** — Top 10 best-matching jobs with match percentage and reasoning
- **Trend tracking** — 7/14/30/90 day score history charts
- **Skill heatmap** — Visual representation of trending skills in job postings
- **Weekly recommendations** — AI-generated action items based on current gaps

#### Data Pipeline
- **Daily automated pipeline** — Runs at 06:00 UTC via APScheduler
- **Tiered job scraping** — JSearch RapidAPI (Tier 1) → Apify (Tier 2) → Direct scrapers (Tier 3)
- **GitHub profile ingestion** — GraphQL API v4 for repos, languages, commits, PRs, streaks
- **AI assessment engine** — Gemini Flash 2.5 with structured JSON output
- **15 realistic mock jobs** — Fallback when no API keys available (DeepMind, Google, Amazon, Spotify, Netflix, Meta, Revolut, Monzo, OpenAI, Anthropic, Stability AI, JPMorgan, Goldman Sachs, Palantir, Databricks)

#### User Configuration
- **Settings page** — Configure target roles, locations, seniority, GitHub username
- **user_settings Supabase table** — Persistent configuration with env fallback
- **Multi-target support** — Multiple roles and locations per user

#### Frontend
- **Bloomberg Terminal aesthetic** — Dense, monospace, dark theme with CSS variables
- **SWR data fetching** — Caching, revalidation, optimistic updates
- **Skeleton loading states** — Score cards, job cards, charts, heatmaps, gap lists
- **Error states with retry** — User-friendly error handling
- **Responsive CSS Grid** — Mobile (1 col) → Tablet (2 col) → Desktop (3 col)
- **Toast notifications** — Sync status feedback
- **Tab navigation** — Dashboard, Trends, Jobs, Gaps, Settings

#### API & Backend
- **FastAPI REST API** — Full CRUD for snapshots, jobs, scores, gaps
- **GET/POST /api/settings** — User configuration endpoints
- **Pydantic v2 models** — Strict type validation throughout
- **Automatic revalidation** — SWR mutate triggers cascade refetch

#### DevOps & CI/CD
- **GitHub Actions CI** — Python syntax checks, import validation, Next.js build
- **Security workflows** — Gitleaks secrets scan, pip-audit, npm audit
- **PR automation** — Security summary comments on pull requests

#### Documentation
- **Comprehensive README** — Features, stack, quickstart, deployment
- **SELF_HOSTING.md** — Step-by-step self-hosting guide
- **CONTRIBUTING.md** — Development setup, branch naming, commit style
- **API documentation** — Auto-generated FastAPI docs at `/docs`

### Changed

- **Frontend styling** — Replaced Tailwind CSS with inline CSS variables for Bloomberg terminal aesthetic
- **Data fetching** — Migrated from useEffect + fetch to SWR hooks
- **Component architecture** — Added loading skeletons to all data components
- **Job scraping** — Integrated user settings (target_roles, target_locations) into JSearch queries
- **Assessment logic** — Skip assessment when no job listings exist, show warning message

### Fixed

- **Pydantic date field naming** — Fixed `date: date` clash by aliasing import
- **datetime.timedelta import** — Fixed AttributeError in database/queries.py
- **JSON serialization** — Added `mode='json'` for datetime ISO conversion
- **styled-jsx compilation** — Consolidated multiple CSS blocks into single block
- **Tab navigation data loading** — Added useEffect listeners for 'data-refetch' event
- **Sync button UX** — Added spinner, disable state, and toast notifications

### Technical Debt

- **No test coverage** — Backend lacks pytest test suite
- **No TypeScript strict mode** — Frontend uses relaxed type checking
- **Playwright browsers** — Manual installation required

---

## [0.9.0] - 2026-03-20

### Added
- Initial project scaffold
- Basic FastAPI backend structure
- Next.js 14 frontend with App Router
- Supabase database connection
- GitHub GraphQL client
- JSearch RapidAPI scraper
- Basic assessment pipeline

### Known Issues
- Tailwind custom colors not rendering
- useEffect causing stale data on tab navigation
- Empty jobs tab when no API key configured
- Assessment runs against 0 jobs

---

## Roadmap

### [1.1.0] - Planned
- [ ] Email digest with SendGrid/Resend
- [ ] CV/resume PDF upload and matching
- [ ] Multi-user support with Supabase Auth
- [ ] Slack/Discord bot integration
- [ ] Interview tracker

### [1.2.0] - Planned
- [ ] Salary benchmarking by role/location
- [ ] More job sources (Otta, Cord, Hired)
- [ ] Battle-test Glassdoor/Otta scrapers
- [ ] pytest test suite

### [2.0.0] - Future
- [ ] ML-based skill extraction from descriptions
- [ ] Company culture matching
- [ ] Interview question preparation based on gaps
- [ ] Mobile app (React Native)

---

## Version History Notes

- **1.0.0**: Production-ready MVP with full feature set
- **0.9.0**: Alpha release with core functionality

For detailed commit history, see [GitHub commits](https://github.com/CosmicAlgo/careerradar/commits/main).
