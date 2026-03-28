"""
CareerRadar - Tier 3 Scraper: Zing Jobs
Direct Playwright scraper for Zing
"""

from typing import List, Optional
from datetime import datetime
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from scrapers.base_scraper import BaseScraper, RawJobListing, ScraperTier


ZING_BASE_URL = "https://zing.jobs"


class ZingScraper(BaseScraper):
    """
    Zing Jobs direct scraper - Tier 3.

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
        Scrape jobs from Zing.

        Args:
            query: Job search query
            location: Location filter
            max_results: Max results to return
        """
        jobs: List[RawJobListing] = []

        # Build search URL
        search_query = quote_plus(query)
        url = f"{ZING_BASE_URL}/jobs?query={search_query}"

        if location:
            url += f"&location={quote_plus(location)}"

        try:
            # Fetch page with Playwright
            html = await self._get_page_with_playwright(
                url,
                wait_selector=".job-card, .job-listing, [data-testid='job']",
                wait_timeout=15000,
            )

            # Parse HTML
            soup = BeautifulSoup(html, "html.parser")

            # Find job listings - try multiple selectors
            job_cards = (
                soup.find_all("div", class_="job-card")
                or soup.find_all("article", class_="job-listing")
                or soup.find_all(
                    "div",
                    class_=lambda x: x and "job" in str(x).lower() if x else False,
                )
                or soup.find_all("a", href=lambda x: x and "/job/" in x if x else False)
            )

            for card in job_cards[:max_results]:
                try:
                    job = self._parse_job_card(card)
                    if job and job.title:
                        jobs.append(job)
                except Exception as e:
                    print(f"[Zing] Failed to parse job card: {e}")
                    continue

            print(f"[Zing] Found {len(jobs)} jobs")

        except Exception as e:
            print(f"[Zing] Scraping failed: {e}")

        return jobs

    def _parse_job_card(self, card) -> Optional[RawJobListing]:
        """Parse a job card element from Zing."""
        # Extract job details using various selectors
        title = self._extract_text(
            card,
            [
                "h2",
                "h3",
                ".job-title",
                "[data-testid='job-title']",
                ".title",
                "a strong",
            ],
        )

        company = self._extract_text(
            card, [".company", "[data-testid='company']", ".employer", ".company-name"]
        )

        location = self._extract_text(
            card, [".location", "[data-testid='location']", ".job-location", ".place"]
        )

        # Get job URL
        url = None
        link = card.find("a", href=True) if hasattr(card, "find") else None
        if link:
            href = link.get("href", "")
            if href.startswith("/"):
                url = f"{ZING_BASE_URL}{href}"
            elif href.startswith("http"):
                url = href

        # Get description/snippet
        description = self._extract_text(
            card,
            [
                ".description",
                ".job-description",
                ".summary",
                ".snippet",
                "[data-testid='description']",
            ],
        )

        # Try to find salary info
        salary_text = self._extract_text(
            card, [".salary", ".compensation", ".pay", "[data-testid='salary']"]
        )

        # Detect remote
        remote = None
        if location:
            loc_lower = location.lower()
            if "remote" in loc_lower:
                remote = True
            elif any(word in loc_lower for word in ["hybrid", "flexible"]):
                remote = False  # Hybrid, not fully remote

        # Parse posted date
        date_text = self._extract_text(
            card, [".date", ".posted", ".time-ago", "[data-testid='posted-date']"]
        )
        posted_at = self._parse_relative_date(date_text)

        return RawJobListing(
            title=title or "",
            company=company,
            location=location,
            description=description,
            url=url,
            salary_text=salary_text,
            posted_at=posted_at,
            source="zing",
            remote=remote,
        )

    def _extract_text(self, element, selectors: List[str]) -> Optional[str]:
        """Try multiple selectors to extract text."""
        for selector in selectors:
            try:
                if hasattr(element, "select_one"):
                    # BeautifulSoup 4.7+
                    found = element.select_one(selector)
                elif hasattr(element, "find"):
                    # Older BeautifulSoup or Tag
                    if selector.startswith(".") or selector.startswith("["):
                        # CSS selector - use find with class_
                        class_name = selector.replace(".", "").split(",")[0]
                        found = element.find(
                            class_=lambda x: class_name in str(x) if x else False
                        )
                    else:
                        found = element.find(selector)
                else:
                    continue

                if found:
                    text = found.get_text(strip=True)
                    if text:
                        return text
            except Exception:
                continue
        return None

    def _parse_relative_date(self, text: Optional[str]) -> Optional[datetime]:
        """Parse relative date text."""
        if not text:
            return None

        text_lower = text.lower()
        now = datetime.now()

        if "today" in text_lower or "just now" in text_lower or "now" in text_lower:
            return now
        elif "yesterday" in text_lower:
            return now.replace(day=max(1, now.day - 1))
        elif "day" in text_lower:
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


async def scrape_with_zing(
    query: str, location: Optional[str] = None, max_results: int = 50
) -> List[RawJobListing]:
    """Convenience function to scrape using Zing."""
    scraper = ZingScraper()
    return await scraper.scrape(query, location, max_results)
