'use client';

import { NormalisedJob, JobMatch } from '@/lib/types';
import { ExternalLink, MapPin, DollarSign, Building2 } from 'lucide-react';

interface JobCardProps {
  job: NormalisedJob;
  match?: JobMatch;
}

export default function JobCard({ job, match }: JobCardProps) {
  const getMatchColor = (pct: number) => {
    if (pct >= 80) return 'text-green-400 bg-green-400/10 border-green-400/30';
    if (pct >= 60) return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
  };

  const formatSalary = () => {
    if (!job.salary_min && !job.salary_max) return null;
    const min = job.salary_min?.toLocaleString();
    const max = job.salary_max?.toLocaleString();
    const symbol = job.currency === 'USD' ? '$' : job.currency === 'EUR' ? '€' : '£';
    if (min && max && min !== max) return `${symbol}${min} - ${symbol}${max}`;
    return `${symbol}${min || max}`;
  };

  return (
    <div className="group relative rounded-lg border border-[#1e1e2e] bg-[#111118] p-4 transition-all hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(251,191,36,0.1)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title & Company */}
          <div className="flex items-start gap-2">
            <h3 className="font-mono text-sm font-semibold text-slate-200 truncate">
              {job.title}
            </h3>
            {match && (
              <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-mono border ${getMatchColor(match.match_pct)}`}>
                {match.match_pct}%
              </span>
            )}
          </div>
          
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            {job.company && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {job.company}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.location}
                {job.remote && <span className="text-green-400">(Remote)</span>}
              </span>
            )}
          </div>

          {/* Skills */}
          {job.required_skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.required_skills.slice(0, 5).map(skill => (
                <span 
                  key={skill}
                  className="px-2 py-0.5 rounded text-xs font-mono bg-[#0a0a0f] text-amber-400/80 border border-[#1e1e2e]"
                >
                  {skill}
                </span>
              ))}
              {job.required_skills.length > 5 && (
                <span className="px-2 py-0.5 rounded text-xs font-mono text-slate-600">
                  +{job.required_skills.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Match reasons */}
          {match && match.reasons.length > 0 && (
            <div className="mt-2 text-xs text-slate-500">
              <span className="text-green-400">Match:</span> {match.reasons.slice(0, 2).join(', ')}
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex flex-col items-end gap-2">
          {formatSalary() && (
            <span className="flex items-center gap-1 text-xs font-mono text-green-400">
              <DollarSign className="h-3 w-3" />
              {formatSalary()}
            </span>
          )}
          {job.seniority && (
            <span className="text-xs font-mono text-slate-500 uppercase">
              {job.seniority}
            </span>
          )}
          {job.url && (
            <a 
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded bg-[#0a0a0f] text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      {/* Source badge */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-mono text-slate-600 uppercase">
          {job.source}
        </span>
      </div>
    </div>
  );
}
