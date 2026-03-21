"""
CareerRadar - Daily Pipeline Runner
Orchestrates the daily data pipeline: GitHub ingestion, job scraping, AI assessment, persistence
"""

import asyncio
from typing import List, Dict, Optional, Any
from datetime import date, datetime

from config.settings import settings
from ingestion.github_client import GitHubClient, get_github_summary
from api.schemas import (
    GitHubSummary, NormalisedJob, AssessmentResult, SkillGap, JobMatch,
    AssessmentPayload
)
from database.queries import get_db_queries, DatabaseQueries


class DailyPipelineRunner:
    """Orchestrates the daily data pipeline."""
    
    def __init__(self, db_queries: Optional[DatabaseQueries] = None):
        self.db = db_queries or get_db_queries()
        self.github_client = GitHubClient()
    
    async def run_full_pipeline(
        self,
        force: bool = False,
        skip_github: bool = False,
        skip_jobs: bool = False,
        skip_assessment: bool = False
    ) -> Dict[str, Any]:
        """
        Run the complete daily pipeline.
        
        Steps:
        1. Check if already ran today (unless force=True)
        2. Fetch GitHub profile data
        3. Scrape job listings
        4. Run AI assessment
        5. Persist to database
        
        Returns pipeline result with snapshot_id and status.
        """
        today = date.today()
        
        # Check if already ran today
        if not force:
            exists = await self.db.check_snapshot_exists(today)
            if exists:
                return {
                    "success": True,
                    "message": "Snapshot already exists for today. Use force=True to override.",
                    "snapshot_id": None,
                    "date": today.isoformat()
                }
        
        results = {
            "success": False,
            "message": "",
            "snapshot_id": None,
            "date": today.isoformat(),
            "steps": {}
        }
        
        try:
            # Step 1: GitHub Ingestion
            github_summary = None
            if not skip_github:
                print(f"[Pipeline] Step 1: Fetching GitHub data for {settings.github_username}...")
                github_summary = await get_github_summary()
                results["steps"]["github"] = {
                    "success": True,
                    "username": github_summary.username,
                    "total_repos": github_summary.total_repos,
                    "languages": list(github_summary.languages.keys())
                }
                print(f"[Pipeline] GitHub: {github_summary.total_repos} repos, {len(github_summary.languages)} languages")
            else:
                # Try to load from existing snapshot
                existing = await self.db.get_latest_snapshot()
                if existing:
                    github_summary = GitHubSummary.model_validate(existing["github_data"])
                    results["steps"]["github"] = {"success": True, "skipped": True, "loaded_from_cache": True}
                else:
                    results["steps"]["github"] = {"success": False, "error": "No GitHub data available"}
                    results["message"] = "GitHub step failed: no data available"
                    return results
            
            # Step 2: Job Scraping
            job_listings: List[NormalisedJob] = []
            if not skip_jobs:
                print("[Pipeline] Step 2: Scraping job listings...")
                job_listings = await self._scrape_jobs()
                results["steps"]["jobs"] = {
                    "success": True,
                    "count": len(job_listings),
                    "sources": list(set(j.source for j in job_listings if j.source))
                }
                print(f"[Pipeline] Jobs: Scraped {len(job_listings)} listings")
            else:
                # Load recent jobs from database
                jobs_data = await self.db.get_latest_jobs(limit=50)
                job_listings = [NormalisedJob.model_validate(j) for j in jobs_data]
                results["steps"]["jobs"] = {
                    "success": True,
                    "skipped": True,
                    "loaded_from_db": True,
                    "count": len(job_listings)
                }
                print(f"[Pipeline] Jobs: Loaded {len(job_listings)} from database")
            
            # Step 3: AI Assessment
            assessment = None
            if not skip_assessment and github_summary and job_listings:
                print("[Pipeline] Step 3: Running AI assessment...")
                assessment = await self._run_assessment(github_summary, job_listings)
                results["steps"]["assessment"] = {
                    "success": True,
                    "overall_score": assessment.overall_score,
                    "role_scores": assessment.role_scores,
                    "skill_gaps_count": len(assessment.skill_gaps),
                    "top_jobs_count": len(assessment.top_matching_jobs)
                }
                print(f"[Pipeline] Assessment: Overall score {assessment.overall_score}")
            else:
                # Create a mock assessment for testing/demo
                assessment = self._create_mock_assessment(job_listings)
                results["steps"]["assessment"] = {
                    "success": True,
                    "mock": True,
                    "overall_score": assessment.overall_score
                }
                print(f"[Pipeline] Assessment: Created mock assessment (score: {assessment.overall_score})")
            
            # Step 4: Persist to Database
            print("[Pipeline] Step 4: Persisting to database...")
            
            # Save jobs
            if job_listings and not skip_jobs:
                await self.db.upsert_jobs(job_listings)
            
            # Save skill trends
            if assessment and assessment.skill_gaps:
                await self.db.upsert_skill_trends(today, assessment.skill_gaps)
            
            # Save role scores
            if assessment and assessment.role_scores:
                await self.db.upsert_role_scores(today, assessment.role_scores)
            
            # Save snapshot
            snapshot_id = await self.db.create_snapshot(
                snapshot_date=today,
                github_data=github_summary,
                assessment=assessment,
                overall_score=assessment.overall_score if assessment else 0
            )
            
            results["steps"]["persistence"] = {
                "success": True,
                "snapshot_created": snapshot_id is not None,
                "jobs_saved": len(job_listings) if not skip_jobs else 0
            }
            
            results["success"] = True
            results["message"] = "Pipeline completed successfully"
            results["snapshot_id"] = snapshot_id
            
            print(f"[Pipeline] Complete! Snapshot ID: {snapshot_id}")
            
        except Exception as e:
            results["success"] = False
            results["message"] = f"Pipeline failed: {str(e)}"
            print(f"[Pipeline] Error: {e}")
            raise
        
        return results
    
    async def _scrape_jobs(self) -> List[NormalisedJob]:
        """
        Scrape job listings using tiered fallback strategy.
        
        Tier 1: JSearch RapidAPI
        Tier 2: Apify Actors (fallback)
        Tier 3: Direct scraping (fallback)
        """
        jobs: List[NormalisedJob] = []
        
        # For now, return empty list - scrapers to be implemented separately
        # This allows the pipeline to run with mock data for testing
        print("[Pipeline] Job scraping: Using placeholder (implement scrapers separately)")
        
        return jobs
    
    async def _run_assessment(
        self,
        github_summary: GitHubSummary,
        job_listings: List[NormalisedJob]
    ) -> AssessmentResult:
        """
        Run AI assessment using Gemini or Claude.
        
        Returns AssessmentResult with scores, gaps, and recommendations.
        """
        # Import assessment modules here to avoid circular imports
        from assessment.ai_router import get_ai_client
        
        payload = AssessmentPayload(
            github_summary=github_summary,
            target_roles=settings.target_roles,
            job_listings=job_listings,
            date=date.today()
        )
        
        ai_client = get_ai_client()
        return await ai_client.assess_profile(payload)
    
    def _create_mock_assessment(
        self,
        job_listings: List[NormalisedJob]
    ) -> AssessmentResult:
        """Create a mock assessment for testing/demo purposes."""
        return AssessmentResult(
            overall_score=72,
            role_scores={
                "ml_engineer": 74,
                "mlops": 70,
                "devops": 68,
                "backend": 65
            },
            top_matching_jobs=[
                JobMatch(
                    job_id="mock-1",
                    match_pct=85,
                    reasons=["Strong Python skills", "GitHub activity"]
                )
            ] if job_listings else [],
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
            weekly_recommendation="Focus on learning Kubernetes this week - it's mentioned in 45% of relevant job postings.",
            trending_skills_today=["Kubernetes", "Docker", "Python", "AWS", "React"]
        )


async def run_daily_pipeline(
    force: bool = False,
    skip_github: bool = False,
    skip_jobs: bool = False,
    skip_assessment: bool = False
) -> Dict[str, Any]:
    """Convenience function to run the daily pipeline."""
    runner = DailyPipelineRunner()
    return await runner.run_full_pipeline(
        force=force,
        skip_github=skip_github,
        skip_jobs=skip_jobs,
        skip_assessment=skip_assessment
    )
