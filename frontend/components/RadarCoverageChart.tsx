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
  skillTrends?: SkillTrendsResponse | undefined;
  overrideRole?: string;
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
  hpc_engineer: {
    "C++/Fortran": 95,
    Parallelization: 95,
    "Memory Opt": 90,
    "Cloud/HPC": 80,
    Profiling: 85,
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
  Parallelization: [
    "mpi",
    "openmp",
    "cuda",
    "tbb",
    "pthreads",
    "parallel",
    "multithreading",
    "threading",
    "gpu",
    "simd",
    "intrinsic",
  ],
  "Memory Opt": [
    "cache",
    "memory",
    "alignment",
    "allocator",
    "buffer",
    "heap",
    "stack",
    "efficiency",
    "performance",
    "optimisation",
  ],
  "C++/Fortran": [
    "cpp",
    "c++",
    "fortran",
    "cmake",
    "make",
    "gcc",
    "llvm",
    "clang",
  ],
  "Cloud/HPC": [
    "slurm",
    "pbs",
    "batch",
    "cluster",
    "node",
    "supercomputer",
    "grid",
    "aws",
    "azure",
    "gcp",
    "parallel-file-system",
  ],
  Profiling: [
    "valgrind",
    "gprof",
    "nsight",
    "profiler",
    "tracing",
    "perf",
    "instrumentation",
    "benchmarking",
    "benchmark",
  ],
};

function getGithubAxisScore(axis: string, snapshot: SnapshotResponse): number {
  const keywords = AXIS_GITHUB_KEYWORDS[axis] || [];
  if (!snapshot?.github_data || keywords.length === 0) return 0;

  let rawScore = 0;
  const langs = Object.keys(snapshot.github_data.languages || {}).map((l) =>
    l.toLowerCase(),
  );
  const repos = snapshot.github_data.top_repos || [];

  // Evaluate each keyword for the given axis
  for (const kw of keywords) {
    let kwScore = 0;

    // Primary evidence: Language stats (shows sustained usage)
    if (langs.some((l) => l.includes(kw))) {
      kwScore = Math.max(kwScore, 50); // Base 50 for direct language match
    }

    // Secondary evidence: Repo topics, names, descriptions
    let repoHits = 0;
    for (const repo of repos) {
      const topics = (repo.topics || []).map((t) => t.toLowerCase());
      const name = (repo.name || "").toLowerCase();
      const desc = (repo.description || "").toLowerCase();

      if (topics.some((t) => t.includes(kw))) {
        repoHits += 2; // Dedicated topic is strong evidence
      } else if (name.includes(kw) || desc.includes(kw)) {
        repoHits += 1; // Mentioned in description or name
      }
    }

    if (repoHits > 0) {
      // Add up to 40 points for practical repo evidence
      kwScore += Math.min(40, repoHits * 15);
    }

    rawScore += kwScore;
  }

  // Normalize: We don't expect all keywords simultaneously.
  // 1 strong core match (e.g. 65 rawScore) gives a very solid base.
  let normalizedScore = rawScore > 0 ? 30 + rawScore * 0.7 : 0;

  // Cross-reference with AI-identified skill gaps
  // If the axis overlaps with a known gap, penalize the score instead of boosting it
  const gaps =
    snapshot.assessment?.skill_gaps?.map((g) => g.skill.toLowerCase()) || [];
  const axisGaps = gaps.filter((g) =>
    keywords.some((kw) => g.includes(kw) || kw.includes(g)),
  );

  if (axisGaps.length > 0) {
    normalizedScore -= axisGaps.length * 20; // Significant penalty for verified gaps
  }

  return Math.max(0, Math.min(100, Math.round(normalizedScore)));
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
  overrideRole,
}: RadarCoverageChartProps) {
  if (!snapshot?.github_data) {
    return (
      <p className="text-sm font-mono text-muted-foreground text-center py-4">
        No GitHub data — sync the pipeline first
      </p>
    );
  }

  const selectedRoles: string[] = overrideRole
    ? [overrideRole]
    : (snapshot as any)?.settings?.target_roles ||
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
