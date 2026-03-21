'use client';

import Navbar from '@/components/Navbar';
import ScoreCard from '@/components/ScoreCard';
import SkillHeatmap from '@/components/SkillHeatmap';
import GapList from '@/components/GapList';
import { useDashboard } from '@/lib/swr-hooks';
import { ScoreCardSkeleton, HeatmapSkeleton, GapListSkeleton, ErrorState } from '@/components/Skeleton';

export default function Dashboard() {
  const { score, snapshot, skillTrends, gaps, isLoading, error, mutate } = useDashboard();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
        <Navbar />
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ width: '250px', height: '28px', backgroundColor: '#1e1e2e', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
            <div style={{ marginTop: '8px', width: '200px', height: '16px', backgroundColor: '#1e1e2e', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[...Array(4)].map((_, i) => <ScoreCardSkeleton key={i} />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <HeatmapSkeleton />
            <GapListSkeleton />
          </div>
        </main>
        <style jsx global>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
        <Navbar />
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
          <ErrorState message="Failed to load dashboard data" onRetry={() => mutate()} />
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
      <Navbar />
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
            DASHBOARD <span style={{ color: '#fbbf24' }}>::</span> OVERVIEW
          </h1>
          <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', marginTop: '8px', margin: 0 }}>
            {snapshot?.github_data?.username ? `> ${snapshot.github_data.username} | ${new Date().toLocaleDateString()}` : '> READY'}
          </p>
        </div>

        {snapshot && !snapshot.assessment?.overall_score && (
          <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.3)', backgroundColor: 'rgba(251, 191, 36, 0.05)', color: '#fbbf24', fontFamily: 'JetBrains Mono, monospace', fontSize: '14px' }}>
            <span style={{ marginRight: '8px' }}>⚠</span>No market data yet — add a RapidAPI key to enable job matching
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <ScoreCard title="Overall Score" score={score?.overall_score || 0} size="md" />
          {score?.role_scores?.ml_engineer !== undefined && (
            <ScoreCard title="ML ENGINEER" score={score.role_scores.ml_engineer} size="sm" />
          )}
          {score?.role_scores?.mlops !== undefined && (
            <ScoreCard title="MLOPS" score={score.role_scores.mlops} size="sm" />
          )}
          {score?.role_scores?.devops !== undefined && (
            <ScoreCard title="DEVOPS" score={score.role_scores.devops} size="sm" />
          )}
          {score?.role_scores?.backend !== undefined && (
            <ScoreCard title="BACKEND" score={score.role_scores.backend} size="sm" />
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
          <div style={{ borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118', padding: '16px', minHeight: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <svg style={{ height: '16px', width: '16px', color: '#fbbf24' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/>
                <path d="M6 9v3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V9"/><path d="M12 12V3"/>
              </svg>
              <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase', margin: 0 }}>GitHub Activity</h2>
            </div>
            {snapshot?.github_data ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
                {[
                  { label: 'REPOS', value: snapshot.github_data.public_repos, color: '#e2e8f0' },
                  { label: 'COMMITS (90D)', value: snapshot.github_data.contribution_stats.total_commits_last_90d, color: '#22c55e' },
                  { label: 'STREAK', value: `${snapshot.github_data.contribution_stats.contribution_streak}d`, color: '#fbbf24' },
                  { label: 'PRs', value: snapshot.github_data.contribution_stats.total_prs, color: '#e2e8f0' },
                ].map((stat) => (
                  <div key={stat.label} style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#0a0a0f', border: '1px solid #1e1e2e', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', margin: '0 0 4px 0' }}>{stat.label}</p>
                    <p style={{ fontSize: '18px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: stat.color, margin: 0 }}>{stat.value}</p>
                  </div>
                ))}
              </div>
            ) : (<p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>No GitHub data available</p>)}
          </div>

          <div style={{ borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118', padding: '16px', minHeight: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <svg style={{ height: '16px', width: '16px', color: '#22c55e' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase', margin: 0 }}>Skill Market Trends</h2>
            </div>
            {skillTrends ? <SkillHeatmap data={skillTrends.trends} topSkills={skillTrends.top_trending} /> : <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>No trend data available</p>}
          </div>

          <div style={{ borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118', padding: '16px', minHeight: '200px' }}>
            <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase', margin: '0 0 16px 0' }}>Priority Skill Gaps</h2>
            {gaps ? <GapList gaps={gaps.gaps.slice(0, 5)} /> : <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>No gaps identified</p>}
          </div>

          {snapshot?.assessment?.strengths && (
            <div style={{ borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)', backgroundColor: 'rgba(34, 197, 94, 0.05)', padding: '16px', minHeight: '150px' }}>
              <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#22c55e', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Your Strengths</h2>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
                {snapshot.assessment.strengths.map((strength, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#cbd5e1' }}>
                    <span style={{ color: '#22c55e', marginTop: '2px' }}>+</span><span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {snapshot?.assessment?.top_matching_jobs && snapshot.assessment.top_matching_jobs.length > 0 && (
            <div style={{ borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118', padding: '16px', minHeight: '180px' }}>
              <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Top Matches</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {snapshot.assessment.top_matching_jobs.slice(0, 3).map((job) => (
                  <div key={job.job_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0a0a0f', border: '1px solid #1e1e2e' }}>
                    <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{job.job_id.slice(0, 12)}...</span>
                    <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', padding: '2px 8px', borderRadius: '4px', backgroundColor: job.match_pct >= 80 ? 'rgba(34, 197, 94, 0.1)' : job.match_pct >= 60 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(148, 163, 184, 0.1)', color: job.match_pct >= 80 ? '#22c55e' : job.match_pct >= 60 ? '#fbbf24' : '#94a3b8' }}>{job.match_pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {snapshot?.assessment?.weekly_recommendation && (
            <div style={{ borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.3)', backgroundColor: 'rgba(251, 191, 36, 0.05)', padding: '16px', minHeight: '120px', gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <svg style={{ height: '16px', width: '16px', color: '#fbbf24' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase', margin: 0 }}>Weekly Recommendation</h2>
              </div>
              <p style={{ fontSize: '14px', color: '#cbd5e1', fontFamily: 'JetBrains Mono, monospace', margin: 0, lineHeight: '1.5' }}>{snapshot.assessment.weekly_recommendation}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
