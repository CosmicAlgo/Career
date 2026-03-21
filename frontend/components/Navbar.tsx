'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { usePipelineStatus, triggerSync } from '@/lib/swr-hooks';

export default function Navbar() {
  const pathname = usePathname();
  const { status, mutate: mutateStatus } = usePipelineStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await triggerSync();
      await mutateStatus();
      setToast({ message: 'Sync complete', type: 'success' });
    } catch (err) {
      setToast({ message: 'Sync failed', type: 'error' });
    } finally {
      setIsRefreshing(false);
    }
  }

  const navItems = [
    { href: '/', label: 'DASHBOARD' },
    { href: '/trends', label: 'TRENDS' },
    { href: '/jobs', label: 'JOBS' },
    { href: '/gaps', label: 'GAPS' },
    { href: '/settings', label: 'SETTINGS' },
  ];

  const amberColor = '#fbbf24';
  const terminalBg = '#0a0a0f';
  const terminalBorder = '#1e1e2e';
  const slate400 = '#94a3b8';
  const slate500 = '#64748b';
  const green400 = '#22c55e';

  const lastUpdated = status?.latest_snapshot_date 
    ? new Date(status.latest_snapshot_date).toLocaleDateString() 
    : '---';

  return (
    <>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${terminalBorder}`, backgroundColor: `${terminalBg}f2`, backdropFilter: 'blur(4px)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', height: '56px', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <svg style={{ height: '24px', width: '24px', color: amberColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
              </svg>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 600, color: amberColor, letterSpacing: '-0.025em' }}>
                CareerRadar
              </span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono, monospace',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                      border: isActive ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid transparent',
                      backgroundColor: isActive ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
                      color: isActive ? amberColor : slate400
                    }}
                  >
                    {item.label}
                    {isActive && <span style={{ marginLeft: '4px', height: '6px', width: '6px', borderRadius: '50%', backgroundColor: amberColor }} />}
                  </Link>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
                <span style={{ color: slate500 }}>LAST SYNC:</span>
                <span style={{ color: status?.today_ran ? green400 : amberColor }}>{lastUpdated}</span>
                <span style={{ height: '8px', width: '8px', borderRadius: '50%', backgroundColor: status?.today_ran ? green400 : amberColor }} />
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${terminalBorder}`,
                  backgroundColor: '#111118',
                  color: slate400,
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  cursor: isRefreshing ? 'not-allowed' : 'pointer',
                  opacity: isRefreshing ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {isRefreshing ? (
                  <svg style={{ height: '16px', width: '16px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
                  </svg>
                ) : (
                  <svg style={{ height: '16px', width: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M21 12v9m0-9h-9"/>
                  </svg>
                )}
                <span>{isRefreshing ? 'SYNCING...' : 'SYNC'}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 100,
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '14px',
          fontFamily: 'JetBrains Mono, monospace',
          backgroundColor: toast.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: toast.type === 'success' ? '#22c55e' : '#ef4444',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.type === 'success' ? '✓ ' : '✗ '}{toast.message}
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
