/**
 * CareerRadar Frontend Types
 * Shared TypeScript interfaces for API and components
 */

export interface RepoInfo {
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  topics: string[];
  language: string | null;
  last_commit: string | null;
  is_private: boolean;
}

export interface ContributionStats {
  total_commits_last_90d: number;
  contribution_streak: number;
  total_prs: number;
  total_issues: number;
  total_reviews: number;
}

export interface GitHubSummary {
  username: string;
  total_repos: number;
  public_repos: number;
  followers: number;
  following: number;
  bio: string | null;
  company: string | null;
  location: string | null;
  languages: Record<string, number>;
  top_repos: RepoInfo[];
  contribution_stats: ContributionStats;
  readme_excerpt: string | null;
  certifications_detected: string[];
  last_updated: string;
}

export interface JobMatch {
  job_id: string;
  match_pct: number;
  reasons: string[];
}

export interface SkillGap {
  skill: string;
  frequency_in_market: number;
  priority: 'high' | 'medium' | 'low';
}

export interface AssessmentResult {
  overall_score: number;
  role_scores: Record<string, number>;
  top_matching_jobs: JobMatch[];
  skill_gaps: SkillGap[];
  strengths: string[];
  weekly_recommendation: string;
  trending_skills_today: string[];
}

export interface NormalisedJob {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  remote: boolean;
  required_skills: string[];
  nice_to_have: string[];
  seniority: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  source: string | null;
  url: string | null;
  posted_date: string | null;
}

export interface ScoreResponse {
  overall_score: number;
  role_scores: Record<string, number>;
  date: string;
}

export interface TrendData {
  date: string;
  overall_score: number;
  role_scores: Record<string, number>;
}

export interface TrendsResponse {
  trends: TrendData[];
}

export interface JobsResponse {
  jobs: NormalisedJob[];
  total: number;
  date: string;
}

export interface SnapshotResponse {
  id: string;
  date: string;
  github_data: GitHubSummary;
  assessment: AssessmentResult;
  overall_score: number;
  created_at: string;
}

export interface SkillTrendData {
  skill: string;
  frequency: number;
  date: string;
}

export interface SkillTrendsResponse {
  trends: SkillTrendData[];
  top_trending: string[];
}

export interface GapResponse {
  gaps: SkillGap[];
  date: string;
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  snapshot_id: string | null;
}

export interface PipelineStatus {
  today_ran: boolean;
  latest_snapshot_date: string | null;
  total_snapshots: number;
  jobs_today: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}

export interface SettingsResponse {
  github_username: string;
  target_roles: string[];
  target_locations: string[];
  target_seniority: string[];
  updated_at?: string;
}

// Application Tracker Types
export interface JobApplication {
  id?: string;
  user_id?: string;
  job_title: string;
  company: string;
  source_url?: string;
  source: string;
  status: 'interested' | 'applied' | 'phone_screen' | 'technical' | 'final' | 'offer' | 'rejected';
  date_applied?: string;
  notes?: string;
  salary_range?: string;
  location?: string;
  follow_up_date?: string;
  response_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateApplicationRequest {
  job_title: string;
  company: string;
  source_url?: string;
  source?: string;
  status?: string;
  notes?: string;
  salary_range?: string;
  location?: string;
}

export interface UpdateApplicationRequest {
  status?: string;
  notes?: string;
  response_date?: string;
}

export interface ApplicationResponse {
  application: JobApplication;
  success: boolean;
  message: string;
}

export interface ApplicationsResponse {
  applications: JobApplication[];
  total: number;
  success: boolean;
}

export interface ApplicationStats {
  total_applications: number;
  by_status: Record<string, number>;
  by_source: Record<string, number>;
  response_rate: number;
  interview_rate: number;
  offer_rate: number;
  avg_response_days: number;
}

export interface ApplicationStatsResponse {
  stats: ApplicationStats;
  success: boolean;
  days_analyzed: number;
}

export interface FollowUpResponse {
  follow_ups: JobApplication[];
  total: number;
  success: boolean;
  message: string;
}
