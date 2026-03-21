"""
CareerRadar - Tier 1 Scraper: JSearch RapidAPI
Primary job source: 200 free requests/month via RapidAPI
"""

from typing import List, Optional, Dict, Any
from datetime import datetime

from scrapers.base_scraper import BaseScraper, RawJobListing, ScraperTier, QuotaExceededError
from scrapers.quota_tracker import get_quota_tracker
from config.settings import settings


JSEARCH_API_URL = "https://jsearch.p.rapidapi.com/search"


class JSearchScraper(BaseScraper):
    """
    JSearch RapidAPI scraper - Tier 1.
    
    Free tier: 200 requests/month
    Covers: LinkedIn, Indeed, Glassdoor aggregated
    """
    
    def __init__(self):
        super().__init__(
            tier=ScraperTier.TIER_1_API,
            max_retries=3,
            retry_delay=1.0
        )
        self.api_key = settings.rapidapi_key
        self.quota_name = "jsearch_rapidapi"
        
        # Register quota tracking
        tracker = get_quota_tracker()
        tracker.register_quota(
            name=self.quota_name,
            limit=settings.rapidapi_jsearch_quota,
            reset_date=datetime.now().replace(day=1)  # Resets monthly
        )
    
    def is_available(self) -> bool:
        """Check if API key is configured and quota available."""
        if not self.api_key:
            return False
        
        tracker = get_quota_tracker()
        return tracker.should_use_tier(self.quota_name, warning_threshold=90.0)
    
    async def scrape(
        self,
        query: str,
        location: Optional[str] = None,
        max_results: int = 50
    ) -> List[RawJobListing]:
        """
        Scrape jobs via JSearch RapidAPI.
        
        Args:
            query: Job search query (e.g., "ML Engineer")
            location: Location (e.g., "UK", "Remote")
            max_results: Max results to return (API returns up to 10 per page)
        """
        if not self.is_available():
            raise QuotaExceededError("JSearch quota exhausted or not configured")
        
        tracker = get_quota_tracker()
        jobs: List[RawJobListing] = []
        
        # Build query string
        search_query = query
        if location and location.lower() != "remote":
            search_query = f"{query} in {location}"
        elif location and location.lower() == "remote":
            search_query = f"{query} remote"
        
        # JSearch returns max 10 per request, paginate
        page = 1
        remaining = max_results
        
        while remaining > 0 and page <= 5:  # Max 5 pages = 50 results
            page_jobs = await self._fetch_page(search_query, page, min(remaining, 10))
            
            if not page_jobs:
                break
            
            jobs.extend(page_jobs)
            remaining -= len(page_jobs)
            page += 1
            
            # Record API usage
            tracker.record_usage(self.quota_name, 1)
        
        return jobs[:max_results]
    
    async def _fetch_page(
        self,
        query: str,
        page: int,
        num_pages: int = 1
    ) -> List[RawJobListing]:
        """Fetch a single page of results."""
        
        async def _make_request():
            headers = {
                "X-RapidAPI-Key": self.api_key,
                "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
            }
            
            params = {
                "query": query,
                "page": page,
                "num_pages": num_pages,
                "date_posted": "all",  # Options: all, today, 3days, week, month
                "job_requirements": "no_experience",  # Options: under_3_years_experience, more_than_3_years_experience, no_experience, no_degree
            }
            
            response = await self._make_http_request(
                "GET",
                JSEARCH_API_URL,
                headers=headers,
                params=params
            )
            return response.json()
        
        try:
            data = await self._retry_with_backoff(_make_request)
        except Exception as e:
            print(f"[JSearch] API request failed: {e}")
            return []
        
        jobs = []
        
        if "data" not in data:
            return jobs
        
        for item in data.get("data", []):
            try:
                job = self._parse_job_item(item)
                if job:
                    jobs.append(job)
            except Exception as e:
                print(f"[JSearch] Failed to parse job item: {e}")
                continue
        
        return jobs
    
    def _parse_job_item(self, item: Dict[str, Any]) -> Optional[RawJobListing]:
        """Parse a single JSearch job item."""
        job_data = item.get("job", item)  # Handle both nested and flat structures
        
        if not job_data:
            return None
        
        # Extract posted date
        posted_at = None
        date_posted = job_data.get("job_posted_at_datetime_utc") or job_data.get("date_posted")
        if date_posted:
            try:
                posted_at = datetime.fromisoformat(date_posted.replace("Z", "+00:00"))
            except:
                pass
        
        # Determine remote status
        remote = False
        is_remote = job_data.get("job_is_remote")
        if is_remote is not None:
            remote = bool(is_remote)
        
        # Build description
        description = job_data.get("job_description", "")
        if not description:
            highlights = job_data.get("job_highlights", [])
            if highlights:
                description = "\n".join([
                    q for h in highlights if isinstance(h, dict)
                    for q in h.get("items", [])
                ])
        
        return RawJobListing(
            title=job_data.get("job_title", ""),
            company=job_data.get("employer_name") or job_data.get("company"),
            location=job_data.get("job_location") or job_data.get("location"),
            description=description,
            url=job_data.get("job_apply_link") or job_data.get("job_google_link") or job_data.get("url"),
            salary_text=job_data.get("job_min_salary") or job_data.get("job_max_salary") or job_data.get("job_salary"),
            posted_at=posted_at,
            source="jsearch",
            raw_data=item,
            remote=remote
        )


async def scrape_with_jsearch(
    query: str,
    location: Optional[str] = None,
    max_results: int = 50
) -> List[RawJobListing]:
    """Convenience function to scrape using JSearch."""
    scraper = JSearchScraper()
    return await scraper.scrape(query, location, max_results)
