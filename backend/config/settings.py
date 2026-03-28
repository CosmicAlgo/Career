"""
CareerRadar - Configuration Settings
Pydantic v2 settings for environment variables
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    # GitHub Configuration
    github_token: str = Field(default="", description="GitHub personal access token")
    github_username: str = Field(default="", description="GitHub username to analyze")

    # AI Provider Configuration
    ai_provider: str = Field(
        default="gemini", description="AI provider: gemini or claude"
    )
    google_ai_api_key: str = Field(
        default="", description="Google AI API key for Gemini"
    )
    anthropic_api_key: str = Field(
        default="", description="Anthropic API key for Claude"
    )

    # Job Scraping - Tier 1
    rapidapi_key: str = Field(default="", description="RapidAPI key for JSearch")
    rapidapi_jsearch_quota: int = Field(default=200, description="JSearch quota limit")

    # Job Scraping - Tier 2
    apify_token: str = Field(default="", description="Apify API token")

    # Supabase Configuration
    supabase_url: str = Field(default="", description="Supabase project URL")
    supabase_anon_key: str = Field(default="", description="Supabase anon key")
    supabase_service_role_key: str = Field(
        default="", description="Supabase service role key"
    )

    # Target Configuration
    target_roles: List[str] = Field(
        default=["ml_engineer", "mlops", "devops", "backend"],
        description="Target roles for matching",
    )
    target_locations: List[str] = Field(
        default=["UK", "Remote"], description="Target job locations"
    )
    target_seniority: List[str] = Field(
        default=["junior", "mid"], description="Target seniority levels"
    )

    # Scheduling
    scrape_interval_hours: int = Field(
        default=24, description="Scraping interval in hours"
    )
    scrape_user_agent: str = Field(
        default="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        description="User agent for scraping",
    )

    # App Configuration
    backend_url: str = Field(default="http://localhost:8000", description="Backend URL")

    # Error Tracking
    sentry_dsn: str = Field(default="", description="Sentry DSN for error tracking")
    environment: str = Field(
        default="development", description="Environment: development/production"
    )

    @field_validator(
        "target_roles", "target_locations", "target_seniority", mode="before"
    )
    @classmethod
    def parse_comma_separated(cls, v):
        """Parse comma-separated string into list."""
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @property
    def is_gemini_provider(self) -> bool:
        """Check if using Gemini as AI provider."""
        return self.ai_provider.lower() == "gemini"

    @property
    def is_claude_provider(self) -> bool:
        """Check if using Claude as AI provider."""
        return self.ai_provider.lower() == "claude"


# Global settings instance
settings = Settings()
