"""
CareerRadar - AI Router
Routes AI requests to appropriate provider (Gemini or Claude)
"""

from typing import Protocol
from abc import abstractmethod
from typing import Dict, Any

from config.settings import settings
from assessment.assessment_schema import AssessmentResult


class AIClient(Protocol):
    """Protocol for AI clients."""

    @abstractmethod
    async def assess_profile(
        self,
        github_summary: Dict[str, Any],
        target_roles: list,
        job_listings: list,
        assessment_date: str,
    ) -> AssessmentResult:
        """Run profile assessment and return results."""
        ...


class MockAIClient:
    """Mock AI client for testing."""

    async def assess_profile(
        self,
        github_summary: Dict[str, Any],
        target_roles: list,
        job_listings: list,
        assessment_date: str,
    ) -> AssessmentResult:
        """Return mock assessment."""
        from assessment.prompt_templates import create_fallback_assessment

        return create_fallback_assessment(
            github_languages=list(github_summary.get("languages", {}).keys()),
            job_count=len(job_listings),
        )


def get_ai_client() -> AIClient:
    """
    Get the appropriate AI client based on settings.

    Routes based on AI_PROVIDER env var:
    - "gemini": Use Google Gemini Flash 2.5 (default, free tier)
    - "claude": Use Anthropic Claude (premium, requires ANTHROPIC_API_KEY)
    - Fallback to MockAIClient if neither is configured
    """
    provider = settings.ai_provider.lower()

    if provider == "gemini" and settings.google_ai_api_key:
        from assessment.gemini_client import GeminiClient

        return GeminiClient()

    elif provider == "claude" and settings.anthropic_api_key:
        from assessment.claude_client import ClaudeClient

        return ClaudeClient()

    # No valid AI provider configured, use mock
    print(
        f"[AI Router] Warning: AI provider '{provider}' not available or not configured."
    )
    print("[AI Router] Using mock client. Set GOOGLE_AI_API_KEY or ANTHROPIC_API_KEY.")
    return MockAIClient()


async def run_assessment(
    github_summary: Dict[str, Any],
    target_roles: list,
    job_listings: list,
    assessment_date: str,
) -> AssessmentResult:
    """Convenience function to run assessment with the configured AI provider."""
    client = get_ai_client()
    return await client.assess_profile(
        github_summary, target_roles, job_listings, assessment_date
    )
