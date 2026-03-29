"use client";

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = "20px",
  className = "",
}: SkeletonProps) {
  return (
    <div
      style={{ width, height }}
      className={`bg-muted rounded-md animate-pulse ${className}`}
    />
  );
}

export function ScoreCardSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-border bg-card min-h-[120px]">
      <Skeleton width="60%" height="14px" />
      <div className="mt-4">
        <Skeleton width="40%" height="32px" />
      </div>
      <div className="mt-3">
        <Skeleton width="80%" height="12px" />
      </div>
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="glass-panel p-4 rounded-xl min-h-[160px]">
      <div className="flex justify-between items-start">
        <Skeleton width="70%" height="18px" />
        <Skeleton width="60px" height="20px" />
      </div>
      <div className="mt-2">
        <Skeleton width="40%" height="14px" />
      </div>
      <div className="mt-3 flex gap-2 flex-wrap">
        <Skeleton width="60px" height="20px" />
        <Skeleton width="80px" height="20px" />
        <Skeleton width="50px" height="20px" />
      </div>
      <div className="mt-4">
        <Skeleton width="100%" height="40px" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass-panel p-4 rounded-xl h-[300px] flex flex-col">
      <Skeleton width="30%" height="16px" />
      <div className="flex-1 mt-4 flex items-end gap-2">
        {[...Array(7)].map((_, i) => (
          <Skeleton
            key={i}
            width={`${Math.random() * 40 + 20}%`}
            height={`${Math.random() * 60 + 20}%`}
          />
        ))}
      </div>
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div className="glass-panel p-4 rounded-xl">
      <Skeleton width="40%" height="16px" />
      <div className="mt-4 grid grid-cols-7 gap-1">
        {[...Array(28)].map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded bg-muted animate-pulse"
            style={{ animationDelay: `${i * 0.05}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export function GapListSkeleton() {
  return (
    <div className="glass-panel p-4 rounded-xl">
      <Skeleton width="50%" height="16px" />
      <div className="mt-4 flex flex-col gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton width="30%" height="14px" />
            <Skeleton width="40px" height="14px" />
            <div className="flex-1">
              <Skeleton width="100%" height="8px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Skeleton width="200px" height="24px" />
        <div className="mt-2">
          <Skeleton width="300px" height="14px" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <ScoreCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <HeatmapSkeleton />
        <GapListSkeleton />
      </div>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="p-6 rounded-lg border border-destructive/30 bg-destructive/5 text-center">
      <p className="text-destructive font-mono text-sm mb-4">✗ {message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-md border border-destructive/30 bg-transparent text-destructive font-mono text-xs cursor-pointer hover:bg-destructive/10 transition-colors"
        >
          RETRY
        </button>
      )}
    </div>
  );
}
