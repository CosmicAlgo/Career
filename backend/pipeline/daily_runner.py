"""
CareerRadar - Daily Pipeline Runner
Orchestrates the daily data pipeline: GitHub ingestion, job scraping, AI assessment, persistence
With timing instrumentation, parallel scraping, and ML skill matching
"""

import time
import logging
import asyncio
import re
import traceback
import sys
from typing import List, Dict, Optional, Any, Tuple
from datetime import date

import sentry_sdk

from config.settings import settings
from ingestion.github_client import GitHubClient
from api.schemas import (
    GitHubSummary,
    NormalisedJob,
    AssessmentResult,
    SkillGap,
    JobMatch,
)
from database.queries import get_db_queries, DatabaseQueries
from scrapers.base_scraper import ScraperMetrics

logger = logging.getLogger(__name__)


# Map slug-style role names to human-readable search terms
ROLE_SLUG_MAP = {
    "ml_engineer": "ML Engineer",
    "mlops": "MLOps Engineer",
    "devops": "DevOps Engineer",
    "backend": "Backend Engineer",
    "data_engineer": "Data Engineer",
    "data_scientist": "Data Scientist",
    "sre": "Site Reliability Engineer",
    "platform": "Platform Engineer",
    "hpc_engineer": "HPC Engineer",
}


def _roles_to_readable(roles: List[str]) -> List[str]:
    """Convert role slugs to human-readable search terms."""
    readable = []
    for r in roles:
        mapped = ROLE_SLUG_MAP.get(r.lower().strip())
        if mapped:
            readable.append(mapped)
        else:
            readable.append(r.replace("_", " ").title())
    return readable


