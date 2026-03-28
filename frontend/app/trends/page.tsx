"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import TrendChart from "@/components/TrendChart";
import ScoreCard from "@/components/ScoreCard";
import { useTrends } from "@/lib/swr-hooks";
import {
  ChartSkeleton,
  ScoreCardSkeleton,
  ErrorState,
} from "@/components/Skeleton";
import { TrendingUp, Clock } from "lucide-react";

export default function TrendsPage() {
  const [days, setDays] = useState(30);
  const { trends, score, isLoading, error, mutate } = useTrends(days);

  if (error && !trends) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <ErrorState
            message="No trend data yet. Run the pipeline first."
            onRetry={() => mutate()}
          />
        </main>
      </div>
    );
  }

  if (isLoading && !trends) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="w-48 h-7 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <ScoreCardSkeleton />
            <ScoreCardSkeleton />
          </div>
          <ChartSkeleton />
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
            message="Failed to load trends data"
            onRetry={() => mutate()}
          />
        </main>
      </div>
    );
  }

  const roleScoreKeys = Object.keys(trends?.trends[0]?.role_scores || {});

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="relative z-10">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-mono font-bold text-foreground tracking-tight">
              SCORE <span className="text-primary">::</span> TRENDS
            </h1>
            <p className="text-sm font-mono text-muted-foreground mt-2">
              Track your career readiness over time
            </p>
          </div>

          {/* Period selector */}
          <div className="flex gap-2 mb-6">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded-lg border font-mono text-sm transition-all ${
                  days === d
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80"
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          {/* Score summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <ScoreCard
              title="Current Score"
              score={score?.overall_score || 0}
              size="md"
            />
            <div className="glass-panel rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Trend Period
                </p>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">
                {days}{" "}
                <span className="text-lg text-muted-foreground">days</span>
              </p>
              {trends?.trends && trends.trends.length > 0 && (
                <p className="text-xs font-mono text-muted-foreground mt-1">
                  {trends.trends.length} data{" "}
                  {trends.trends.length === 1 ? "point" : "points"}
                </p>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-4 w-4 text-secondary" />
              <h2 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wider">
                Score History
              </h2>
            </div>
            {trends?.trends && trends.trends.length > 0 ? (
              <>
                {/* Dynamic role score badges */}
                {roleScoreKeys.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {roleScoreKeys.map((role) => {
                      const latest =
                        trends.trends[trends.trends.length - 1]?.role_scores[
                          role
                        ];
                      return (
                        <div
                          key={role}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/50 text-xs font-mono text-muted-foreground"
                        >
                          <span className="capitalize">
                            {role.replace(/_/g, " ")}
                          </span>
                          {latest !== undefined && (
                            <span className="text-foreground font-semibold">
                              {latest}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <TrendChart data={trends.trends} roles={roleScoreKeys} />
              </>
            ) : (
              <p className="text-sm font-mono text-muted-foreground py-8 text-center">
                No trend data available for the selected period
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
