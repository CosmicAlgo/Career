"""
CareerRadar - Prompt Templates
System and user prompt templates for AI assessment
"""

import json
from typing import List, Dict, Any

from assessment.assessment_schema import AssessmentResult


SYSTEM_PROMPT = """You are a senior technical recruiter and career coach specialising in ML,
MLOps, DevOps, and backend engineering roles. You receive a candidate's
GitHub profile summary and a list of real job postings from today's market.

Your job is to:
1. Score the candidate's profile against each target role category (0-100)
2. Identify the top 5 skill gaps ranked by market frequency
3. Highlight 3 genuine strengths visible from the GitHub data
4. Surface the top 10 best-matching jobs with match percentage and reasons
5. Identify trending skills appearing in today's postings

Respond ONLY with valid JSON matching the provided schema exactly.
No markdown, no preamble, no explanation outside the JSON object."""


ASSESSMENT_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "overall_score": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100,
            "description": "Overall profile match score 0-100"
        },
        "role_scores": {
            "type": "object",
            "additionalProperties": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100
            },
            "description": "Per-role scores (e.g., ml_engineer: 74)"
        },
        "top_matching_jobs": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "job_id": {"type": "string"},
                    "match_pct": {"type": "integer", "minimum": 0, "maximum": 100},
                    "reasons": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["job_id", "match_pct", "reasons"]
            }
        },
        "skill_gaps": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "skill": {"type": "string"},
                    "frequency_in_market": {"type": "integer"},
                    "priority": {"type": "string", "enum": ["high", "medium", "low"]}
                },
                "required": ["skill", "frequency_in_market", "priority"]
            }
        },
        "strengths": {
            "type": "array",
            "items": {"type": "string"},
            "description": "3 genuine strengths visible from GitHub data"
        },
        "weekly_recommendation": {
            "type": "string",
            "description": "One specific, actionable recommendation for this week"
        },
        "trending_skills_today": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Skills trending in today's job postings"
        }
    },
    "required": [
        "overall_score",
        "role_scores",
        "top_matching_jobs",
        "skill_gaps",
        "strengths",
        "weekly_recommendation",
        "trending_skills_today"
    ]
}


def build_user_prompt(
    github_summary: Dict[str, Any],
    target_roles: List[str],
    job_listings: List[Dict[str, Any]],
    assessment_date: str
) -> str:
    """
    Build the user prompt with GitHub data and job listings.
    
    Args:
        github_summary: GitHub profile summary dict
        target_roles: List of target role names
        job_listings: List of job listing dicts
        assessment_date: Date string (ISO format)
        
    Returns:
        Formatted user prompt string
    """
    # Build GitHub summary section
    github_section = f"""
GITHUB PROFILE SUMMARY:
Username: {github_summary.get('username', 'N/A')}
Total Repos: {github_summary.get('total_repos', 0)}
Public Repos: {github_summary.get('public_repos', 0)}
Followers: {github_summary.get('followers', 0)}
Languages: {json.dumps(github_summary.get('languages', {}), indent=2)}
Top Repositories:
"""
    
    for repo in github_summary.get('top_repos', []):
        github_section += f"""
  - {repo.get('name', 'Unknown')}: {repo.get('stars', 0)} stars
    Description: {repo.get('description', 'N/A')}
    Language: {repo.get('language', 'N/A')}
    Topics: {', '.join(repo.get('topics', []))}
"""
    
    contribution = github_summary.get('contribution_stats', {})
    github_section += f"""
Contribution Stats:
- Total commits (last 90 days): {contribution.get('total_commits_last_90d', 0)}
- Current streak: {contribution.get('contribution_streak', 0)} days
- Total PRs: {contribution.get('total_prs', 0)}

Certifications Detected: {', '.join(github_summary.get('certifications_detected', []))}
"""
    
    # Build job listings section
    jobs_section = "\nJOB LISTINGS:\n"
    
    for i, job in enumerate(job_listings[:20], 1):  # Limit to 20 jobs for token budget
        jobs_section += f"""
Job {i}:
- ID: {job.get('id', f'job-{i}')}
- Title: {job.get('title', 'Unknown')}
- Company: {job.get('company', 'Unknown')}
- Location: {job.get('location', 'N/A')}
- Remote: {job.get('remote', False)}
- Required Skills: {', '.join(job.get('required_skills', []))}
- Nice to Have: {', '.join(job.get('nice_to_have', []))}
- Seniority: {job.get('seniority', 'N/A')}
"""
    
    # Build target roles section
    roles_section = f"""
TARGET ROLES: {', '.join(target_roles)}
ASSESSMENT DATE: {assessment_date}
"""
    
    return f"{github_section}\n{jobs_section}\n{roles_section}"


