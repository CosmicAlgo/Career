'use client';

import Navbar from '@/components/Navbar';
import JobCard from '@/components/JobCard';
import { useJobs } from '@/lib/swr-hooks';
import { JobCardSkeleton, ErrorState } from '@/components/Skeleton';

export default function JobsPage() {
  const { jobs, isLoading, error, mutate } = useJobs(100);

  if (error && !jobs) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
        <Navbar />
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
          <ErrorState message="Failed to load jobs. Run the pipeline first." onRetry={() => mutate()} />
        </main>
      </div>
    );
  }

  if (isLoading && !jobs) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
        <Navbar />
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ width: '180px', height: '28px', backgroundColor: '#1e1e2e', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
            <div style={{ marginTop: '8px', width: '250px', height: '16px', backgroundColor: '#1e1e2e', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {[...Array(6)].map((_, i) => <JobCardSkeleton key={i} />)}
          </div>
        </main>
        <style jsx global>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
        <Navbar />
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
          <ErrorState message="Failed to load job listings" onRetry={() => mutate()} />
        </main>
      </div>
    );
  }

  const jobCount = jobs?.jobs?.length || 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
      <Navbar />
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
            JOB <span style={{ color: '#fbbf24' }}>::</span> LISTINGS
          </h1>
          <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', marginTop: '4px' }}>
            {jobCount > 0 ? `> ${jobCount} positions found` : '> No jobs available'}
          </p>
        </div>

        {jobCount > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {jobs.jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>
              No jobs available. Run a sync to fetch job listings.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
