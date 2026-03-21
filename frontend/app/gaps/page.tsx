'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import GapList from '@/components/GapList';
import SkillHeatmap from '@/components/SkillHeatmap';
import { getSkillGaps, getSkillTrends, getLatestSnapshot } from '@/lib/api';
import { GapResponse, SkillTrendsResponse, SnapshotResponse } from '@/lib/types';

export default function GapsPage() {
  const [gaps, setGaps] = useState<GapResponse | null>(null);
  const [trends, setTrends] = useState<SkillTrendsResponse | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [gapsData, trendsData, snapData] = await Promise.all([
        getSkillGaps(),
        getSkillTrends(14),
        getLatestSnapshot().catch(() => null)
      ]);
      setGaps(gapsData);
      setTrends(trendsData);
      setSnapshot(snapData);
    } catch (err) {
      console.error('Failed to load gaps data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate gap stats
  const gapStats = {
    highPriority: gaps?.gaps.filter(g => g.priority === 'high').length || 0,
    mediumPriority: gaps?.gaps.filter(g => g.priority === 'medium').length || 0,
    lowPriority: gaps?.gaps.filter(g => g.priority === 'low').length || 0,
    totalFrequency: gaps?.gaps.reduce((sum, g) => sum + g.frequency_in_market, 0) || 0
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
      <Navbar />
      
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#e2e8f0' }}>
            GAPS <span style={{ color: '#fbbf24' }}>::</span> ANALYSIS
          </h1>
          <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', marginTop: '4px' }}>
            Skill gaps ranked by market demand
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <svg style={{ height: '16px', width: '16px', color: '#ef4444' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#ef4444', textTransform: 'uppercase' }}>High Priority</span>
            </div>
            <p style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#ef4444' }}>
              {gapStats.highPriority}
            </p>
          </div>
          <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.2)', backgroundColor: 'rgba(251, 191, 36, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <svg style={{ height: '16px', width: '16px', color: '#fbbf24' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#fbbf24', textTransform: 'uppercase' }}>Medium Priority</span>
            </div>
            <p style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#fbbf24' }}>
              {gapStats.mediumPriority}
            </p>
          </div>
          <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(100, 116, 139, 0.2)', backgroundColor: 'rgba(100, 116, 139, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <svg style={{ height: '16px', width: '16px', color: '#94a3b8' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
              <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#94a3b8', textTransform: 'uppercase' }}>Low Priority</span>
            </div>
            <p style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#94a3b8' }}>
              {gapStats.lowPriority}
            </p>
          </div>
          <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <svg style={{ height: '16px', width: '16px', color: '#22c55e' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#22c55e', textTransform: 'uppercase' }}>Total Mentions</span>
            </div>
            <p style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#22c55e' }}>
              {gapStats.totalFrequency}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          {/* Gap List */}
          <div style={{ borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase' }}>
                Priority Skill Gaps
              </h2>
              <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>
                {gaps?.gaps.length || 0} identified
              </span>
            </div>
            
            {loading ? (
              <div style={{ padding: '32px 0', textAlign: 'center', fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>
                Analyzing gaps...
              </div>
            ) : gaps && gaps.gaps.length > 0 ? (
              <GapList gaps={gaps.gaps} />
            ) : (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <svg style={{ height: '32px', width: '32px', color: '#475569', margin: '0 auto 8px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>No gaps identified yet</p>
              </div>
            )}
          </div>

          {/* Trending Skills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <svg style={{ height: '16px', width: '16px', color: '#22c55e' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase' }}>
                  Market Trend Heatmap
                </h2>
              </div>
              
              {loading ? (
                <div style={{ padding: '32px 0', textAlign: 'center', fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>
                  Loading trends...
                </div>
              ) : trends && trends.trends.length > 0 ? (
                <SkillHeatmap 
                  data={trends.trends} 
                  topSkills={trends.top_trending}
                />
              ) : (
                <div style={{ padding: '32px 0', textAlign: 'center', fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>
                  No trend data available
                </div>
              )}
            </div>

            {/* Weekly Recommendation */}
            {snapshot?.assessment?.weekly_recommendation && (
              <div style={{ borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.3)', backgroundColor: 'rgba(251, 191, 36, 0.05)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <svg style={{ height: '16px', width: '16px', color: '#fbbf24' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                  <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase' }}>
                    This Week&apos;s Focus
                  </h2>
                </div>
                <p style={{ fontSize: '14px', color: '#cbd5e1', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6 }}>
                  {snapshot.assessment.weekly_recommendation}
                </p>
              </div>
            )}

            {/* Top Trending */}
            {trends?.top_trending && trends.top_trending.length > 0 && (
              <div style={{ borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118', padding: '16px' }}>
                <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Top Trending Skills
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {trends.top_trending.map(skill => (
                    <span 
                      key={skill}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono, monospace',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        color: '#22c55e',
                        border: '1px solid rgba(34, 197, 94, 0.2)'
                      }}
                    >
                      {skill}
                    </span>
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
