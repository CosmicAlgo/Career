'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useApplications, useApplicationStats, useApplicationMutations, useFollowUps } from '@/lib/swr-hooks';
import { ErrorState } from '@/components/Skeleton';
import { JobApplication, CreateApplicationRequest } from '@/lib/types';

const APPLICATION_STATUSES = [
  { id: 'interested', label: 'Interested', color: '#64748b' },
  { id: 'applied', label: 'Applied', color: '#fbbf24' },
  { id: 'phone_screen', label: 'Phone Screen', color: '#8b5cf6' },
  { id: 'technical', label: 'Technical', color: '#3b82f6' },
  { id: 'final', label: 'Final Round', color: '#10b981' },
  { id: 'offer', label: 'Offer', color: '#22c55e' },
  { id: 'rejected', label: 'Rejected', color: '#ef4444' },
];

const APPLICATION_SOURCES = [
  'manual', 'linkedin', 'indeed', 'glassdoor', 'company_careers', 'referral', 'other'
];

export default function ApplicationsPage() {
  const { applications, isLoading, error, mutate } = useApplications();
  const { stats, daysAnalyzed } = useApplicationStats();
  const { followUps, message: followUpMessage } = useFollowUps();
  const { create, update } = useApplicationMutations();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [formData, setFormData] = useState<CreateApplicationRequest>({
    job_title: '',
    company: '',
    source: 'manual',
    status: 'interested',
  });

  // Group applications by status
  const applicationsByStatus = APPLICATION_STATUSES.reduce((acc, status) => {
    acc[status.id] = applications.filter(app => app.status === status.id);
    return acc;
  }, {} as Record<string, JobApplication[]>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingApp) {
        await update(editingApp.id!, formData);
      } else {
        await create(formData);
      }
      setShowCreateForm(false);
      setEditingApp(null);
      setFormData({
        job_title: '',
        company: '',
        source: 'manual',
        status: 'interested',
      });
    } catch (err) {
      console.error('Failed to save application:', err);
    }
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      await update(appId, { status: newStatus });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const openEditForm = (app: JobApplication) => {
    setEditingApp(app);
    setFormData({
      job_title: app.job_title,
      company: app.company,
      source: app.source,
      status: app.status,
      notes: app.notes,
      salary_range: app.salary_range,
      location: app.location,
    });
    setShowCreateForm(true);
  };

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
        <Navbar />
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
          <ErrorState message="Failed to load applications" onRetry={() => mutate()} />
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
      <Navbar />
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
              APPLICATION TRACKER
            </h1>
            <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', marginTop: '4px' }}>
              Track your job applications through the hiring pipeline
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: '12px 24px',
              borderRadius: '6px',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              backgroundColor: 'rgba(251, 191, 36, 0.1)',
              color: '#fbbf24',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
            }}
          >
            + ADD APPLICATION
          </button>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px', 
            marginBottom: '24px' 
          }}>
            <div style={{ 
              padding: '16px', 
              borderRadius: '8px', 
              border: '1px solid #1e1e2e', 
              backgroundColor: '#111118' 
            }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#fbbf24' }}>{stats.total_applications}</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                Total Applications ({daysAnalyzed} days)
              </div>
            </div>
            <div style={{ 
              padding: '16px', 
              borderRadius: '8px', 
              border: '1px solid #1e1e2e', 
              backgroundColor: '#111118' 
            }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>{stats.response_rate.toFixed(1)}%</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                Response Rate
              </div>
            </div>
            <div style={{ 
              padding: '16px', 
              borderRadius: '8px', 
              border: '1px solid #1e1e2e', 
              backgroundColor: '#111118' 
            }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>{stats.interview_rate.toFixed(1)}%</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                Interview Rate
              </div>
            </div>
            <div style={{ 
              padding: '16px', 
              borderRadius: '8px', 
              border: '1px solid #1e1e2e', 
              backgroundColor: '#111118' 
            }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6' }}>{stats.offer_rate.toFixed(1)}%</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                Offer Rate
              </div>
            </div>
          </div>
        )}

        {/* Follow-ups Alert */}
        {followUps.length > 0 && (
          <div style={{ 
            padding: '16px', 
            borderRadius: '8px', 
            border: '1px solid rgba(251, 191, 36, 0.3)', 
            backgroundColor: 'rgba(251, 191, 36, 0.1)', 
            marginBottom: '24px' 
          }}>
            <div style={{ fontSize: '14px', color: '#fbbf24', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
              📌 {followUpMessage}
            </div>
          </div>
        )}

        {/* Kanban Board */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${APPLICATION_STATUSES.length}, 1fr)`, gap: '16px', overflowX: 'auto' }}>
          {APPLICATION_STATUSES.map(status => (
            <div key={status.id} style={{ 
              minWidth: '250px', 
              border: '1px solid #1e1e2e', 
              borderRadius: '8px', 
              backgroundColor: '#111118',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                padding: '12px', 
                borderBottom: '1px solid #1e1e2e',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: status.color, 
                  fontFamily: 'JetBrains Mono, monospace',
                  textTransform: 'uppercase'
                }}>
                  {status.label}
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  color: '#64748b', 
                  fontFamily: 'JetBrains Mono, monospace',
                  backgroundColor: '#1e1e2e',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {applicationsByStatus[status.id]?.length || 0}
                </div>
              </div>
              
              <div style={{ padding: '12px', flex: 1 }}>
                {applicationsByStatus[status.id]?.map(app => (
                  <div key={app.id} style={{ 
                    padding: '12px', 
                    borderRadius: '6px', 
                    border: '1px solid #1e1e2e', 
                    backgroundColor: '#0a0a0f',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} 
                  onClick={() => openEditForm(app)}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace', marginBottom: '4px' }}>
                      {app.job_title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#fbbf24', fontFamily: 'JetBrains Mono, monospace', marginBottom: '4px' }}>
                      {app.company}
                    </div>
                    {app.location && (
                      <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: '4px' }}>
                        📍 {app.location}
                      </div>
                    )}
                    {app.salary_range && (
                      <div style={{ fontSize: '10px', color: '#22c55e', fontFamily: 'JetBrains Mono, monospace', marginBottom: '4px' }}>
                        💰 {app.salary_range}
                      </div>
                    )}
                    {app.date_applied && (
                      <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                        Applied: {new Date(app.date_applied).toLocaleDateString()}
                      </div>
                    )}
                    
                    {/* Status change buttons */}
                    <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                      <select
                        value={app.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(app.id!, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: '10px',
                          fontFamily: 'JetBrains Mono, monospace',
                          padding: '4px',
                          borderRadius: '4px',
                          border: '1px solid #1e1e2e',
                          backgroundColor: '#0a0a0f',
                          color: '#e2e8f0',
                          cursor: 'pointer'
                        }}
                      >
                        {APPLICATION_STATUSES.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit Modal */}
        {showCreateForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: '#111118',
              border: '1px solid #1e1e2e',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <h2 style={{ fontSize: '18px', color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace', marginBottom: '16px' }}>
                {editingApp ? 'Edit Application' : 'Add New Application'}
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #1e1e2e',
                      backgroundColor: '#0a0a0f',
                      color: '#e2e8f0',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                    Company *
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #1e1e2e',
                      backgroundColor: '#0a0a0f',
                      color: '#e2e8f0',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                      Source
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #1e1e2e',
                        backgroundColor: '#0a0a0f',
                        color: '#e2e8f0',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '14px',
                      }}
                    >
                      {APPLICATION_SOURCES.map(source => (
                        <option key={source} value={source}>
                          {source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #1e1e2e',
                        backgroundColor: '#0a0a0f',
                        color: '#e2e8f0',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '14px',
                      }}
                    >
                      {APPLICATION_STATUSES.map(status => (
                        <option key={status.id} value={status.id}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g., London, Remote"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #1e1e2e',
                        backgroundColor: '#0a0a0f',
                        color: '#e2e8f0',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                      Salary Range
                    </label>
                    <input
                      type="text"
                      value={formData.salary_range || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, salary_range: e.target.value }))}
                      placeholder="e.g., £60k-£80k"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #1e1e2e',
                        backgroundColor: '#0a0a0f',
                        color: '#e2e8f0',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                    Notes
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    placeholder="Any additional notes..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #1e1e2e',
                      backgroundColor: '#0a0a0f',
                      color: '#e2e8f0',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '14px',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingApp(null);
                      setFormData({
                        job_title: '',
                        company: '',
                        source: 'manual',
                        status: 'interested',
                      });
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #1e1e2e',
                      backgroundColor: '#0a0a0f',
                      color: '#64748b',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      backgroundColor: 'rgba(251, 191, 36, 0.1)',
                      color: '#fbbf24',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {editingApp ? 'Update' : 'Create'} Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
