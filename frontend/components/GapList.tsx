'use client';

import { SkillGap } from '@/lib/types';
import { AlertTriangle, ArrowUp, Minus, ArrowDown } from 'lucide-react';

interface GapListProps {
  gaps: SkillGap[];
}

export default function GapList({ gaps }: GapListProps) {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <ArrowUp className="h-3 w-3 text-red-400" />;
      case 'medium':
        return <Minus className="h-3 w-3 text-amber-400" />;
      default:
        return <ArrowDown className="h-3 w-3 text-slate-500" />;
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-500/30 bg-red-500/5';
      case 'medium':
        return 'border-amber-500/30 bg-amber-500/5';
      default:
        return 'border-slate-500/20 bg-slate-500/5';
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
    <div className="space-y-2">
      {sortedGaps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm font-mono">No skill gaps identified yet</p>
        </div>
      ) : (
        sortedGaps.map((gap, index) => (
          <div
            key={gap.skill}
            className={`flex items-center gap-3 p-3 rounded-lg border ${getPriorityClass(gap.priority)}`}
          >
            {/* Rank */}
            <span className="w-6 text-center text-xs font-mono text-slate-600">
              {index + 1}
            </span>

            {/* Priority indicator */}
            <div className="flex items-center justify-center w-6">
              {getPriorityIcon(gap.priority)}
            </div>

            {/* Skill info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-slate-200 truncate">
                  {gap.skill}
                </span>
                <span className={`
                  px-1.5 py-0.5 rounded text-[10px] font-mono uppercase
                  ${gap.priority === 'high' ? 'bg-red-500/20 text-red-400' : 
                    gap.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' : 
                    'bg-slate-500/20 text-slate-500'}
                `}>
                  {gap.priority}
                </span>
              </div>
              
              {/* Frequency bar */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 bg-[#0a0a0f] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      gap.priority === 'high' ? 'bg-red-400' : 
                      gap.priority === 'medium' ? 'bg-amber-400' : 
                      'bg-slate-500'
                    }`}
                    style={{ width: `${Math.min(100, (gap.frequency_in_market / 100) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-500">
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
