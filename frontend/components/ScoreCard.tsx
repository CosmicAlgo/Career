"use client";

import { useState, useEffect } from "react";

interface ScoreCardProps {
  title: string;
  score: number;
  previousScore?: number;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
}

export default function ScoreCard({
  title,
  score,
  previousScore,
  subtitle,
  size = "md",
}: ScoreCardProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  const change =
    previousScore !== undefined ? score - previousScore : undefined;

  const paddingClass = size === "sm" ? "p-3" : size === "md" ? "p-4" : "p-6";
  const scoreSizeClass =
    size === "sm" ? "text-2xl" : size === "md" ? "text-4xl" : "text-6xl";

  const getScoreVariant = (s: number) => {
    if (s >= 80) return "text-green-500";
    if (s >= 60) return "text-amber-500";
    return "text-red-500";
  };
  const getGlowShadow = (s: number) => {
    if (s >= 80) return "shadow-[0_0_20px_rgba(34,197,94,0.15)]";
    if (s >= 60) return "shadow-[0_0_20px_rgba(245,158,11,0.15)]";
    return "shadow-[0_0_20px_rgba(239,68,68,0.15)]";
  };
  const getBorderColor = (s: number) => {
    if (s >= 80) return "border-green-500/30";
    if (s >= 60) return "border-amber-500/30";
    return "border-red-500/30";
  };
  const getBgColor = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  const scoreColor = getScoreVariant(score);
  const borderColor = getBorderColor(score);
  const glowShadow = getGlowShadow(score);
  const barColor = getBgColor(score);

  return (
    <div
      className={`relative overflow-hidden rounded-lg border ${borderColor} bg-card ${paddingClass} ${glowShadow} transition-all duration-300 hover:-translate-y-1`}
    >
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          {change !== undefined && (
            <div
              className={`flex items-center gap-1 text-xs font-mono ${
                change > 0
                  ? "text-green-500"
                  : change < 0
                    ? "text-red-500"
                    : "text-muted-foreground"
              }`}
            >
              {change > 0 ? "↑" : change < 0 ? "↓" : "−"}
              {change > 0 ? "+" : ""}
              {change}
            </div>
          )}
        </div>

        {/* Score */}
        <div className={`font-mono font-bold ${scoreSizeClass} ${scoreColor}`}>
          {displayScore}
          <span className="text-lg text-muted-foreground ml-1">/100</span>
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground font-mono truncate">
            {subtitle}
          </p>
        )}

        {/* Progress bar */}
        <div className="mt-3 h-1 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-1000 ease-out`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}
