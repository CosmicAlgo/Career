/**
 * CareerRadar SWR Hooks
 * Data fetching with caching, revalidation, and optimistic updates
 */

import useSWR, { mutate } from 'swr';
import {
  ScoreResponse,
  TrendsResponse,
  JobsResponse,
  SnapshotResponse,
  SkillTrendsResponse,
  GapResponse,
  PipelineStatus,
  RefreshResponse,
  SettingsResponse,
  JobApplication,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  ApplicationResponse,
  ApplicationsResponse,
  ApplicationStatsResponse,
  FollowUpResponse,
} from './types';
import {
  getCurrentScore,
  getScoreTrends,
  getLatestJobs,
  getLatestSnapshot,
  getSkillTrends,
  getSkillGaps,
  getPipelineStatus,
  triggerRefresh,
  getSettings,
  updateSettings,
  createApplication,
  getApplications,
  updateApplication,
  getApplicationsByStatus,
  getApplicationStats,
  getFollowUps,
} from './api';

// Fetcher wrapper for SWR
const fetcher = <T>(fn: () => Promise<T>) => fn();

// Revalidation config
const SWR_CONFIG = {
  refreshInterval: 30000, // 30 seconds
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
  errorRetryCount: 3,
  shouldRetryOnError: true,
  onError: (err: Error, key: string) => {
    console.error(`[SWR] Key "${key}" failed:`, err.message);
  },
};

// Dashboard data hook
export function useDashboard() {
  const { data: score, error: scoreError, isLoading: scoreLoading } = useSWR<ScoreResponse>(
    'score',
    () => fetcher(getCurrentScore),
    SWR_CONFIG
  );

  const { data: snapshot, error: snapshotError, isLoading: snapshotLoading } = useSWR<SnapshotResponse>(
    'snapshot',
    () => fetcher(getLatestSnapshot),
    SWR_CONFIG
  );

  const { data: skillTrends, error: trendsError, isLoading: trendsLoading } = useSWR<SkillTrendsResponse>(
    'skill-trends',
    () => fetcher(() => getSkillTrends(7)),
    SWR_CONFIG
  );

  const { data: gaps, error: gapsError, isLoading: gapsLoading } = useSWR<GapResponse>(
    'gaps',
    () => fetcher(getSkillGaps),
    SWR_CONFIG
  );

  const isLoading = scoreLoading || snapshotLoading || trendsLoading || gapsLoading;
  const error = scoreError || snapshotError || trendsError || gapsError;

  return {
    score,
    snapshot,
    skillTrends,
    gaps,
    isLoading,
    error,
    mutate: () => {
      mutate('score');
      mutate('snapshot');
      mutate('skill-trends');
      mutate('gaps');
    },
  };
}

// Trends page hook
export function useTrends(days: number = 30) {
  const { data: trends, error: trendsError, isLoading: trendsLoading } = useSWR<TrendsResponse>(
    ['score-trends', days],
    () => fetcher(() => getScoreTrends(days)),
    SWR_CONFIG
  );

  const { data: score, error: scoreError, isLoading: scoreLoading } = useSWR<ScoreResponse>(
    'score',
    () => fetcher(getCurrentScore),
    SWR_CONFIG
  );

  return {
    trends,
    score,
    isLoading: trendsLoading || scoreLoading,
    error: trendsError || scoreError,
    mutate: () => {
      mutate(['score-trends', days]);
      mutate('score');
    },
  };
}

// Jobs page hook
export function useJobs(limit: number = 100) {
  const { data: jobs, error, isLoading } = useSWR<JobsResponse>(
    ['jobs', limit],
    () => fetcher(() => getLatestJobs(limit)),
    SWR_CONFIG
  );

  return {
    jobs,
    isLoading,
    error,
    mutate: () => mutate(['jobs', limit]),
  };
}

// Gaps page hook
export function useGaps() {
  const { data: gaps, error: gapsError, isLoading: gapsLoading } = useSWR<GapResponse>(
    'gaps',
    () => fetcher(getSkillGaps),
    SWR_CONFIG
  );

  const { data: trends, error: trendsError, isLoading: trendsLoading } = useSWR<SkillTrendsResponse>(
    ['skill-trends', 14],
    () => fetcher(() => getSkillTrends(14)),
    SWR_CONFIG
  );

  const { data: snapshot, error: snapshotError, isLoading: snapshotLoading } = useSWR<SnapshotResponse>(
    'snapshot',
    () => fetcher(getLatestSnapshot),
    SWR_CONFIG
  );

  const isLoading = gapsLoading || trendsLoading || snapshotLoading;
  const error = gapsError || trendsError || snapshotError;

  return {
    gaps,
    trends,
    snapshot,
    isLoading,
    error,
    mutate: () => {
      mutate('gaps');
      mutate(['skill-trends', 14]);
      mutate('snapshot');
    },
  };
}

