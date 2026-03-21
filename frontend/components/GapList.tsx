'use client';

import { SkillGap } from '@/lib/types';

interface GapListProps {
  gaps: SkillGap[];
}

export default function GapList({ gaps }: GapListProps) {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '↑';
      case 'medium':
        return '−';
      default:
        return '↓';
    }
  };

  const getPriorityIconColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#fbbf24';
      default:
        return '#64748b';
    }
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case 'high':
        return '1px solid rgba(239, 68, 68, 0.3)';
      case 'medium':
        return '1px solid rgba(251, 191, 36, 0.3)';
      default:
        return '1px solid rgba(100, 116, 139, 0.2)';
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'rgba(239, 68, 68, 0.05)';
      case 'medium':
        return 'rgba(251, 191, 36, 0.05)';
      default:
        return 'rgba(100, 116, 139, 0.05)';
    }
  };

  const getPriorityBadgeBg = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'rgba(239, 68, 68, 0.2)';
      case 'medium':
        return 'rgba(251, 191, 36, 0.2)';
      default:
        return 'rgba(100, 116, 139, 0.2)';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#fbbf24';
      default:
        return '#64748b';
    }
  };

  const getBarColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#fbbf24';
      default:
        return '#64748b';
    }
  };

  const sortedGaps = [...gaps].sort((a, b) => {
    // Sort by priority first, then by frequency
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    if (priorityDiff !== 0) return priorityDiff;
    return b.frequency_in_market - a.frequency_in_market;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {sortedGaps.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', color: '#64748b' }}>
          <svg style={{ height: '32px', width: '32px', marginBottom: '8px', opacity: 0.5 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace' }}>No skill gaps identified yet</p>
        </div>
      ) : (
        sortedGaps.map((gap, index) => (
          <div
            key={gap.skill}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              border: getPriorityBorder(gap.priority),
              backgroundColor: getPriorityBg(gap.priority)
            }}
          >
            {/* Rank */}
            <span style={{ width: '24px', textAlign: 'center', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#475569' }}>
              {index + 1}
            </span>

            {/* Priority indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px' }}>
              <span style={{ fontSize: '14px', color: getPriorityIconColor(gap.priority) }}>
                {getPriorityIcon(gap.priority)}
              </span>
            </div>

            {/* Skill info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {gap.skill}
                </span>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  textTransform: 'uppercase',
                  backgroundColor: getPriorityBadgeBg(gap.priority),
                  color: getPriorityBadgeColor(gap.priority)
                }}>
                  {gap.priority}
                </span>
              </div>
              
              {/* Frequency bar */}
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '4px', backgroundColor: '#0a0a0f', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: '9999px',
                    backgroundColor: getBarColor(gap.priority),
                    width: `${Math.min(100, (gap.frequency_in_market / 100) * 100)}%`
                  }} />
                </div>
                <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>
                  {gap.frequency_in_market} jobs
                </span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
