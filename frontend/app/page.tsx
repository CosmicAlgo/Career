'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import ScoreCard from '@/components/ScoreCard';
import SkillHeatmap from '@/components/SkillHeatmap';
import GapList from '@/components/GapList';
import { 
  getCurrentScore, 
  getLatestSnapshot, 
  getSkillTrends,
  getSkillGaps 
} from '@/lib/api';
import { ScoreResponse, SnapshotResponse, SkillTrendsResponse, GapResponse } from '@/lib/types';

export default function Dashboard() {
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [skillTrends, setSkillTrends] = useState<SkillTrendsResponse | null>(null);
  const [gaps, setGaps] = useState<GapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [scoreData, snapshotData, trendsData, gapsData] = await Promise.all([
        getCurrentScore().catch(() => null),
        getLatestSnapshot().catch(() => null),
        getSkillTrends(7).catch(() => null),
        getSkillGaps().catch(() => null)
      ]);
      
      setScore(scoreData);
      setSnapshot(snapshotData);
      setSkillTrends(trendsData);
      setGaps(gapsData);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 56px)' }}>
          <div style={{ textAlign: 'center' }}>
            <svg style={{ height: '32px', width: '32px', color: '#fbbf24', margin: '0 auto 16px', animation: 'pulse 2s infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
              <path d="M8 10h8M8 14h8"/>
            </svg>
            <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>INITIALIZING...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
      <Navbar />
      
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#e2e8f0' }}>
            DASHBOARD <span style={{ color: '#fbbf24' }}>::</span> OVERVIEW
          </h1>
          <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', marginTop: '4px' }}>
            {snapshot?.github_data?.username 
              ? `> ${snapshot.github_data.username} | ${new Date().toLocaleDateString()}` 
              : '> READY'}
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* Score Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <ScoreCard 
            title="Overall Score" 
            score={score?.overall_score || 0}
            size="md"
          />
          {score?.role_scores && Object.entries(score.role_scores).slice(0, 3).map(([role, scoreVal]) => (
            <ScoreCard
              key={role}
              title={role.replace(/_/g, ' ').toUpperCase()}
              score={scoreVal}
              size="sm"
            />
          ))}
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          {/* GitHub Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <svg style={{ height: '16px', width: '16px', color: '#fbbf24' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="18" r="3"/>
                  <circle cx="6" cy="6" r="3"/>
                  <circle cx="18" cy="6" r="3"/>
                  <path d="M6 9v3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V9"/>
                  <path d="M12 12V3"/>
                </svg>
                <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase' }}>
                  GitHub Activity
                </h2>
              </div>
              
              {snapshot?.github_data ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#0a0a0f', border: '1px solid #1e1e2e' }}>
                    <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>REPOS</p>
                    <p style={{ fontSize: '20px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#e2e8f0' }}>
                      {snapshot.github_data.public_repos}
                    </p>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#0a0a0f', border: '1px solid #1e1e2e' }}>
                    <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>COMMITS (90D)</p>
                    <p style={{ fontSize: '20px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#22c55e' }}>
                      {snapshot.github_data.contribution_stats.total_commits_last_90d}
                    </p>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#0a0a0f', border: '1px solid #1e1e2e' }}>
                    <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>STREAK</p>
                    <p style={{ fontSize: '20px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#fbbf24' }}>
                      {snapshot.github_data.contribution_stats.contribution_streak}d
                    </p>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#0a0a0f', border: '1px solid #1e1e2e' }}>
                    <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>PRs</p>
                    <p style={{ fontSize: '20px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#e2e8f0' }}>
                      {snapshot.github_data.contribution_stats.total_prs}
                    </p>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>No GitHub data available</p>
              )}
            </div>

            {/* Weekly Recommendation */}
            {snapshot?.assessment?.weekly_recommendation && (
              <div style={{ borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.3)', backgroundColor: 'rgba(251, 191, 36, 0.05)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <svg style={{ height: '16px', width: '16px', color: '#fbbf24' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="7"/>
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                  </svg>
                  <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase' }}>
                    Weekly Recommendation
                  </h2>
                </div>
                <p style={{ fontSize: '14px', color: '#cbd5e1', fontFamily: 'JetBrains Mono, monospace' }}>
                  {snapshot.assessment.weekly_recommendation}
                </p>
              </div>
            )}

            {/* Skill Trends */}
            <div style={{ borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <svg style={{ height: '16px', width: '16px', color: '#22c55e' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase' }}>
                  Skill Market Trends
                </h2>
              </div>
              {skillTrends ? (
                <SkillHeatmap 
                  data={skillTrends.trends} 
                  topSkills={skillTrends.top_trending}
                />
              ) : (
                <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>No trend data available</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Skill Gaps */}
            <div style={{ borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118', padding: '16px' }}>
              <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase', marginBottom: '16px' }}>
                Priority Skill Gaps
              </h2>
              {gaps ? (
                <GapList gaps={gaps.gaps.slice(0, 5)} />
              ) : (
                <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>No gaps identified</p>
              )}
            </div>

            {/* Strengths */}
            {snapshot?.assessment?.strengths && (
              <div style={{ borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)', backgroundColor: 'rgba(34, 197, 94, 0.05)', padding: '16px' }}>
                <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#22c55e', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Your Strengths
                </h2>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
                  {snapshot.assessment.strengths.map((strength, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#cbd5e1' }}>
                      <span style={{ color: '#22c55e', marginTop: '2px' }}>+</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top Matching Jobs Preview */}
            {snapshot?.assessment?.top_matching_jobs && snapshot.assessment.top_matching_jobs.length > 0 && (
              <div style={{ borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118', padding: '16px' }}>
                <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Top Matches
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {snapshot.assessment.top_matching_jobs.slice(0, 3).map((job) => (
                    <div 
                      key={job.job_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px',
                        borderRadius: '6px',
                        backgroundColor: '#0a0a0f',
                        border: '1px solid #1e1e2e'
                      }}
                    >
                      <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {job.job_id.slice(0, 12)}...
                      </span>
                      <span style={{
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono, monospace',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: job.match_pct >= 80 ? 'rgba(34, 197, 94, 0.1)' : job.match_pct >= 60 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                        color: job.match_pct >= 80 ? '#22c55e' : job.match_pct >= 60 ? '#fbbf24' : '#94a3b8'
                      }}>
                        {job.match_pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
