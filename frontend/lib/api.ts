/**
 * CareerRadar API Client
 * Typed fetch wrappers to backend
 */

import {
  ScoreResponse,
  TrendsResponse,
  JobsResponse,
  SnapshotResponse,
  SkillTrendsResponse,
  GapResponse,
  RefreshResponse,
  PipelineStatus,
  HealthResponse,
  SettingsResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error ${response.status}: ${error}`);
  }

  return response.json();
}

// Health check
export async function getHealth(): Promise<HealthResponse> {
  return fetchApi<HealthResponse>('/health');
}

// Scores
export async function getCurrentScore(): Promise<ScoreResponse> {
  return fetchApi<ScoreResponse>('/api/score');
}

export async function getScoreTrends(days?: number): Promise<TrendsResponse> {
  const params = days ? `?days=${days}` : '';
  return fetchApi<TrendsResponse>(`/api/score/trends${params}`);
}

// Jobs
export async function getJobs(date?: string, limit?: number): Promise<JobsResponse> {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (limit) params.append('limit', limit.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchApi<JobsResponse>(`/api/jobs${query}`);
}

export async function getLatestJobs(limit?: number): Promise<JobsResponse> {
  const params = limit ? `?limit=${limit}` : '';
  return fetchApi<JobsResponse>(`/api/jobs/latest${params}`);
}

// Snapshots
export async function getLatestSnapshot(): Promise<SnapshotResponse> {
  return fetchApi<SnapshotResponse>('/api/snapshot/latest');
}

export async function getSnapshotByDate(date: string): Promise<SnapshotResponse> {
  return fetchApi<SnapshotResponse>(`/api/snapshot/${date}`);
}

export async function getSnapshotHistory(days?: number): Promise<SnapshotResponse[]> {
  const params = days ? `?days=${days}` : '';
  return fetchApi<SnapshotResponse[]>(`/api/snapshot${params}`);
}

// Gaps
export async function getSkillGaps(): Promise<GapResponse> {
  return fetchApi<GapResponse>('/api/gaps');
}

// Skill Trends
export async function getSkillTrends(days?: number): Promise<SkillTrendsResponse> {
  const params = days ? `?days=${days}` : '';
  return fetchApi<SkillTrendsResponse>(`/api/skills/trends${params}`);
}

// Refresh / Pipeline
export async function triggerRefresh(force?: boolean): Promise<RefreshResponse> {
  const params = force ? '?force=true' : '';
  return fetchApi<RefreshResponse>(`/api/score/refresh${params}`, {
    method: 'POST',
    body: JSON.stringify({ force: force || false }),
  });
}

export async function getPipelineStatus(): Promise<PipelineStatus> {
  return fetchApi<PipelineStatus>('/api/status');
}

// Settings
export async function getSettings(): Promise<SettingsResponse> {
  return fetchApi<SettingsResponse>('/api/settings');
}

export async function updateSettings(settings: Partial<SettingsResponse>): Promise<SettingsResponse> {
  return fetchApi<SettingsResponse>('/api/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}
