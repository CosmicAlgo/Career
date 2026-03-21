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
  
  const getIntensityColor = (skill: string, date: string) => {
    const freq = dataMap.get(`${skill}-${date}`) || 0;
    const intensity = freq / maxFreq;
    
    // Color scale from dark to amber
    if (intensity === 0) return '#0a0a0f';
    if (intensity < 0.25) return 'rgba(251, 191, 36, 0.1)';
    if (intensity < 0.5) return 'rgba(251, 191, 36, 0.25)';
    if (intensity < 0.75) return 'rgba(251, 191, 36, 0.4)';
    return 'rgba(251, 191, 36, 0.6)';
  };
  
  const getTextColor = (freq: number) => {
    return freq / maxFreq > 0.5 ? '#0a0a0f' : '#94a3b8';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>
        <span>RARE</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <div style={{ height: '12px', width: '12px', borderRadius: '2px', backgroundColor: '#0a0a0f', border: '1px solid #1e1e2e' }} />
          <div style={{ height: '12px', width: '12px', borderRadius: '2px', backgroundColor: 'rgba(251, 191, 36, 0.1)' }} />
          <div style={{ height: '12px', width: '12px', borderRadius: '2px', backgroundColor: 'rgba(251, 191, 36, 0.25)' }} />
          <div style={{ height: '12px', width: '12px', borderRadius: '2px', backgroundColor: 'rgba(251, 191, 36, 0.4)' }} />
          <div style={{ height: '12px', width: '12px', borderRadius: '2px', backgroundColor: 'rgba(251, 191, 36, 0.6)' }} />
        </div>
        <span>COMMON</span>
      </div>
      
      {/* Heatmap Grid */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: '400px' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${dates.length}, 1fr)` }}>
            <div style={{ padding: '4px 8px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#475569', textTransform: 'uppercase' }}>Skill</div>
            {dates.map(date => (
              <div key={date} style={{ padding: '4px 8px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', textAlign: 'center' }}>
                {formatDate(date)}
              </div>
            ))}
          </div>
          
          {/* Skill rows */}
          {sortedSkills.map(skill => (
            <div 
              key={skill}
              style={{ 
                display: 'grid', 
                gridTemplateColumns: `120px repeat(${dates.length}, 1fr)`,
                borderBottom: '1px solid #1e1e2e'
              }}
            >
              <div style={{
                padding: '6px 8px',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: topSkills?.includes(skill) ? '#fbbf24' : '#94a3b8',
                fontWeight: topSkills?.includes(skill) ? 600 : 400
              }}>
                {topSkills?.includes(skill) && <span style={{ color: '#fbbf24' }}>★</span>}
                {skill}
              </div>
              {dates.map(date => {
                const freq = dataMap.get(`${skill}-${date}`) || 0;
                const bgColor = getIntensityColor(skill, date);
                const textColor = getTextColor(freq);
                return (
                  <div
                    key={`${skill}-${date}`}
                    style={{
                      margin: '2px',
                      borderRadius: '2px',
                      transition: 'all 0.2s',
                      backgroundColor: bgColor,
                      cursor: freq > 0 ? 'pointer' : 'default',
                      border: freq > 0 ? '1px solid transparent' : 'none'
                    }}
                    title={`${skill} on ${date}: ${freq} mentions`}
                  >
                    {freq > 0 && (
                      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: textColor }}>
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
