"""
CareerRadar - Skill Embedder
Local ML embeddings using sentence-transformers for skill matching
"""

import logging
from typing import List, Dict
import numpy as np

from api.schemas import NormalisedJob, GitHubSummary

logger = logging.getLogger(__name__)

# Lazy-load the model to avoid import errors if not installed
_model = None


def get_model():
    """Lazy-load the sentence-transformers model."""
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer

            logger.info(
                "[Embedder] Loading sentence-transformers model (all-MiniLM-L6-v2)..."
            )
            _model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("[Embedder] Model loaded successfully")
        except Exception as e:
            logger.error(f"[Embedder] Failed to load model: {e}")
            raise
    return _model


def extract_skills_from_text(text: str) -> List[str]:
    """
    Extract skill keywords from text using regex patterns.

    Returns list of skill keywords found in the text.
    """
    if not text:
        return []

    text_lower = text.lower()

    # Common tech skills to look for
    skill_keywords = [
        # Programming Languages
        "python",
        "javascript",
        "typescript",
        "java",
        "scala",
        "go",
        "rust",
        "c++",
        "c#",
        "ruby",
        "php",
        "swift",
        "kotlin",
        "r",
        "matlab",
        # Web/Frameworks
        "react",
        "vue",
        "angular",
        "node.js",
        "django",
        "flask",
        "fastapi",
        "spring",
        "rails",
        "laravel",
        "next.js",
        "svelte",
        # Data/ML
        "tensorflow",
        "pytorch",
        "scikit-learn",
        "pandas",
        "numpy",
        "jupyter",
        "spark",
        "kafka",
        "airflow",
        "mlflow",
        "huggingface",
        "transformers",
        "computer vision",
        "nlp",
        "natural language processing",
        "deep learning",
        "machine learning",
        "data science",
        "statistics",
        "a/b testing",
        # Cloud/DevOps
        "aws",
        "azure",
        "gcp",
        "google cloud",
        "docker",
        "kubernetes",
        "terraform",
        "ansible",
        "jenkins",
        "gitlab ci",
        "github actions",
        "cicd",
        "ci/cd",
        "prometheus",
        "grafana",
        "elk",
        "logging",
        "monitoring",
        # Databases
        "postgresql",
        "mysql",
        "mongodb",
        "redis",
        "elasticsearch",
        "cassandra",
        "dynamodb",
        "bigquery",
        "snowflake",
        "sql",
        "nosql",
        # Infrastructure
        "linux",
        "nginx",
        "apache",
        "microservices",
        "serverless",
        "lambda",
        "ec2",
        "s3",
        "eks",
        "gke",
        "aks",
        # Other
        "git",
        "agile",
        "scrum",
        "jira",
        "confluence",
        "api design",
        "rest",
        "graphql",
        "grpc",
        "protobuf",
        "swagger",
        "openapi",
    ]

    found_skills = []
    for skill in skill_keywords:
        if skill in text_lower:
            found_skills.append(skill)

    return found_skills


def extract_skills_from_job(job: NormalisedJob) -> List[str]:
    """Extract skills from job description and title."""
    text = f"{job.title} {' '.join(job.required_skills)} {' '.join(job.nice_to_have)}"
    return extract_skills_from_text(text)


def extract_skills_from_profile(github_summary: GitHubSummary) -> List[str]:
    """Extract skills from GitHub profile."""
    skills = []

    # Languages from repos
    if github_summary.languages:
        for lang in github_summary.languages.keys():
            skills.append(lang.lower())

    # Topics from repos
    for repo in github_summary.top_repos:
        if repo.topics:
            for topic in repo.topics:
                skills.append(topic.lower())

    # Extract from descriptions and bio
    text_parts = [github_summary.bio or ""]
    for repo in github_summary.top_repos:
        text_parts.append(repo.description or "")

    text = " ".join(text_parts)
    skills.extend(extract_skills_from_text(text))

    # Deduplicate while preserving order
    seen = set()
    unique_skills = []
    for s in skills:
        if s not in seen:
            seen.add(s)
            unique_skills.append(s)

    return unique_skills


def embed_text(text: str) -> np.ndarray:
    """
    Embed a text string into a vector.

    Args:
        text: Text to embed

    Returns:
        Vector embedding (384-dimensional for all-MiniLM-L6-v2)
    """
    model = get_model()
    embedding = model.encode(text, convert_to_numpy=True)
    return embedding


def embed_job(job: NormalisedJob) -> np.ndarray:
    """
    Embed a job listing into a vector.

    Combines title, skills, and description into an embedding.
    """
    skills = extract_skills_from_job(job)

    # Build rich text representation
    text_parts = [job.title]
    if skills:
        text_parts.append("Skills: " + ", ".join(skills))
    if job.required_skills:
        text_parts.append("Required: " + ", ".join(job.required_skills))
    if job.nice_to_have:
        text_parts.append("Nice: " + ", ".join(job.nice_to_have))

    text = " | ".join(text_parts)
    return embed_text(text)


def embed_profile(github_summary: GitHubSummary) -> np.ndarray:
    """
    Embed a GitHub profile into a vector.

    Combines languages, repos, and bio into an embedding.
    """
    skills = extract_skills_from_profile(github_summary)

    # Build rich text representation
    text_parts = []

    if skills:
        text_parts.append("Skills: " + ", ".join(skills))

    # Add repo info
    for repo in github_summary.top_repos[:5]:  # Top 5 repos
        text_parts.append(f"{repo.name}: {repo.description or ''}")

    if github_summary.bio:
        text_parts.append(github_summary.bio)

    text = " | ".join(text_parts)
    return embed_text(text)


def batch_embed_jobs(jobs: List[NormalisedJob]) -> Dict[str, np.ndarray]:
    """
    Batch embed multiple jobs for efficiency.

    Returns dict mapping job_id to embedding vector.
    """
    if not jobs:
        return {}

    logger.info(f"[Embedder] Batch embedding {len(jobs)} jobs...")

    texts = []
    for job in jobs:
        skills = extract_skills_from_job(job)
        text_parts = [job.title]
        if skills:
            text_parts.append("Skills: " + ", ".join(skills))
        if job.required_skills:
            text_parts.append(" ".join(job.required_skills))
        if job.nice_to_have:
            text_parts.append(" ".join(job.nice_to_have))
        texts.append(" | ".join(text_parts))

    model = get_model()
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)

    result = {}
    for i, job in enumerate(jobs):
        result[job.id] = embeddings[i]

    logger.info(f"[Embedder] Embedded {len(jobs)} jobs successfully")
    return result
