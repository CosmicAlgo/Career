"""
CareerRadar - Remotive Scraper
Free public API for remote jobs - no key needed
"""

import time
import logging
from typing import List, Optional, Tuple
from datetime import datetime
import httpx

from .base_scraper import BaseScraper, RawJobListing, ScraperMetrics, ScraperTier
from api.schemas import NormalisedJob

logger = logging.getLogger(__name__)


class RemotiveScraper(BaseScraper):
    """Remotive API scraper - free, no key required."""
    
    def __init__(self):
        super().__init__(tier=ScraperTier.TIER_1_API, max_retries=2, retry_delay=1.0, timeout=30.0)
        self.base_url = "https://remotive.com/api/remote-jobs"
        self.category = "software-dev"
    
    def is_available(self) -> bool:
        """Always available - no API key needed."""
        return True
    
    def _title_matches_roles(self, title: str, target_roles: List[str]) -> bool:
        """Check if job title matches any target role."""
        title_lower = title.lower()
        
        # Role keyword mappings
        role_keywords = {
            "ml_engineer": ["ml engineer", "machine learning", "ml developer", "ai engineer"],
            "mlops": ["mlops", "ml ops", "machine learning ops", "ml infrastructure"],
            "devops": ["devops", "dev ops", "sre", "site reliability", "platform engineer"],
            "backend": ["backend", "back-end", "server-side", "api developer"],
            "data_engineer": ["data engineer", "data eng", "etl", "data pipeline"],
            "data_scientist": ["data scientist", "data science", "ds ", "analytics"],
            "sre": ["sre", "site reliability engineer", "reliability engineer"],
            "platform": ["platform engineer", "infrastructure engineer", "systems engineer"]
        }
        
        for role in target_roles:
            role_lower = role.lower().strip()
            keywords = role_keywords.get(role_lower, [role_lower.replace("_", " ")])
            
            for keyword in keywords:
                if keyword in title_lower:
                    return True
        
        return False
    
    async def scrape(
        self,
        target_roles: List[str],
        target_locations: Optional[List[str]] = None,
        max_results: int = 50
    ) -> Tuple[List[NormalisedJob], ScraperMetrics]:
        """
        Scrape remote jobs from Remotive API.
        
        Args:
            target_roles: List of role slugs to filter by
            target_locations: Ignored (Remotive is all remote)
            max_results: Maximum jobs to return
            
        Returns:
            Tuple of (jobs list, metrics)
        """
        start_time = time.time()
        jobs: List[NormalisedJob] = []
        error_msg = None
        
        try:
            logger.info(f"[Remotive] Starting scrape for roles: {target_roles}")
            
            params = {
                "category": self.category,
                "limit": min(max_results * 2, 100)  # Fetch extra for filtering
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.base_url, params=params)
                response.raise_for_status()
                data = response.json()
            
            raw_jobs = data.get("jobs", [])
            logger.info(f"[Remotive] API returned {len(raw_jobs)} raw jobs")
            
            for job in raw_jobs:
                title = job.get("title", "")
                
                # Filter by role
                if not self._title_matches_roles(title, target_roles):
                    continue
                
                # Determine seniority from title
                seniority = "mid"
                title_lower = title.lower()
                if "senior" in title_lower or "sr." in title_lower or "lead" in title_lower:
                    seniority = "senior"
                elif "junior" in title_lower or "jr." in title_lower or "entry" in title_lower:
                    seniority = "junior"
                
                # Extract skills from tags
                tags = job.get("tags", [])
                skills = [tag for tag in tags if len(tag) < 20]  # Filter out long descriptions
                
                # Parse salary if available
                salary = job.get("salary", "")
                salary_min = None
                salary_max = None
                
                # Try to extract numeric salary range
                if salary and "-" in salary:
                    try:
                        parts = salary.replace("$", "").replace("£", "").replace("€", "").replace(",", "").split("-")
                        if len(parts) == 2:
                            salary_min = int(parts[0].strip().split()[0])
                            salary_max = int(parts[1].strip().split()[0])
                    except (ValueError, IndexError):
                        pass
                
                normalised_job = NormalisedJob(
                    id=f"remotive-{job.get('id', '')}",
                    title=title,
                    company=job.get("company_name"),
                    location=job.get("candidate_required_location") or "Remote",
                    remote=True,
                    required_skills=skills[:10],
                    nice_to_have=[],
                    seniority=seniority,
                    salary_min=salary_min,
                    salary_max=salary_max,
                    currency="USD",  # Remotive primarily lists USD
                    source="remotive",
                    url=job.get("url") or job.get("apply_url"),
                    posted_date=datetime.now().date(),
                    description=job.get("description", "")[:500]
                )
                
                jobs.append(normalised_job)
                
                if len(jobs) >= max_results:
                    break
            
            logger.info(f"[Remotive] Successfully scraped {len(jobs)} matching jobs")
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"[Remotive] Scraping error: {e}", exc_info=True)
        
        duration_ms = int((time.time() - start_time) * 1000)
        metrics = ScraperMetrics(
            scraper_name="remotive",
            duration_ms=duration_ms,
            jobs_returned=len(jobs),
            error=error_msg
        )
        
        return jobs, metrics
