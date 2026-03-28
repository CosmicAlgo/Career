'use client';

import { SkillTrendData } from '@/lib/types';

interface SkillHeatmapProps {
  data: SkillTrendData[];
  topSkills?: string[];
}

export default function SkillHeatmap({ data, topSkills }: SkillHeatmapProps) {
  const skills = Array.from(new Set(data.map(d => d.skill)));
  const dates = Array.from(new Set(data.map(d => d.date))).sort().slice(-7);
  
  const dataMap = new Map(data.map(d => [`${d.skill}-${d.date}`, d.frequency]));
  const maxFreq = Math.max(...data.map(d => d.frequency), 1);
  
  // Custom heatmap logic for tailwind classes instead of raw CSS
  const getIntensityClass = (skill: string, date: string) => {
    const freq = dataMap.get(`${skill}-${date}`) || 0;
    const intensity = freq / maxFreq;
    
    if (intensity === 0) return 'bg-background';
    if (intensity < 0.25) return 'bg-secondary/20';
    if (intensity < 0.5) return 'bg-secondary/40';
    if (intensity < 0.75) return 'bg-secondary/60';
    return 'bg-secondary/90';
  };
  
  const getTextColor = (skill: string, date: string) => {
    const freq = dataMap.get(`${skill}-${date}`) || 0;
    return freq / maxFreq > 0.5 ? 'text-black' : 'text-muted-foreground';
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };
  
  const sortedSkills = skills.sort((a, b) => {
    const aTotal = dates.reduce((sum, d) => sum + (dataMap.get(`${a}-${d}`) || 0), 0);
    const bTotal = dates.reduce((sum, d) => sum + (dataMap.get(`${b}-${d}`) || 0), 0);
    return bTotal - aTotal;
  }).slice(0, 15);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
        <span>RARE</span>
        <div className="flex gap-1">
          <div className="h-3 w-3 rounded-sm bg-background border border-border" />
          <div className="h-3 w-3 rounded-sm bg-secondary/20" />
          <div className="h-3 w-3 rounded-sm bg-secondary/40" />
          <div className="h-3 w-3 rounded-sm bg-secondary/60" />
          <div className="h-3 w-3 rounded-sm bg-secondary/90" />
        </div>
        <span>COMMON</span>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          <div className="grid" style={{ gridTemplateColumns: `120px repeat(${dates.length}, 1fr)` }}>
            <div className="py-1 px-2 text-xs font-mono text-muted-foreground uppercase">Skill</div>
            {dates.map(date => (
              <div key={date} className="py-1 px-2 text-xs font-mono text-muted-foreground text-center">
                {formatDate(date)}
              </div>
            ))}
          </div>
          
          {sortedSkills.map(skill => (
            <div 
              key={skill}
              className="grid border-b border-border/50 items-center hover:bg-muted/10 transition-colors"
              style={{ gridTemplateColumns: `120px repeat(${dates.length}, 1fr)` }}
            >
              <div className={`py-1.5 px-2 text-xs font-mono truncate flex items-center gap-1 ${
                topSkills?.includes(skill) ? 'text-secondary font-semibold' : 'text-muted-foreground'
              }`}>
                {topSkills?.includes(skill) && <span className="text-secondary">★</span>}
                {skill}
              </div>
              {dates.map(date => {
                const freq = dataMap.get(`${skill}-${date}`) || 0;
                return (
                  <div
                    key={`${skill}-${date}`}
                    className={`m-0.5 rounded-[2px] transition-all h-6 ${getIntensityClass(skill, date)} ${
                      freq > 0 ? 'cursor-pointer hover:ring-1 hover:ring-secondary/50 hover:z-10 relative' : 'cursor-default'
                    }`}
                    title={`${skill} on ${date}: ${freq} mentions`}
                  >
                    {freq > 0 && (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className={`text-[10px] font-mono ${getTextColor(skill, date)}`}>
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
