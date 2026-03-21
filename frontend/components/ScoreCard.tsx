'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ScoreCardProps {
  title: string;
  score: number;
  previousScore?: number;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ScoreCard({ 
  title, 
  score, 
  previousScore, 
  subtitle,
  size = 'md' 
}: ScoreCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-400';
    if (s >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getGlowClass = (s: number) => {
    if (s >= 80) return 'shadow-[0_0_30px_rgba(34,197,94,0.15)]';
    if (s >= 60) return 'shadow-[0_0_30px_rgba(251,191,36,0.15)]';
    return 'shadow-[0_0_30px_rgba(239,68,68,0.15)]';
  };

  const getBorderColor = (s: number) => {
    if (s >= 80) return 'border-green-500/30';
    if (s >= 60) return 'border-amber-500/30';
    return 'border-red-500/30';
  };

  const change = previousScore !== undefined ? score - previousScore : undefined;
  
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const scoreSizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl'
  };

  return (
    <div className={`
      relative overflow-hidden rounded-lg border bg-[#111118] ${sizeClasses[size]}
      ${getBorderColor(score)} ${getGlowClass(score)}
      transition-all hover:border-opacity-50
    `}>
      {/* Grid background */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(to right, #1e1e2e 1px, transparent 1px),
            linear-gradient(to bottom, #1e1e2e 1px, transparent 1px)
          `,
          backgroundSize: '10px 10px'
        }}
      />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
            {title}
          </span>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-mono ${
              change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-slate-500'
            }`}>
              {change > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : change < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {change > 0 ? '+' : ''}{change}
            </div>
          )}
        </div>

        {/* Score */}
        <div className={`font-mono font-bold ${scoreSizeClasses[size]} ${getScoreColor(score)}`}>
          {score}
          <span className="text-lg text-slate-600 ml-1">/100</span>
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 font-mono truncate">
            {subtitle}
          </p>
        )}

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-[#0a0a0f] rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${
              score >= 80 ? 'bg-green-400' : score >= 60 ? 'bg-amber-400' : 'bg-red-400'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}
