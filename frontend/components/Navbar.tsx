'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radar, TrendingUp, Briefcase, AlertTriangle, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getPipelineStatus, triggerRefresh } from '@/lib/api';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Radar },
  { href: '/trends', label: 'Trends', icon: TrendingUp },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/gaps', label: 'Gaps', icon: AlertTriangle },
];

export default function Navbar() {
  const pathname = usePathname();
  const [lastUpdated, setLastUpdated] = useState<string>('---');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState<{ today_ran: boolean } | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const data = await getPipelineStatus();
      setStatus(data);
      if (data.latest_snapshot_date) {
        const date = new Date(data.latest_snapshot_date);
        setLastUpdated(date.toLocaleDateString());
      }
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await triggerRefresh();
      await loadStatus();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-[#1e1e2e] bg-[#0a0a0f]/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Radar className="h-6 w-6 text-amber-400" />
              <div className="absolute inset-0 h-6 w-6 animate-ping rounded-full bg-amber-400/20" />
            </div>
            <span className="font-mono text-lg font-semibold text-amber-400 tracking-tight">
              CareerRadar
            </span>
            <span className="hidden sm:inline text-xs text-slate-500 font-mono">
              v1.0.0
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-mono transition-all ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {isActive && (
                    <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Status & Refresh */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-500">LAST SYNC:</span>
              <span className={status?.today_ran ? 'text-green-400' : 'text-amber-400'}>
                {lastUpdated}
              </span>
              <span className={`h-2 w-2 rounded-full ${status?.today_ran ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`} />
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#1e1e2e] bg-[#111118] text-slate-400 hover:text-amber-400 hover:border-amber-500/30 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline text-xs font-mono">
                {isRefreshing ? 'SYNCING...' : 'SYNC'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-[#1e1e2e]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-mono ${
                  isActive ? 'text-amber-400' : 'text-slate-500'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
