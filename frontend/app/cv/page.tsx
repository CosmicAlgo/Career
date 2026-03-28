"use client";

import { useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { useSettings } from "@/lib/swr-hooks";

export default function CVPage() {
  const { settings } = useSettings();
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please upload a PDF file");
        return;
      }

      setUploading(true);
      setError(null);
      setResult(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("filename", file.name);

        // Add target roles from settings
        if (settings?.target_roles) {
          settings.target_roles.forEach((role: string) => {
            formData.append("target_roles", role);
          });
        }

        const response = await fetch("/api/cv/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Upload failed");
        }

        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [settings],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile],
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0f" }}>
      <Navbar />
      <main
        style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 16px" }}
      >
        <div style={{ marginBottom: "24px" }}>
          <h1
            style={{
              fontSize: "24px",
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: 700,
              color: "#e2e8f0",
              margin: 0,
            }}
          >
            CV ANALYZER
          </h1>
          <p
            style={{
              fontSize: "14px",
              fontFamily: "JetBrains Mono, monospace",
              color: "#64748b",
              marginTop: "4px",
            }}
          >
            Upload your CV to analyze skills, experience, and market fit
          </p>
        </div>

        {/* Upload Area */}
        <div
          style={{
            border: `2px dashed ${dragActive ? "#fbbf24" : "#1e1e2e"}`,
            borderRadius: "8px",
            padding: "48px",
            textAlign: "center",
            backgroundColor: dragActive
              ? "rgba(251, 191, 36, 0.05)"
              : "#111118",
            cursor: "pointer",
            transition: "all 0.2s",
            marginBottom: "24px",
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleChange}
            style={{ display: "none" }}
            id="cv-upload"
            disabled={uploading}
          />
          <label htmlFor="cv-upload" style={{ cursor: "pointer" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
            <div
              style={{
                fontSize: "16px",
                color: "#e2e8f0",
                fontFamily: "JetBrains Mono, monospace",
                marginBottom: "8px",
              }}
            >
              {uploading
                ? "Processing..."
                : "Drop your CV here or click to browse"}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              PDF files only • Max 10MB
            </div>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#ef4444",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              ❌ {error}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ display: "grid", gap: "24px" }}>
            {/* CV Score */}
            {result.cv_data?.cv_score && (
              <div
                style={{
                  padding: "24px",
                  borderRadius: "8px",
                  border: "1px solid #1e1e2e",
                  backgroundColor: "#111118",
                }}
              >
                <h2
                  style={{
                    fontSize: "18px",
                    color: "#e2e8f0",
                    fontFamily: "JetBrains Mono, monospace",
                    marginBottom: "16px",
                  }}
                >
                  CV Score
                </h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "32px",
                        fontWeight: 700,
                        color: "#fbbf24",
                      }}
                    >
                      {result.cv_data.cv_score.percentage.toFixed(1)}%
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      Overall Score
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "16px",
                        color: "#22c55e",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      Skills: {result.cv_data.cv_score.breakdown.skills}/40
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        color: "#3b82f6",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      Experience: {result.cv_data.cv_score.breakdown.experience}
                      /35
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        color: "#8b5cf6",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      Education: {result.cv_data.cv_score.breakdown.education}
                      /25
                    </div>
                  </div>
                </div>
                {result.cv_data.cv_score.feedback.length > 0 && (
                  <div style={{ marginTop: "16px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        fontFamily: "JetBrains Mono, monospace",
                        marginBottom: "8px",
                      }}
                    >
                      Suggestions:
                    </div>
                    {result.cv_data.cv_score.feedback.map(
                      (feedback: string, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: "12px",
                            color: "#fbbf24",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          • {feedback}
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Skills Analysis */}
            {result.cv_data?.skills &&
              Object.keys(result.cv_data.skills).length > 0 && (
                <div
                  style={{
                    padding: "24px",
                    borderRadius: "8px",
                    border: "1px solid #1e1e2e",
                    backgroundColor: "#111118",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "18px",
                      color: "#e2e8f0",
                      fontFamily: "JetBrains Mono, monospace",
                      marginBottom: "16px",
                    }}
                  >
                    Extracted Skills
                  </h2>
                  {Object.entries(result.cv_data.skills).map(
                    ([category, skills]: [string, string[]]) => (
                      <div key={category} style={{ marginBottom: "16px" }}>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            fontFamily: "JetBrains Mono, monospace",
                            textTransform: "uppercase",
                            marginBottom: "4px",
                          }}
                        >
                          {category}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "8px",
                          }}
                        >
                          {skills.map((skill: string) => (
                            <span
                              key={skill}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "4px",
                                backgroundColor: "rgba(251, 191, 36, 0.1)",
                                color: "#fbbf24",
                                fontSize: "12px",
                                fontFamily: "JetBrains Mono, monospace",
                              }}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

            {/* Experience */}
            {result.cv_data?.experience &&
              result.cv_data.experience.length > 0 && (
                <div
                  style={{
                    padding: "24px",
                    borderRadius: "8px",
                    border: "1px solid #1e1e2e",
                    backgroundColor: "#111118",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "18px",
                      color: "#e2e8f0",
                      fontFamily: "JetBrains Mono, monospace",
                      marginBottom: "16px",
                    }}
                  >
                    Work Experience
                  </h2>
                  {result.cv_data.experience.map((exp: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        marginBottom: "12px",
                        paddingBottom: "12px",
                        borderBottom: "1px solid #1e1e2e",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "16px",
                          color: "#e2e8f0",
                          fontFamily: "JetBrains Mono, monospace",
                          fontWeight: 600,
                        }}
                      >
                        {exp.position}
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#fbbf24",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        {exp.company}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        {exp.dates}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            {/* Market Analysis */}
            {result.analysis && (
              <div
                style={{
                  padding: "24px",
                  borderRadius: "8px",
                  border: "1px solid #1e1e2e",
                  backgroundColor: "#111118",
                }}
              >
                <h2
                  style={{
                    fontSize: "18px",
                    color: "#e2e8f0",
                    fontFamily: "JetBrains Mono, monospace",
                    marginBottom: "16px",
                  }}
                >
                  Market Analysis
                </h2>

                {/* Skill Gaps */}
                {result.analysis.skill_analysis?.missing_skills &&
                  result.analysis.skill_analysis.missing_skills.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#64748b",
                          fontFamily: "JetBrains Mono, monospace",
                          marginBottom: "8px",
                        }}
                      >
                        Missing In-Demand Skills:
                      </div>
                      {result.analysis.skill_analysis.missing_skills
                        .slice(0, 5)
                        .map((skill: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              fontSize: "12px",
                              color: "#fbbf24",
                              fontFamily: "JetBrains Mono, monospace",
                              marginBottom: "4px",
                            }}
                          >
                            • {skill.skill} (appears in {skill.market_frequency}{" "}
                            jobs)
                          </div>
                        ))}
                    </div>
                  )}

                {/* Role Scores */}
                {result.analysis.role_scores &&
                  Object.keys(result.analysis.role_scores).length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#64748b",
                          fontFamily: "JetBrains Mono, monospace",
                          marginBottom: "8px",
                        }}
                      >
                        Role Match Scores:
                      </div>
                      {Object.entries(result.analysis.role_scores).map(
                        ([role, data]: [string, any]) => (
                          <div
                            key={role}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "4px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#e2e8f0",
                                fontFamily: "JetBrains Mono, monospace",
                              }}
                            >
                              {role
                                .replace("_", " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </span>
                            <span
                              style={{
                                fontSize: "12px",
                                color:
                                  data.score >= 70
                                    ? "#22c55e"
                                    : data.score >= 50
                                      ? "#fbbf24"
                                      : "#ef4444",
                                fontFamily: "JetBrains Mono, monospace",
                              }}
                            >
                              {data.score}%
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                {/* Suggestions */}
                {result.analysis.suggestions &&
                  result.analysis.suggestions.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#64748b",
                          fontFamily: "JetBrains Mono, monospace",
                          marginBottom: "8px",
                        }}
                      >
                        Recommendations:
                      </div>
                      {result.analysis.suggestions.map(
                        (suggestion: string, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              fontSize: "12px",
                              color: "#22c55e",
                              fontFamily: "JetBrains Mono, monospace",
                              marginBottom: "4px",
                            }}
                          >
                            • {suggestion}
                          </div>
                        ),
                      )}
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
