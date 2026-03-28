"use client";

import Navbar from "@/components/Navbar";
import ScoreCard from "@/components/ScoreCard";
import SkillHeatmap from "@/components/SkillHeatmap";
import GapList from "@/components/GapList";
import RadarCoverageChart from "@/components/RadarCoverageChart";
import { useDashboard } from "@/lib/swr-hooks";
import {
  ScoreCardSkeleton,
  HeatmapSkeleton,
  GapListSkeleton,
  ErrorState,
} from "@/components/Skeleton";
import { Github, TrendingUp, Target, Plus, CheckCircle2 } from "lucide-react";

export default function Dashboard() {
  const { score, snapshot, skillTrends, gaps, isLoading, error, mutate } =
    useDashboard();

  if (error && !score && !snapshot) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8 w-full">
          <div className="mb-6">
            <h1 className="text-2xl font-mono font-bold text-foreground tracking-tight">
              DASHBOARD <span className="text-primary">::</span> OVERVIEW
            </h1>
          </div>
          <div className="p-6 rounded-xl border border-primary/30 bg-primary/5 glass-panel">
            <p className="text-base text-primary font-mono mb-2">
              No pipeline data yet
            </p>
            <p className="text-sm text-muted-foreground font-mono mb-4">
              Click the SYNC button in the navbar to run the pipeline and
              generate your first score.
            </p>
            <button
              onClick={() => mutate()}
              className="px-4 py-2 rounded-md border border-border bg-card text-muted-foreground font-mono text-sm hover:bg-accent hover:text-foreground transition-all"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading && !score && !snapshot) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8 w-full">
          <div className="mb-6">
            <div className="w-64 h-7 bg-muted rounded-md animate-pulse" />
            <div className="mt-2 w-48 h-4 bg-muted rounded-md animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <ScoreCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HeatmapSkeleton />
            <GapListSkeleton />
          </div>
        </main>
      </div>
    );
  }

  // Dynamically collect all role scores (handles any role the backend returns)
  const roleScoreEntries = Object.entries(score?.role_scores || {});

  return (
    <div className="min-h-screen bg-background relative flex flex-col overflow-hidden">
      {/* Background flair */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] pointer-events-none mix-blend-overlay" />

      <div className="z-10 flex-col flex w-full">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8 w-full">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-mono font-bold text-foreground tracking-tight">
              DASHBOARD <span className="text-primary">::</span> OVERVIEW
            </h1>
            <p className="text-sm font-mono text-muted-foreground mt-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {snapshot?.github_data?.username
                ? `${
                    snapshot.github_data.username
                  } | ${new Date().toLocaleDateString()}`
                : "READY"}
            </p>
          </div>

          {snapshot &&
            (!snapshot.assessment ||
              typeof snapshot.assessment.overall_score !== "number") && (
              <div className="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5 text-primary text-sm font-mono flex items-center gap-2">
                <span className="text-lg">⚠</span> No market data yet — add a
                RapidAPI key to enable job matching
              </div>
            )}

          {/* Score Cards — Overall + all dynamic role scores */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <ScoreCard
              title="Overall Score"
              score={score?.overall_score || 0}
              size="md"
            />
            {roleScoreEntries.map(([roleKey, roleScore]) => (
              <ScoreCard
                key={roleKey}
                title={roleKey.replace(/_/g, " ").toUpperCase()}
                score={roleScore as number}
                size="sm"
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* GitHub Activity Card — with Radar chart */}
            <div className="glass-panel p-5 rounded-xl flex flex-col h-full relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 text-primary/5 group-hover:text-primary/10 transition-colors pointer-events-none">
                <Github size={120} />
              </div>
              <div className="flex items-center gap-2 mb-4 relative z-10">
                <Github className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wider">
                  GitHub Activity
                </h2>
              </div>

              {snapshot?.github_data ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10 w-full mb-5">
                    {[
                      {
                        label: "REPOS",
                        value: snapshot.github_data.public_repos,
                        color: "text-foreground",
                      },
                      {
                        label: "COMMITS (90D)",
                        value:
                          snapshot.github_data.contribution_stats
                            .total_commits_last_90d,
                        color: "text-green-500",
                      },
                      {
                        label: "STREAK",
                        value: `${snapshot.github_data.contribution_stats.contribution_streak}d`,
                        color: "text-primary",
                      },
                      {
                        label: "PRs",
                        value:
                          snapshot.github_data.contribution_stats.total_prs,
                        color: "text-foreground",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="p-3 rounded-lg bg-background/50 border border-border/50 text-center hover:bg-muted/50 transition-colors"
                      >
                        <p className="text-[10px] font-mono text-muted-foreground mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                          {stat.label}
                        </p>
                        <p
                          className={`text-xl font-display font-bold ${stat.color}`}
                        >
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Radar Coverage Chart */}
                  <div className="relative z-10 border-t border-border/50 pt-4">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                      Coverage vs Market
                    </p>
                    <RadarCoverageChart
                      snapshot={snapshot}
                      skillTrends={skillTrends}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm font-mono text-muted-foreground relative z-10">
                  No GitHub data available
                </p>
              )}
            </div>

            {/* Skill Market Trends */}
            <div className="glass-panel p-5 rounded-xl flex flex-col h-full relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 text-secondary/5 group-hover:text-secondary/10 transition-colors pointer-events-none">
                <TrendingUp size={120} />
              </div>
              <div className="flex items-center gap-2 mb-4 relative z-10">
                <TrendingUp className="h-4 w-4 text-secondary" />
                <h2 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wider">
                  Skill Market Trends
                </h2>
              </div>
              <div className="relative z-10 w-full overflow-hidden">
                {skillTrends ? (
                  <SkillHeatmap
                    data={skillTrends.trends}
                    topSkills={skillTrends.top_trending}
                  />
                ) : (
                  <p className="text-sm font-mono text-muted-foreground">
                    No trend data available
                  </p>
                )}
              </div>
            </div>

            {/* Priority Skill Gaps */}
            <div className="glass-panel p-5 rounded-xl flex flex-col h-full relative overflow-hidden group">
              <div className="absolute -left-6 -bottom-6 text-red-500/5 group-hover:text-red-500/10 transition-colors pointer-events-none">
                <Target size={120} />
              </div>
              <div className="flex items-center gap-2 mb-4 relative z-10">
                <Target className="h-4 w-4 text-red-500" />
                <h2 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wider">
                  Priority Skill Gaps
                </h2>
              </div>
              <div className="relative z-10 w-full overflow-hidden">
                {gaps ? (
                  <GapList gaps={gaps.gaps.slice(0, 5)} />
                ) : (
                  <p className="text-sm font-mono text-muted-foreground">
                    No gaps identified
                  </p>
                )}
              </div>
            </div>

            {/* Strengths */}
            {snapshot?.assessment?.strengths && (
              <div className="glass-panel p-5 rounded-xl border-green-500/20 bg-green-500/5 flex flex-col h-full relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <h2 className="text-sm font-mono font-semibold text-green-500 uppercase tracking-wider">
                    Your Strengths
                  </h2>
                </div>
                <ul className="flex flex-col gap-3 relative z-10 w-full">
                  {snapshot.assessment.strengths.map((strength, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground group/item"
                    >
                      <Plus className="h-4 w-4 text-green-500 shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform" />
                      <span className="font-mono group-hover/item:text-foreground transition-colors">
                        {strength}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top Matching Jobs */}
            {snapshot?.assessment?.top_matching_jobs &&
              snapshot.assessment.top_matching_jobs.length > 0 && (
                <div className="glass-panel p-5 rounded-xl flex flex-col col-span-1 lg:col-span-2 relative overflow-hidden">
                  <h2 className="text-sm font-mono font-semibold text-secondary uppercase mb-4 tracking-wider relative z-10">
                    Top Matches
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                    {snapshot.assessment.top_matching_jobs
                      .slice(0, 3)
                      .map((job) => (
                        <div
                          key={job.job_id}
                          className="flex flex-col gap-3 p-4 rounded-lg bg-background/50 border border-border/50 hover:border-secondary/30 hover:bg-secondary/5 transition-all cursor-pointer group hover:-translate-y-0.5"
                        >
                          <span className="text-sm font-display font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate">
                            {job.job_id.slice(0, 20)}…
                          </span>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-xs font-mono text-muted-foreground">
                              Match:
                            </span>
                            <span
                              className={`text-xs font-mono px-2 py-1 rounded-md font-bold ${
                                job.match_pct >= 80
                                  ? "bg-green-500/10 text-green-500 border border-green-500/20"
                                  : job.match_pct >= 60
                                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                    : "bg-muted text-muted-foreground border border-border"
                              }`}
                            >
                              {job.match_pct}%
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* Weekly Recommendation */}
            {snapshot?.assessment?.weekly_recommendation && (
              <div className="glass-panel p-6 rounded-xl border border-primary/20 bg-primary/5 flex flex-col col-span-1 lg:col-span-2 relative overflow-hidden shadow-glow-primary">
                <div className="absolute right-[-10%] top-[-10%] w-[50%] h-[150%] bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-mono font-semibold text-primary uppercase tracking-wider">
                    Weekly Recommendation
                  </h2>
                </div>
                <p className="text-base text-foreground/90 font-mono leading-relaxed relative z-10 max-w-4xl">
                  {snapshot.assessment.weekly_recommendation}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
