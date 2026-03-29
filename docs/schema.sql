-- Daily snapshot of GitHub state + assessment
CREATE TABLE snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date          DATE NOT NULL UNIQUE,
  github_data   JSONB NOT NULL,
  assessment    JSONB NOT NULL,
  overall_score INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Normalised job listings
CREATE TABLE jobs (
  id               TEXT PRIMARY KEY,  -- hash of title+company+date
  title            TEXT NOT NULL,
  company          TEXT,
  location         TEXT,
  remote           BOOLEAN,
  required_skills  TEXT[],
  nice_to_have     TEXT[],
  seniority        TEXT,
  salary_min       INTEGER,
  salary_max       INTEGER,
  currency         TEXT DEFAULT 'GBP',
  source           TEXT,  -- simplify | glassdoor | otta | zing
  url              TEXT,
  posted_date      DATE,
  scraped_at       TIMESTAMPTZ DEFAULT now()
);

-- Skill frequency tracking over time
CREATE TABLE skill_trends (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date       DATE NOT NULL,
  skill      TEXT NOT NULL,
  frequency  INTEGER,  -- how many job postings mentioned it today
  UNIQUE(date, skill)
);

-- Per-role match scores over time
CREATE TABLE role_scores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date       DATE NOT NULL,
  role       TEXT NOT NULL,
  score      INTEGER,
  UNIQUE(date, role)
);

-- User settings table (for per-user configuration)
CREATE TABLE user_settings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_username  TEXT NOT NULL,
  target_roles     TEXT[] NOT NULL DEFAULT '{ml_engineer,mlops,devops,backend}',
  target_locations TEXT[] NOT NULL DEFAULT '{UK,Remote}',
  target_seniority TEXT[] NOT NULL DEFAULT '{mid,senior}',
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Pipeline execution tracking for observability
CREATE TABLE pipeline_runs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                 DATE NOT NULL,
  run_at               TIMESTAMPTZ DEFAULT now(),
  github_duration_ms   INTEGER,
  scraping_duration_ms INTEGER,
  assessment_duration_ms INTEGER,
  embedding_duration_ms INTEGER,
  total_duration_ms    INTEGER,
  jobs_scraped         INTEGER,
  scraper_metrics      JSONB,   -- {jsearch: {duration_ms, jobs, error}, remotive: {...}}
  status               TEXT,    -- success | partial | failed
  error                TEXT
);

-- Create index for efficient pipeline history queries
CREATE INDEX idx_pipeline_runs_date ON pipeline_runs(date DESC);
CREATE INDEX idx_pipeline_runs_status ON pipeline_runs(status);
