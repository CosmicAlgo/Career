'use client';

import { useState, useEffect } from 'react';

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
  const [displayScore, setDisplayScore] = useState(0);
  
  useEffect(() => {
    const duration = 1000; // 1 second animation
    const steps = 30;
    const increment = score / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [score]);
  const getScoreColor = (s: number) => {
    if (s >= 80) return '#22c55e';
    if (s >= 60) return '#fbbf24';
    return '#ef4444';
  };

  const getGlowShadow = (s: number) => {
    if (s >= 80) return '0 0 30px rgba(34, 197, 94, 0.15)';
    if (s >= 60) return '0 0 30px rgba(251, 191, 36, 0.15)';
    return '0 0 30px rgba(239, 68, 68, 0.15)';
  };

  const getBorderColor = (s: number) => {
    if (s >= 80) return 'rgba(34, 197, 94, 0.3)';
    if (s >= 60) return 'rgba(251, 191, 36, 0.3)';
    return 'rgba(239, 68, 68, 0.3)';
  };

  const change = previousScore !== undefined ? score - previousScore : undefined;
  
  const padding = size === 'sm' ? '12px' : size === 'md' ? '16px' : '24px';
  const scoreSize = size === 'sm' ? '24px' : size === 'md' ? '36px' : '60px';

  const scoreColor = getScoreColor(score);
  const borderColor = getBorderColor(score);
  const glowShadow = getGlowShadow(score);

  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '8px',
      border: `1px solid ${borderColor}`,
      backgroundColor: '#111118',
      padding: padding,
      boxShadow: glowShadow,
      transition: 'all 0.2s'
    }}>
      {/* Grid background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.05,
        backgroundImage: `linear-gradient(to right, #1e1e2e 1px, transparent 1px), linear-gradient(to bottom, #1e1e2e 1px, transparent 1px)`,
        backgroundSize: '10px 10px'
      }} />
      
      <div style={{ position: 'relative' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ 
            fontSize: '12px', 
            fontFamily: 'JetBrains Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#64748b'
          }}>
            {title}
          </span>
          {change !== undefined && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              fontSize: '12px', 
              fontFamily: 'JetBrains Mono, monospace',
              color: change > 0 ? '#22c55e' : change < 0 ? '#ef4444' : '#64748b'
            }}>
              {change > 0 ? '↑' : change < 0 ? '↓' : '−'}
              {change > 0 ? '+' : ''}{change}
            </div>
          )}
        </div>

        {/* Score */}
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 700,
          fontSize: scoreSize,
          color: scoreColor
        }}>
          {displayScore}
          <span style={{ fontSize: '18px', color: '#475569', marginLeft: '4px' }}>/100</span>
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p style={{ 
            marginTop: '4px', 
            fontSize: '12px', 
            color: '#64748b', 
            fontFamily: 'JetBrains Mono, monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {subtitle}
          </p>
        )}

        {/* Progress bar */}
        <div style={{ marginTop: '12px', height: '4px', backgroundColor: '#0a0a0f', borderRadius: '9999px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            backgroundColor: scoreColor,
            width: `${score}%`,
            transition: 'all 1s ease-out'
          }} />
        </div>
      </div>
    </div>
  );
}
