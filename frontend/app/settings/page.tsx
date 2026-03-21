'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useSettings } from '@/lib/swr-hooks';
import { ErrorState } from '@/components/Skeleton';

const AVAILABLE_ROLES = [
  { id: 'ml_engineer', label: 'ML Engineer' },
  { id: 'mlops', label: 'MLOps' },
  { id: 'devops', label: 'DevOps' },
  { id: 'backend', label: 'Backend' },
  { id: 'frontend', label: 'Frontend' },
  { id: 'fullstack', label: 'Full Stack' },
  { id: 'data_engineer', label: 'Data Engineer' },
];

const AVAILABLE_LOCATIONS = [
  { id: 'UK', label: 'UK' },
  { id: 'US', label: 'US' },
  { id: 'EU', label: 'EU' },
  { id: 'Remote', label: 'Remote' },
  { id: 'London', label: 'London' },
  { id: 'New York', label: 'New York' },
  { id: 'San Francisco', label: 'San Francisco' },
];

const SENIORITY_LEVELS = [
  { id: 'junior', label: 'Junior' },
  { id: 'mid', label: 'Mid-level' },
  { id: 'senior', label: 'Senior' },
  { id: 'lead', label: 'Lead' },
  { id: 'staff', label: 'Staff+' },
];

export default function SettingsPage() {
  const { settings, isLoading, error, update, mutate } = useSettings();
  const [formData, setFormData] = useState({
    github_username: '',
    target_roles: [] as string[],
    target_locations: [] as string[],
    target_seniority: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        github_username: settings.github_username || '',
        target_roles: settings.target_roles || [],
        target_locations: settings.target_locations || [],
        target_seniority: settings.target_seniority || [],
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await update(formData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelection = (field: 'target_roles' | 'target_locations' | 'target_seniority', value: string) => {
    setFormData(prev => {
      const current = prev[field];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
        <Navbar />
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
          <ErrorState message="Failed to load settings" onRetry={() => mutate()} />
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f', animation: 'fadeIn 0.2s ease-out' }}>
      <Navbar />
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
            CONFIG <span style={{ color: '#fbbf24' }}>::</span> SETTINGS
          </h1>
          <p style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#64748b', marginTop: '4px' }}>
            Customize your CareerRadar experience
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* GitHub Username */}
          <div style={{ 
            borderRadius: '8px', 
            border: '1px solid #1e1e2e', 
            backgroundColor: '#111118', 
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h2 style={{ 
              fontSize: '16px', 
              fontFamily: 'JetBrains Mono, monospace', 
              fontWeight: 600, 
              color: '#e2e8f0', 
              margin: '0 0 16px 0',
              textTransform: 'uppercase'
            }}>
              GitHub Profile
            </h2>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
              Username
            </label>
            <input
              type="text"
              value={formData.github_username}
              onChange={(e) => setFormData(prev => ({ ...prev, github_username: e.target.value }))}
              placeholder="e.g., octocat"
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '12px 16px',
                borderRadius: '6px',
                border: '1px solid #1e1e2e',
                backgroundColor: '#0a0a0f',
                color: '#e2e8f0',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Target Roles */}
          <div style={{ 
            borderRadius: '8px', 
            border: '1px solid #1e1e2e', 
            backgroundColor: '#111118', 
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h2 style={{ 
              fontSize: '16px', 
              fontFamily: 'JetBrains Mono, monospace', 
              fontWeight: 600, 
              color: '#e2e8f0', 
              margin: '0 0 16px 0',
              textTransform: 'uppercase'
            }}>
              Target Roles
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', fontFamily: 'JetBrains Mono, monospace' }}>
              Select roles you&apos;re interested in for job matching
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {AVAILABLE_ROLES.map(role => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleSelection('target_roles', role.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: formData.target_roles.includes(role.id) ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid #1e1e2e',
                    backgroundColor: formData.target_roles.includes(role.id) ? 'rgba(251, 191, 36, 0.1)' : '#0a0a0f',
                    color: formData.target_roles.includes(role.id) ? '#fbbf24' : '#64748b',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Locations */}
          <div style={{ 
            borderRadius: '8px', 
            border: '1px solid #1e1e2e', 
            backgroundColor: '#111118', 
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h2 style={{ 
              fontSize: '16px', 
              fontFamily: 'JetBrains Mono, monospace', 
              fontWeight: 600, 
              color: '#e2e8f0', 
              margin: '0 0 16px 0',
              textTransform: 'uppercase'
            }}>
              Target Locations
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', fontFamily: 'JetBrains Mono, monospace' }}>
              Select preferred job locations
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {AVAILABLE_LOCATIONS.map(loc => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => toggleSelection('target_locations', loc.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: formData.target_locations.includes(loc.id) ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid #1e1e2e',
                    backgroundColor: formData.target_locations.includes(loc.id) ? 'rgba(251, 191, 36, 0.1)' : '#0a0a0f',
                    color: formData.target_locations.includes(loc.id) ? '#fbbf24' : '#64748b',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Seniority Levels */}
          <div style={{ 
            borderRadius: '8px', 
            border: '1px solid #1e1e2e', 
            backgroundColor: '#111118', 
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h2 style={{ 
              fontSize: '16px', 
              fontFamily: 'JetBrains Mono, monospace', 
              fontWeight: 600, 
              color: '#e2e8f0', 
              margin: '0 0 16px 0',
              textTransform: 'uppercase'
            }}>
              Seniority Levels
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', fontFamily: 'JetBrains Mono, monospace' }}>
              Select seniority levels you&apos;re targeting
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SENIORITY_LEVELS.map(level => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => toggleSelection('target_seniority', level.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: formData.target_seniority.includes(level.id) ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid #1e1e2e',
                    backgroundColor: formData.target_seniority.includes(level.id) ? 'rgba(251, 191, 36, 0.1)' : '#0a0a0f',
                    color: formData.target_seniority.includes(level.id) ? '#fbbf24' : '#64748b',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              type="submit"
              disabled={isSaving || isLoading}
              style={{
                padding: '12px 24px',
                borderRadius: '6px',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                color: '#fbbf24',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSaving || isLoading ? 'not-allowed' : 'pointer',
                opacity: isSaving || isLoading ? 0.6 : 1,
                transition: 'all 0.2s',
                textTransform: 'uppercase',
              }}
            >
              {isSaving ? 'SAVING...' : 'SAVE SETTINGS'}
            </button>
            {showSuccess && (
              <span style={{ fontSize: '14px', color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>
                ✓ Settings saved successfully
              </span>
            )}
          </div>
        </form>
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
