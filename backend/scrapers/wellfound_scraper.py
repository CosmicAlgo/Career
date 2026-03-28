"""
CareerRadar - Wellfound (AngelList) Scraper
Playwright-based scraper for Wellfound/AngelList job board
"""

import time
import logging
from typing import List, Optional, Tuple
from datetime import datetime
from playwright.async_api import async_playwright

from .base_scraper import BaseScraper, ScraperMetrics, ScraperTier
from api.schemas import NormalisedJob

logger = logging.getLogger(__name__)


class WellfoundScraper(BaseScraper):
    """Wellfound (AngelList) Playwright scraper."""

    def __init__(self):
        super().__init__(
            tier=ScraperTier.TIER_3_DIRECT, max_retries=2, retry_delay=2.0, timeout=60.0
        )
        self.base_url = "https://wellfound.com/jobs"

    def is_available(self) -> bool:
        """Available if Playwright is installed."""
        try:
            import playwright

            return True
        except ImportError:
            return False

    def _title_matches_roles(self, title: str, target_roles: List[str]) -> bool:
        """Check if job title matches any target role."""
        title_lower = title.lower()

        role_keywords = {
            "ml_engineer": [
                "ml engineer",
                "machine learning",
                "ml developer",
                "ai engineer",
            ],
            "mlops": ["mlops", "ml ops", "machine learning ops"],
            "devops": ["devops", "dev ops", "sre", "site reliability", "platform"],
            "backend": [
                "backend",
                "back-end",
                "server-side",
                "api developer",
                "software engineer",
            ],
            "data_engineer": ["data engineer", "data eng", "etl", "data pipeline"],
            "data_scientist": ["data scientist", "data science"],
            "sre": ["sre", "site reliability engineer"],
            "platform": ["platform engineer", "infrastructure engineer"],
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
        max_results: int = 30,
    ) -> Tuple[List[NormalisedJob], ScraperMetrics]:
        """
        Scrape jobs from Wellfound using Playwright.

        Args:
            target_roles: List of role slugs to search for
            target_locations: Ignored (Wellfound has location filtering but complex)
            max_results: Maximum jobs to return

        Returns:
            Tuple of (jobs list, metrics)
        """
        start_time = time.time()
        jobs: List[NormalisedJob] = []
        error_msg = None

        try:
            logger.info(f"[Wellfound] Starting scrape for roles: {target_roles}")

            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                )
                page = await context.new_page()

                for role in target_roles[
                    :3
                ]:  # Limit to first 3 roles to avoid timeouts
                    if len(jobs) >= max_results:
                        break

                    try:
                        # Build search query from role
                        search_term = role.replace("_", " ").replace("-", " ")
                        url = f"{self.base_url}?search={search_term.replace(' ', '+')}"

                        logger.info(f"[Wellfound] Searching for: {search_term}")

                        await page.goto(url, wait_until="networkidle", timeout=30000)
                        await page.wait_for_load_state("domcontentloaded")

                        # Wait for job listings to load
                        await page.wait_for_selector(
                            "[data-test='job-listing']", timeout=10000
                        )

                        # Extract job listings
                        job_cards = await page.query_selector_all(
                            "[data-test='job-listing']"
                        )

                        for card in job_cards[:10]:  # Limit per role
                            try:
                                # Extract job details
                                title_el = await card.query_selector(
                                    "h2, .title, [data-test='job-title']"
                                )
                                company_el = await card.query_selector(
                                    ".company-name, [data-test='company-name']"
                                )
                                location_el = await card.query_selector(
                                    ".location, [data-test='location']"
                                )
                                link_el = await card.query_selector("a[href*='/jobs/']")

                                title = (
                                    await title_el.inner_text()
                                    if title_el
                                    else "Unknown"
                                )
                                company = (
                                    await company_el.inner_text()
                                    if company_el
                                    else None
                                )
                                location = (
                                    await location_el.inner_text()
                                    if location_el
                                    else "Remote"
                                )

                                # Get job URL
                                job_url = None
                                if link_el:
                                    href = await link_el.get_attribute("href")
                                    if href:
                                        job_url = (
                                            f"https://wellfound.com{href}"
                                            if href.startswith("/")
                                            else href
                                        )

                                # Filter by role
                                if not self._title_matches_roles(title, target_roles):
                                    continue

                                # Determine seniority
                                seniority = "mid"
                                title_lower = title.lower()
                                if (
                                    "senior" in title_lower
                                    or "sr." in title_lower
                                    or "lead" in title_lower
                                ):
                                    seniority = "senior"
                                elif (
                                    "junior" in title_lower
                                    or "jr." in title_lower
                                    or "entry" in title_lower
                                ):
                                    seniority = "junior"

                                normalised_job = NormalisedJob(
                                    id=f"wellfound-{hash(title + company) % 10000000:07d}",
                                    title=title.strip(),
                                    company=company.strip() if company else None,
                                    location=location.strip() if location else "Remote",
                                    remote="remote" in location.lower()
                                    or "anywhere" in location.lower(),
                                    required_skills=[],  # Would need individual job page scrape
                                    nice_to_have=[],
                                    seniority=seniority,
                                    salary_min=None,
                                    salary_max=None,
                                    currency="USD",
                                    source="wellfound",
                                    url=job_url,
                                    posted_date=datetime.now().date(),
                                    description="",
                                )

                                jobs.append(normalised_job)

                                if len(jobs) >= max_results:
                                    break

                            except Exception as e:
                                logger.warning(
                                    f"[Wellfound] Error extracting job card: {e}"
                                )
                                continue

                        # Add delay between searches
                        await page.wait_for_timeout(2000)

                    except Exception as e:
                        logger.warning(
                            f"[Wellfound] Error searching for role {role}: {e}"
                        )
                        continue

                await browser.close()

            logger.info(f"[Wellfound] Successfully scraped {len(jobs)} jobs")

        except Exception as e:
            error_msg = str(e)
            logger.error(f"[Wellfound] Scraping error: {e}", exc_info=True)

        duration_ms = int((time.time() - start_time) * 1000)
        metrics = ScraperMetrics(
            scraper_name="wellfound",
            duration_ms=duration_ms,
            jobs_returned=len(jobs),
            error=error_msg,
        )

        return jobs, metrics
