"""
CareerRadar - API Schemas
Pydantic v2 models for FastAPI request/response schemas
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional
from datetime import date as DateType, datetime

from ingestion.github_schema import GitHubSummary


# ============ Job Models ============


class JobMatch(BaseModel):
    """Job match information with match percentage."""

    model_config = ConfigDict(populate_by_name=True)

    job_id: str = Field(..., description="Job identifier")
    match_pct: int = Field(..., ge=0, le=100, description="Match percentage")
    reasons: List[str] = Field(default_factory=list, description="Why this job matches")


class NormalisedJob(BaseModel):
    """Normalised job listing."""

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(
        ..., description="Unique job identifier (hash of title+company+date)"
    )
    title: str = Field(..., description="Job title")
    company: Optional[str] = Field(default=None, description="Company name")
    location: Optional[str] = Field(default=None, description="Job location")
    remote: bool = Field(default=False, description="Whether job is remote")
    required_skills: List[str] = Field(
        default_factory=list, description="Required skills"
    )
    nice_to_have: List[str] = Field(
        default_factory=list, description="Nice-to-have skills"
    )
    seniority: Optional[str] = Field(default=None, description="Seniority level")
    salary_min: Optional[int] = Field(default=None, description="Minimum salary")
    salary_max: Optional[int] = Field(default=None, description="Maximum salary")
    currency: str = Field(default="GBP", description="Currency code")
    source: Optional[str] = Field(default=None, description="Source platform")
    url: Optional[str] = Field(default=None, description="Job posting URL")
    posted_date: Optional[DateType] = Field(default=None, description="Posting date")


# ============ Assessment Models ============


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


# ============ API Request/Response Models ============


class RefreshRequest(BaseModel):
    """Request to trigger manual refresh."""

    model_config = ConfigDict(populate_by_name=True)

    force: bool = Field(
        default=False, description="Force refresh even if already ran today"
    )


class RefreshResponse(BaseModel):
    """Response from refresh trigger."""

    model_config = ConfigDict(populate_by_name=True)

    success: bool = Field(..., description="Whether refresh was triggered")
    message: str = Field(..., description="Status message")
    snapshot_id: Optional[str] = Field(default=None, description="Created snapshot ID")


class ScoreResponse(BaseModel):
    """Score data response."""

    model_config = ConfigDict(populate_by_name=True)

    overall_score: int = Field(..., description="Current overall score")
    role_scores: Dict[str, int] = Field(..., description="Per-role scores")
    date: DateType = Field(..., description="Date of assessment")


class JobsResponse(BaseModel):
    """Jobs listing response."""

    model_config = ConfigDict(populate_by_name=True)

    jobs: List[NormalisedJob] = Field(..., description="List of jobs")
    total: int = Field(..., description="Total job count")
    date: DateType = Field(..., description="Date of job listings")


class SnapshotResponse(BaseModel):
    """Daily snapshot response."""

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Snapshot ID")
    date: DateType = Field(..., description="Snapshot date")
    github_data: GitHubSummary = Field(..., description="GitHub data snapshot")
    assessment: AssessmentResult = Field(..., description="Assessment results")
    overall_score: int = Field(..., description="Overall score")
    created_at: datetime = Field(..., description="Creation timestamp")


class TrendData(BaseModel):
    """Trend data point."""

    model_config = ConfigDict(populate_by_name=True)

    date: DateType = Field(..., description="Date of data point")
    overall_score: int = Field(..., description="Overall score")
    role_scores: Dict[str, int] = Field(..., description="Per-role scores")


class TrendsResponse(BaseModel):
    """Score trends over time response."""

    model_config = ConfigDict(populate_by_name=True)

    trends: List[TrendData] = Field(..., description="Daily trend data")


class SkillTrendData(BaseModel):
    """Skill trend information."""

    model_config = ConfigDict(populate_by_name=True)

    skill: str = Field(..., description="Skill name")
    frequency: int = Field(..., description="Frequency in job postings")
    date: DateType = Field(..., description="Date of trend data")


class SkillTrendsResponse(BaseModel):
    """Skill trends response."""

    model_config = ConfigDict(populate_by_name=True)

    trends: List[SkillTrendData] = Field(..., description="Skill trend data")
    top_trending: List[str] = Field(..., description="Top trending skills today")


class GapResponse(BaseModel):
    """Skill gaps response."""

    model_config = ConfigDict(populate_by_name=True)

    gaps: List[SkillGap] = Field(..., description="Identified skill gaps")
    date: DateType = Field(..., description="Date of gap analysis")


class HealthResponse(BaseModel):
    """Health check response."""

    model_config = ConfigDict(populate_by_name=True)

    status: str = Field(default="healthy", description="Service status")
    version: str = Field(default="1.0.0", description="API version")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Current timestamp"
    )


class AssessmentPayload(BaseModel):
    """Payload sent to AI for assessment."""

    model_config = ConfigDict(populate_by_name=True)

    github_summary: GitHubSummary = Field(..., description="GitHub profile summary")
    target_roles: List[str] = Field(..., description="Target roles for matching")
    job_listings: List[NormalisedJob] = Field(
        ..., description="Job listings to match against"
    )
    date: DateType = Field(
        default_factory=DateType.today, description="Assessment date"
    )
