'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import TrendChart from '@/components/TrendChart';
import ScoreCard from '@/components/ScoreCard';
import { getScoreTrends, getCurrentScore } from '@/lib/api';
import { TrendData, ScoreResponse } from '@/lib/types';
import { TrendingUp, Calendar } from 'lucide-react';

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
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-mono font-bold text-slate-200">
              TRENDS <span className="text-amber-400">::</span> HISTORY
            </h1>
            <p className="text-sm font-mono text-slate-500 mt-1">
              Score progression over time
            </p>
          </div>
          
          {/* Time range selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded text-xs font-mono ${
                  days === d 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                    : 'text-slate-500 hover:text-slate-300 border border-[#1e1e2e]'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg border border-[#1e1e2e] bg-[#111118]">
            <p className="text-xs font-mono text-slate-500 uppercase">Period Change</p>
            <p className={`text-2xl font-mono font-bold ${
              stats.overallChange >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {stats.overallChange >= 0 ? '+' : ''}{stats.overallChange}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-[#1e1e2e] bg-[#111118]">
            <p className="text-xs font-mono text-slate-500 uppercase">Average Score</p>
            <p className="text-2xl font-mono font-bold text-amber-400">
              {stats.avgScore}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-[#1e1e2e] bg-[#111118]">
            <p className="text-xs font-mono text-slate-500 uppercase">Best Day</p>
            <p className="text-2xl font-mono font-bold text-green-400">
              {stats.bestDay?.overall_score || 0}
            </p>
            <p className="text-xs font-mono text-slate-600">
              {stats.bestDay?.date ? new Date(stats.bestDay.date).toLocaleDateString() : '--'}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-[#1e1e2e] bg-[#111118]">
            <p className="text-xs font-mono text-slate-500 uppercase">Worst Day</p>
            <p className="text-2xl font-mono font-bold text-red-400">
              {stats.worstDay?.overall_score || 0}
            </p>
            <p className="text-xs font-mono text-slate-600">
              {stats.worstDay?.date ? new Date(stats.worstDay.date).toLocaleDateString() : '--'}
            </p>
          </div>
        </div>

        {/* Main Chart */}
        <div className="rounded-lg border border-[#1e1e2e] bg-[#111118] p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-amber-400" />
            <h2 className="text-sm font-mono font-semibold text-slate-200 uppercase">
              Score Trends
            </h2>
          </div>
          
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="animate-pulse text-slate-500 font-mono">Loading...</div>
            </div>
          ) : trends.length > 0 ? (
            <TrendChart data={trends} roles={roles} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500 font-mono">
              No trend data available
            </div>
          )}
        </div>

        {/* Role Breakdown */}
        {currentScore && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