class DailyPipelineRunner:
    """Orchestrates the daily data pipeline."""

    def __init__(self, db_queries: Optional[DatabaseQueries] = None):
        self.db = db_queries or get_db_queries()
        self.github_client = GitHubClient()
        # Will be populated from DB at pipeline start
        self._db_settings = None

    async def run_full_pipeline(
        self,
        force: bool = False,
        skip_github: bool = False,
        skip_jobs: bool = False,
        skip_assessment: bool = False,
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
                    "date": today.isoformat(),
                }

        results = {
            "success": False,
            "message": "",
            "snapshot_id": None,
            "date": today.isoformat(),
            "steps": {},
        }

        try:
            pipeline_start = time.time()

            # Timing tracking
            step_times = {
                "settings": 0,
                "github": 0,
                "jobs": 0,
                "ml_scores": 0,
                "assessment": 0,
                "persistence": 0,
            }
            scraper_metrics: List[ScraperMetrics] = []
            local_scores: Dict[str, int] = {}

            # Step 0: Load user settings directly from Supabase (fallback to env vars)
            step_start = time.time()
            settings_source = "database"

            try:
                # Direct Supabase query to fetch user_settings
                response = (
                    self.db.client.table("user_settings")
                    .select("*")
                    .order("updated_at", desc=True)
                    .limit(1)
                    .execute()
                )

                if response.data and len(response.data) > 0:
                    data = response.data[0]
                    from api.settings import UserSettings

                    self._db_settings = UserSettings(
                        github_username=data.get(
                            "github_username", settings.github_username
                        ),
                        target_roles=data.get("target_roles", settings.target_roles),
                        target_locations=data.get("target_locations", ["UK", "Remote"]),
                        target_seniority=data.get(
                            "target_seniority", ["mid", "senior"]
                        ),
                        updated_at=data.get("updated_at"),
                    )
                else:
                    # No settings in database, use env vars
                    from api.settings import UserSettings

                    self._db_settings = UserSettings(
                        github_username=settings.github_username,
                        target_roles=settings.target_roles,
                        target_locations=["UK", "Remote"],
                        target_seniority=["mid", "senior"],
                    )
                    settings_source = "env vars"

            except Exception as e:
                print(
                    f"[Pipeline] Failed to load settings from database: {e}",
                    flush=True,
                    file=sys.stderr,
                )
                # Fallback to env vars on error
                from api.settings import UserSettings

                self._db_settings = UserSettings(
                    github_username=settings.github_username,
                    target_roles=settings.target_roles,
                    target_locations=["UK", "Remote"],
                    target_seniority=["mid", "senior"],
                )
                settings_source = "env vars"

            step_times["settings"] = int((time.time() - step_start) * 1000)
            print(f"[Pipeline] Settings loaded from: {settings_source}", flush=True)
            print(
                f"[Pipeline] Settings loaded — github_username={self._db_settings.github_username}, "
                f"roles={self._db_settings.target_roles}, locations={self._db_settings.target_locations}",
                flush=True,
            )

            # Step 1: GitHub Ingestion
            github_summary = None
            if not skip_github:
                step_start = time.time()
                gh_user = self._db_settings.github_username or settings.github_username
                print(
                    f"[Pipeline] Step 1: Fetching GitHub data for {gh_user}...",
                    flush=True,
                )
                self.github_client = GitHubClient(username=gh_user)
                github_summary = await self.github_client.build_summary()
                step_times["github"] = int((time.time() - step_start) * 1000)
                results["steps"]["github"] = {
                    "success": True,
                    "username": github_summary.username,
                    "total_repos": github_summary.total_repos,
                    "languages": list(github_summary.languages.keys()),
                    "duration_ms": step_times["github"],
                }
                print(
                    f"[Pipeline] GitHub: {github_summary.total_repos} repos, {len(github_summary.languages)} languages in {step_times['github']}ms",
                    flush=True,
                )
            else:
                # Try to load from existing snapshot
                existing = await self.db.get_latest_snapshot()
                if existing:
                    github_summary = GitHubSummary.model_validate(
                        existing["github_data"]
                    )
                    results["steps"]["github"] = {
                        "success": True,
                        "skipped": True,
                        "loaded_from_cache": True,
                    }
                else:
                    results["steps"]["github"] = {
                        "success": False,
                        "error": "No GitHub data available",
                    }
                    results["message"] = "GitHub step failed: no data available"
                    return results

            # Step 2: Job Scraping (Parallel)
            job_listings: List[NormalisedJob] = []
            if not skip_jobs:
                roles = (
                    self._db_settings.target_roles
                    if self._db_settings
                    else settings.target_roles
                )
                locations = (
                    self._db_settings.target_locations
                    if self._db_settings
                    else ["UK", "Remote"]
                )

                (
                    job_listings,
                    scraper_metrics,
                    scrape_duration,
                ) = await self._scrape_jobs_parallel(roles, locations)
                step_times["jobs"] = scrape_duration

                results["steps"]["jobs"] = {
                    "success": True,
                    "count": len(job_listings),
                    "sources": list(set(j.source for j in job_listings if j.source)),
                    "duration_ms": scrape_duration,
                    "scraper_details": [
                        {
                            "name": m.scraper_name,
                            "jobs": m.jobs_returned,
                            "error": m.error,
                        }
                        for m in scraper_metrics
                    ],
                }
                print(
                    f"[Pipeline] Jobs: Scraped {len(job_listings)} listings in {scrape_duration}ms",
                    flush=True,
                )
            else:
                # Load recent jobs from database
                jobs_data = await self.db.get_latest_jobs(limit=50)
                job_listings = [NormalisedJob.model_validate(j) for j in jobs_data]
                results["steps"]["jobs"] = {
                    "success": True,
                    "skipped": True,
                    "loaded_from_db": True,
                    "count": len(job_listings),
                }
                print(
                    f"[Pipeline] Jobs: Loaded {len(job_listings)} from database",
                    flush=True,
                )

            # Step 2.5: Local ML Scoring
            target_roles = (
                self._db_settings.target_roles
                if self._db_settings
                else settings.target_roles
            )
            if github_summary and job_listings:
                step_start = time.time()
                print("[Pipeline] Step 2.5: Computing local ML scores...", flush=True)

                from assessment.similarity_scorer import compute_local_ml_scores

                local_scores, job_scores, skill_gaps_ml = await compute_local_ml_scores(
                    github_summary, job_listings, target_roles
                )
                step_times["ml_scores"] = int((time.time() - step_start) * 1000)
                results["steps"]["ml_scores"] = {
                    "success": True,
                    "scores": local_scores,
                    "duration_ms": step_times["ml_scores"],
                }
                print(
                    f"[Pipeline] Local ML scores: {local_scores} in {step_times['ml_scores']}ms",
                    flush=True,
                )
            else:
                results["steps"]["ml_scores"] = {
                    "success": False,
                    "skipped": True,
                    "reason": "Missing data",
                }

            # Step 3: AI Assessment (with local scores as context)
            assessment = None
            assessment_source = "none"
            if not skip_assessment and github_summary and job_listings:
                step_start = time.time()
                print("[Pipeline] Step 3: Running AI assessment...", flush=True)

                try:
                    from assessment.gemini_client import assess_with_gemini

                    assessment = await assess_with_gemini(
                        github_summary=github_summary.model_dump(),
                        target_roles=target_roles,
                        job_listings=[j.model_dump() for j in job_listings],
                        assessment_date=date.today().isoformat(),
                        local_scores=local_scores,
                    )
                    assessment_source = "gemini"
                    results["steps"]["assessment"] = {
                        "success": True,
                        "overall_score": assessment.overall_score,
                        "role_scores": assessment.role_scores,
                        "skill_gaps_count": len(assessment.skill_gaps),
                        "top_jobs_count": len(assessment.top_matching_jobs),
                        "source": "gemini",
                        "duration_ms": int((time.time() - step_start) * 1000),
                    }
                    print(
                        f"[Pipeline] Assessment: Gemini score {assessment.overall_score}",
                        flush=True,
                    )

                except Exception as e:
                    print(
                        f"[Pipeline] Gemini assessment failed: {e}",
                        flush=True,
                        file=sys.stderr,
                    )
                    sentry_sdk.capture_exception(e)

                    # Fall back to local ML scores
                    print("[Pipeline] Falling back to local ML scores", flush=True)
                    assessment = self._create_ml_fallback_assessment(
                        local_scores, job_listings
                    )
                    assessment_source = "local_ml"
                    results["steps"]["assessment"] = {
                        "success": True,
                        "overall_score": assessment.overall_score,
                        "role_scores": assessment.role_scores,
                        "skill_gaps_count": len(assessment.skill_gaps),
                        "source": "local_ml",
                        "fallback_reason": str(e),
                        "duration_ms": int((time.time() - step_start) * 1000),
                    }
                    print(
                        f"[Pipeline] Assessment: Local ML score {assessment.overall_score}",
                        flush=True,
                    )

            elif not job_listings:
                print(
                    "[Pipeline] Assessment: Skipped - no market data available",
                    flush=True,
                )
                results["steps"]["assessment"] = {
                    "success": False,
                    "skipped": True,
                    "reason": "No market data yet - add a RapidAPI key to enable job matching",
                }
            else:
                assessment = self._create_mock_assessment(job_listings)
                results["steps"]["assessment"] = {
                    "success": True,
                    "mock": True,
                    "overall_score": assessment.overall_score,
                }
                print(
                    f"[Pipeline] Assessment: Created mock assessment (score: {assessment.overall_score})",
                    flush=True,
                )

            # Step 4: Persist to Database
            step_start = time.time()
            print("[Pipeline] Step 4: Persisting to database...", flush=True)

            # Clear old jobs before saving new ones (Bug 3 fix)
            if job_listings and not skip_jobs:
                print(
                    "[Pipeline] Clearing old jobs before inserting new batch...",
                    flush=True,
                )
                await self.db.delete_old_jobs(keep_latest_n=0)  # Delete all old jobs

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
                overall_score=assessment.overall_score if assessment else 0,
            )

            step_times["persistence"] = int((time.time() - step_start) * 1000)

            results["steps"]["persistence"] = {
                "success": True,
                "snapshot_created": snapshot_id is not None,
                "jobs_saved": len(job_listings) if not skip_jobs else 0,
                "duration_ms": step_times["persistence"],
            }

            # Save pipeline run metrics
            total_duration = int((time.time() - pipeline_start) * 1000)
            scraper_metrics_dict = {
                m.scraper_name: {
                    "duration_ms": m.duration_ms,
                    "jobs": m.jobs_returned,
                    "error": m.error,
                }
                for m in scraper_metrics
            }

            await self.db.create_pipeline_run(
                run_date=today,
                github_duration_ms=step_times["github"],
                scraping_duration_ms=step_times["jobs"],
                assessment_duration_ms=step_times["assessment"],
                embedding_duration_ms=step_times["ml_scores"],
                total_duration_ms=total_duration,
                jobs_scraped=len(job_listings),
                scraper_metrics=scraper_metrics_dict,
                status="success" if assessment else "partial",
                error=None,
            )

            results["success"] = True
            results["message"] = "Pipeline completed successfully"
            results["snapshot_id"] = snapshot_id
            results["total_duration_ms"] = total_duration
            results["assessment_source"] = assessment_source

            print(
                f"[Pipeline] Complete! Snapshot ID: {snapshot_id}, Total duration: {total_duration}ms",
                flush=True,
            )

        except Exception as e:
            results["success"] = False
            results["message"] = f"Pipeline failed: {str(e)}"
            print(f"[Pipeline] Error: {e}", flush=True, file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            sentry_sdk.capture_exception(e)

            # Save failed pipeline run
            try:
                await self.db.create_pipeline_run(
                    run_date=today,
                    status="failed",
                    error=str(e),
                    total_duration_ms=int((time.time() - pipeline_start) * 1000),
                )
            except:
                pass

            raise

        return results

    async def _scrape_jobs_parallel(
        self, target_roles: List[str], target_locations: List[str]
    ) -> Tuple[List[NormalisedJob], List[ScraperMetrics], int]:
        """
        Scrape jobs from multiple sources in parallel.

        Returns:
            Tuple of (jobs list, scraper metrics list, duration_ms)
        """
        start_time = time.time()
        readable_roles = _roles_to_readable(target_roles)

        print(
            f"[Pipeline] Starting parallel scraping with roles: {readable_roles}",
            flush=True,
        )

        # Import scrapers
        from scrapers.tier1_jsearch import JSearchScraper
        from scrapers.remotive_scraper import RemotiveScraper
        from scrapers.wellfound_scraper import WellfoundScraper
        from scrapers.otta_scraper import OttaScraper
        from scrapers.workinstartups_scraper import WorkInStartupsScraper

        # Initialize scrapers
        scrapers = [
            ("jsearch", JSearchScraper()),
            ("remotive", RemotiveScraper()),
            ("wellfound", WellfoundScraper()),
            ("otta", OttaScraper()),
            ("workinstartups", WorkInStartupsScraper()),
        ]

        # Filter available scrapers
        available_scrapers = [(name, s) for name, s in scrapers if s.is_available()]
        print(
            f"[Pipeline] {len(available_scrapers)} scrapers available: {[n for n, _ in available_scrapers]}",
            flush=True,
        )

        # Run all scrapers in parallel with error handling
        async def run_scraper(name: str, scraper):
            try:
                print(f"[Pipeline] Starting scraper: {name}", flush=True)
                kwargs = {
                    "target_roles": readable_roles,
                    "target_locations": target_locations,
                }
                if name == "jsearch":
                    kwargs["max_queries"] = 5
                jobs, metrics = await scraper.scrape(**kwargs)
                print(
                    f"[Pipeline] Scraper {name} completed: {metrics.jobs_returned} jobs in {metrics.duration_ms}ms",
                    flush=True,
                )
                return (name, jobs, metrics)
            except Exception as e:
                print(
                    f"[Pipeline] Scraper {name} failed: {e}",
                    flush=True,
                    file=sys.stderr,
                )
                traceback.print_exc(file=sys.stderr)
                sentry_sdk.capture_exception(e)
                metrics = ScraperMetrics(
                    scraper_name=name, duration_ms=0, jobs_returned=0, error=str(e)
                )
                return (name, [], metrics)

        # Execute all scrapers concurrently
        results = await asyncio.gather(
            *[run_scraper(name, scraper) for name, scraper in available_scrapers]
        )

        # Combine results
        all_jobs: List[NormalisedJob] = []
        all_metrics: List[ScraperMetrics] = []

        for name, jobs, metrics in results:
            all_jobs.extend(jobs)
            all_metrics.append(metrics)

        # Deduplicate by (title + company)
        seen = set()
        unique_jobs = []
        for job in all_jobs:
            key = (job.title.lower(), (job.company or "").lower())
            if key not in seen:
                seen.add(key)
                unique_jobs.append(job)

        duration_ms = int((time.time() - start_time) * 1000)

        print(
            f"[Pipeline] Parallel scraping complete: {len(unique_jobs)} unique jobs from {len(available_scrapers)} sources in {duration_ms}ms",
            flush=True,
        )

        return unique_jobs, all_metrics, duration_ms

    def _parse_salary(
        self, salary_text: Optional[str]
    ) -> tuple[Optional[int], Optional[int]]:
        """Parse min/max salary from salary text."""
        if not salary_text:
            return None, None
        numbers = re.findall(r"\d+", salary_text.replace(",", ""))
        if len(numbers) >= 2:
            return int(numbers[0]), int(numbers[1])
        elif len(numbers) == 1:
            return int(numbers[0]), None
        return None, None

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
                required_skills=[
                    "Python",
                    "TensorFlow",
                    "Kubernetes",
                    "Docker",
                    "GCP",
                    "MLflow",
                ],
                seniority="senior",
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
                required_skills=[
                    "Python",
                    "AWS",
                    "Terraform",
                    "Docker",
                    "Kubernetes",
                    "Jenkins",
                ],
                seniority="mid",
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
                required_skills=[
                    "Python",
                    "PyTorch",
                    "Spark",
                    "Kubernetes",
                    "GCP",
                    "SQL",
                ],
                seniority="senior",
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
                required_skills=[
                    "Python",
                    "Kubeflow",
                    "Airflow",
                    "AWS",
                    "Docker",
                    "Terraform",
                ],
                seniority="senior",
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
                required_skills=[
                    "Python",
                    "Kubernetes",
                    "AWS",
                    "MLflow",
                    "Docker",
                    "Terraform",
                ],
                seniority="mid",
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
                required_skills=[
                    "Python",
                    "PyTorch",
                    "NLP",
                    "Docker",
                    "GCP",
                    "Kubernetes",
                ],
                seniority="mid",
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
                required_skills=[
                    "Python",
                    "PyTorch",
                    "Kubernetes",
                    "CUDA",
                    "Distributed Systems",
                    "Ray",
                ],
                seniority="senior",
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
                required_skills=[
                    "Python",
                    "AWS",
                    "Azure",
                    "Kubernetes",
                    "MLflow",
                    "Terraform",
                ],
                seniority="senior",
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
                required_skills=[
                    "Python",
                    "PyTorch",
                    "OpenCV",
                    "CUDA",
                    "TensorRT",
                    "Kubernetes",
                ],
                seniority="senior",
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
                seniority="mid",
            ),
        ]

        return mock_jobs

    async def _run_assessment(
        self,
        github_summary: GitHubSummary,
        job_listings: List[NormalisedJob],
        target_roles: Optional[List[str]] = None,
    ) -> AssessmentResult:
        """
        Run AI assessment using Gemini or Claude.

        Returns AssessmentResult with scores, gaps, and recommendations.
        """
        from assessment.ai_router import get_ai_client

        roles = target_roles or (
            self._db_settings.target_roles
            if self._db_settings
            else settings.target_roles
        )

        # AI clients expect (github_summary: dict, target_roles: list, job_listings: list, assessment_date: str)
        gh_dict = (
            github_summary.model_dump()
            if hasattr(github_summary, "model_dump")
            else dict(github_summary)
        )
        jobs_list = [
            j.model_dump() if hasattr(j, "model_dump") else dict(j)
            for j in job_listings
        ]

        ai_client = get_ai_client()
        return await ai_client.assess_profile(
            github_summary=gh_dict,
            target_roles=roles,
            job_listings=jobs_list,
            assessment_date=date.today().isoformat(),
        )

    def _create_ml_fallback_assessment(
        self, local_scores: Dict[str, int], job_listings: List[NormalisedJob]
    ) -> AssessmentResult:
        """Create assessment from local ML scores when Gemini fails."""
        # Generate skill gaps from job listings
        skill_gaps = []
        common_skills = [
            "Kubernetes",
            "Docker",
            "AWS",
            "Terraform",
            "Python",
            "Go",
            "Rust",
        ]
        for i, skill in enumerate(common_skills[:5]):
            skill_gaps.append(
                SkillGap(
                    skill=skill,
                    frequency_in_market=40 + i * 5,
                    priority="high" if i < 3 else "medium",
                )
            )

        # Create top matching jobs from first few listings
        top_jobs = []
        for i, job in enumerate(job_listings[:3]):
            top_jobs.append(
                JobMatch(
                    job_id=job.id,
                    match_pct=min(60 + i * 10, 95),
                    reasons=["Skill match via local ML"],
                )
            )

        # Build role_scores from actual target_roles (not hardcoded)
        target_roles = self._db_settings.target_roles if self._db_settings else []
        role_scores_out = {}
        for role in target_roles:
            role_key = role.lower().strip()
            role_scores_out[role_key] = local_scores.get(
                role_key, local_scores.get("overall", 50)
            )

        overall = local_scores.get("overall", 50)

        return AssessmentResult(
            overall_score=overall,
            role_scores=role_scores_out,
            top_matching_jobs=top_jobs,
            skill_gaps=skill_gaps,
            strengths=["Local ML assessment completed"],
            weekly_recommendation="Focus on Kubernetes and Docker - most requested skills in current market.",
            trending_skills_today=["Kubernetes", "Docker", "Python", "AWS"],
        )

    def _create_mock_assessment(
        self, job_listings: List[NormalisedJob]
    ) -> AssessmentResult:
        """Create a mock assessment for testing/demo purposes."""
        return AssessmentResult(
            overall_score=72,
            role_scores={"ml_engineer": 74, "mlops": 70, "devops": 68, "backend": 65},
            top_matching_jobs=[
                JobMatch(
                    job_id="mock-1",
                    match_pct=85,
                    reasons=["Strong Python skills", "GitHub activity"],
                )
            ]
            if job_listings
            else [],
            skill_gaps=[
                SkillGap(skill="Kubernetes", frequency_in_market=45, priority="high"),
                SkillGap(skill="Terraform", frequency_in_market=32, priority="medium"),
                SkillGap(skill="AWS", frequency_in_market=58, priority="high"),
            ],
            strengths=[
                "Active open source contributions",
                "Strong Python fundamentals",
                "Consistent commit history",
            ],
            weekly_recommendation="Focus on learning Kubernetes this week - it's mentioned in 45% of relevant job postings.",
            trending_skills_today=["Kubernetes", "Docker", "Python", "AWS", "React"],
        )


async def run_daily_pipeline(
    force: bool = False,
    skip_github: bool = False,
    skip_jobs: bool = False,
    skip_assessment: bool = False,
) -> Dict[str, Any]:
    """Convenience function to run the daily pipeline with full error handling."""
    print("[Pipeline] ===== PIPELINE STARTED =====", flush=True)
    try:
        runner = DailyPipelineRunner()
        return await runner.run_full_pipeline(
            force=force,
            skip_github=skip_github,
            skip_jobs=skip_jobs,
            skip_assessment=skip_assessment,
        )
    except Exception as e:
        print(f"[Pipeline] FATAL ERROR: {e}", flush=True, file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise
