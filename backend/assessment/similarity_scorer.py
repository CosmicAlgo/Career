"""
CareerRadar - Similarity Scorer
Compute cosine similarity between profile and job embeddings for matching
"""

import logging
from typing import Dict, List, Tuple, Optional
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from api.schemas import NormalisedJob, GitHubSummary
from assessment.skill_embedder import (
    embed_profile,
    batch_embed_jobs,
    extract_skills_from_job,
    extract_skills_from_profile,
)

logger = logging.getLogger(__name__)


def compute_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """
    Compute cosine similarity between two vectors.

    Returns similarity score between 0 and 1.
    """
    # Reshape for sklearn (expects 2D arrays)
    v1 = vec1.reshape(1, -1)
    v2 = vec2.reshape(1, -1)

    similarity = cosine_similarity(v1, v2)[0][0]

    # Ensure result is in valid range
    return float(np.clip(similarity, 0.0, 1.0))


def score_profile_against_jobs(
    profile_embedding: np.ndarray, job_embeddings: Dict[str, np.ndarray]
) -> Dict[str, float]:
    """
    Compute similarity scores between profile and all jobs.

    Args:
        profile_embedding: Embedded profile vector
        job_embeddings: Dict mapping job_id to embedding vector

    Returns:
        Dict mapping job_id to similarity score (0-1)
    """
    scores = {}

    for job_id, job_embedding in job_embeddings.items():
        similarity = compute_similarity(profile_embedding, job_embedding)
        scores[job_id] = similarity

    return scores


def infer_job_role(job: NormalisedJob, target_roles: List[str]) -> Optional[str]:
    """
    Infer which target role category a job belongs to.

    Uses title matching to categorize jobs.
    """
    title_lower = job.title.lower()

    # Role keyword mappings
    role_keywords = {
        "ml_engineer": [
            "ml engineer",
            "machine learning",
            "ml developer",
            "ai engineer",
            "ai/ml",
        ],
        "mlops": ["mlops", "ml ops", "ml infrastructure", "machine learning ops"],
        "devops": [
            "devops",
            "dev ops",
            "sre",
            "site reliability",
            "platform engineer",
            "infrastructure",
        ],
        "backend": ["backend", "back-end", "server-side", "api developer"],
        "data_engineer": ["data engineer", "data eng", "etl", "data pipeline"],
        "data_scientist": ["data scientist", "data science"],
        "sre": ["sre", "site reliability engineer"],
        "platform": ["platform engineer"],
        "hpc_engineer": [
            "hpc",
            "high performance computing",
            "parallel computing",
            "mpi",
            "cuda",
            "openmp",
            "supercomputing",
            "distributed systems",
        ],
    }

    # Find best matching role
    best_role = None
    best_score = 0

    for role in target_roles:
        role_lower = role.lower().strip()
        keywords = role_keywords.get(role_lower, [role_lower.replace("_", " ")])

        score = 0
        for keyword in keywords:
            if keyword in title_lower:
                score += 1

        if score > best_score:
            best_score = score
            best_role = role_lower

    # Default to first target role if no match found
    if best_role is None and target_roles:
        best_role = target_roles[0].lower().strip()

    return best_role


def aggregate_role_scores(
    job_scores: Dict[str, float], jobs: List[NormalisedJob], target_roles: List[str]
) -> Dict[str, int]:
    """
    Aggregate job similarity scores by role category.

    Groups jobs by inferred role and computes average similarity.
    Converts to 0-100 scale for scores.

    Returns:
        Dict mapping role to score (0-100)
    """
    # Group jobs by role
    role_groups: Dict[str, List[float]] = {}
    job_lookup = {job.id: job for job in jobs}

    for job_id, score in job_scores.items():
        job = job_lookup.get(job_id)
        if not job:
            continue

        role = infer_job_role(job, target_roles)
        if role:
            if role not in role_groups:
                role_groups[role] = []
            role_groups[role].append(score)

    # Compute average score per role
    role_scores = {}
    for role, scores in role_groups.items():
        if scores:
            avg_score = sum(scores) / len(scores)
            # Convert to 0-100 scale
            role_scores[role] = int(avg_score * 100)
        else:
            role_scores[role] = 0

    # Ensure all target roles have a score (omit if no jobs found to prevent inflating averages/showing 0)
    for role in target_roles:
        role_lower = role.lower().strip()
        if role_lower not in role_scores:
            # We explicitly OMIT the role from the collection if no market data is found
            # This allows the frontend to show a "Gap/No Data" state instead of a failing 0.
            pass

    # Compute overall score smartly:
    # A user shouldn't be heavily penalized if 5 secondary roles don't match or lack data.
    # Therefore, we heavily weight their primary (best) matched role against the others.
    valid_scores = [score for role, score in role_scores.items() if score > 0]

    if valid_scores:
        valid_scores.sort(reverse=True)
        top_score = valid_scores[0]

        # 70% weight on best match, 30% averaged across other matched roles
        if len(valid_scores) > 1:
            rest_avg = sum(valid_scores[1:]) / len(valid_scores[1:])
            overall = (top_score * 0.70) + (rest_avg * 0.30)
        else:
            overall = top_score

        role_scores["overall"] = int(overall)
    else:
        role_scores["overall"] = 0

    return role_scores


