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
    
    def is_available(self) -> bool:
        """Check if API key is configured."""
        return bool(self.api_key)
    
    async def scrape(
        self,
        query: str,
        location: Optional[str] = None,
        max_results: int = 50
    ) -> List[RawJobListing]:
        """
        Scrape job listings from JSearch RapidAPI.
        Uses the query parameter directly - caller is responsible for building the query.
        """
        if not self.api_key:
            print("[JSearch] WARNING: RAPIDAPI_KEY not set in env, returning empty list")
            return []
        
        headers = {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": self.api_host
        }
        
        params = {
            "query": query,
            "page": "1",
            "num_pages": "2",
            "date_posted": "today"
        }
        
        # === DEBUG LOGGING ===
        print(f"[JSearch] === DEBUG ===")
        print(f"[JSearch] URL: {self.base_url}")
        print(f"[JSearch] Query: {query}")
        print(f"[JSearch] Headers: X-RapidAPI-Key={self.api_key[:8]}...{self.api_key[-4:]}, X-RapidAPI-Host={self.api_host}")
        print(f"[JSearch] Params: {params}")
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    self.base_url,
                    headers=headers,
                    params=params
                )
                
                # === DEBUG: response info ===
                print(f"[JSearch] Response status: {response.status_code}")
                body_text = response.text
                print(f"[JSearch] Response body (first 500 chars): {body_text[:500]}")
                
                response.raise_for_status()
                data = response.json()
                
            jobs_data = data.get("data", []) or []
            print(f"[JSearch] API returned {len(jobs_data)} jobs")
            
            if not jobs_data:
                print(f"[JSearch] No jobs in response. Full keys: {list(data.keys())}")
                if "message" in data:
                    print(f"[JSearch] API message: {data['message']}")
            
            listings = []
            for i, job in enumerate(jobs_data):
                apply_link = job.get("job_apply_link") or job.get("job_google_link") or ""
                listing = RawJobListing(
                    title=job.get("job_title", "Unknown Title"),
                    company=job.get("employer_name"),
                    location=self._build_location(job),
                    description=job.get("job_description", ""),
                    url=apply_link,
                    salary_text=self._format_salary(job),
                    posted_at=self._parse_date(job.get("job_posted_at_datetime_utc")),
                    source="jsearch",
                    remote=job.get("job_is_remote", False),
                    raw_data=job
                )
                listings.append(listing)
                if i < 3:
                    print(f"[JSearch] Job {i+1}: {listing.title} @ {listing.company} | url={apply_link[:80]}")
            
            print(f"[JSearch] Successfully parsed {len(listings)} job listings")
            return listings
            
        except httpx.HTTPStatusError as e:
            print(f"[JSearch] HTTP error: {e.response.status_code}")
            print(f"[JSearch] Error body: {e.response.text[:500]}")
            raise
        except Exception as e:
            print(f"[JSearch] Error during API call: {type(e).__name__}: {e}")
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
        symbol = "\u00a3" if currency == "GBP" else "$" if currency == "USD" else "\u20ac" if currency == "EUR" else currency
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
