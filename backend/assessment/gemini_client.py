"""
CareerRadar - Gemini Flash 2.5 Client
Google AI client for profile assessment using new google-genai SDK
"""

import json
import logging
from typing import Dict, Any, Optional

from google import genai
from google.genai import types

from config.settings import settings
from assessment.assessment_schema import AssessmentResult
from assessment.prompt_templates import (
    SYSTEM_PROMPT,
    build_user_prompt,
    parse_assessment_response,
)

logger = logging.getLogger(__name__)


class GeminiClient:
    """Google Gemini Flash 2.5 AI client with structured JSON output using new SDK."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.google_ai_api_key

        if not self.api_key:
            raise ValueError("Google AI API key not configured")

        # Initialize client with new SDK
        self.client = genai.Client(api_key=self.api_key)

        # Try gemini-2.5-flash, fallback to gemini-1.5-flash
        self.model_name = "gemini-2.5-flash"

        logger.info(f"[Gemini] Initialized with model: {self.model_name}")

    async def assess_profile(
        self,
        github_summary: Dict[str, Any],
        target_roles: list,
        job_listings: list,
        assessment_date: str,
        local_scores: Optional[Dict[str, int]] = None,
    ) -> AssessmentResult:
        """
        Run profile assessment using Gemini Flash 2.5.

        Uses response_mime_type="application/json" for structured output.

        Args:
            github_summary: GitHub profile data
            target_roles: Target role names
            job_listings: Job listings to match against
            assessment_date: Date string (ISO format)
            local_scores: Optional local ML scores to provide as context

        Returns:
            AssessmentResult with scores, gaps, and recommendations

        Raises:
            Exception: If assessment fails and cannot produce valid result
        """
        # Build prompts with local scores context if available
        local_scores_text = ""
        if local_scores:
            score_lines = [f"- Overall: {local_scores.get('overall', 'N/A')}"]
            for role in target_roles:
                role_key = role.lower().strip()
                if role_key in local_scores:
                    score_lines.append(
                        f"- {role_key.replace('_', ' ').title()}: {local_scores[role_key]}"
                    )
            local_scores_text = (
                "\nLocal ML similarity scores (0-100) computed from skill embeddings:\n"
                + "\n".join(score_lines)
                + "\n\nUse these as a baseline for your assessment but apply your own judgment based on the full profile context.\n"
            )

        user_prompt = (
            build_user_prompt(
                github_summary=github_summary,
                target_roles=target_roles,
                job_listings=job_listings,
                assessment_date=assessment_date,
            )
            + local_scores_text
        )

        try:
            # Combine system + user prompts
            full_prompt = f"{SYSTEM_PROMPT}\n\n{user_prompt}"

            # Configure generation with JSON output
            config = types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=8192,
                response_mime_type="application/json",
            )

            logger.info(
                f"[Gemini] Sending assessment request with {len(job_listings)} jobs"
            )

            # Generate content with new SDK
            response = await self.client.aio.models.generate_content(
                model=self.model_name, contents=full_prompt, config=config
            )

            # Get response text
            response_text = response.text

            # Clean up response if needed
            response_text = self._clean_json_response(response_text)

            # Parse to dict
            response_data = json.loads(response_text)

            # Add assessment source
            response_data["assessment_source"] = "gemini"
            if local_scores:
                response_data["local_ml_scores"] = local_scores

            # Validate and construct AssessmentResult
            result = parse_assessment_response(response_data)
            logger.info(
                f"[Gemini] Assessment complete: overall_score={result.overall_score}"
            )
            return result

        except Exception as e:
            logger.error(f"[Gemini] Assessment error: {e}", exc_info=True)
            # Re-raise exception instead of silently falling back
            raise Exception(f"Gemini assessment failed: {str(e)}") from e

    def _clean_json_response(self, text: str) -> str:
        """Clean up JSON response from model."""
        text = text.strip()

        # Remove markdown code blocks if present
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            parts = text.split("```")
            for part in parts:
                if "{" in part and "}" in part:
                    text = part
                    break

        # Find JSON object
        start = text.find("{")
        end = text.rfind("}")

        if start != -1 and end != -1 and end > start:
            text = text[start : end + 1]

        return text.strip()


# Convenience function
async def assess_with_gemini(
    github_summary: Dict[str, Any],
    target_roles: list,
    job_listings: list,
    assessment_date: str,
    local_scores: Optional[Dict[str, int]] = None,
) -> AssessmentResult:
    """Assess profile using Gemini."""
    client = GeminiClient()
    return await client.assess_profile(
        github_summary, target_roles, job_listings, assessment_date, local_scores
    )
