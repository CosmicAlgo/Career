"""
CareerRadar - Otta (Welcome to the Jungle) Scraper
Playwright-based scraper for Otta/Welcome to the Jungle - UK focused
"""

import time
import logging
from typing import List, Optional, Tuple
from datetime import datetime
from playwright.async_api import async_playwright

from .base_scraper import BaseScraper, ScraperMetrics, ScraperTier
from api.schemas import NormalisedJob

logger = logging.getLogger(__name__)


class OttaScraper(BaseScraper):
    """Otta (Welcome to the Jungle) Playwright scraper - UK focused."""

    def __init__(self):
        super().__init__(
            tier=ScraperTier.TIER_3_DIRECT, max_retries=2, retry_delay=2.0, timeout=60.0
        )
        self.base_url = "https://app.welcometothejungle.com/jobs"

    def is_available(self) -> bool:
        """Available if Playwright is installed."""
        try:
            import importlib.util

            return importlib.util.find_spec("playwright") is not None
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
                "ai/ml",
            ],
            "mlops": ["mlops", "ml ops", "machine learning ops", "ml infrastructure"],
            "devops": [
                "devops",
                "dev ops",
                "sre",
                "site reliability",
                "platform engineer",
                "infrastructure",
            ],
            "backend": [
                "backend",
                "back-end",
                "server-side",
                "api developer",
                "software engineer",
                "fullstack",
            ],
            "data_engineer": [
                "data engineer",
                "data eng",
                "etl",
                "data pipeline",
                "data infrastructure",
            ],
            "data_scientist": ["data scientist", "data science", "analytics engineer"],
            "sre": ["sre", "site reliability engineer", "reliability engineer"],
            "platform": [
                "platform engineer",
                "infrastructure engineer",
                "systems engineer",
            ],
        }

        for role in target_roles:
            role_lower = role.lower().strip()
            keywords = role_keywords.get(role_lower, [role_lower.replace("_", " ")])

            for keyword in keywords:
                if keyword in title_lower:
                    return True

        return False

    def _extract_salary(self, text: str) -> Tuple[Optional[int], Optional[int]]:
        """Extract salary range from text."""
        import re

        # Look for patterns like £50,000 - £70,000 or £50k-£70k
        patterns = [
            r"£(\d{2,3}),?\d{0,3}\s*-\s*£(\d{2,3}),?\d{0,3}",
            r"£(\d{2,3})k?\s*-\s*£(\d{2,3})k",
            r"(\d{2,3}),?\d{0,3}\s*-\s*(\d{2,3}),?\d{0,3}\s*(?:GBP|£)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    min_sal = int(match.group(1).replace(",", "").replace("k", "000"))
                    max_sal = int(match.group(2).replace(",", "").replace("k", "000"))
                    # Normalize k notation
                    if min_sal < 1000:
                        min_sal *= 1000
                    if max_sal < 1000:
                        max_sal *= 1000
                    return min_sal, max_sal
                except (ValueError, IndexError):
                    continue

        return None, None

    async def scrape(
        self,
        target_roles: List[str],
        target_locations: Optional[List[str]] = None,
        max_results: int = 30,
    ) -> Tuple[List[NormalisedJob], ScraperMetrics]:
        """
        Scrape jobs from Otta/Welcome to the Jungle.

        Args:
            target_roles: List of role slugs to search for
            target_locations: List of locations (filters for UK/London if specified)
            max_results: Maximum jobs to return

        Returns:
            Tuple of (jobs list, metrics)
        """
        start_time = time.time()
        jobs: List[NormalisedJob] = []
        error_msg = None

        # Check if UK/London is in target locations
        uk_focused = False
        if target_locations:
            uk_locations = ["uk", "united kingdom", "london", "england", "britain"]
            uk_focused = any(loc.lower() in uk_locations for loc in target_locations)

        try:
            logger.info(
                f"[Otta] Starting scrape for roles: {target_roles} (UK focused: {uk_focused})"
            )

            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                )
                page = await context.new_page()

                # Build query with roles
                query_roles = " OR ".join(
                    [r.replace("_", " ") for r in target_roles[:2]]
                )
                url = f"{self.base_url}?query={query_roles.replace(' ', '%20')}"

                if uk_focused:
                    url += "&aroundLatLng=51.5074,-0.1278&aroundRadius=50000"  # London radius

                logger.info(f"[Otta] Navigating to: {url}")

                await page.goto(url, wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(3000)  # Wait for dynamic content

                # Accept cookies if prompted
                try:
                    cookie_btn = await page.query_selector(
                        "button:has-text('Accept'), button:has-text('accept'), [data-test='accept-cookies']"
                    )
                    if cookie_btn:
                        await cookie_btn.click()
                        await page.wait_for_timeout(1000)
                except Exception:
                    pass

                # Scroll to load more jobs
                for _ in range(3):
                    await page.evaluate("window.scrollBy(0, 800)")
                    await page.wait_for_timeout(1500)

                # Extract job listings
                # Otta uses article elements for job cards
                job_cards = await page.query_selector_all(
                    "article, [data-testid='job-card'], .sc-" + "job-card"
                )

                logger.info(f"[Otta] Found {len(job_cards)} job cards")

                for card in job_cards[:max_results]:
                    try:
                        # Try multiple selectors for title
                        title_el = await card.query_selector(
                            "h2, h3, .title, [data-testid='job-title']"
                        )
                        if not title_el:
                            continue

                        title = await title_el.inner_text()

                        # Filter by role
                        if not self._title_matches_roles(title, target_roles):
                            continue

                        # Extract company
                        company_el = await card.query_selector(
                            ".company-name, [data-testid='company-name'], .sc-company"
                        )
                        company = await company_el.inner_text() if company_el else None

                        # Extract location
                        location_el = await card.query_selector(
                            ".location, [data-testid='location'], .sc-location"
                        )
                        location = (
                            await location_el.inner_text() if location_el else "UK"
                        )

                        # Check UK focus
                        if uk_focused and not any(
                            loc in location.lower()
                            for loc in [
                                "uk",
                                "london",
                                "england",
                                "united kingdom",
                                "remote",
                            ]
                        ):
                            continue

                        # Extract salary if available
                        salary_el = await card.query_selector(
                            ".salary, [data-testid='salary'], .sc-salary"
                        )
                        salary_text = await salary_el.inner_text() if salary_el else ""
                        salary_min, salary_max = (
                            self._extract_salary(salary_text)
                            if salary_text
                            else (None, None)
                        )

                        # Get job URL
                        link_el = await card.query_selector("a[href*='/jobs/']")
                        job_url = None
                        if link_el:
                            href = await link_el.get_attribute("href")
                            if href:
                                job_url = (
                                    f"https://app.welcometothejungle.com{href}"
                                    if href.startswith("/")
                                    else href
                                )

                        # Determine seniority
                        seniority = "mid"
                        title_lower = title.lower()
                        if (
                            "senior" in title_lower
                            or "lead" in title_lower
                            or "principal" in title_lower
                        ):
                            seniority = "senior"
                        elif (
                            "junior" in title_lower
                            or "graduate" in title_lower
                            or "entry" in title_lower
                        ):
                            seniority = "junior"

                        # Check remote
                        remote = (
                            "remote" in location.lower()
                            or "hybrid" in location.lower()
                            or "flexible" in location.lower()
                        )

                        normalised_job = NormalisedJob(
                            id=f"otta-{hash(title + (company or '')) % 10000000:07d}",
                            title=title.strip(),
                            company=company.strip() if company else None,
                            location=location.strip(),
                            remote=remote,
                            required_skills=[],  # Would need individual job page for full details
                            nice_to_have=[],
                            seniority=seniority,
                            salary_min=salary_min,
                            salary_max=salary_max,
                            currency="GBP" if uk_focused else "USD",
                            source="otta",
                            url=job_url,
                            posted_date=datetime.now().date(),
                            description="",
                        )

                        jobs.append(normalised_job)

                        if len(jobs) >= max_results:
                            break

                    except Exception as e:
                        logger.warning(f"[Otta] Error extracting job card: {e}")
                        continue

                await browser.close()

            logger.info(f"[Otta] Successfully scraped {len(jobs)} jobs")

        except Exception as e:
            error_msg = str(e)
            logger.error(f"[Otta] Scraping error: {e}", exc_info=True)

        duration_ms = int((time.time() - start_time) * 1000)
        metrics = ScraperMetrics(
            scraper_name="otta",
            duration_ms=duration_ms,
            jobs_returned=len(jobs),
            error=error_msg,
        )

        return jobs, metrics
