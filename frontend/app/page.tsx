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
import { Activity, GitBranch, Award, Terminal } from 'lucide-react';

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
      <div className="min-h-screen bg-[#0a0a0f]">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-56px)]">
          <div className="text-center">
            <Terminal className="h-8 w-8 text-amber-400 animate-pulse mx-auto mb-4" />
            <p className="text-sm font-mono text-slate-500">INITIALIZING...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-mono font-bold text-slate-200">
            DASHBOARD <span className="text-amber-400">::</span> OVERVIEW
          </h1>
          <p className="text-sm font-mono text-slate-500 mt-1">
            {snapshot?.github_data?.username 
              ? `> ${snapshot.github_data.username} | ${new Date().toLocaleDateString()}` 
              : '> READY'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 font-mono text-sm">
            {error}
          </div>
        )}

        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* GitHub Stats */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border border-[#1e1e2e] bg-[#111118] p-4">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-mono font-semibold text-slate-200 uppercase">
                  GitHub Activity
                </h2>
              </div>
              
              {snapshot?.github_data ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded bg-[#0a0a0f] border border-[#1e1e2e]">
                    <p className="text-xs font-mono text-slate-500">REPOS</p>
                    <p className="text-xl font-mono font-bold text-slate-200">
                      {snapshot.github_data.public_repos}
                    </p>
                  </div>
                  <div className="p-3 rounded bg-[#0a0a0f] border border-[#1e1e2e]">
                    <p className="text-xs font-mono text-slate-500">COMMITS (90D)</p>
                    <p className="text-xl font-mono font-bold text-green-400">
                      {snapshot.github_data.contribution_stats.total_commits_last_90d}
                    </p>
                  </div>
                  <div className="p-3 rounded bg-[#0a0a0f] border border-[#1e1e2e]">
                    <p className="text-xs font-mono text-slate-500">STREAK</p>
                    <p className="text-xl font-mono font-bold text-amber-400">
                      {snapshot.github_data.contribution_stats.contribution_streak}d
                    </p>
                  </div>
                  <div className="p-3 rounded bg-[#0a0a0f] border border-[#1e1e2e]">
                    <p className="text-xs font-mono text-slate-500">PRs</p>
                    <p className="text-xl font-mono font-bold text-slate-200">
                      {snapshot.github_data.contribution_stats.total_prs}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-mono text-slate-500">No GitHub data available</p>
              )}
            </div>

            {/* Weekly Recommendation */}
            {snapshot?.assessment?.weekly_recommendation && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-mono font-semibold text-amber-400 uppercase">
                    Weekly Recommendation
                  </h2>
                </div>
                <p className="text-sm text-slate-300 font-mono">
                  {snapshot.assessment.weekly_recommendation}
                </p>
              </div>
            )}

            {/* Skill Trends */}
            <div className="rounded-lg border border-[#1e1e2e] bg-[#111118] p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-green-400" />
                <h2 className="text-sm font-mono font-semibold text-slate-200 uppercase">
                  Skill Market Trends
                </h2>
              </div>
              {skillTrends ? (
                <SkillHeatmap 
                  data={skillTrends.trends} 
                  topSkills={skillTrends.top_trending}
                />
              ) : (
                <p className="text-sm font-mono text-slate-500">No trend data available</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Skill Gaps */}
            <div className="rounded-lg border border-[#1e1e2e] bg-[#111118] p-4">
              <h2 className="text-sm font-mono font-semibold text-slate-200 uppercase mb-4">
                Priority Skill Gaps
              </h2>
              {gaps ? (
                <GapList gaps={gaps.gaps.slice(0, 5)} />
              ) : (
                <p className="text-sm font-mono text-slate-500">No gaps identified</p>
              )}
            </div>

            {/* Strengths */}
            {snapshot?.assessment?.strengths && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                <h2 className="text-sm font-mono font-semibold text-green-400 uppercase mb-3">
                  Your Strengths
                </h2>
                <ul className="space-y-2">
                  {snapshot.assessment.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-green-400 mt-0.5">+</span>
                      <span className="font-mono">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top Matching Jobs Preview */}
            {snapshot?.assessment?.top_matching_jobs && snapshot.assessment.top_matching_jobs.length > 0 && (
              <div className="rounded-lg border border-[#1e1e2e] bg-[#111118] p-4">
                <h2 className="text-sm font-mono font-semibold text-slate-200 uppercase mb-3">
                  Top Matches
                </h2>
                <div className="space-y-2">
                  {snapshot.assessment.top_matching_jobs.slice(0, 3).map((job) => (
                    <div 
                      key={job.job_id}
                      className="flex items-center justify-between p-2 rounded bg-[#0a0a0f] border border-[#1e1e2e]"
                    >
                      <span className="text-xs font-mono text-slate-300 truncate flex-1">
                        {job.job_id.slice(0, 12)}...
                      </span>
                      <span className={`
                        text-xs font-mono px-2 py-0.5 rounded
                        ${job.match_pct >= 80 ? 'text-green-400 bg-green-400/10' : 
                          job.match_pct >= 60 ? 'text-amber-400 bg-amber-400/10' : 
                          'text-slate-400 bg-slate-400/10'}
                      `}>
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
