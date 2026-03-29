"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useSettings, usePipelineStatus } from "@/lib/swr-hooks";
import { ErrorState } from "@/components/Skeleton";
import {
  Settings,
  MapPin,
  BarChart2,
  User,
  CheckCircle2,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";

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
  { id: "internship", label: "Internship" },
  { id: "part-time", label: "Part-time" },
  { id: "junior", label: "Junior" },
  { id: "mid", label: "Mid-level" },
  { id: "senior", label: "Senior" },
  { id: "lead", label: "Lead" },
  { id: "staff", label: "Staff+" },
];

export default function SettingsPage() {
  const { settings, isLoading, error, update, mutate } = useSettings();
  const { status } = usePipelineStatus();
  const isDemoMode = status?.public_demo_mode || false;

  const [formData, setFormData] = useState({
    github_username: "",
    target_roles: [] as string[],
    target_locations: [] as string[],
    target_seniority: [] as string[],
  });

  const [customRole, setCustomRole] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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
    if (isDemoMode) return;

    setFormData((prev) => {
      const current = prev[field];
      const isSelected = current.includes(value);

      // Validation for Roles (Max 5)
      if (field === "target_roles" && !isSelected && current.length >= 5) {
        setValidationError("Maximum 5 target roles allowed.");
        setTimeout(() => setValidationError(null), 3000);
        return prev;
      }

      // Validation for Locations (Max 3)
      if (field === "target_locations" && !isSelected && current.length >= 3) {
        setValidationError("Maximum 3 target locations allowed.");
        setTimeout(() => setValidationError(null), 3000);
        return prev;
      }

      const updated = isSelected
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const addCustomRole = () => {
    if (isDemoMode || !customRole.trim()) return;
    if (formData.target_roles.length >= 5) {
      setValidationError("Maximum 5 target roles allowed.");
      setTimeout(() => setValidationError(null), 3000);
      return;
    }
    if (formData.target_roles.includes(customRole.trim())) return;

    setFormData((prev) => ({
      ...prev,
      target_roles: [...prev.target_roles, customRole.trim()],
    }));
    setCustomRole("");
  };

  const addCustomLocation = () => {
    if (isDemoMode || !customLocation.trim()) return;

    // Check if it's already "Remote" and we are trying to add a second remote
    if (
      customLocation.trim().toLowerCase() === "remote" &&
      formData.target_locations.includes("Remote")
    ) {
      return;
    }

    if (formData.target_locations.length >= 3) {
      setValidationError("Maximum 3 target locations allowed.");
      setTimeout(() => setValidationError(null), 3000);
      return;
    }

    // Logic: 1 Remote + 2 arbitrary text locations
    const normalized = customLocation.trim();
    if (formData.target_locations.includes(normalized)) return;

    setFormData((prev) => ({
      ...prev,
      target_locations: [...prev.target_locations, normalized],
    }));
    setCustomLocation("");
  };

  const removeValue = (
    field: "target_roles" | "target_locations",
    value: string,
  ) => {
    if (isDemoMode) return;
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((v) => v !== value),
    }));
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

          {isDemoMode && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-mono font-bold text-amber-500 uppercase tracking-wider">
                  Public Demo Mode Active
                </h3>
                <p className="text-xs font-mono text-amber-500/80 mt-1">
                  Settings are strictly read-only to preserve the author&apos;s
                  data. Deploy your own instance from GitHub to customize these
                  values.
                </p>
              </div>
            </div>
          )}

          {validationError && (
            <div className="mb-6 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 font-mono text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4" />
              {validationError}
            </div>
          )}

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
                disabled={isDemoMode}
                value={formData.github_username}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    github_username: e.target.value,
                  }))
                }
                placeholder="e.g., octocat"
                className="w-full max-w-sm px-4 py-2.5 rounded-lg border border-border bg-background text-foreground font-mono text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all disabled:opacity-50"
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
                Select or add roles — limit 5 total
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {AVAILABLE_ROLES.map((role) => {
                  const selected = formData.target_roles.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      disabled={isDemoMode}
                      onClick={() => toggleSelection("target_roles", role.id)}
                      className={`px-4 py-2 rounded-lg border font-mono text-sm transition-all ${
                        selected
                          ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
                      } disabled:cursor-not-allowed`}
                    >
                      {selected && <span className="mr-1.5">✓</span>}
                      {role.label}
                    </button>
                  );
                })}

                {/* Render custom roles that aren't in the default list as removable pills */}
                {formData.target_roles
                  .filter((id) => !AVAILABLE_ROLES.find((r) => r.id === id))
                  .map((roleId) => (
                    <div
                      key={roleId}
                      className="px-4 py-2 rounded-lg border border-primary/40 bg-primary/5 text-primary font-mono text-sm flex items-center gap-2"
                    >
                      <span>✓ {roleId}</span>
                      <button
                        type="button"
                        disabled={isDemoMode}
                        onClick={() => removeValue("target_roles", roleId)}
                        className="p-0.5 hover:bg-primary/20 rounded transition-colors disabled:hidden"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
              </div>

              {!isDemoMode && (
                <div className="flex items-center gap-2 max-w-sm">
                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addCustomRole())
                    }
                    placeholder="Add custom role..."
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background font-mono text-xs outline-none focus:border-primary/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={addCustomRole}
                    className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
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
                Target locations — limit 3 total (max 1 Remote)
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {AVAILABLE_LOCATIONS.map((loc) => {
                  const selected = formData.target_locations.includes(loc.id);
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      disabled={isDemoMode}
                      onClick={() =>
                        toggleSelection("target_locations", loc.id)
                      }
                      className={`px-4 py-2 rounded-lg border font-mono text-sm transition-all ${
                        selected
                          ? "border-secondary/40 bg-secondary/10 text-secondary shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
                      } disabled:cursor-not-allowed`}
                    >
                      {selected && <span className="mr-1.5">✓</span>}
                      {loc.label}
                    </button>
                  );
                })}

                {/* Render custom locations that aren't in the default list as removable pills */}
                {formData.target_locations
                  .filter((id) => !AVAILABLE_LOCATIONS.find((l) => l.id === id))
                  .map((locId) => (
                    <div
                      key={locId}
                      className="px-4 py-2 rounded-lg border border-secondary/40 bg-secondary/5 text-secondary font-mono text-sm flex items-center gap-2"
                    >
                      <span>✓ {locId}</span>
                      <button
                        type="button"
                        disabled={isDemoMode}
                        onClick={() => removeValue("target_locations", locId)}
                        className="p-0.5 hover:bg-secondary/20 rounded transition-colors disabled:hidden"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
              </div>

              {!isDemoMode && (
                <div className="flex items-center gap-2 max-w-sm">
                  <input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(), addCustomLocation())
                    }
                    placeholder="Add city or country..."
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background font-mono text-xs outline-none focus:border-secondary/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={addCustomLocation}
                    className="p-2 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
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
                      disabled={isDemoMode}
                      onClick={() =>
                        toggleSelection("target_seniority", level.id)
                      }
                      className={`px-4 py-2 rounded-lg border font-mono text-sm transition-all ${
                        selected
                          ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
                      } disabled:cursor-not-allowed`}
                    >
                      {selected && <span className="mr-1.5">✓</span>}
                      {level.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={isSaving || isLoading || isDemoMode}
                className="px-6 py-2.5 rounded-lg border border-primary/30 bg-primary/10 text-primary font-mono text-sm font-semibold uppercase tracking-wider cursor-pointer hover:bg-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving
                  ? "SAVING..."
                  : isDemoMode
                    ? "LOCKED (DEMO MODE)"
                    : "SAVE SETTINGS"}
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