def get_gemini_response_schema() -> Dict[str, Any]:
    """Get the response schema for Gemini's structured output."""
    from google.generativeai.types import Schema
    
    return Schema(
        type="object",
        properties={
            "overall_score": {"type": "integer"},
            "role_scores": {"type": "object"},
            "top_matching_jobs": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "job_id": {"type": "string"},
                        "match_pct": {"type": "integer"},
                        "reasons": {"type": "array", "items": {"type": "string"}}
                    }
                }
            },
            "skill_gaps": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "skill": {"type": "string"},
                        "frequency_in_market": {"type": "integer"},
                        "priority": {"type": "string"}
                    }
                }
            },
            "strengths": {"type": "array", "items": {"type": "string"}},
            "weekly_recommendation": {"type": "string"},
            "trending_skills_today": {"type": "array", "items": {"type": "string"}}
        },
        required=list(ASSESSMENT_JSON_SCHEMA["required"])
    )


def parse_assessment_response(response_data: Dict[str, Any]) -> AssessmentResult:
    """
    Parse AI response data into AssessmentResult.
    
    Args:
        response_data: Raw response from AI
        
    Returns:
        Validated AssessmentResult
    """
    from assessment.assessment_schema import SkillGap, JobMatch
    
    # Parse skill gaps
    skill_gaps = []
    for gap_data in response_data.get("skill_gaps", []):
        skill_gaps.append(SkillGap(
            skill=gap_data.get("skill", ""),
            frequency_in_market=gap_data.get("frequency_in_market", 0),
            priority=gap_data.get("priority", "medium")
        ))
    
    # Parse job matches
    top_jobs = []
    for job_data in response_data.get("top_matching_jobs", []):
        top_jobs.append(JobMatch(
            job_id=job_data.get("job_id", ""),
            match_pct=job_data.get("match_pct", 0),
            reasons=job_data.get("reasons", [])
        ))
    
    return AssessmentResult(
        overall_score=response_data.get("overall_score", 0),
        role_scores=response_data.get("role_scores", {}),
        top_matching_jobs=top_jobs,
        skill_gaps=skill_gaps,
        strengths=response_data.get("strengths", []),
        weekly_recommendation=response_data.get("weekly_recommendation", ""),
        trending_skills_today=response_data.get("trending_skills_today", [])
    )


def create_fallback_assessment(
    github_languages: List[str],
    job_count: int
) -> AssessmentResult:
    """Create a fallback assessment when AI call fails."""
    from assessment.assessment_schema import SkillGap, JobMatch
    
    # Common skills to suggest based on what's popular
    common_gaps = [
        SkillGap(skill="Kubernetes", frequency_in_market=45, priority="high"),
        SkillGap(skill="AWS/GCP/Azure", frequency_in_market=58, priority="high"),
        SkillGap(skill="Docker", frequency_in_market=42, priority="medium"),
        SkillGap(skill="CI/CD", frequency_in_market=35, priority="medium"),
        SkillGap(skill="System Design", frequency_in_market=28, priority="medium")
    ]
    
    # Base score on number of languages
    base_score = min(50 + len(github_languages) * 10, 85)
    
    return AssessmentResult(
        overall_score=base_score,
        role_scores={
            "ml_engineer": base_score,
            "mlops": max(base_score - 5, 50),
            "devops": max(base_score - 10, 45),
            "backend": base_score
        },
        top_matching_jobs=[
            JobMatch(job_id=f"fallback-{i}", match_pct=70, reasons=["Skills align"])
            for i in range(min(5, job_count))
        ],
        skill_gaps=common_gaps,
        strengths=[
            "Active GitHub presence",
            f"Experience with {len(github_languages)} languages",
            "Consistent code contributions"
        ],
        weekly_recommendation="Focus on learning container orchestration (Kubernetes) - it's the most in-demand skill gap.",
        trending_skills_today=["Kubernetes", "Docker", "Python", "AWS", "React"]
    )
