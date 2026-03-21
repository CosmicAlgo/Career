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