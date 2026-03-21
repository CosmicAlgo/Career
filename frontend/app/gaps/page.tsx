'use client';

import Navbar from '@/components/Navbar';
import GapList from '@/components/GapList';
import SkillHeatmap from '@/components/SkillHeatmap';
import { useGaps } from '@/lib/swr-hooks';
import { GapListSkeleton, HeatmapSkeleton, ErrorState } from '@/components/Skeleton';

export default function GapsPage() {
  const { gaps, trends, snapshot, isLoading, error, mutate } = useGaps();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
        <Navbar />
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ width: '200px', height: '28px', backgroundColor: '#1e1e2e', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
            <div style={{ marginTop: '8px', width: '280px', height: '16px', backgroundColor: '#1e1e2e', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <GapListSkeleton />
            <HeatmapSkeleton />
          </div>
        </main>
        <style jsx global>{\@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }\}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
        <Navbar />
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
          <ErrorState message= Failed to load skill gaps data onRetry={() => mutate()} />
        </main>
      </div>
    );
  }

  const gapCount = gaps?.gaps?.length || 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
      <Navbar />
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
            SKILL <span style={{ color: '#fbbf24' }}>::</span> GAPS
          </h1>
          <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', marginTop: '4px' }}>
            {gapCount > 0 ? >  gaps identified : '> No gaps identified'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
          <div style={{ borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118', padding: '16px' }}>
            <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase', margin: '0 0 16px 0' }}>
              Priority Skill Gaps
            </h2>
            {gaps ? <GapList gaps={gaps.gaps.slice(0, 10)} /> : <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>No gaps identified</p>}
          </div>

          <div style={{ borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118', padding: '16px' }}>
            <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase', margin: '0 0 16px 0' }}>
              Skill Market Trends
            </h2>
            {trends ? <SkillHeatmap data={trends.trends} topSkills={trends.top_trending} /> : <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>No trend data available</p>}
          </div>

          {snapshot?.assessment?.skill_gaps && (
            <div style={{ borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.3)', backgroundColor: 'rgba(251, 191, 36, 0.05)', padding: '16px', gridColumn: '1 / -1' }}>
              <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase', margin: '0 0 12px 0' }}>
                Learning Recommendations
              </h2>
              <p style={{ fontSize: '14px', color: '#cbd5e1', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
                Focus on closing high-priority gaps first. Skills with frequency >50% in job postings are critical for marketability.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
