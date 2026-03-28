"""
CareerRadar - Database Queries
All database read/write operations
"""

from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta

from supabase import Client

from database.supabase_client import get_supabase_client
from api.schemas import GitHubSummary, AssessmentResult, NormalisedJob, SkillGap


class DatabaseQueries:
    """Database query operations."""

    def __init__(self, client: Optional[Client] = None):
        self.client = client or get_supabase_client()

    # ============ Snapshot Operations ============

    async def create_snapshot(
        self,
        snapshot_date: date,
        github_data: GitHubSummary,
        assessment: AssessmentResult,
        overall_score: int,
    ) -> Optional[str]:
        """Create or update a daily snapshot using UPSERT. Returns snapshot ID."""
        try:
            data = {
                "date": snapshot_date.isoformat(),
                "github_data": github_data.model_dump(mode="json"),
                "assessment": assessment.model_dump(mode="json"),
                "overall_score": overall_score,
            }

            # Use UPSERT to update existing snapshot for the same date
            response = (
                self.client.table("snapshots")
                .upsert(data, on_conflict="date")
                .execute()
            )

            if response.data and len(response.data) > 0:
                return response.data[0]["id"]
            return None
        except Exception as e:
            print(f"Error upserting snapshot: {e}")
            return None

    async def get_snapshot_by_date(
        self, snapshot_date: date
    ) -> Optional[Dict[str, Any]]:
        """Get snapshot by specific date."""
        try:
            response = (
                self.client.table("snapshots")
                .select("*")
                .eq("date", snapshot_date.isoformat())
                .execute()
            )

            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            print(f"Error fetching snapshot: {e}")
            return None

    async def get_latest_snapshot(self) -> Optional[Dict[str, Any]]:
        """Get the most recent snapshot."""
        try:
            response = (
                self.client.table("snapshots")
                .select("*")
                .order("date", desc=True)
                .limit(1)
                .execute()
            )

            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            print(f"Error fetching latest snapshot: {e}")
            return None

    async def get_snapshot_history(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get snapshot history for the last N days."""
        try:
            from_date = datetime.now() - timedelta(days=days)

            response = (
                self.client.table("snapshots")
                .select("*")
                .gte("date", from_date.date().isoformat())
                .order("date", desc=True)
                .execute()
            )

            return response.data or []
        except Exception as e:
            print(f"Error fetching snapshot history: {e}")
            return []

    # ============ Job Operations ============

    async def upsert_jobs(self, jobs: List[NormalisedJob]) -> bool:
        """Upsert job listings. Returns success status."""
        try:
            if not jobs:
                return True

            job_dicts = []
            for job in jobs:
                job_dict = job.model_dump()
                # Convert date to ISO string for JSON serialization
                if job_dict.get("posted_date"):
                    job_dict["posted_date"] = job_dict["posted_date"].isoformat()
                job_dicts.append(job_dict)

            # Upsert with conflict resolution on id
            response = (
                self.client.table("jobs").upsert(job_dicts, on_conflict="id").execute()
            )

            return True
        except Exception as e:
            print(f"Error upserting jobs: {e}")
            return False

    async def get_jobs_by_date(
        self, job_date: date, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get jobs for a specific date."""
        try:
            response = (
                self.client.table("jobs")
                .select("*")
                .eq("posted_date", job_date.isoformat())
                .order("scraped_at", desc=True)
                .limit(limit)
                .execute()
            )

            return response.data or []
        except Exception as e:
            print(f"Error fetching jobs: {e}")
            return []

    async def get_latest_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get most recently scraped jobs."""
        try:
            response = (
                self.client.table("jobs")
                .select("*")
                .order("scraped_at", desc=True)
                .limit(limit)
                .execute()
            )

            return response.data or []
        except Exception as e:
            print(f"Error fetching latest jobs: {e}")
            return []

    async def delete_old_jobs(
        self, before_date: Optional[date] = None, keep_latest_n: int = 0
    ) -> bool:
        """Delete jobs older than specified date, or clear all if keep_latest_n=0."""
        try:
            if keep_latest_n == 0:
                # Delete all jobs (clear the table)
                response = self.client.table("jobs").delete().neq("id", "").execute()
            elif before_date:
                # Delete jobs before specific date
                response = (
                    self.client.table("jobs")
                    .delete()
                    .lt("posted_date", before_date.isoformat())
                    .execute()
                )
            else:
                return True

            return True
        except Exception as e:
            print(f"Error deleting old jobs: {e}")
            return False

    # ============ Skill Trends Operations ============

    async def upsert_skill_trends(
        self, trend_date: date, skills: List[SkillGap]
    ) -> bool:
        """Upsert skill trends for a date."""
        try:
            if not skills:
                return True

            trend_dicts = [
                {
                    "date": trend_date.isoformat(),
                    "skill": skill.skill,
                    "frequency": skill.frequency_in_market,
                }
                for skill in skills
            ]

            response = (
                self.client.table("skill_trends")
                .upsert(trend_dicts, on_conflict="date,skill")
                .execute()
            )

            return True
        except Exception as e:
            print(f"Error upserting skill trends: {e}")
            return False

    async def get_skill_trends(
        self, trend_date: Optional[date] = None, days: int = 7
    ) -> List[Dict[str, Any]]:
        """Get skill trends for a date or recent period."""
        try:
            if trend_date:
                response = (
                    self.client.table("skill_trends")
                    .select("*")
                    .eq("date", trend_date.isoformat())
                    .execute()
                )
            else:
                from_date = datetime.now() - timedelta(days=days)
                response = (
                    self.client.table("skill_trends")
                    .select("*")
                    .gte("date", from_date.date().isoformat())
                    .order("date", desc=True)
                    .execute()
                )

            return response.data or []
        except Exception as e:
            print(f"Error fetching skill trends: {e}")
            return []

    # ============ Role Scores Operations ============

    async def upsert_role_scores(
        self, score_date: date, role_scores: Dict[str, int]
    ) -> bool:
        """Upsert role scores for a date."""
        try:
            if not role_scores:
                return True

            score_dicts = [
                {"date": score_date.isoformat(), "role": role, "score": score}
                for role, score in role_scores.items()
            ]

            response = (
                self.client.table("role_scores")
                .upsert(score_dicts, on_conflict="date,role")
                .execute()
            )

            return True
        except Exception as e:
            print(f"Error upserting role scores: {e}")
            return False

    async def get_role_score_history(
        self, role: str, days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get role score history."""
        try:
            from_date = datetime.now() - timedelta(days=days)

            response = (
                self.client.table("role_scores")
                .select("*")
                .eq("role", role)
                .gte("date", from_date.date().isoformat())
                .order("date", desc=True)
                .execute()
            )

            return response.data or []
        except Exception as e:
            print(f"Error fetching role scores: {e}")
            return []

    # ============ Pipeline Runs Operations ============

    async def create_pipeline_run(
        self,
        run_date: date,
        github_duration_ms: int = 0,
        scraping_duration_ms: int = 0,
        assessment_duration_ms: int = 0,
        embedding_duration_ms: int = 0,
        total_duration_ms: int = 0,
        jobs_scraped: int = 0,
        scraper_metrics: Optional[Dict[str, Any]] = None,
        status: str = "success",
        error: Optional[str] = None,
    ) -> Optional[str]:
        """Create a pipeline run record."""
        try:
            data = {
                "date": run_date.isoformat(),
                "github_duration_ms": github_duration_ms,
                "scraping_duration_ms": scraping_duration_ms,
                "assessment_duration_ms": assessment_duration_ms,
                "embedding_duration_ms": embedding_duration_ms,
                "total_duration_ms": total_duration_ms,
                "jobs_scraped": jobs_scraped,
                "scraper_metrics": scraper_metrics or {},
                "status": status,
                "error": error,
            }

            response = self.client.table("pipeline_runs").insert(data).execute()

            if response.data and len(response.data) > 0:
                return response.data[0]["id"]
            return None
        except Exception as e:
            print(f"Error creating pipeline run: {e}")
            return None

    async def get_pipeline_run_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent pipeline runs."""
        try:
            response = (
                self.client.table("pipeline_runs")
                .select("*")
                .order("run_at", desc=True)
                .limit(limit)
                .execute()
            )

            return response.data or []
        except Exception as e:
            print(f"Error fetching pipeline runs: {e}")
            return []

    # ============ Helper Methods ============

    async def check_snapshot_exists(self, check_date: date) -> bool:
        """Check if a snapshot already exists for a date."""
        try:
            response = (
                self.client.table("snapshots")
                .select("count", count="exact")
                .eq("date", check_date.isoformat())
                .execute()
            )

            return response.count is not None and response.count > 0
        except Exception as e:
            print(f"Error checking snapshot: {e}")
            return False


# Global queries instance
_db_queries: Optional[DatabaseQueries] = None


def get_db_queries() -> DatabaseQueries:
    """Get global database queries instance."""
    global _db_queries
    if _db_queries is None:
        _db_queries = DatabaseQueries()
    return _db_queries
