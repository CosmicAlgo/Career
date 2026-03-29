"""
CareerRadar - Assessment Schema
Pydantic models for AI assessment
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional


class JobMatch(BaseModel):
    """Job match information with match percentage."""

    model_config = ConfigDict(populate_by_name=True)

    job_id: str = Field(..., description="Job identifier")
    match_pct: int = Field(..., ge=0, le=100, description="Match percentage")
    reasons: List[str] = Field(default_factory=list, description="Why this job matches")


class SkillGap(BaseModel):
    """Skill gap information."""

    model_config = ConfigDict(populate_by_name=True)

    skill: str = Field(..., description="Skill name")
    frequency_in_market: int = Field(
        ..., description="How often mentioned in job postings"
    )
    priority: str = Field(
        default="medium", description="Priority level: high/medium/low"
    )


class RoleScore(BaseModel):
    """Per-role score information."""

    model_config = ConfigDict(populate_by_name=True)

    role: str = Field(..., description="Role name")
    score: int = Field(..., ge=0, le=100, description="Score for this role")
    reasoning: Optional[str] = Field(
        default=None, description="Why this score was given"
    )


class AssessmentResult(BaseModel):
    """AI assessment result."""

    model_config = ConfigDict(populate_by_name=True)

    overall_score: int = Field(..., ge=0, le=100, description="Overall match score")
    role_scores: Dict[str, int] = Field(
        default_factory=dict, description="Per-role scores (e.g., ml_engineer: 74)"
    )
    top_matching_jobs: List[JobMatch] = Field(
        default_factory=list, description="Top matching jobs"
    )
    skill_gaps: List[SkillGap] = Field(
        default_factory=list, description="Identified skill gaps"
    )
    strengths: List[str] = Field(
        default_factory=list, description="Candidate strengths from GitHub analysis"
    )
    weekly_recommendation: str = Field(
        default="", description="Weekly actionable recommendation"
    )
    trending_skills_today: List[str] = Field(
        default_factory=list, description="Skills trending in today's job postings"
    )


class AssessmentInput(BaseModel):
    """Input data for assessment."""

    model_config = ConfigDict(populate_by_name=True)

    github_summary: Dict = Field(..., description="GitHub profile summary")
    target_roles: List[str] = Field(..., description="Target roles for matching")
    job_listings: List[Dict] = Field(..., description="Job listings to match against")
    date: str = Field(..., description="Assessment date (ISO format)")
