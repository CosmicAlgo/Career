"""
CareerRadar - GitHub Schema Models
Pydantic v2 models for GitHub data ingestion
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional
from datetime import date, datetime


class RepoInfo(BaseModel):
    """Repository information from GitHub."""
    model_config = ConfigDict(populate_by_name=True)
    
    name: str = Field(..., description="Repository name")
    description: Optional[str] = Field(default=None, description="Repository description")
    stars: int = Field(default=0, description="Number of stars")
    forks: int = Field(default=0, description="Number of forks")
    topics: List[str] = Field(default_factory=list, description="Repository topics")
    language: Optional[str] = Field(default=None, description="Primary language")
    last_commit: Optional[str] = Field(default=None, description="Last commit date (ISO format)")
    is_private: bool = Field(default=False, description="Whether repo is private")


class LanguageBreakdown(BaseModel):
    """Language usage breakdown for a repository."""
    model_config = ConfigDict(populate_by_name=True)
    
    name: str = Field(..., description="Programming language name")
    percentage: float = Field(..., description="Percentage of code in this language")
    color: Optional[str] = Field(default=None, description="GitHub language color")


class ContributionStats(BaseModel):
    """GitHub contribution statistics."""
    model_config = ConfigDict(populate_by_name=True)
    
    total_commits_last_90d: int = Field(default=0, description="Total commits in last 90 days")
    contribution_streak: int = Field(default=0, description="Current contribution streak")
    total_prs: int = Field(default=0, description="Total pull requests")
    total_issues: int = Field(default=0, description="Total issues opened")
    total_reviews: int = Field(default=0, description="Total PR reviews")


class GitHubSummary(BaseModel):
    """Complete GitHub profile summary."""
    model_config = ConfigDict(populate_by_name=True)
    
    username: str = Field(..., description="GitHub username")
    total_repos: int = Field(default=0, description="Total repository count")
    public_repos: int = Field(default=0, description="Public repository count")
    followers: int = Field(default=0, description="Follower count")
    following: int = Field(default=0, description="Following count")
    bio: Optional[str] = Field(default=None, description="User bio")
    company: Optional[str] = Field(default=None, description="Company")
    location: Optional[str] = Field(default=None, description="Location")
    
    languages: Dict[str, float] = Field(
        default_factory=dict,
        description="Language breakdown (name -> percentage)"
    )
    top_repos: List[RepoInfo] = Field(
        default_factory=list,
        description="Top repositories by stars"
    )
    
    contribution_stats: ContributionStats = Field(
        default_factory=ContributionStats,
        description="Contribution statistics"
    )
    
    readme_excerpt: Optional[str] = Field(
        default=None,
        description="Excerpt from profile README"
    )
    certifications_detected: List[str] = Field(
        default_factory=list,
        description="Certifications detected in README/repos"
    )
    
    last_updated: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this summary was generated"
    )


class GitHubGraphQLResponse(BaseModel):
    """Raw GitHub GraphQL API response structure."""
    model_config = ConfigDict(populate_by_name=True)
    
    data: Optional[Dict] = Field(default=None, description="Response data")
    errors: Optional[List[Dict]] = Field(default=None, description="GraphQL errors")
