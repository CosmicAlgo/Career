"""
CareerRadar - Tier 3 Scraper: Simplify Jobs
Direct Playwright scraper for Simplify (no auth required)
"""

from typing import List, Optional
from datetime import datetime
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from scrapers.base_scraper import BaseScraper, RawJobListing, ScraperTier


SIMPLIFY_BASE_URL = "https://simplify.jobs"


class SimplifyScraper(BaseScraper):
    """
    Simplify Jobs direct scraper - Tier 3.

    No authentication required, uses Playwright for JS-rendered content.
    """

    def __init__(self):
        super().__init__(tier=ScraperTier.TIER_3_DIRECT, max_retries=2, retry_delay=2.0)

    def is_available(self) -> bool:
        """Always available - no credentials required."""
        return True

    async def scrape(
        self, query: str, location: Optional[str] = None, max_results: int = 50
    ) -> List[RawJobListing]:
        """
        Scrape jobs from Simplify.

        Args:
            query: Job search query
            location: Location filter
            max_results: Max results to return
        """
        jobs: List[RawJobListing] = []

        # Simplify search URL format
        search_query = quote_plus(query)
        url = f"{SIMPLIFY_BASE_URL}/search?q={search_query}"

        if location:
            url += f"&location={quote_plus(location)}"

        try:
            # Fetch page with Playwright
            html = await self._get_page_with_playwright(
                url,
                wait_selector="[data-testid='job-card']",  # Adjust based on actual site
                wait_timeout=15000,
            )

            # Parse HTML
            soup = BeautifulSoup(html, "html.parser")

            # Find job listings - selectors need to match actual site structure
            job_cards = soup.find_all(
                "div", class_=lambda x: x and "job" in x.lower() if x else False
            )

            # Fallback selectors
            if not job_cards:
                job_cards = soup.find_all("article")
            if not job_cards:
                job_cards = soup.find_all(
                    "a", href=lambda x: x and "/jobs/" in x if x else False
                )

            for card in job_cards[:max_results]:
                try:
                    job = self._parse_job_card(card)
                    if job and job.title:
                        jobs.append(job)
                except Exception as e:
                    print(f"[Simplify] Failed to parse job card: {e}")
                    continue

            print(f"[Simplify] Found {len(jobs)} jobs")

        except Exception as e:
            print(f"[Simplify] Scraping failed: {e}")

        return jobs

    def _parse_job_card(self, card) -> Optional[RawJobListing]:
        """Parse a job card element."""
        # Try various selectors to extract job info
        title = self._extract_text(
            card, ["h2", "h3", "h4", ".title", "[data-testid='job-title']", "a"]
        )
        company = self._extract_text(
            card, [".company", "[data-testid='company']", ".employer"]
        )
        location = self._extract_text(card, [".location", "[data-testid='location']"])

        # Get URL
        url = None
        link = card.find("a", href=True)
        if link:
            href = link.get("href", "")
            if href.startswith("/"):
                url = f"{SIMPLIFY_BASE_URL}{href}"
            elif href.startswith("http"):
                url = href

        # Get description
        description = self._extract_text(
            card,
            [
                ".description",
                "[data-testid='description']",
                ".job-description",
                ".summary",
            ],
        )

        # Try to find posted date
        posted_text = self._extract_text(
            card, [".date", ".posted", "[data-testid='date']"]
        )
        posted_at = self._parse_relative_date(posted_text)

        # Detect remote
        remote = None
        if location and "remote" in location.lower():
            remote = True
        elif description and "remote" in description.lower():
            remote = True

        return RawJobListing(
            title=title or "",
            company=company,
            location=location,
            description=description,
            url=url,
            posted_at=posted_at,
            source="simplify",
            remote=remote,
        )

    def _extract_text(self, element, selectors: List[str]) -> Optional[str]:
        """Try multiple selectors to extract text."""
        for selector in selectors:
            try:
                found = (
                    element.select_one(selector)
                    if hasattr(element, "select_one")
                    else element.find(selector)
                )
                if found:
                    text = found.get_text(strip=True)
                    if text:
                        return text
            except:
                continue
        return None

    def _parse_relative_date(self, text: Optional[str]) -> Optional[datetime]:
        """Parse relative date text (e.g., '2 days ago')."""
        if not text:
            return None

        text_lower = text.lower()
        now = datetime.now()

        if "today" in text_lower or "just now" in text_lower:
            return now
        elif "yesterday" in text_lower:
            return now.replace(day=now.day - 1)
        elif "day" in text_lower:
            # Extract number
            import re

            match = re.search(r"(\d+)\s*day", text_lower)
            if match:
                days = int(match.group(1))
                return now.replace(day=max(1, now.day - days))
        elif "week" in text_lower:
            import re

            match = re.search(r"(\d+)\s*week", text_lower)
            if match:
                weeks = int(match.group(1))
                return now.replace(day=max(1, now.day - (weeks * 7)))
        elif "month" in text_lower:
            import re

            match = re.search(r"(\d+)\s*month", text_lower)
            if match:
                months = int(match.group(1))
                return now.replace(month=max(1, now.month - months))

        return None


async def scrape_with_simplify(
    query: str, location: Optional[str] = None, max_results: int = 50
) -> List[RawJobListing]:
    """Convenience function to scrape using Simplify."""
    scraper = SimplifyScraper()
    return await scraper.scrape(query, location, max_results)
