"""
CareerRadar - Tier 2 Scraper: Apify Actors
Fallback source: Glassdoor and Otta via Apify ($5 free credit/month)
"""

import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime

import httpx

from scrapers.base_scraper import (
    BaseScraper,
    RawJobListing,
    ScraperTier,
    QuotaExceededError,
)
from scrapers.quota_tracker import get_quota_tracker
from config.settings import settings


APIFY_BASE_URL = "https://api.apify.com/v2"


class ApifyScraper(BaseScraper):
    """
    Apify Actors scraper - Tier 2.

    Free tier: $5 credit/month (resets monthly)
    Covers: Glassdoor, Otta (Welcome to the Jungle)
    """

    ACTOR_IDS = {
        "glassdoor": "apify/glassdoor-jobs-scraper",
        "otta": "apify/wttj-jobs-scraper",  # Welcome to the Jungle / Otta
    }

    def __init__(self):
        super().__init__(
            tier=ScraperTier.TIER_2_APIFY,
            max_retries=3,
            retry_delay=2.0,
            timeout=60.0,  # Apify runs can take time
        )
        self.token = settings.apify_token
        self.quota_name = "apify"

        # Register quota tracking (estimate $5 = ~500-1000 runs)
        tracker = get_quota_tracker()
        tracker.register_quota(
            name=self.quota_name,
            limit=500,  # Conservative estimate
            reset_date=datetime.now().replace(day=1),
        )

    def is_available(self) -> bool:
        """Check if token is configured and quota available."""
        if not self.token:
            return False

        tracker = get_quota_tracker()
        return tracker.should_use_tier(self.quota_name, warning_threshold=85.0)

    async def scrape(
        self,
        query: str,
        location: Optional[str] = None,
        max_results: int = 50,
        sources: Optional[List[str]] = None,
    ) -> List[RawJobListing]:
        """
        Scrape jobs via Apify actors.

        Args:
            query: Job search query
            location: Location filter
            max_results: Max results per source
            sources: List of sources to use ["glassdoor", "otta"]. Default: both
        """
        if not self.is_available():
            raise QuotaExceededError("Apify quota exhausted or not configured")

        sources = sources or ["glassdoor", "otta"]
        all_jobs: List[RawJobListing] = []

        # Scrape from each source in parallel
        tasks = []
        for source in sources:
            if source in self.ACTOR_IDS:
                tasks.append(self._scrape_source(source, query, location, max_results))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, list):
                all_jobs.extend(result)
            elif isinstance(result, Exception):
                print(f"[Apify] Source failed: {result}")

        return all_jobs

    async def _scrape_source(
        self, source: str, query: str, location: Optional[str], max_results: int
    ) -> List[RawJobListing]:
        """Scrape from a specific Apify actor."""
        actor_id = self.ACTOR_IDS.get(source)
        if not actor_id:
            return []

        tracker = get_quota_tracker()

        try:
            # Start actor run
            run_id = await self._start_actor_run(actor_id, query, location, max_results)

            # Wait for completion and get results
            jobs = await self._wait_and_fetch_results(run_id, source)

            # Record usage
            tracker.record_usage(self.quota_name, 1)

            return jobs
        except Exception as e:
            print(f"[Apify] {source} scrape failed: {e}")
            return []

    async def _start_actor_run(
        self, actor_id: str, query: str, location: Optional[str], max_results: int
    ) -> str:
        """Start an Apify actor run and return run ID."""
        url = f"{APIFY_BASE_URL}/acts/{actor_id}/runs"

        # Build input based on actor
        if "glassdoor" in actor_id:
            run_input = {
                "keywords": query,
                "location": location or "United Kingdom",
                "maxResults": max_results,
                "parseCompanyDetails": False,
            }
        elif "wttj" in actor_id or "otta" in actor_id:
            run_input = {
                "query": query,
                "location": location or "London",
                "maxItems": max_results,
            }
        else:
            run_input = {"query": query, "maxItems": max_results}

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=run_input)
            response.raise_for_status()
            data = response.json()

            return data["data"]["id"]

    async def _wait_and_fetch_results(
        self, run_id: str, source: str, max_wait: int = 120
    ) -> List[RawJobListing]:
        """Wait for actor run to complete and fetch results."""
        url = f"{APIFY_BASE_URL}/actor-runs/{run_id}"
        headers = {"Authorization": f"Bearer {self.token}"}

        # Poll for completion
        async with httpx.AsyncClient() as client:
            waited = 0
            poll_interval = 5

            while waited < max_wait:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()

                status = data["data"]["status"]

                if status == "SUCCEEDED":
                    break
                elif status in ["FAILED", "ABORTED", "TIMED-OUT"]:
                    raise Exception(f"Actor run failed with status: {status}")

                await asyncio.sleep(poll_interval)
                waited += poll_interval
            else:
                raise Exception("Actor run timed out waiting for completion")

        # Fetch dataset items
        dataset_id = data["data"]["defaultDatasetId"]
        return await self._fetch_dataset_items(dataset_id, source)

    async def _fetch_dataset_items(
        self, dataset_id: str, source: str
    ) -> List[RawJobListing]:
        """Fetch items from Apify dataset."""
        url = f"{APIFY_BASE_URL}/datasets/{dataset_id}/items"
        headers = {"Authorization": f"Bearer {self.token}"}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            items = response.json()

        jobs = []
        for item in items:
            try:
                job = self._parse_item(item, source)
                if job:
                    jobs.append(job)
            except Exception as e:
                print(f"[Apify] Failed to parse {source} item: {e}")
                continue

        return jobs

    def _parse_item(self, item: Dict[str, Any], source: str) -> Optional[RawJobListing]:
        """Parse Apify item to RawJobListing."""
        if source == "glassdoor":
            return self._parse_glassdoor_item(item)
        elif source == "otta":
            return self._parse_otta_item(item)
        return None

    def _parse_glassdoor_item(self, item: Dict[str, Any]) -> Optional[RawJobListing]:
        """Parse Glassdoor job item."""
        # Extract posted date
        posted_at = None
        date_text = item.get("date") or item.get("postingDate")
        if date_text:
            try:
                # Try various date formats
                for fmt in ["%Y-%m-%d", "%b %d, %Y", "%d-%b-%Y"]:
                    try:
                        posted_at = datetime.strptime(date_text, fmt)
                        break
                    except:
                        continue
            except:
                pass

        # Build location string
        location_parts = []
        if item.get("city"):
            location_parts.append(item["city"])
        if item.get("state"):
            location_parts.append(item["state"])
        if item.get("country"):
            location_parts.append(item["country"])
        location = ", ".join(location_parts) if location_parts else item.get("location")

        return RawJobListing(
            title=item.get("jobTitle", ""),
            company=item.get("employerName") or item.get("companyName"),
            location=location,
            description=item.get("description") or item.get("jobDescription"),
            url=item.get("jobUrl") or item.get("url"),
            salary_text=item.get("salary") or item.get("pay"),
            posted_at=posted_at,
            source="glassdoor",
            raw_data=item,
            remote=item.get("remoteWorkAllowed", False)
            if isinstance(item.get("remoteWorkAllowed"), bool)
            else None,
        )

    def _parse_otta_item(self, item: Dict[str, Any]) -> Optional[RawJobListing]:
        """Parse Otta/Welcome to the Jungle job item."""
        # Extract posted date
        posted_at = None
        date_text = item.get("publishedAt") or item.get("date")
        if date_text:
            try:
                posted_at = datetime.fromisoformat(date_text.replace("Z", "+00:00"))
            except:
                pass

        # Build description from requirements/description
        description_parts = []
        if item.get("description"):
            description_parts.append(item["description"])
        if item.get("requirements"):
            description_parts.append("\nRequirements:\n" + str(item["requirements"]))
        description = "\n".join(description_parts)

        # Detect remote from workplace type
        remote = None
        workplace = item.get("workplaceType", "").lower()
        if "remote" in workplace:
            remote = True
        elif "onsite" in workplace or "office" in workplace:
            remote = False

        return RawJobListing(
            title=item.get("title", ""),
            company=item.get("company", {}).get("name")
            if isinstance(item.get("company"), dict)
            else item.get("company"),
            location=item.get("location", {}).get("city")
            if isinstance(item.get("location"), dict)
            else item.get("location"),
            description=description,
            url=item.get("url") or item.get("jobUrl"),
            salary_text=item.get("salary") or item.get("compensation"),
            posted_at=posted_at,
            source="otta",
            raw_data=item,
            remote=remote,
        )


async def scrape_with_apify(
    query: str,
    location: Optional[str] = None,
    max_results: int = 50,
    sources: Optional[List[str]] = None,
) -> List[RawJobListing]:
    """Convenience function to scrape using Apify."""
    scraper = ApifyScraper()
    return await scraper.scrape(query, location, max_results, sources)
