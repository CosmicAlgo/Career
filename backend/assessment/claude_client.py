"""
CareerRadar - Anthropic Claude Client
Optional premium AI client using Anthropic SDK
"""

import json
from typing import Dict, Any, Optional

import anthropic

from config.settings import settings
from assessment.assessment_schema import AssessmentResult
from assessment.prompt_templates import (
    SYSTEM_PROMPT,
    build_user_prompt,
    parse_assessment_response,
    create_fallback_assessment
)


class ClaudeClient:
    """Anthropic Claude AI client (premium option)."""
    
    MODEL = "claude-3-5-sonnet-20241022"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.anthropic_api_key
        
        if not self.api_key:
            raise ValueError("Anthropic API key not configured")
        
        self.client = anthropic.AsyncAnthropic(api_key=self.api_key)
    
    async def assess_profile(
        self,
        github_summary: Dict[str, Any],
        target_roles: list,
        job_listings: list,
        assessment_date: str
    ) -> AssessmentResult:
        """
        Run profile assessment using Claude Sonnet.
        
        Args:
            github_summary: GitHub profile data
            target_roles: Target role names
            job_listings: Job listings to match against
            assessment_date: Date string (ISO format)
            
        Returns:
            AssessmentResult with scores, gaps, and recommendations
        """
        # Build user prompt
        user_prompt = build_user_prompt(
            github_summary=github_summary,
            target_roles=target_roles,
            job_listings=job_listings,
            assessment_date=assessment_date
        )
        
        try:
            # Create message with system prompt
            message = await self.client.messages.create(
                model=self.MODEL,
                max_tokens=4096,
                temperature=0.3,
                system=SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ]
            )
            
            # Get response text
            response_text = message.content[0].text
            
            # Clean up response if needed
            response_text = self._clean_json_response(response_text)
            
            # Parse JSON response
            response_data = json.loads(response_text)
            
            # Validate and construct AssessmentResult
            return parse_assessment_response(response_data)
            
        except Exception as e:
            print(f"[Claude] Assessment error: {e}")
            # Return fallback assessment on error
            return create_fallback_assessment(
                github_languages=list(github_summary.get('languages', {}).keys()),
                job_count=len(job_listings)
            )
    
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
            text = text[start:end+1]
        
        return text.strip()


# Convenience function
async def assess_with_claude(
    github_summary: Dict[str, Any],
    target_roles: list,
    job_listings: list,
    assessment_date: str
) -> AssessmentResult:
    """Assess profile using Claude."""
    client = ClaudeClient()
    return await client.assess_profile(
        github_summary, target_roles, job_listings, assessment_date
    )
