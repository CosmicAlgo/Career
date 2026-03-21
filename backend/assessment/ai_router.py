"""
CareerRadar - AI Router
Routes AI requests to appropriate provider (Gemini or Claude)
"""

from typing import Protocol
from abc import abstractmethod

from config.settings import settings
from api.schemas import AssessmentPayload, AssessmentResult


class AIClient(Protocol):
    """Protocol for AI clients."""
    
    @abstractmethod
    async def assess_profile(self, payload: AssessmentPayload) -> AssessmentResult:
        """Run profile assessment and return results."""
        ...


class MockAIClient:
    """Mock AI client for testing."""
    
    async def assess_profile(self, payload: AssessmentPayload) -> AssessmentResult:
        """Return mock assessment."""
        from api.schemas import AssessmentResult, SkillGap, JobMatch
        
        return AssessmentResult(
            overall_score=72,
            role_scores={
                "ml_engineer": 74,
                "mlops": 70,
                "devops": 68,
                "backend": 65
            },
            top_matching_jobs=[
                JobMatch(job_id="mock-1", match_pct=85, reasons=["Python", "GitHub"])
            ],
            skill_gaps=[
                SkillGap(skill="Kubernetes", frequency_in_market=45, priority="high"),
                SkillGap(skill="Terraform", frequency_in_market=32, priority="medium"),
                SkillGap(skill="AWS", frequency_in_market=58, priority="high")
            ],
            strengths=[
                "Active open source contributions",
                "Strong Python fundamentals",
                "Consistent commit history"
            ],
            weekly_recommendation="Focus on learning Kubernetes this week.",
            trending_skills_today=["Kubernetes", "Docker", "Python", "AWS", "React"]
        )


def get_ai_client() -> AIClient:
    """Get the appropriate AI client based on settings."""
    if settings.ai_provider == "gemini" and settings.google_ai_api_key:
        from assessment.gemini_client import GeminiClient
        return GeminiClient()
    elif settings.ai_provider == "claude" and settings.anthropic_api_key:
        # Claude client would be implemented here
        # For now, fall back to mock
        return MockAIClient()
    else:
        # No valid AI provider configured, use mock
        return MockAIClient()
