"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import {
  useApplications,
  useApplicationStats,
  useApplicationMutations,
  useFollowUps,
} from "@/lib/swr-hooks";
import { ErrorState } from "@/components/Skeleton";
import { JobApplication, CreateApplicationRequest } from "@/lib/types";
import { Plus, Bell, Trash2, X } from "lucide-react";

const APPLICATION_STATUSES = [
  {
    id: "interested",
    label: "Interested",
    color: "text-muted-foreground",
    border: "border-border",
  },
  {
    id: "applied",
    label: "Applied",
    color: "text-amber-500",
    border: "border-amber-500/30",
  },
  {
    id: "phone_screen",
    label: "Phone Screen",
    color: "text-violet-400",
    border: "border-violet-400/30",
  },
  {
    id: "technical",
    label: "Technical",
    color: "text-blue-400",
    border: "border-blue-400/30",
  },
  {
    id: "final",
    label: "Final Round",
    color: "text-emerald-400",
    border: "border-emerald-400/30",
  },
  {
    id: "offer",
    label: "Offer",
    color: "text-green-500",
    border: "border-green-500/30",
  },
  {
    id: "rejected",
    label: "Rejected",
    color: "text-red-500",
    border: "border-red-500/30",
  },
];

const APPLICATION_SOURCES = [
  "manual",
  "linkedin",
  "indeed",
  "glassdoor",
  "company_careers",
  "referral",
  "other",
];

const EMPTY_FORM: CreateApplicationRequest = {
  job_title: "",
  company: "",
  source: "manual",
  status: "interested",
};

