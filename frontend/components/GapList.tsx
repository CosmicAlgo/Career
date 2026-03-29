"use client";

import { SkillGap } from "@/lib/types";

interface GapListProps {
  gaps: SkillGap[];
}

export default function GapList({ gaps }: GapListProps) {
  const sortedGaps = [...gaps].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff =
      priorityOrder[a.priority as keyof typeof priorityOrder] -
      priorityOrder[b.priority as keyof typeof priorityOrder];
    if (priorityDiff !== 0) return priorityDiff;
    return b.frequency_in_market - a.frequency_in_market;
  });

  return (
    <div className="flex flex-col gap-2">
      {sortedGaps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <svg
            className="h-8 w-8 mb-2 opacity-50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-sm font-mono">No skill gaps identified yet</p>
        </div>
      ) : (
        sortedGaps.map((gap, index) => {
          const isHigh = gap.priority === "high";
          const isMed = gap.priority === "medium";

          const icon = isHigh ? "↑" : isMed ? "−" : "↓";
          const badgeColor = isHigh
            ? "text-red-500 bg-red-500/10"
            : isMed
              ? "text-amber-500 bg-amber-500/10"
              : "text-slate-500 bg-slate-500/10";
          const iconColor = isHigh
            ? "text-red-500"
            : isMed
              ? "text-amber-500"
              : "text-slate-500";
          const wrapperBorder = isHigh
            ? "border-red-500/30 bg-red-500/5"
            : isMed
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-border bg-background";
          const barColor = isHigh
            ? "bg-red-500"
            : isMed
              ? "bg-amber-500"
              : "bg-slate-500";

          return (
            <div
              key={gap.skill}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:-translate-y-0.5 ${wrapperBorder}`}
            >
              <span className="w-6 text-center text-xs font-mono text-muted-foreground">
                {index + 1}
              </span>

              <div className="flex items-center justify-center w-6">
                <span className={`text-sm font-bold ${iconColor}`}>{icon}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-foreground truncate">
                    {gap.skill}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${badgeColor}`}
                  >
                    {gap.priority}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{
                        width: `${Math.min(
                          100,
                          (gap.frequency_in_market / 100) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {gap.frequency_in_market} jobs
                  </span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
