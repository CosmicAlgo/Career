'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import JobCard from '@/components/JobCard';
import { getLatestJobs, getLatestSnapshot } from '@/lib/api';
import { JobsResponse, SnapshotResponse, JobMatch } from '@/lib/types';

export default function JobsPage() {
  const [jobsData, setJobsData] = useState<JobsResponse | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);

  useEffect(() => {
    loadJobs();

    // Listen for sync completion to refetch data
    const handleRefetch = () => {
      loadJobs();
    };
    window.addEventListener('data-refetch', handleRefetch);
    
    return () => {
      window.removeEventListener('data-refetch', handleRefetch);
    };
  }, []);

  async function loadJobs() {
    try {
      setLoading(true);
      const [jobs, snap] = await Promise.all([
        getLatestJobs(100),
        getLatestSnapshot().catch(() => null)
      ]);
      setJobsData(jobs);
      setSnapshot(snap);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  }

  // Create a map of job matches from the snapshot
  const jobMatches = new Map<string, JobMatch>();
  snapshot?.assessment?.top_matching_jobs?.forEach(match => {
    jobMatches.set(match.job_id, match);
  });

  // Filter jobs
  const filteredJobs = jobsData?.jobs.filter(job => {
    const matchesFilter = !filter || 
      job.title.toLowerCase().includes(filter.toLowerCase()) ||
      job.company?.toLowerCase().includes(filter.toLowerCase()) ||
      job.required_skills.some(s => s.toLowerCase().includes(filter.toLowerCase()));
    
    const matchesRemote = !remoteOnly || job.remote;
    
    return matchesFilter && matchesRemote;
  }) || [];

  // Sort by match percentage if available
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const matchA = jobMatches.get(a.id)?.match_pct || 0;
    const matchB = jobMatches.get(b.id)?.match_pct || 0;
    return matchB - matchA;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
      <Navbar />
      
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#e2e8f0' }}>
              JOBS <span style={{ color: '#fbbf24' }}>::</span> MARKET
            </h1>
            <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', marginTop: '4px' }}>
              {jobsData ? `${jobsData.total} listings` : 'Loading...'} | 
              {jobsData?.date ? ` ${new Date(jobsData.date).toLocaleDateString()}` : ''}
            </p>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', height: '16px', width: '16px', color: '#64748b' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search jobs..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  padding: '8px 16px 8px 40px',
                  borderRadius: '8px',
                  border: '1px solid #1e1e2e',
                  backgroundColor: '#111118',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none'
                }}
              />
            </div>
            <button
              onClick={() => setRemoteOnly(!remoteOnly)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: remoteOnly ? 'rgba(34, 197, 94, 0.3)' : '#1e1e2e',
                backgroundColor: remoteOnly ? 'rgba(34, 197, 94, 0.1)' : '#111118',
                color: remoteOnly ? '#22c55e' : '#64748b',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer'
              }}
            >
              <svg style={{ height: '12px', width: '12px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              REMOTE
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#64748b' }}>MATCHED:</span>
            <span style={{ color: '#fbbf24' }}>
              {jobMatches.size} jobs
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#64748b' }}>FILTERED:</span>
            <span style={{ color: '#94a3b8' }}>
              {sortedJobs.length} shown
            </span>
          </div>
        </div>

        {/* Jobs Grid */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>Loading jobs...</div>
          </div>
        ) : sortedJobs.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
            {sortedJobs.map((job) => (
              <JobCard 
                key={job.id} 
                job={job} 
                match={jobMatches.get(job.id)}
              />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#64748b' }}>
            <svg style={{ height: '48px', width: '48px', marginBottom: '16px', opacity: 0.5 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            <p style={{ fontFamily: 'JetBrains Mono, monospace' }}>No jobs found</p>
            <p style={{ fontSize: '14px', marginTop: '4px' }}>Try adjusting your filters</p>
          </div>
        )}
      </main>
    </div>
  );
}
