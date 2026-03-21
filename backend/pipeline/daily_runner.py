"""
CareerRadar - Daily Pipeline Runner
Orchestrates the daily data pipeline: GitHub ingestion, job scraping, AI assessment, persistence
"""

import asyncio
from typing import List, Dict, Optional, Any
from datetime import date, datetime

import sentry_sdk

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
            elif not job_listings:
                # No jobs to compare against - skip assessment
                print("[Pipeline] Assessment: Skipped - no market data available")
                results["steps"]["assessment"] = {
                    "success": False,
                    "skipped": True,
                    "reason": "No market data yet - add a RapidAPI key to enable job matching"
                }
            else:
                # Create a mock assessment for testing/demo (when jobs exist but assessment is skipped)
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
            sentry_sdk.capture_exception(e)
            raise
        
        return results
    
    async def _scrape_jobs(self) -> List[NormalisedJob]:
        """
        Scrape job listings using tiered fallback strategy.
        
        Tier 1: JSearch RapidAPI
        Tier 2: Mock jobs (if no API key configured)
        """
        jobs: List[NormalisedJob] = []
        
        # Try JSearch if API key is available
        if settings.rapidapi_key:
            print("[Pipeline] Job scraping: Using JSearch RapidAPI...")
            try:
                from scrapers.tier1_jsearch import scrape_with_jsearch
                from api.schemas import NormalisedJob as NJ
                
                # Search for each target role
                for role in settings.target_roles:
                    raw_jobs = await scrape_with_jsearch(
                        query=role.replace("_", " ").title(),
                        location="UK",
                        max_results=10
                    )
                    
                    # Convert RawJobListing to NormalisedJob
                    for raw in raw_jobs:
                        try:
                            # Extract skills from description using simple keyword matching
                            skills = self._extract_skills_from_description(raw.description or "")
                            
                            job = NJ(
                                id=f"jsearch-{raw.source}-{hash(raw.url) % 10000000:07d}",
                                title=raw.title,
                                company=raw.company or "Unknown",
                                location=raw.location or "UK",
                                description=raw.description or "",
                                url=raw.url or "",
                                source="jsearch",
                                posted_date=raw.posted_at.date() if raw.posted_at else date.today(),
                                salary_min=None,
                                salary_max=None,
                                currency="GBP",
                                remote=raw.remote,
                                required_skills=skills,
                                seniority="mid"
                            )
                            jobs.append(job)
                        except Exception as e:
                            print(f"[Pipeline] Failed to convert job: {e}")
                            continue
                
                print(f"[Pipeline] JSearch: Found {len(jobs)} jobs")
                
            except Exception as e:
                print(f"[Pipeline] JSearch failed: {e}")
        
        # If no jobs from JSearch or no API key, generate mock jobs
        if not jobs:
            print("[Pipeline] Job scraping: Generating mock jobs...")
            jobs = self._generate_mock_jobs()
            print(f"[Pipeline] Generated {len(jobs)} mock jobs")
        
        return jobs
    
    def _extract_skills_from_description(self, description: str) -> List[str]:
        """Extract common tech skills from job description."""
        description_lower = description.lower()
        
        # Common tech skills to look for
        skill_keywords = {
            "python": "Python",
            "tensorflow": "TensorFlow",
            "pytorch": "PyTorch",
            "kubernetes": "Kubernetes",
            "docker": "Docker",
            "aws": "AWS",
            "gcp": "GCP",
            "azure": "Azure",
            "mlflow": "MLflow",
            "kubeflow": "Kubeflow",
            "terraform": "Terraform",
            "ansible": "Ansible",
            "jenkins": "Jenkins",
            "git": "Git",
            "sql": "SQL",
            "postgresql": "PostgreSQL",
            "mongodb": "MongoDB",
            "redis": "Redis",
            "kafka": "Kafka",
            "spark": "Spark",
            "hadoop": "Hadoop",
            "airflow": "Airflow",
            "dagster": "Dagster",
            "prefect": "Prefect",
            "scikit-learn": "scikit-learn",
            "pandas": "Pandas",
            "numpy": "NumPy",
            "fastapi": "FastAPI",
            "flask": "Flask",
            "django": "Django",
            "react": "React",
            "typescript": "TypeScript",
            "javascript": "JavaScript",
            "go": "Go",
            "rust": "Rust",
            "java": "Java",
            "scala": "Scala",
            "c++": "C++",
            "prometheus": "Prometheus",
            "grafana": "Grafana",
            "elk": "ELK Stack",
            "opencv": "OpenCV",
            "hugging face": "Hugging Face",
            "langchain": "LangChain",
            "llama": "LLaMA",
            "gpt": "GPT",
            "bert": "BERT",
        }
        
        found_skills = []
        for keyword, skill_name in skill_keywords.items():
            if keyword in description_lower:
                found_skills.append(skill_name)
        
        return found_skills[:10]  # Limit to top 10 skills
    
    def _generate_mock_jobs(self) -> List[NormalisedJob]:
        """Generate realistic mock job listings for ML Engineer and MLOps roles in UK."""
        from api.schemas import NormalisedJob as NJ
        
        mock_jobs = [
            NJ(
                id="mock-001",
                title="Senior ML Engineer",
                company="DeepMind",
                location="London, UK",
                description="We're seeking an experienced ML Engineer to design and deploy large-scale machine learning systems. You'll work on cutting-edge AI research projects and productionize models serving millions of users. Strong Python, TensorFlow, and Kubernetes skills required.",
                url="https://example.com/job/1",
                source="mock",
                posted_date=date.today(),
                salary_min=80000,
                salary_max=120000,
                currency="GBP",
                remote=True,
                required_skills=["Python", "TensorFlow", "Kubernetes", "Docker", "GCP", "MLflow"],
                seniority="senior"
            ),
            NJ(
                id="mock-002",
                title="MLOps Engineer",
                company="Monzo Bank",
                location="London, UK",
                description="Join our ML Platform team to build infrastructure for training and serving ML models at scale. You'll design CI/CD pipelines for ML, implement monitoring, and optimize model performance. Experience with AWS, Terraform, and Python essential.",
                url="https://example.com/job/2",
                source="mock",
                posted_date=date.today(),
                salary_min=70000,
                salary_max=95000,
                currency="GBP",
                remote=True,
                required_skills=["Python", "AWS", "Terraform", "Docker", "Kubernetes", "Jenkins"],
                seniority="mid"
            ),
            NJ(
                id="mock-003",
                title="Machine Learning Engineer",
                company="Spotify",
                location="London, UK",
                description="Help us personalize the listening experience for millions. You'll build recommendation systems, train deep learning models, and deploy them to production. Strong skills in PyTorch, Python, and distributed systems required.",
                url="https://example.com/job/3",
                source="mock",
                posted_date=date.today(),
                salary_min=75000,
                salary_max=110000,
                currency="GBP",
                remote=True,
                required_skills=["Python", "PyTorch", "Spark", "Kubernetes", "GCP", "SQL"],
                seniority="senior"
            ),
            NJ(
                id="mock-004",
                title="Senior MLOps Engineer",
                company="Revolut",
                location="London, UK",
                description="Build the ML infrastructure powering financial services used by millions. Design and implement ML pipelines, model versioning, and A/B testing frameworks. Experience with Kubeflow, Airflow, and cloud platforms required.",
                url="https://example.com/job/4",
                source="mock",
                posted_date=date.today(),
                salary_min=85000,
                salary_max=130000,
                currency="GBP",
                remote=False,
                required_skills=["Python", "Kubeflow", "Airflow", "AWS", "Docker", "Terraform"],
                seniority="senior"
            ),
            NJ(
                id="mock-005",
                title="ML Platform Engineer",
                company="ASOS",
                location="London, UK",
                description="Develop and maintain the ML platform that powers fashion recommendations. Build tools for model training, deployment, and monitoring. Strong Python, Kubernetes, and cloud infrastructure skills needed.",
                url="https://example.com/job/5",
                source="mock",
                posted_date=date.today(),
                salary_min=65000,
                salary_max=90000,
                currency="GBP",
                remote=True,
                required_skills=["Python", "Kubernetes", "AWS", "MLflow", "Docker", "Terraform"],
                seniority="mid"
            ),
            NJ(
                id="mock-006",
                title="AI/ML Engineer",
                company=" Babylon Health",
                location="London, UK",
                description="Work on AI systems that help doctors provide better care. Deploy NLP models for medical text analysis and build computer vision systems for medical imaging. Python, PyTorch, and healthcare domain experience preferred.",
                url="https://example.com/job/6",
                source="mock",
                posted_date=date.today(),
                salary_min=70000,
                salary_max=105000,
                currency="GBP",
                remote=True,
                required_skills=["Python", "PyTorch", "NLP", "Docker", "GCP", "Kubernetes"],
                seniority="mid"
            ),
            NJ(
                id="mock-007",
                title="Senior ML Infrastructure Engineer",
                company="OpenAI",
                location="London, UK (Remote)",
                description="Build the infrastructure that trains and serves large language models. Design distributed training systems, optimize inference performance, and ensure reliability at scale. Deep expertise in distributed systems and ML frameworks required.",
                url="https://example.com/job/7",
                source="mock",
                posted_date=date.today(),
                salary_min=120000,
                salary_max=180000,
                currency="GBP",
                remote=True,
                required_skills=["Python", "PyTorch", "Kubernetes", "CUDA", "Distributed Systems", "Ray"],
                seniority="senior"
            ),
            NJ(
                id="mock-008",
                title="MLOps Consultant",
                company="Thoughtworks",
                location="London, UK",
                description="Help clients build production-grade ML systems. Design MLOps architectures, implement CI/CD for ML, and train teams on best practices. Strong consulting skills plus hands-on experience with major ML platforms.",
                url="https://example.com/job/8",
                source="mock",
                posted_date=date.today(),
                salary_min=80000,
                salary_max=120000,
                currency="GBP",
                remote=True,
                required_skills=["Python", "AWS", "Azure", "Kubernetes", "MLflow", "Terraform"],
                seniority="senior"
            ),
            NJ(
                id="mock-009",
                title="ML Engineer - Computer Vision",
                company="Meta",
                location="London, UK",
                description="Build computer vision systems for AR/VR products. Research and implement state-of-the-art CV models, optimize for mobile/edge deployment. Experience with PyTorch, OpenCV, and model optimization required.",
                url="https://example.com/job/9",
                source="mock",
                posted_date=date.today(),
                salary_min=90000,
                salary_max=140000,
                currency="GBP",
                remote=True,
                required_skills=["Python", "PyTorch", "OpenCV", "CUDA", "TensorRT", "Kubernetes"],
                seniority="senior"
            ),
            NJ(
                id="mock-010",
                title="Data/MLOps Engineer",
                company="Deliveroo",
                location="London, UK",
                description="Build data pipelines and ML infrastructure for logistics optimization. Work on real-time prediction systems that route millions of deliveries. Python, Airflow, and cloud platform experience required.",
                url="https://example.com/job/10",
                source="mock",
                posted_date=date.today(),
                salary_min=60000,
                salary_max=85000,
                currency="GBP",
                remote=True,
                required_skills=["Python", "Airflow", "AWS", "SQL", "Docker", "dbt"],
                seniority="mid"
            ),
        ]
        
        return mock_jobs
    
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