def find_top_matching_jobs(
    job_scores: Dict[str, float], jobs: List[NormalisedJob], top_n: int = 10
) -> List[Tuple[NormalisedJob, float]]:
    """
    Find the top N best matching jobs.

    Returns list of (job, score) tuples sorted by score descending.
    """
    job_lookup = {job.id: job for job in jobs}

    # Sort by score
    sorted_scores = sorted(
        [(job_id, score) for job_id, score in job_scores.items()],
        key=lambda x: x[1],
        reverse=True,
    )

    # Get top N with job objects
    top_matches = []
    for job_id, score in sorted_scores[:top_n]:
        job = job_lookup.get(job_id)
        if job:
            top_matches.append((job, score))

    return top_matches


def compute_skill_gaps(
    profile_skills: List[str], jobs: List[NormalisedJob]
) -> List[Dict[str, any]]:
    """
    Identify skill gaps by comparing profile skills to job requirements.

    Returns list of skill gaps with frequency in market.
    """
    profile_skills_set = set(s.lower() for s in profile_skills)

    # Count skill frequency in jobs
    skill_counts = {}
    for job in jobs:
        job_skills = extract_skills_from_job(job)
        for skill in job_skills:
            skill_lower = skill.lower()
            if skill_lower not in profile_skills_set:
                skill_counts[skill_lower] = skill_counts.get(skill_lower, 0) + 1

    # Convert to gap list
    gaps = []
    total_jobs = len(jobs)
    for skill, count in skill_counts.items():
        frequency = int((count / total_jobs) * 100) if total_jobs > 0 else 0
        if frequency > 5:  # Only include skills that appear in >5% of jobs
            gaps.append(
                {
                    "skill": skill,
                    "frequency_in_market": frequency,
                    "reason": f"Appears in {frequency}% of job postings",
                }
            )

    # Sort by frequency descending
    gaps.sort(key=lambda x: x["frequency_in_market"], reverse=True)

    return gaps[:20]  # Return top 20 gaps


async def compute_local_ml_scores(
    github_summary: GitHubSummary, jobs: List[NormalisedJob], target_roles: List[str]
) -> Tuple[Dict[str, int], Dict[str, float], List[Dict]]:
    """
    Compute all local ML scores in one pass.

    Returns:
        Tuple of (role_scores, job_scores, skill_gaps)
        - role_scores: Dict[str, int] mapping role to 0-100 score
        - job_scores: Dict[str, float] mapping job_id to 0-1 similarity
        - skill_gaps: List of skill gaps with frequency
    """
    logger.info(f"[ML Scorer] Computing local ML scores for {len(jobs)} jobs...")

    # Embed profile
    logger.info("[ML Scorer] Embedding profile...")
    profile_embedding = embed_profile(github_summary)

    # Batch embed jobs
    logger.info("[ML Scorer] Embedding jobs...")
    job_embeddings = batch_embed_jobs(jobs)

    if not job_embeddings:
        logger.warning("[ML Scorer] No job embeddings generated")
        return {"overall": 50}, {}, []

    # Compute similarities
    logger.info("[ML Scorer] Computing similarities...")
    job_scores = score_profile_against_jobs(profile_embedding, job_embeddings)

    # Aggregate by role
    role_scores = aggregate_role_scores(job_scores, jobs, target_roles)

    # Compute skill gaps
    profile_skills = extract_skills_from_profile(github_summary)
    skill_gaps = compute_skill_gaps(profile_skills, jobs)

    logger.info(f"[ML Scorer] Role scores: {role_scores}")
    logger.info(
        f"[ML Scorer] Top 5 job matches: {sorted(job_scores.items(), key=lambda x: x[1], reverse=True)[:5]}"
    )

    return role_scores, job_scores, skill_gaps