export default function ApplicationsPage() {
  const { applications, isLoading, error, mutate } = useApplications();
  const { stats, daysAnalyzed } = useApplicationStats();
  const { followUps, message: followUpMessage } = useFollowUps();
  const { create, update, remove } = useApplicationMutations();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [formData, setFormData] =
    useState<CreateApplicationRequest>(EMPTY_FORM);
  const [deleting, setDeleting] = useState<string | null>(null);

  const applicationsByStatus = APPLICATION_STATUSES.reduce(
    (acc, status) => {
      acc[status.id] = applications.filter((app) => app.status === status.id);
      return acc;
    },
    {} as Record<string, JobApplication[]>,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingApp) {
        await update(editingApp.id!, formData);
      } else {
        await create(formData);
      }
      closeForm();
    } catch (err) {
      console.error("Failed to save application:", err);
    }
  };

  const handleDelete = async (appId: string) => {
    if (!confirm("Delete this application? This cannot be undone.")) return;
    setDeleting(appId);
    try {
      await remove(appId);
    } catch (err) {
      console.error("Failed to delete application:", err);
    } finally {
      setDeleting(null);
    }
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      await update(appId, { status: newStatus });
    } catch (err) {
      console.error("Failed to update status:", err);
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

  const closeForm = () => {
    setShowCreateForm(false);
    setEditingApp(null);
    setFormData(EMPTY_FORM);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <ErrorState
            message="Failed to load applications"
            onRetry={() => mutate()}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-[-5%] right-[-5%] w-[30%] h-[30%] bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="relative z-10">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-mono font-bold text-foreground tracking-tight">
                APPLICATION <span className="text-primary">::</span> TRACKER
              </h1>
              <p className="text-sm font-mono text-muted-foreground mt-2">
                Track your job applications through the hiring pipeline
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-primary/30 bg-primary/10 text-primary font-mono text-sm font-semibold uppercase hover:bg-primary/20 transition-all shrink-0"
            >
              <Plus className="h-4 w-4" />
              Add Application
            </button>
          </div>

          {/* Stats Bar */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                {
                  label: `Total (${daysAnalyzed}d)`,
                  value: stats.total_applications,
                  color: "text-foreground",
                },
                {
                  label: "Response Rate",
                  value: `${stats.response_rate.toFixed(1)}%`,
                  color: "text-green-500",
                },
                {
                  label: "Interview Rate",
                  value: `${stats.interview_rate.toFixed(1)}%`,
                  color: "text-blue-400",
                },
                {
                  label: "Offer Rate",
                  value: `${stats.offer_rate.toFixed(1)}%`,
                  color: "text-violet-400",
                },
              ].map((stat) => (
                <div key={stat.label} className="glass-panel rounded-xl p-4">
                  <div
                    className={`text-2xl font-display font-bold ${stat.color}`}
                  >
                    {stat.value}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Follow-up Alert */}
          {followUps.length > 0 && (
            <div className="mb-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
              <Bell className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm font-mono text-amber-500">
                {followUpMessage}
              </p>
            </div>
          )}

          {/* Kanban Board */}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {APPLICATION_STATUSES.map((status) => (
              <div
                key={status.id}
                className={`min-w-[240px] w-64 shrink-0 border rounded-xl bg-card flex flex-col ${status.border}`}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span
                    className={`text-xs font-mono font-semibold uppercase tracking-wider ${status.color}`}
                  >
                    {status.label}
                  </span>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {applicationsByStatus[status.id]?.length || 0}
                  </span>
                </div>

                <div className="p-3 flex flex-col gap-2 flex-1 min-h-[120px]">
                  {applicationsByStatus[status.id]?.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => openEditForm(app)}
                      className="p-3 rounded-lg border border-border bg-background hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer group relative"
                    >
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(app.id!);
                        }}
                        disabled={deleting === app.id}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                        title="Delete application"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>

                      <div className="text-sm font-mono font-semibold text-foreground mb-1 pr-5 truncate">
                        {app.job_title}
                      </div>
                      <div className="text-xs font-mono text-primary mb-2">
                        {app.company}
                      </div>
                      {app.location && (
                        <div className="text-[10px] font-mono text-muted-foreground mb-1">
                          📍 {app.location}
                        </div>
                      )}
                      {app.salary_range && (
                        <div className="text-[10px] font-mono text-green-500 mb-1">
                          💰 {app.salary_range}
                        </div>
                      )}
                      {app.date_applied && (
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {new Date(app.date_applied).toLocaleDateString()}
                        </div>
                      )}

                      <select
                        value={app.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(app.id!, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 w-full text-[10px] font-mono px-2 py-1 rounded border border-border bg-background text-muted-foreground cursor-pointer focus:outline-none"
                      >
                        {APPLICATION_STATUSES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Create / Edit Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-mono font-semibold text-foreground">
                {editingApp ? "Edit Application" : "Add New Application"}
              </h2>
              <div className="flex items-center gap-2">
                {editingApp && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingApp.id!)}
                    disabled={deleting === editingApp.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 font-mono text-xs hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                )}
                <button
                  onClick={closeForm}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.job_title}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      job_title: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono text-sm focus:outline-none focus:border-primary/60 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  Company *
                </label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      company: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono text-sm focus:outline-none focus:border-primary/60 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                    Source
                  </label>
                  <select
                    value={formData.source}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        source: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono text-sm focus:outline-none"
                  >
                    {APPLICATION_SOURCES.map((source) => (
                      <option key={source} value={source}>
                        {source
                          .replace("_", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono text-sm focus:outline-none"
                  >
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    placeholder="e.g., London, Remote"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono text-sm focus:outline-none focus:border-primary/60 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                    Salary Range
                  </label>
                  <input
                    type="text"
                    value={formData.salary_range || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        salary_range: e.target.value,
                      }))
                    }
                    placeholder="e.g., £60k–£80k"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono text-sm focus:outline-none focus:border-primary/60 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={3}
                  placeholder="Any additional notes..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono text-sm focus:outline-none focus:border-primary/60 transition-all resize-vertical"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 rounded-lg border border-border bg-transparent text-muted-foreground font-mono text-sm hover:text-foreground hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg border border-primary/30 bg-primary/10 text-primary font-mono text-sm font-semibold hover:bg-primary/20 transition-all"
                >
                  {editingApp ? "Update" : "Create"} Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
