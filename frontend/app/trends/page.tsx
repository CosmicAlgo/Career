'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import TrendChart from '@/components/TrendChart';
import ScoreCard from '@/components/ScoreCard';
import { useTrends } from '@/lib/swr-hooks';
import { ChartSkeleton, ScoreCardSkeleton, ErrorState } from '@/components/Skeleton';

export default function TrendsPage() {
  const [days, setDays] = useState(30);
  const { trends, score, isLoading, error, mutate } = useTrends(days);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
        <Navbar />
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ width: '200px', height: '28px', backgroundColor: '#1e1e2e', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <ScoreCardSkeleton />
          </div>
          <ChartSkeleton />
        </main>
        <style jsx global>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
        <Navbar />
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
          <ErrorState message="Failed to load trends data" onRetry={() => mutate()} />
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
            SCORE <span style={{ color: '#fbbf24' }}>::</span> TRENDS
          </h1>
          <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', marginTop: '4px' }}>
            Track your career readiness over time
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: days === d ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid #1e1e2e',
                backgroundColor: days === d ? 'rgba(251, 191, 36, 0.1)' : '#111118',
                color: days === d ? '#fbbf24' : '#64748b',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {d}D
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <ScoreCard title="Current Score" score={score?.overall_score || 0} size="md" />
          <div style={{ borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118', padding: '16px' }}>
            <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', margin: 0 }}>TREND PERIOD</p>
            <p style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#e2e8f0', margin: '8px 0 0 0' }}>{days} DAYS</p>
          </div>
        </div>

        <div style={{ borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118', padding: '24px', minHeight: '400px' }}>
          <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase', margin: '0 0 24px 0' }}>
            Score History
          </h2>
          {trends?.scores && trends.scores.length > 0 ? (
            <TrendChart data={trends.scores} />
          ) : (
            <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>
              No trend data available for the selected period
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
