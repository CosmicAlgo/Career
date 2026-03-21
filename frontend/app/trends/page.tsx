'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import TrendChart from '@/components/TrendChart';
import ScoreCard from '@/components/ScoreCard';
import { getScoreTrends, getCurrentScore } from '@/lib/api';
import { TrendData, ScoreResponse } from '@/lib/types';

export default function TrendsPage() {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [currentScore, setCurrentScore] = useState<ScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadTrends();
  }, [days]);

  async function loadTrends() {
    try {
      setLoading(true);
      const [trendsData, scoreData] = await Promise.all([
        getScoreTrends(days),
        getCurrentScore().catch(() => null)
      ]);
      setTrends(trendsData.trends);
      setCurrentScore(scoreData);
    } catch (err) {
      console.error('Failed to load trends:', err);
    } finally {
      setLoading(false);
    }
  }

  const roles = currentScore ? Object.keys(currentScore.role_scores) : [];

  // Calculate stats
  const stats = {
    overallChange: trends.length >= 2 
      ? trends[0].overall_score - trends[trends.length - 1].overall_score 
      : 0,
    avgScore: trends.length > 0 
      ? Math.round(trends.reduce((sum, t) => sum + t.overall_score, 0) / trends.length)
      : 0,
    bestDay: trends.reduce((best, t) => t.overall_score > best.overall_score ? t : best, trends[0] || { overall_score: 0, date: '' }),
    worstDay: trends.reduce((worst, t) => t.overall_score < worst.overall_score ? t : worst, trends[0] || { overall_score: 100, date: '' })
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
      <Navbar />
      
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#e2e8f0' }}>
              TRENDS <span style={{ color: '#fbbf24' }}>::</span> HISTORY
            </h1>
            <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', marginTop: '4px' }}>
              Score progression over time
            </p>
          </div>
          
          {/* Time range selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg style={{ height: '16px', width: '16px', color: '#64748b' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  border: days === d ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid #1e1e2e',
                  backgroundColor: days === d ? 'rgba(251, 191, 36, 0.2)' : 'transparent',
                  color: days === d ? '#fbbf24' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118' }}>
            <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', textTransform: 'uppercase' }}>Period Change</p>
            <p style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: stats.overallChange >= 0 ? '#22c55e' : '#ef4444' }}>
              {stats.overallChange >= 0 ? '+' : ''}{stats.overallChange}
            </p>
          </div>
          <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118' }}>
            <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', textTransform: 'uppercase' }}>Average Score</p>
            <p style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#fbbf24' }}>
              {stats.avgScore}
            </p>
          </div>
          <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118' }}>
            <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', textTransform: 'uppercase' }}>Best Day</p>
            <p style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#22c55e' }}>
              {stats.bestDay?.overall_score || 0}
            </p>
            <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#475569' }}>
              {stats.bestDay?.date ? new Date(stats.bestDay.date).toLocaleDateString() : '--'}
            </p>
          </div>
          <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118' }}>
            <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', textTransform: 'uppercase' }}>Worst Day</p>
            <p style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#ef4444' }}>
              {stats.worstDay?.overall_score || 0}
            </p>
            <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#475569' }}>
              {stats.worstDay?.date ? new Date(stats.worstDay.date).toLocaleDateString() : '--'}
            </p>
          </div>
        </div>

        {/* Main Chart */}
        <div style={{ borderRadius: '8px', border: '1px solid #1e1e2e', backgroundColor: '#111118', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <svg style={{ height: '20px', width: '20px', color: '#fbbf24' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
            <h2 style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase' }}>
              Score Trends
            </h2>
          </div>
          
          {loading ? (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>Loading...</div>
            </div>
          ) : trends.length > 0 ? (
            <TrendChart data={trends} roles={roles} />
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>
              No trend data available
            </div>
          )}
        </div>

        {/* Role Breakdown */}
        {currentScore && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {Object.entries(currentScore.role_scores).map(([role, score]) => {
              const historicalScores = trends.map(t => t.role_scores[role]).filter(Boolean);
              const prevScore = historicalScores[historicalScores.length - 2];
              
              return (
                <ScoreCard
                  key={role}
                  title={role.replace(/_/g, ' ')}
                  score={score}
                  previousScore={prevScore}
                  subtitle={`${historicalScores.length} data points`}
                  size="sm"
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
