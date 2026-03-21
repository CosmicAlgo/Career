"""
CareerRadar - Gemini Flash 2.5 Client
Google AI client for profile assessment using Gemini's structured output
"""

import json
from typing import Dict, Any, Optional

import google.generativeai as genai
from google.generativeai.types import GenerationConfig

from config.settings import settings
from assessment.assessment_schema import AssessmentResult
from assessment.prompt_templates import (
    SYSTEM_PROMPT,
    build_user_prompt,
    parse_assessment_response,
    create_fallback_assessment,
    get_gemini_response_schema
)


class GeminiClient:
    """Google Gemini Flash 2.5 AI client with structured JSON output."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.google_ai_api_key
        
        if not self.api_key:
            raise ValueError("Google AI API key not configured")
        
        # Configure API
        genai.configure(api_key=self.api_key)
        
        # Try gemini-2.5-flash, fallback to gemini-1.5-flash
        model_name = "gemini-2.5-flash"
        try:
            # Test if model exists
            self.model = genai.GenerativeModel(model_name)
        except Exception:
            model_name = "gemini-1.5-flash"
            self.model = genai.GenerativeModel(model_name)
        
        self.model_name = model_name
        
        # Generation config for structured output
        self.generation_config = GenerationConfig(
            temperature=0.3,
            response_mime_type="application/json",
            max_output_tokens=8192
        )
    
    async def assess_profile(
        self,
        github_summary: Dict[str, Any],
        target_roles: list,
        job_listings: list,
        assessment_date: str
    ) -> AssessmentResult:
        """
        Run profile assessment using Gemini Flash 2.5.
        
        Uses response_mime_type="application/json" for structured output.
        
        Args:
            github_summary: GitHub profile data
            target_roles: Target role names
            job_listings: Job listings to match against
            assessment_date: Date string (ISO format)
            
        Returns:
            AssessmentResult with scores, gaps, and recommendations
        """
        # Build prompts
        user_prompt = build_user_prompt(
            github_summary=github_summary,
            target_roles=target_roles,
            job_listings=job_listings,
            assessment_date=assessment_date
        )
        
        try:
            # Create generation config with response schema for structured output
            # Gemini 1.5 Flash+ supports response_schema parameter
            if self.model_name == "gemini-1.5-flash":
                try:
                    response_schema = get_gemini_response_schema()
                    generation_config = GenerationConfig(
                        temperature=0.3,
                        response_mime_type="application/json",
                        response_schema=response_schema,
                        max_output_tokens=8192
                    )
                except Exception:
                    # Fallback if response_schema not supported
                    generation_config = self.generation_config
            else:
                generation_config = self.generation_config
            
            # Start chat
            chat = self.model.start_chat(history=[])
            
            # Combine system + user prompts
            full_prompt = f"{SYSTEM_PROMPT}\n\n{user_prompt}"
            
            # Send message
            response = await chat.send_message_async(
                full_prompt,
                generation_config=generation_config
            )
            
            # Parse JSON response
            response_text = response.text
            
            # Clean up response if needed (in case model didn't use structured output)
            response_text = self._clean_json_response(response_text)
            
            # Parse to dict
            response_data = json.loads(response_text)
            
            # Validate and construct AssessmentResult
            return parse_assessment_response(response_data)
            
        except Exception as e:
            print(f"[Gemini] Assessment error: {e}")
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
async def assess_with_gemini(
    github_summary: Dict[str, Any],
    target_roles: list,
    job_listings: list,
    assessment_date: str
) -> AssessmentResult:
    """Assess profile using Gemini."""
    client = GeminiClient()
    return await client.assess_profile(
        github_summary, target_roles, job_listings, assessment_date
    )
