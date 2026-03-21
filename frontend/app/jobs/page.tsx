'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import JobCard from '@/components/JobCard';
import { getLatestJobs, getLatestSnapshot } from '@/lib/api';
import { JobsResponse, SnapshotResponse, JobMatch } from '@/lib/types';
import { Briefcase, Filter, Search } from 'lucide-react';

export default function JobsPage() {
  const [jobsData, setJobsData] = useState<JobsResponse | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);

  useEffect(() => {
    loadJobs();
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
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-mono font-bold text-slate-200">
              JOBS <span className="text-amber-400">::</span> MARKET
            </h1>
            <p className="text-sm font-mono text-slate-500 mt-1">
              {jobsData ? `${jobsData.total} listings` : 'Loading...'} | 
              {jobsData?.date ? ` ${new Date(jobsData.date).toLocaleDateString()}` : ''}
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg bg-[#111118] border border-[#1e1e2e] text-sm text-slate-200 placeholder-slate-600 focus:border-amber-500/30 focus:outline-none font-mono"
              />
            </div>
            <button
              onClick={() => setRemoteOnly(!remoteOnly)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                remoteOnly 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                  : 'bg-[#111118] border-[#1e1e2e] text-slate-500 hover:text-slate-300'
              }`}
            >
              <Filter className="h-3 w-3" />
              REMOTE
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-6 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">MATCHED:</span>
            <span className="text-amber-400">
              {jobMatches.size} jobs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">FILTERED:</span>
            <span className="text-slate-300">
              {sortedJobs.length} shown
            </span>
          </div>
        </div>

        {/* Jobs Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-slate-500 font-mono">Loading jobs...</div>
          </div>
        ) : sortedJobs.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedJobs.map((job) => (
              <JobCard 
                key={job.id} 
                job={job} 
                match={jobMatches.get(job.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Briefcase className="h-12 w-12 mb-4 opacity-50" />
            <p className="font-mono">No jobs found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        )}
      </main>
    </div>
  );
}
