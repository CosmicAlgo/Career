'use client';

import { SkillTrendData } from '@/lib/types';

interface SkillHeatmapProps {
  data: SkillTrendData[];
  topSkills?: string[];
}

export default function SkillHeatmap({ data, topSkills }: SkillHeatmapProps) {
  // Get unique skills and dates
  const skills = Array.from(new Set(data.map(d => d.skill)));
  const dates = Array.from(new Set(data.map(d => d.date))).sort().slice(-7); // Last 7 days
  
  // Create a map for quick lookup
  const dataMap = new Map(data.map(d => [`${d.skill}-${d.date}`, d.frequency]));
  
  // Get max frequency for normalization
  const maxFreq = Math.max(...data.map(d => d.frequency), 1);
  
  const getIntensity = (skill: string, date: string) => {
    const freq = dataMap.get(`${skill}-${date}`) || 0;
    const intensity = freq / maxFreq;
    
    // Color scale from dark to amber
    if (intensity === 0) return 'bg-[#0a0a0f]';
    if (intensity < 0.25) return 'bg-amber-500/10';
    if (intensity < 0.5) return 'bg-amber-500/25';
    if (intensity < 0.75) return 'bg-amber-500/40';
    return 'bg-amber-500/60';
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };
  
  // Sort skills by total frequency (most mentioned first)
  const sortedSkills = skills.sort((a, b) => {
    const aTotal = dates.reduce((sum, d) => sum + (dataMap.get(`${a}-${d}`) || 0), 0);
    const bTotal = dates.reduce((sum, d) => sum + (dataMap.get(`${b}-${d}`) || 0), 0);
    return bTotal - aTotal;
  }).slice(0, 15); // Top 15 skills

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
        <span>RARE</span>
        <div className="flex gap-1">
          <div className="h-3 w-3 rounded-sm bg-[#0a0a0f] border border-[#1e1e2e]" />
          <div className="h-3 w-3 rounded-sm bg-amber-500/10" />
          <div className="h-3 w-3 rounded-sm bg-amber-500/25" />
          <div className="h-3 w-3 rounded-sm bg-amber-500/40" />
          <div className="h-3 w-3 rounded-sm bg-amber-500/60" />
        </div>
        <span>COMMON</span>
      </div>
      
      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          {/* Header row */}
          <div className="grid" style={{ gridTemplateColumns: `120px repeat(${dates.length}, 1fr)` }}>
            <div className="px-2 py-1 text-xs font-mono text-slate-600 uppercase">Skill</div>
            {dates.map(date => (
              <div key={date} className="px-2 py-1 text-xs font-mono text-slate-500 text-center">
                {formatDate(date)}
              </div>
            ))}
          </div>
          
          {/* Skill rows */}
          {sortedSkills.map(skill => (
            <div 
              key={skill}
              className="grid border-b border-[#1e1e2e] last:border-0"
              style={{ gridTemplateColumns: `120px repeat(${dates.length}, 1fr)` }}
            >
              <div className={`
                px-2 py-1.5 text-xs font-mono truncate flex items-center gap-1
                ${topSkills?.includes(skill) ? 'text-amber-400 font-semibold' : 'text-slate-400'}
              `}>
                {topSkills?.includes(skill) && <span className="text-amber-400">★</span>}
                {skill}
              </div>
              {dates.map(date => {
                const freq = dataMap.get(`${skill}-${date}`) || 0;
                return (
                  <div
                    key={`${skill}-${date}`}
                    className={`
                      m-0.5 rounded-sm transition-all
                      ${getIntensity(skill, date)}
                      ${freq > 0 ? 'cursor-pointer hover:ring-1 hover:ring-amber-500/50' : ''}
                    `}
                    title={`${skill} on ${date}: ${freq} mentions`}
                  >
                    {freq > 0 && (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className={`
                          text-[10px] font-mono
                          ${freq / maxFreq > 0.5 ? 'text-slate-900' : 'text-slate-400'}
                        `}>
                          {freq}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
