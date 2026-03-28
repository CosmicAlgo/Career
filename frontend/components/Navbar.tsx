"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { usePipelineStatus, triggerSync } from "@/lib/swr-hooks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader2, RefreshCw, Radar } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { status, mutate: mutateStatus } = usePipelineStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

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
      await triggerSync(true);
      setToast({
        message: "Pipeline started — data will update in ~60s",
        type: "success",
      });
      mutateStatus();
    } catch (err) {
      setToast({ message: "Sync failed", type: "error" });
    } finally {
      setIsRefreshing(false);
    }
  }

  const navItems = [
    { href: "/", label: "DASHBOARD" },
    { href: "/trends", label: "TRENDS" },
    { href: "/jobs", label: "JOBS" },
    { href: "/applications", label: "APPLICATIONS" },
    { href: "/cv", label: "CV" },
    { href: "/gaps", label: "GAPS" },
    { href: "/settings", label: "SETTINGS" },
  ];

  const lastUpdated = (() => {
    if (!status?.latest_snapshot_date) return "---";
    const d = new Date(status.latest_snapshot_date);
    const dateStr = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
    const time = (status as any).latest_snapshot_time as string | undefined;
    return time ? `${dateStr} · ${time}` : dateStr;
  })();

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <Radar className="h-6 w-6 text-primary group-hover:animate-pulse" />
              <span className="font-display text-lg font-bold text-foreground tracking-tight">
                CareerRadar
              </span>
            </Link>

            <div className="flex items-center gap-1 hidden md:flex">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow-primary" />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-medium font-mono hidden sm:flex">
                <span className="text-muted-foreground">LAST SYNC:</span>
                <span
                  className={
                    status?.today_ran ? "text-green-500" : "text-primary"
                  }
                >
                  {lastUpdated}
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    status?.today_ran
                      ? "bg-green-500"
                      : "bg-primary shadow-glow-primary"
                  }`}
                />
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-muted-foreground font-mono text-xs font-medium transition-all ${
                  isRefreshing
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-accent hover:text-foreground"
                }`}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span>{isRefreshing ? "SYNCING..." : "SYNC"}</span>
              </button>

              <div className="w-px h-6 bg-border mx-1"></div>

              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[100] px-6 py-3 rounded-lg text-sm font-medium shadow-lg transition-transform duration-300 transform translate-y-0 ${
            toast.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
          }`}
        >
          {toast.type === "success" ? "✓ " : "✗ "}
          {toast.message}
        </div>
      )}
    </>
  );
}