// Pipeline status hook
export function usePipelineStatus() {
  const { data: status, error, isLoading } = useSWR<PipelineStatus>(
    'pipeline-status',
    () => fetcher(getPipelineStatus),
    {
      ...SWR_CONFIG,
      refreshInterval: 10000, // 10 seconds for status
    }
  );

  return {
    status,
    isLoading,
    error,
    mutate: () => mutate('pipeline-status'),
  };
}

// Settings hook
export function useSettings() {
  const { data: settings, error, isLoading } = useSWR<SettingsResponse>(
    'settings',
    () => fetcher(getSettings),
    SWR_CONFIG
  );

  const update = async (newSettings: Partial<SettingsResponse>) => {
    const result = await updateSettings(newSettings);
    mutate('settings', result, false);
    return result;
  };

  return {
    settings,
    isLoading,
    error,
    update,
    mutate: () => mutate('settings'),
  };
}

// Application Tracker hooks
export function useApplications() {
  const { data: applicationsData, error, isLoading } = useSWR<ApplicationsResponse>(
    'applications',
    () => fetcher(getApplications),
    SWR_CONFIG
  );

  return {
    applications: applicationsData?.applications || [],
    total: applicationsData?.total || 0,
    isLoading,
    error,
    mutate: () => mutate('applications'),
  };
}

export function useApplicationsByStatus(status: string) {
  const { data: applicationsData, error, isLoading } = useSWR<ApplicationsResponse>(
    ['applications-by-status', status],
    () => fetcher(() => getApplicationsByStatus(status)),
    SWR_CONFIG
  );

  return {
    applications: applicationsData?.applications || [],
    total: applicationsData?.total || 0,
    isLoading,
    error,
    mutate: () => mutate(['applications-by-status', status]),
  };
}

export function useApplicationStats(days: number = 30) {
  const { data: statsData, error, isLoading } = useSWR<ApplicationStatsResponse>(
    ['application-stats', days],
    () => fetcher(() => getApplicationStats(days)),
    SWR_CONFIG
  );

  return {
    stats: statsData?.stats,
    daysAnalyzed: statsData?.days_analyzed || days,
    isLoading,
    error,
    mutate: () => mutate(['application-stats', days]),
  };
}

export function useFollowUps(daysAhead: number = 0) {
  const { data: followUpsData, error, isLoading } = useSWR<FollowUpResponse>(
    ['follow-ups', daysAhead],
    () => fetcher(() => getFollowUps(daysAhead)),
    {
      ...SWR_CONFIG,
      refreshInterval: 60000, // Check follow-ups every minute
    }
  );

  return {
    followUps: followUpsData?.follow_ups || [],
    total: followUpsData?.total || 0,
    message: followUpsData?.message || '',
    isLoading,
    error,
    mutate: () => mutate(['follow-ups', daysAhead]),
  };
}

// Mutation hooks for applications
export function useApplicationMutations() {
  const create = async (application: CreateApplicationRequest) => {
    const result = await createApplication(application);
    mutate('applications'); // Refresh applications list
    return result;
  };

  const update = async (applicationId: string, update: UpdateApplicationRequest) => {
    const result = await updateApplication(applicationId, update);
    mutate('applications'); // Refresh applications list
    mutate(['applications-by-status', update.status]); // Refresh filtered list if status changed
    return result;
  };

  return {
    create,
    update,
  };
}

// Trigger sync with automatic revalidation
export async function triggerSync(force?: boolean) {
  const result = await triggerRefresh(force);
  
  // Revalidate all known SWR cache keys after sync completes
  // Fire-and-forget: don't await so the function returns immediately
  mutate('score');
  mutate('snapshot');
  mutate('skill-trends');
  mutate('gaps');
  mutate('pipeline-status');
  mutate('settings');
  mutate(['jobs', 100]);
  mutate(['score-trends', 30]);
  mutate('applications'); // Also refresh applications
  
  return result;
}
