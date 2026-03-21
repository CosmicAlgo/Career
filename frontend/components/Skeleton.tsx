'use client';

/**
 * Skeleton Loading Components
 * Bloomberg terminal style loading placeholders
 */

const skeletonBg = '#1e1e2e';
const shimmer = 'rgba(251, 191, 36, 0.1)';

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ width = '100%', height = '20px' }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: skeletonBg,
        borderRadius: '4px',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

export function ScoreCardSkeleton() {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #1e1e2e',
        backgroundColor: '#111118',
        minHeight: '120px',
      }}
    >
      <Skeleton width="60%" height="14px" />
      <div style={{ marginTop: '16px' }}>
        <Skeleton width="40%" height="32px" />
      </div>
      <div style={{ marginTop: '12px' }}>
        <Skeleton width="80%" height="12px" />
      </div>
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #1e1e2e',
        backgroundColor: '#111118',
        minHeight: '160px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Skeleton width="70%" height="18px" />
        <Skeleton width="60px" height="20px" />
      </div>
      <div style={{ marginTop: '8px' }}>
        <Skeleton width="40%" height="14px" />
      </div>
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Skeleton width="60px" height="20px" />
        <Skeleton width="80px" height="20px" />
        <Skeleton width="50px" height="20px" />
      </div>
      <div style={{ marginTop: '12px' }}>
        <Skeleton width="100%" height="40px" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #1e1e2e',
        backgroundColor: '#111118',
        height: '300px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Skeleton width="30%" height="16px" />
      <div style={{ flex: 1, marginTop: '16px', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} width={`${Math.random() * 40 + 20}%`} height={`${Math.random() * 60 + 20}%`} />
        ))}
      </div>
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #1e1e2e',
        backgroundColor: '#111118',
      }}
    >
      <Skeleton width="40%" height="16px" />
      <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {[...Array(28)].map((_, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '1',
              borderRadius: '4px',
              backgroundColor: skeletonBg,
              animation: 'shimmer 1.5s infinite',
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function GapListSkeleton() {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #1e1e2e',
        backgroundColor: '#111118',
      }}
    >
      <Skeleton width="50%" height="16px" />
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Skeleton width="30%" height="14px" />
            <Skeleton width="40px" height="14px" />
            <div style={{ flex: 1 }}>
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
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Skeleton width="200px" height="24px" />
        <div style={{ marginTop: '8px' }}>
          <Skeleton width="300px" height="14px" />
        </div>
      </div>

      {/* Score Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {[...Array(4)].map((_, i) => (
          <ScoreCardSkeleton key={i} />
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <ChartSkeleton />
        <HeatmapSkeleton />
        <GapListSkeleton />
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      style={{
        padding: '24px',
        borderRadius: '8px',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        textAlign: 'center',
      }}
    >
      <p style={{ color: '#ef4444', fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', marginBottom: '16px' }}>
        ✗ {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            backgroundColor: 'transparent',
            color: '#ef4444',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          RETRY
        </button>
      )}
    </div>
  );
}
