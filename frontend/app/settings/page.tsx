"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useSettings } from "@/lib/swr-hooks";
import { ErrorState } from "@/components/Skeleton";
import { Settings, MapPin, BarChart2, User, CheckCircle2 } from "lucide-react";

const AVAILABLE_ROLES = [
  { id: "ml_engineer", label: "ML Engineer" },
  { id: "mlops", label: "MLOps" },
  { id: "devops", label: "DevOps" },
  { id: "backend", label: "Backend" },
  { id: "frontend", label: "Frontend" },
  { id: "fullstack", label: "Full Stack" },
  { id: "data_engineer", label: "Data Engineer" },
];

const AVAILABLE_LOCATIONS = [
  { id: "UK", label: "UK" },
  { id: "US", label: "US" },
  { id: "EU", label: "EU" },
  { id: "Remote", label: "Remote" },
  { id: "London", label: "London" },
  { id: "New York", label: "New York" },
  { id: "San Francisco", label: "San Francisco" },
];

const SENIORITY_LEVELS = [
  { id: "junior", label: "Junior" },
  { id: "mid", label: "Mid-level" },
  { id: "senior", label: "Senior" },
  { id: "lead", label: "Lead" },
  { id: "staff", label: "Staff+" },
];

export default function SettingsPage() {
  const { settings, isLoading, error, update, mutate } = useSettings();
  const [formData, setFormData] = useState({
    github_username: "",
    target_roles: [] as string[],
    target_locations: [] as string[],
    target_seniority: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        github_username: settings.github_username || "",
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
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelection = (
    field: "target_roles" | "target_locations" | "target_seniority",
    value: string,
  ) => {
    setFormData((prev) => {
      const current = prev[field];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <ErrorState
            message="Failed to load settings"
            onRetry={() => mutate()}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[35%] h-[35%] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="relative z-10">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-mono font-bold text-foreground tracking-tight">
              CONFIG <span className="text-primary">::</span> SETTINGS
            </h1>
            <p className="text-sm font-mono text-muted-foreground mt-2">
              Customize your CareerRadar experience
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* GitHub Profile */}
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <User className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wider">
                  GitHub Profile
                </h2>
              </div>
              <label className="block mb-2 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                value={formData.github_username}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    github_username: e.target.value,
                  }))
                }
                placeholder="e.g., octocat"
                className="w-full max-w-sm px-4 py-2.5 rounded-lg border border-border bg-background text-foreground font-mono text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>

            {/* Target Roles */}
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <BarChart2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wider">
                  Target Roles
                </h2>
              </div>
              <p className="text-xs font-mono text-muted-foreground mb-5">
                Select roles you&apos;re interested in — these drive your score
                breakdown and radar chart
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ROLES.map((role) => {
                  const selected = formData.target_roles.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleSelection("target_roles", role.id)}
                      className={`px-4 py-2 rounded-lg border font-mono text-sm transition-all ${
                        selected
                          ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
                      }`}
                    >
                      {selected && <span className="mr-1.5">✓</span>}
                      {role.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Locations */}
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-secondary" />
                <h2 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wider">
                  Target Locations
                </h2>
              </div>
              <p className="text-xs font-mono text-muted-foreground mb-5">
                Select preferred job locations
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_LOCATIONS.map((loc) => {
                  const selected = formData.target_locations.includes(loc.id);
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() =>
                        toggleSelection("target_locations", loc.id)
                      }
                      className={`px-4 py-2 rounded-lg border font-mono text-sm transition-all ${
                        selected
                          ? "border-secondary/40 bg-secondary/10 text-secondary shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
                      }`}
                    >
                      {selected && <span className="mr-1.5">✓</span>}
                      {loc.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seniority Levels */}
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wider">
                  Seniority Levels
                </h2>
              </div>
              <p className="text-xs font-mono text-muted-foreground mb-5">
                Select seniority levels you&apos;re targeting
              </p>
              <div className="flex flex-wrap gap-2">
                {SENIORITY_LEVELS.map((level) => {
                  const selected = formData.target_seniority.includes(level.id);
                  return (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() =>
                        toggleSelection("target_seniority", level.id)
                      }
                      className={`px-4 py-2 rounded-lg border font-mono text-sm transition-all ${
                        selected
                          ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
                      }`}
                    >
                      {selected && <span className="mr-1.5">✓</span>}
                      {level.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={isSaving || isLoading}
                className="px-6 py-2.5 rounded-lg border border-primary/30 bg-primary/10 text-primary font-mono text-sm font-semibold uppercase tracking-wider cursor-pointer hover:bg-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "SAVING..." : "SAVE SETTINGS"}
              </button>
              {showSuccess && (
                <span className="flex items-center gap-1.5 text-sm text-green-500 font-mono">
                  <CheckCircle2 className="h-4 w-4" />
                  Settings saved successfully
                </span>
              )}
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
