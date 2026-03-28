"""
CareerRadar - JSearch RapidAPI Scraper (Tier 1)
Real job listings from JSearch RapidAPI with dynamic query building
"""

import time
import logging
import asyncio
from typing import List, Optional, Tuple
from datetime import datetime
import httpx

from .base_scraper import BaseScraper, RawJobListing, ScraperMetrics, ScraperTier
from api.schemas import NormalisedJob
from config.settings import settings

logger = logging.getLogger(__name__)


class JSearchScraper(BaseScraper):
    """Tier 1 scraper using JSearch RapidAPI."""

    def __init__(self):
        super().__init__(
            tier=ScraperTier.TIER_1_API, max_retries=3, retry_delay=1.0, timeout=30.0
        )
        self.api_key = settings.rapidapi_key
        self.api_host = "jsearch.p.rapidapi.com"
        self.base_url = "https://jsearch.p.rapidapi.com/search"

    def is_available(self) -> bool:
        """Check if API key is configured."""
        return bool(self.api_key)

    def _build_queries(
        self, target_roles: List[str], target_locations: List[str], max_queries: int = 5
    ) -> List[str]:
        """
        Build search queries from user settings.

        Examples:
          roles=["ML Engineer", "MLOps"] + locations=["UK", "Remote"]
          → ["ML Engineer UK", "ML Engineer Remote", "MLOps UK", "MLOps Remote"]

        If combined count > max_queries, prioritise by taking
        first N combinations (roles ordered first, then locations).
        """
        queries = []
        for role in target_roles:
            for location in target_locations:
                queries.append(f"{role} {location}")
                if len(queries) >= max_queries:
                    return queries
        return queries

    async def _fetch_query(self, query: str, client: httpx.AsyncClient) -> List[dict]:
        """Fetch jobs for a single query."""
        headers = {"X-RapidAPI-Key": self.api_key, "X-RapidAPI-Host": self.api_host}

        params = {"query": query, "page": "1", "num_pages": "2", "date_posted": "today"}

        logger.info(f"[JSearch] Fetching query: {query}")

        response = await client.get(self.base_url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()

        jobs = data.get("data", []) or []
        logger.info(f"[JSearch] Query '{query}' returned {len(jobs)} jobs")
        return jobs

    async def scrape(
        self,
        target_roles: List[str],
        target_locations: Optional[List[str]] = None,
        max_queries: int = 5,
    ) -> Tuple[List[NormalisedJob], ScraperMetrics]:
        """
        Scrape job listings from JSearch RapidAPI with dynamic query building.

        Args:
            target_roles: List of role names (human-readable)
            target_locations: List of location names
            max_queries: Maximum number of queries to run (respects quota)

        Returns:
            Tuple of (jobs list, metrics)
        """
        start_time = time.time()
        error_msg = None

        if not self.api_key:
            logger.warning("[JSearch] RAPIDAPI_KEY not set, skipping")
            return [], ScraperMetrics(
                scraper_name="jsearch",
                duration_ms=0,
                jobs_returned=0,
                error="RAPIDAPI_KEY not configured",
            )

        # Default locations if not provided
        locations = target_locations or ["UK", "Remote"]

        # Build queries
        queries = self._build_queries(target_roles, locations, max_queries)
        logger.info(
            f"[JSearch] Built {len(queries)} queries from {len(target_roles)} roles and {len(locations)} locations"
        )

        all_raw_jobs: List[dict] = []

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Run all queries in parallel
                results = await asyncio.gather(
                    *[self._fetch_query(q, client) for q in queries],
                    return_exceptions=True,
                )

                for result in results:
                    if isinstance(result, list):
                        all_raw_jobs.extend(result)
                    elif isinstance(result, Exception):
                        logger.error(f"[JSearch] Query failed: {result}")

            # Deduplicate by (title + company)
            seen = set()
            unique_jobs = []
            for job in all_raw_jobs:
                key = (job.get("job_title", ""), job.get("employer_name", ""))
                if key not in seen:
                    seen.add(key)
                    unique_jobs.append(job)

            logger.info(f"[JSearch] Total unique jobs after dedup: {len(unique_jobs)}")

            # Convert to NormalisedJob
            jobs: List[NormalisedJob] = []
            for job in unique_jobs:
                apply_link = (
                    job.get("job_apply_link") or job.get("job_google_link") or ""
                )

                # Parse salary
                min_salary = job.get("job_min_salary")
                max_salary = job.get("job_max_salary")
                salary_currency = job.get("job_salary_currency", "GBP")

                # Determine seniority from title
                title = job.get("job_title", "")
                seniority = "mid"
                title_lower = title.lower()
                if (
                    "senior" in title_lower
                    or "sr." in title_lower
                    or "lead" in title_lower
                    or "principal" in title_lower
                ):
                    seniority = "senior"
                elif (
                    "junior" in title_lower
                    or "jr." in title_lower
                    or "entry" in title_lower
                ):
                    seniority = "junior"

                normalised_job = NormalisedJob(
                    id=f"jsearch-{job.get('job_id', hash(title) % 10000000)}",
                    title=title,
                    company=job.get("employer_name"),
                    location=job.get("job_location")
                    or f"{job.get('job_city', '')}, {job.get('job_country', '')}".strip(
                        ", "
                    ),
                    remote=job.get("job_is_remote", False),
                    required_skills=[],
                    nice_to_have=[],
                    seniority=seniority,
                    salary_min=int(min_salary) if min_salary else None,
                    salary_max=int(max_salary) if max_salary else None,
                    currency=salary_currency,
                    source="jsearch",
                    url=apply_link,
                    posted_date=datetime.now().date(),
                    description=(job.get("job_description") or "")[:1000],
                )
                jobs.append(normalised_job)

            logger.info(f"[JSearch] Successfully scraped {len(jobs)} jobs")

        except Exception as e:
            error_msg = str(e)
            logger.error(f"[JSearch] Scraping error: {e}", exc_info=True)

        duration_ms = int((time.time() - start_time) * 1000)
        metrics = ScraperMetrics(
            scraper_name="jsearch",
            duration_ms=duration_ms,
            jobs_returned=len(jobs),
            error=error_msg,
        )

        return jobs, metrics

    def _build_location(self, job: dict) -> Optional[str]:
        """Build location string from city and country."""
        city = job.get("job_city")
        country = job.get("job_country")
        if city and country:
            return f"{city}, {country}"
        return city or country or "Remote"

    def _format_salary(self, job: dict) -> Optional[str]:
        """Format salary from min/max fields."""
        min_salary = job.get("job_min_salary")
        max_salary = job.get("job_max_salary")
        currency = job.get("job_salary_currency", "GBP")
        if not min_salary and not max_salary:
            return None
        symbol = (
            "\u00a3"
            if currency == "GBP"
            else "$"
            if currency == "USD"
            else "\u20ac"
            if currency == "EUR"
            else currency
        )
        if min_salary and max_salary and min_salary != max_salary:
            return f"{symbol}{min_salary:,} - {symbol}{max_salary:,}"
        elif min_salary or max_salary:
            return f"{symbol}{min_salary or max_salary:,}"
        return None

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse ISO date string to datetime."""
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except:
            return None


async def scrape_with_jsearch(
    query: str, location: Optional[str] = None, max_results: int = 50
) -> List[RawJobListing]:
    """Convenience function to scrape using JSearch."""
    scraper = JSearchScraper()
    return await scraper.scrape(query, location, max_results)
