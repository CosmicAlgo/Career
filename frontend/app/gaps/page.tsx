'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import GapList from '@/components/GapList';
import SkillHeatmap from '@/components/SkillHeatmap';
import { getSkillGaps, getSkillTrends, getLatestSnapshot } from '@/lib/api';
import { GapResponse, SkillTrendsResponse, SnapshotResponse } from '@/lib/types';
import { AlertTriangle, Target, TrendingUp, BookOpen } from 'lucide-react';

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
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-mono font-bold text-slate-200">
            GAPS <span className="text-amber-400">::</span> ANALYSIS
          </h1>
          <p className="text-sm font-mono text-slate-500 mt-1">
            Skill gaps ranked by market demand
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-xs font-mono text-red-400 uppercase">High Priority</span>
            </div>
            <p className="text-2xl font-mono font-bold text-red-400">
              {gapStats.highPriority}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-mono text-amber-400 uppercase">Medium Priority</span>
            </div>
            <p className="text-2xl font-mono font-bold text-amber-400">
              {gapStats.mediumPriority}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-slate-500/20 bg-slate-500/5">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-mono text-slate-400 uppercase">Low Priority</span>
            </div>
            <p className="text-2xl font-mono font-bold text-slate-400">
              {gapStats.lowPriority}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-[#1e1e2e] bg-[#111118]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-xs font-mono text-green-400 uppercase">Total Mentions</span>
            </div>
            <p className="text-2xl font-mono font-bold text-green-400">
              {gapStats.totalFrequency}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gap List */}
          <div className="rounded-lg border border-[#1e1e2e] bg-[#111118] p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-mono font-semibold text-slate-200 uppercase">
                Priority Skill Gaps
              </h2>
              <span className="text-xs font-mono text-slate-500">
                {gaps?.gaps.length || 0} identified
              </span>
            </div>
            
            {loading ? (
              <div className="py-8 text-center text-slate-500 font-mono">
                Analyzing gaps...
              </div>
            ) : gaps && gaps.gaps.length > 0 ? (
              <GapList gaps={gaps.gaps} />
            ) : (
              <div className="py-8 text-center">
                <AlertTriangle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-mono">No gaps identified yet</p>
              </div>
            )}
          </div>

          {/* Trending Skills */}
          <div className="space-y-6">
            <div className="rounded-lg border border-[#1e1e2e] bg-[#111118] p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <h2 className="text-sm font-mono font-semibold text-slate-200 uppercase">
                  Market Trend Heatmap
                </h2>
              </div>
              
              {loading ? (
                <div className="py-8 text-center text-slate-500 font-mono">
                  Loading trends...
                </div>
              ) : trends && trends.trends.length > 0 ? (
                <SkillHeatmap 
                  data={trends.trends} 
                  topSkills={trends.top_trending}
                />
              ) : (
                <div className="py-8 text-center text-slate-500 font-mono">
                  No trend data available
                </div>
              )}
            </div>

            {/* Weekly Recommendation */}
            {snapshot?.assessment?.weekly_recommendation && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-mono font-semibold text-amber-400 uppercase">
                    This Week&apos;s Focus
                  </h2>
                </div>
                <p className="text-sm text-slate-300 font-mono leading-relaxed">
                  {snapshot.assessment.weekly_recommendation}
                </p>
              </div>
            )}

            {/* Top Trending */}
            {trends?.top_trending && trends.top_trending.length > 0 && (
              <div className="rounded-lg border border-[#1e1e2e] bg-[#111118] p-4">
                <h2 className="text-sm font-mono font-semibold text-slate-200 uppercase mb-3">
                  Top Trending Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {trends.top_trending.map(skill => (
                    <span 
                      key={skill}
                      className="px-3 py-1.5 rounded-full text-xs font-mono bg-green-500/10 text-green-400 border border-green-500/20"
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
