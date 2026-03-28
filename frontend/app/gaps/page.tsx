"use client";

import Navbar from "@/components/Navbar";
import GapList from "@/components/GapList";
import SkillHeatmap from "@/components/SkillHeatmap";
import { useGaps } from "@/lib/swr-hooks";
import {
  GapListSkeleton,
  HeatmapSkeleton,
  ErrorState,
} from "@/components/Skeleton";
import { Target, TrendingUp, Lightbulb } from "lucide-react";

export default function GapsPage() {
  const { gaps, trends, snapshot, isLoading, error, mutate } = useGaps();

  if (error && !gaps) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <ErrorState
            message="No gap data yet. Run the pipeline first."
            onRetry={() => mutate()}
          />
        </main>
      </div>
    );
  }

  if (isLoading && !gaps) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="w-48 h-7 bg-muted rounded animate-pulse" />
            <div className="mt-2 w-64 h-4 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GapListSkeleton />
            <HeatmapSkeleton />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <ErrorState
            message="Failed to load skill gaps data"
            onRetry={() => mutate()}
          />
        </main>
      </div>
    );
  }

  const gapCount = gaps?.gaps?.length || 0;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background flair */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-mono font-bold text-foreground tracking-tight">
              SKILL <span className="text-primary">::</span> GAPS
            </h1>
            <p className="text-sm font-mono text-muted-foreground mt-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              {gapCount > 0
                ? `${gapCount} gaps identified`
                : "No gaps identified — great shape!"}
            </p>
          </div>

          {/* Main two-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Priority Skill Gaps */}
            <div className="glass-panel rounded-xl p-6 h-full relative overflow-hidden">
              <div className="absolute -right-8 -top-8 text-red-500/5 pointer-events-none">
                <Target size={140} />
              </div>
              <div className="flex items-center gap-2 mb-5 relative z-10">
                <Target className="h-4 w-4 text-red-500" />
                <h2 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wider">
                  Priority Skill Gaps
                </h2>
              </div>
              <div className="relative z-10">
                {gaps ? (
                  <GapList gaps={gaps.gaps.slice(0, 10)} />
                ) : (
                  <p className="text-sm font-mono text-muted-foreground">
                    No gaps identified
                  </p>
                )}
              </div>
            </div>

            {/* Skill Market Trends */}
            <div className="glass-panel rounded-xl p-6 h-full relative overflow-hidden">
              <div className="absolute -right-8 -top-8 text-secondary/5 pointer-events-none">
                <TrendingUp size={140} />
              </div>
              <div className="flex items-center gap-2 mb-5 relative z-10">
                <TrendingUp className="h-4 w-4 text-secondary" />
                <h2 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wider">
                  Skill Market Trends
                </h2>
              </div>
              <div className="relative z-10 w-full overflow-x-auto">
                {trends ? (
                  <SkillHeatmap
                    data={trends.trends}
                    topSkills={trends.top_trending}
                  />
                ) : (
                  <p className="text-sm font-mono text-muted-foreground">
                    No trend data available
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Learning Recommendation — full width */}
          {snapshot?.assessment?.skill_gaps && (
            <div className="mt-6 glass-panel rounded-xl p-6 border border-amber-500/20 bg-amber-500/5 relative overflow-hidden">
              <div className="absolute right-6 top-4 text-amber-500/10 pointer-events-none">
                <Lightbulb size={80} />
              </div>
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-mono font-semibold text-amber-500 uppercase tracking-wider">
                  Learning Recommendations
                </h2>
              </div>
              <p className="text-sm text-muted-foreground font-mono leading-relaxed relative z-10">
                Focus on closing high-priority gaps first. Skills with frequency
                &gt; 50% in job postings are critical for marketability.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
