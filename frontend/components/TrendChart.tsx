'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TrendData } from '@/lib/types';

interface TrendChartProps {
  data: TrendData[];
  roles: string[];
}

const roleColors: Record<string, string> = {
  overall: '#fbbf24',
  ml_engineer: '#22c55e',
  mlops: '#3b82f6',
  devops: '#f59e0b',
  backend: '#a855f7',
  data_engineer: '#ec4899',
  sre: '#06b6d4',
};

export default function TrendChart({ data, roles }: TrendChartProps) {
  // Transform data for Recharts
  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    overall: d.overall_score,
    ...d.role_scores
  })).reverse();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#111118',
          border: '1px solid #1e1e2e',
          borderRadius: '6px',
          padding: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
        }}>
          <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', marginBottom: '8px' }}>{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <span 
                style={{ height: '8px', width: '8px', borderRadius: '50%', backgroundColor: entry.color }}
              />
              <span style={{ color: '#cbd5e1', fontFamily: 'JetBrains Mono, monospace', textTransform: 'capitalize' }}>
                {entry.dataKey.replace(/_/g, ' ')}:
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: entry.color }}>
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#1e1e2e" 
            vertical={false}
          />
          <XAxis 
            dataKey="date" 
            stroke="#64748b"
            fontSize={10}
            fontFamily="JetBrains Mono, monospace"
            tickLine={false}
            axisLine={{ stroke: '#1e1e2e' }}
          />
          <YAxis 
            domain={[0, 100]}
            stroke="#64748b"
            fontSize={10}
            fontFamily="JetBrains Mono, monospace"
            tickLine={false}
            axisLine={{ stroke: '#1e1e2e' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ 
              fontSize: '10px', 
              fontFamily: 'JetBrains Mono, monospace',
              paddingTop: '10px'
            }}
          />
          
          {/* Overall score line */}
          <Line
            type="monotone"
            dataKey="overall"
            name="Overall"
            stroke={roleColors.overall}
            strokeWidth={2}
            dot={{ fill: roleColors.overall, strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, stroke: roleColors.overall, strokeWidth: 2 }}
          />
          
          {/* Role score lines */}
          {roles.map(role => (
            <Line
              key={role}
              type="monotone"
              dataKey={role}
              name={role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              stroke={roleColors[role] || '#64748b'}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
