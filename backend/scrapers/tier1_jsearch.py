"""
CareerRadar - JSearch RapidAPI Scraper (Tier 1)
Real job listings from JSearch RapidAPI
"""

from typing import List, Optional
from datetime import datetime
import httpx

from .base_scraper import BaseScraper, RawJobListing, ScraperTier
from config.settings import settings


class JSearchScraper(BaseScraper):
    """Tier 1 scraper using JSearch RapidAPI."""
    
    def __init__(self):
        super().__init__(tier=ScraperTier.TIER_1_API, max_retries=3, retry_delay=1.0, timeout=30.0)
        self.api_key = settings.rapidapi_key
        self.api_host = "jsearch.p.rapidapi.com"
        self.base_url = "https://jsearch.p.rapidapi.com/search"
    
    async def scrape(
        self,
        query: str,
        location: Optional[str] = None,
        max_results: int = 50
    ) -> List[RawJobListing]:
        """
        Scrape job listings from JSearch RapidAPI.
        
        Args:
            query: Job search query
            location: Location filter
            max_results: Maximum results (capped by API)
            
        Returns:
            List of RawJobListing objects
        """
        if not self.api_key:
            print("[JSearch] Warning: RAPIDAPI_KEY not configured, returning empty list")
            return []
        
        # Build combined query for all target roles
        target_roles = settings.target_roles or ["ML Engineer", "MLOps Engineer", "DevOps Engineer"]
        combined_query = " OR ".join([f'"{role} UK"' for role in target_roles])
        
        print(f"[JSearch] Calling API with query: {combined_query[:60]}...")
        
        headers = {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": self.api_host
        }
        
        params = {
            "query": combined_query,
            "page": "1",
            "num_pages": "2",
            "date_posted": "today"
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    self.base_url,
                    headers=headers,
                    params=params
                )
                response.raise_for_status()
                data = response.json()
                
            jobs_data = data.get("data", [])
            print(f"[JSearch] API returned {len(jobs_data)} jobs")
            
            listings = []
            for job in jobs_data:
                # Map JSearch fields to RawJobListing
                listing = RawJobListing(
                    title=job.get("job_title", "Unknown Title"),
                    company=job.get("employer_name"),
                    location=self._build_location(job),
                    description=job.get("job_description", ""),
                    url=job.get("job_apply_link") or job.get("job_apply_url"),
                    salary_text=self._format_salary(job),
                    posted_at=self._parse_date(job.get("job_posted_at_datetime_utc")),
                    source="jsearch",
                    remote=job.get("job_is_remote", False),
                    raw_data=job
                )
                listings.append(listing)
            
            print(f"[JSearch] Successfully parsed {len(listings)} job listings")
            return listings
            
        except httpx.HTTPStatusError as e:
            print(f"[JSearch] HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            print(f"[JSearch] Error during API call: {e}")
            raise
    
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
        
        symbol = "£" if currency == "GBP" else "$" if currency == "USD" else "€" if currency == "EUR" else currency
        
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
    query: str,
    location: Optional[str] = None,
    max_results: int = 50
) -> List[RawJobListing]:
    """Convenience function to scrape using JSearch."""
    scraper = JSearchScraper()
    return await scraper.scrape(query, location, max_results)
