"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { SnapshotResponse, SkillTrendsResponse } from "@/lib/types";

interface RadarCoverageChartProps {
  snapshot: SnapshotResponse | undefined;
  skillTrends: SkillTrendsResponse | undefined;
}

/*
  Market baseline scores per skill per role.
  Normalised 0–100. Represents how important the skill axis is for a given role.
*/
const ROLE_MARKET_BASELINES: Record<string, Record<string, number>> = {
  ml_engineer: {
    Python: 95,
    Cloud: 65,
    MLOps: 70,
    Research: 80,
    Infrastructure: 50,
  },
  mlops: { Python: 75, Cloud: 85, MLOps: 95, Research: 40, Infrastructure: 80 },
  devops: {
    Python: 55,
    Cloud: 90,
    MLOps: 60,
    Infrastructure: 95,
    Security: 70,
  },
  backend: {
    Python: 80,
    Cloud: 70,
    Databases: 85,
    APIs: 90,
    Infrastructure: 65,
  },
  frontend: { JavaScript: 95, CSS: 85, APIs: 75, Testing: 70, Performance: 80 },
  fullstack: { Python: 70, JavaScript: 80, APIs: 85, Cloud: 65, Databases: 75 },
  data_engineer: {
    Python: 85,
    Cloud: 75,
    Databases: 90,
    MLOps: 60,
    Infrastructure: 70,
  },
};

/*
  Maps the market skill axes to GitHub language/topic equivalents for coverage.
*/
const AXIS_GITHUB_KEYWORDS: Record<string, string[]> = {
  Python: ["python", "jupyter", "ipython", "fastapi", "flask", "django"],
  Cloud: [
    "aws",
    "gcp",
    "azure",
    "terraform",
    "pulumi",
    "cloudformation",
    "kubernetes",
    "k8s",
  ],
  MLOps: [
    "mlops",
    "mlflow",
    "kubeflow",
    "airflow",
    "dagster",
    "prefect",
    "dvc",
  ],
  Research: [
    "pytorch",
    "tensorflow",
    "jax",
    "huggingface",
    "transformers",
    "sklearn",
    "scikit",
  ],
  Infrastructure: [
    "docker",
    "kubernetes",
    "helm",
    "ansible",
    "terraform",
    "linux",
  ],
  Security: ["security", "vault", "iam", "oauth", "jwt", "tls"],
  Databases: [
    "postgres",
    "mysql",
    "sqlite",
    "mongodb",
    "redis",
    "cassandra",
    "sql",
  ],
  APIs: ["rest", "graphql", "grpc", "fastapi", "express", "django", "flask"],
  JavaScript: [
    "javascript",
    "typescript",
    "node",
    "react",
    "next",
    "vue",
    "angular",
  ],
  CSS: ["css", "tailwind", "sass", "styled-components"],
  Testing: ["jest", "pytest", "cypress", "vitest", "playwright"],
  Performance: ["lighthouse", "webpack", "vite", "turbopack", "performance"],
};

function getGithubAxisScore(axis: string, snapshot: SnapshotResponse): number {
  const keywords = AXIS_GITHUB_KEYWORDS[axis] || [];
  if (!snapshot?.github_data) return 0;

  let score = 0;
  const langs = Object.keys(snapshot.github_data.languages || {}).map((l) =>
    l.toLowerCase(),
  );
  const repos = snapshot.github_data.top_repos || [];

  // Check languages
  for (const kw of keywords) {
    if (langs.some((l) => l.includes(kw))) score += 25;
  }

  // Check repo topics and names
  for (const repo of repos) {
    const topics = (repo.topics || []).map((t) => t.toLowerCase());
    const name = (repo.name || "").toLowerCase();
    const desc = (repo.description || "").toLowerCase();
    for (const kw of keywords) {
      if (
        topics.some((t) => t.includes(kw)) ||
        name.includes(kw) ||
        desc.includes(kw)
      ) {
        score += 10;
        break;
      }
    }
  }

  // Also look at skill gaps — if a skill is in your profile (not a gap), you cover it
  const gaps =
    snapshot.assessment?.skill_gaps?.map((g) => g.skill.toLowerCase()) || [];
  for (const kw of keywords) {
    if (!gaps.some((g) => g.includes(kw))) score += 5; // not a gap = presumably covered
  }

  return Math.min(100, score);
}

function buildChartData(
  snapshot: SnapshotResponse,
  skillTrends: SkillTrendsResponse | undefined,
  selectedRoles: string[],
) {
  // Pick the primary role (first selected), fallback to ml_engineer
  const primaryRole = selectedRoles[0] || "ml_engineer";
  const baseline =
    ROLE_MARKET_BASELINES[primaryRole] || ROLE_MARKET_BASELINES["ml_engineer"];
  const axes = Object.keys(baseline);

  return axes.map((axis) => ({
    subject: axis,
    "Your GitHub": getGithubAxisScore(axis, snapshot),
    "Market Baseline": baseline[axis],
  }));
}

export default function RadarCoverageChart({
  snapshot,
  skillTrends,
}: RadarCoverageChartProps) {
  if (!snapshot?.github_data) {
    return (
      <p className="text-sm font-mono text-muted-foreground text-center py-4">
        No GitHub data — sync the pipeline first
      </p>
    );
  }

  const selectedRoles: string[] =
    (snapshot as any)?.settings?.target_roles ||
    Object.keys(snapshot.assessment?.role_scores || {});

  const data = buildChartData(snapshot, skillTrends, selectedRoles);
  const primaryRole = selectedRoles[0] || "ml_engineer";
  const roleLabel = primaryRole
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="w-full">
      <p className="text-xs font-mono text-muted-foreground mb-3">
        Role target:{" "}
        <span className="text-primary font-semibold">{roleLabel}</span>
        {selectedRoles.length > 1 && ` +${selectedRoles.length - 1} more`}
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart
          data={data}
          margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
        >
          <PolarGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 11,
              fontFamily: "monospace",
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Market Baseline"
            dataKey="Market Baseline"
            stroke="hsl(var(--secondary))"
            fill="hsl(var(--secondary))"
            fillOpacity={0.12}
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
          <Radar
            name="Your GitHub"
            dataKey="Your GitHub"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Legend
            wrapperStyle={{
              fontSize: "11px",
              fontFamily: "monospace",
              color: "hsl(var(--muted-foreground))",
              paddingTop: "8px",
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
              fontFamily: "monospace",
              color: "hsl(var(--foreground))",
            }}
            formatter={(value: number, name: string) => [`${value}/100`, name]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
