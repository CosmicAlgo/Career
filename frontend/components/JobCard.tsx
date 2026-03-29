"use client";

import { NormalisedJob, JobMatch } from "@/lib/types";

interface JobCardProps {
  job: NormalisedJob;
  match?: JobMatch;
}

export default function JobCard({ job, match }: JobCardProps) {
  const getMatchColors = (pct: number) => {
    if (pct >= 80) {
      return {
        color: "#22c55e",
        bg: "rgba(34, 197, 94, 0.1)",
        border: "rgba(34, 197, 94, 0.3)",
      };
    }
    if (pct >= 60) {
      return {
        color: "#fbbf24",
        bg: "rgba(251, 191, 36, 0.1)",
        border: "rgba(251, 191, 36, 0.3)",
      };
    }
    return {
      color: "#94a3b8",
      bg: "rgba(148, 163, 184, 0.1)",
      border: "rgba(148, 163, 184, 0.3)",
    };
  };

  const formatSalary = () => {
    if (!job.salary_min && !job.salary_max) return null;
    const min = job.salary_min?.toLocaleString();
    const max = job.salary_max?.toLocaleString();
    const symbol =
      job.currency === "USD" ? "$" : job.currency === "EUR" ? "€" : "£";
    if (min && max && min !== max) return `${symbol}${min} - ${symbol}${max}`;
    return `${symbol}${min || max}`;
  };

  const matchColors = match ? getMatchColors(match.match_pct) : null;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "8px",
        border: "1px solid #1e1e2e",
        backgroundColor: "#111118",
        padding: "16px",
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title & Company */}
          <div
            style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}
          >
            <h3
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "14px",
                fontWeight: 600,
                color: "#e2e8f0",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {job.title}
            </h3>
            {match && (
              <span
                style={{
                  flexShrink: 0,
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontFamily: "JetBrains Mono, monospace",
                  border: `1px solid ${matchColors?.border}`,
                  backgroundColor: matchColors?.bg,
                  color: matchColors?.color,
                }}
              >
                {match.match_pct}%
              </span>
            )}
          </div>

          {/* Company */}
          <div
            style={{
              marginTop: "4px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "13px",
              color: "#94a3b8",
              fontWeight: 500,
            }}
          >
            <svg
              style={{ height: "14px", width: "14px" }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 21h18M5 21V7l8-4 8 4v14M8 21v-9a2 2 0 0 1 4 0v9" />
            </svg>
            {job.company || "Unknown Company"}
          </div>

          {/* Location & Remote */}
          <div
            style={{
              marginTop: "2px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            {job.location && (
              <span
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <svg
                  style={{ height: "12px", width: "12px" }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {job.location}
              </span>
            )}
            {job.remote && (
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontFamily: "JetBrains Mono, monospace",
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  color: "#22c55e",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  textTransform: "uppercase",
                }}
              >
                Remote
              </span>
            )}
          </div>

          {/* Salary */}
          {formatSalary() && (
            <div
              style={{
                marginTop: "4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "13px",
                fontFamily: "JetBrains Mono, monospace",
                color: "#22c55e",
              }}
            >
              <svg
                style={{ height: "14px", width: "14px" }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" x2="12" y1="2" y2="22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              {formatSalary()}
            </div>
          )}

          {/* Skills */}
          {job.required_skills && job.required_skills.length > 0 && (
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
              }}
            >
              {job.required_skills.slice(0, 5).map((skill) => (
                <span
                  key={skill}
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontFamily: "JetBrains Mono, monospace",
                    backgroundColor: "#0a0a0f",
                    color: "rgba(251, 191, 36, 0.8)",
                    border: "1px solid #1e1e2e",
                  }}
                >
                  {skill}
                </span>
              ))}
              {job.required_skills.length > 5 && (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontFamily: "JetBrains Mono, monospace",
                    color: "#475569",
                  }}
                >
                  +{job.required_skills.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Match reasons */}
          {match && match.reasons.length > 0 && (
            <div
              style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}
            >
              <span style={{ color: "#22c55e" }}>Match:</span>{" "}
              {match.reasons.slice(0, 2).join(", ")}
            </div>
          )}
        </div>

        {/* Apply Button */}
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 20px",
              borderRadius: "6px",
              backgroundColor: "#22c55e",
              color: "#000",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#16a34a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#22c55e";
            }}
          >
            <svg
              style={{ height: "14px", width: "14px" }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Apply Now
          </a>
        )}
      </div>

      {/* Source badge */}
      <div
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          opacity: 0.5,
          fontSize: "10px",
          fontFamily: "JetBrains Mono, monospace",
          color: "#475569",
          textTransform: "uppercase",
        }}
      >
        {job.source}
      </div>
    </div>
  );
}
