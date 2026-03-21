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
} from './api';

// Fetcher wrapper for SWR
const fetcher = <T>(fn: () => Promise<T>) => fn();

// Revalidation config
const SWR_CONFIG = {
  refreshInterval: 30000, // 30 seconds
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
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

// Trigger sync with automatic revalidation
export async function triggerSync(force?: boolean) {
  const result = await triggerRefresh(force);
  
  // Revalidate all data after sync
  mutate('score');
  mutate('snapshot');
  mutate('skill-trends');
  mutate('gaps');
  mutate(['score-trends', 30]);
  mutate(['jobs', 100]);
  mutate('pipeline-status');
  
  return result;
}
