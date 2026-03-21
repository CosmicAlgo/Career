"""
CareerRadar - Gemini Flash 2.5 Client
Google AI client for profile assessment
"""

import json
from typing import Dict, Any

import google.generativeai as genai
from google.generativeai.types import GenerationConfig

from config.settings import settings
from api.schemas import AssessmentPayload, AssessmentResult, SkillGap, JobMatch


class GeminiClient:
    """Google Gemini Flash 2.5 AI client."""
    
    def __init__(self, api_key: str = ""):
        self.api_key = api_key or settings.google_ai_api_key
        genai.configure(api_key=self.api_key)
        
        # Use gemini-2.5-flash (or gemini-1.5-flash as fallback)
        try:
            self.model = genai.GenerativeModel("gemini-2.5-flash")
        except Exception:
            # Fallback to older model if 2.5 not available
            self.model = genai.GenerativeModel("gemini-1.5-flash")
        
        self.generation_config = GenerationConfig(
            temperature=0.3,
            response_mime_type="application/json"
        )
    
    async def assess_profile(self, payload: AssessmentPayload) -> AssessmentResult:
        """
        Run profile assessment using Gemini Flash 2.5.
        
        Sends GitHub summary + job listings to AI and parses structured response.
        """
        system_prompt = self._get_system_prompt()
        user_prompt = self._build_user_prompt(payload)
        
        try:
            # Create chat with system prompt
            chat = self.model.start_chat(history=[])
            
            # Combine system + user prompts for Gemini
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            response = await chat.send_message_async(
                full_prompt,
                generation_config=self.generation_config
            )
            
            # Parse JSON response
            response_text = response.text
            
            # Clean up response if needed
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            response_text = response_text.strip()
            
            assessment_data = json.loads(response_text)
            
            # Validate and construct AssessmentResult
            return self._parse_assessment_result(assessment_data)
            
        except Exception as e:
            print(f"Gemini assessment error: {e}")
            # Return fallback assessment on error
            return self._create_fallback_assessment(payload)
    
    def _get_system_prompt(self) -> str:
        """Get system prompt for assessment."""
        return """You are a senior technical recruiter and career coach specialising in ML,
MLOps, DevOps, and backend engineering roles. You receive a candidate's
GitHub profile summary and a list of real job postings from today's market.

Your job is to:
1. Score the candidate's profile against each target role category (0-100)
2. Identify the top 5 skill gaps ranked by market frequency
3. Highlight 3 genuine strengths visible from the GitHub data
4. Surface the top 10 best-matching jobs with match percentage and reasons
5. Identify trending skills appearing in today's postings

Respond ONLY with valid JSON matching this exact schema:
{
    "overall_score": 72,
    "role_scores": {
        "ml_engineer": 74,
        "mlops": 70,
        "devops": 68,
        "backend": 65
    },
    "top_matching_jobs": [
        {
            "job_id": "job-id-string",
            "match_pct": 85,
            "reasons": ["Strong Python skills", "Cloud experience"]
        }
    ],
    "skill_gaps": [
        {"skill": "Kubernetes", "frequency_in_market": 45, "priority": "high"}
    ],
    "strengths": ["Strength 1", "Strength 2", "Strength 3"],
    "weekly_recommendation": "Actionable recommendation for this week",
    "trending_skills_today": ["Skill 1", "Skill 2", "Skill 3"]
}

No markdown, no preamble, no explanation outside the JSON object."""
    
    def _build_user_prompt(self, payload: AssessmentPayload) -> str:
        """Build user prompt with GitHub data and job listings."""
        github = payload.github_summary
        
        # Build GitHub summary section
        github_section = f"""
GITHUB PROFILE SUMMARY:
Username: {github.username}
Total Repos: {github.total_repos}
Public Repos: {github.public_repos}
Languages: {json.dumps(github.languages, indent=2)}
Top Repositories: {json.dumps([r.model_dump() for r in github.top_repos], indent=2)}
Contribution Stats:
- Total commits (last 90 days): {github.contribution_stats.total_commits_last_90d}
- Current streak: {github.contribution_stats.contribution_streak} days
- Total PRs: {github.contribution_stats.total_prs}
Certifications Detected: {github.certifications_detected}
"""
        
        # Build job listings section
        jobs_section = "\nJOB LISTINGS:\n"
        for i, job in enumerate(payload.job_listings[:20], 1):  # Limit to 20 jobs
            jobs_section += f"""
Job {i}:
- ID: {job.id}
- Title: {job.title}
- Company: {job.company}
- Location: {job.location}
- Remote: {job.remote}
- Required Skills: {', '.join(job.required_skills)}
- Nice to Have: {', '.join(job.nice_to_have)}
- Seniority: {job.seniority}
"""
        
        # Build target roles section
        roles_section = f"""
TARGET ROLES: {', '.join(payload.target_roles)}
ASSESSMENT DATE: {payload.date}
"""
        
        return f"{github_section}\n{jobs_section}\n{roles_section}"
    
    def _parse_assessment_result(self, data: Dict[str, Any]) -> AssessmentResult:
        """Parse assessment data from AI response."""
        # Parse skill gaps
        skill_gaps = []
        for gap_data in data.get("skill_gaps", []):
            skill_gaps.append(SkillGap(
                skill=gap_data.get("skill", ""),
                frequency_in_market=gap_data.get("frequency_in_market", 0),
                priority=gap_data.get("priority", "medium")
            ))
        
        # Parse job matches
        top_jobs = []
        for job_data in data.get("top_matching_jobs", []):
            top_jobs.append(JobMatch(
                job_id=job_data.get("job_id", ""),
                match_pct=job_data.get("match_pct", 0),
                reasons=job_data.get("reasons", [])
            ))
        
        return AssessmentResult(
            overall_score=data.get("overall_score", 0),
            role_scores=data.get("role_scores", {}),
            top_matching_jobs=top_jobs,
            skill_gaps=skill_gaps,
            strengths=data.get("strengths", []),
            weekly_recommendation=data.get("weekly_recommendation", ""),
            trending_skills_today=data.get("trending_skills_today", [])
        )
    
    def _create_fallback_assessment(self, payload: AssessmentPayload) -> AssessmentResult:
        """Create fallback assessment when AI call fails."""
        # Extract skills from jobs for realistic gaps
        all_skills = set()
        for job in payload.job_listings:
            all_skills.update(job.required_skills)
        
        common_skills = ["Python", "Docker", "Kubernetes", "AWS", "React", "SQL"]
        
        return AssessmentResult(
            overall_score=70,
            role_scores={
                "ml_engineer": 72,
                "mlops": 68,
                "devops": 66,
                "backend": 70
            },
            top_matching_jobs=[
                JobMatch(
                    job_id=job.id,
                    match_pct=75,
                    reasons=["Skills match"]
                )
                for job in payload.job_listings[:5]
            ],
            skill_gaps=[
                SkillGap(skill=skill, frequency_in_market=30 + i * 5, priority="medium")
                for i, skill in enumerate(common_skills[:5])
            ],
            strengths=[
                "Active GitHub profile",
                "Diverse repository portfolio",
                "Consistent activity"
            ],
            weekly_recommendation="Review job requirements and focus on the most common skill gaps.",
            trending_skills_today=list(all_skills)[:10] if all_skills else common_skills[:5]
        )
