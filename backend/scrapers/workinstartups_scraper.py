"""
CareerRadar - Work In Startups Scraper
Scraper for workinstartups.com - UK startup jobs
"""

import time
import logging
from typing import List, Optional, Tuple
from datetime import datetime
from playwright.async_api import async_playwright

from .base_scraper import BaseScraper, ScraperMetrics, ScraperTier
from api.schemas import NormalisedJob

logger = logging.getLogger(__name__)


class WorkInStartupsScraper(BaseScraper):
    """Work In Startups scraper - UK startup job board."""
    
    def __init__(self):
        super().__init__(tier=ScraperTier.TIER_3_DIRECT, max_retries=2, retry_delay=2.0, timeout=60.0)
        self.base_url = "https://workinstartups.com"
    
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
            "ml_engineer": ["ml engineer", "machine learning", "ml developer", "ai engineer"],
            "mlops": ["mlops", "ml ops", "ml infrastructure", "ai ops"],
            "devops": ["devops", "dev ops", "sre", "site reliability", "platform engineer"],
            "backend": ["backend", "back-end", "server-side", "api developer", "software engineer"],
            "data_engineer": ["data engineer", "data eng", "etl", "data pipeline"],
            "data_scientist": ["data scientist", "data science", "analytics"],
            "sre": ["sre", "site reliability engineer", "reliability engineer"],
            "platform": ["platform engineer", "infrastructure engineer"]
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
        max_results: int = 30
    ) -> Tuple[List[NormalisedJob], ScraperMetrics]:
        """
        Scrape jobs from Work In Startups.
        
        Args:
            target_roles: List of role slugs to filter by
            target_locations: Ignored (WorkInStartups is UK focused)
            max_results: Maximum jobs to return
            
        Returns:
            Tuple of (jobs list, metrics)
        """
        start_time = time.time()
        jobs: List[NormalisedJob] = []
        error_msg = None
        
        try:
            logger.info(f"[WorkInStartups] Starting scrape for roles: {target_roles}")
            
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                )
                page = await context.new_page()
                
                # Navigate to tech/engineering jobs
                url = f"{self.base_url}/jobs/tech-engineering/"
                logger.info(f"[WorkInStartups] Navigating to: {url}")
                
                await page.goto(url, wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(2000)
                
                # Extract job listings
                # Job cards are typically in article or div with job classes
                job_cards = await page.query_selector_all(".job, article, .job-listing, [class*='job']")
                
                logger.info(f"[WorkInStartups] Found {len(job_cards)} job cards")
                
                for card in job_cards[:max_results * 2]:  # Fetch extra for filtering
                    try:
                        # Extract title
                        title_el = await card.query_selector("h2, h3, .job-title, .title, a")
                        if not title_el:
                            continue
                        
                        title = await title_el.inner_text()
                        
                        # Filter by role
                        if not self._title_matches_roles(title, target_roles):
                            continue
                        
                        # Extract company
                        company_el = await card.query_selector(".company, .company-name, .startup-name")
                        company = await company_el.inner_text() if company_el else None
                        
                        # Extract location
                        location_el = await card.query_selector(".location, .job-location")
                        location = await location_el.inner_text() if location_el else "UK"
                        
                        # Get job URL
                        link_el = await card.query_selector("a[href*='/jobs/']")
                        job_url = None
                        if link_el:
                            href = await link_el.get_attribute("href")
                            if href:
                                job_url = f"{self.base_url}{href}" if href.startswith("/") else href
                        
                        # Try to extract salary
                        salary_el = await card.query_selector(".salary, .job-salary")
                        salary_text = await salary_el.inner_text() if salary_el else ""
                        
                        # Parse salary if present
                        salary_min = None
                        salary_max = None
                        if salary_text and "£" in salary_text:
                            import re
                            numbers = re.findall(r'£(\d{2,3}(?:,\d{3})?)', salary_text)
                            if len(numbers) >= 2:
                                try:
                                    salary_min = int(numbers[0].replace(",", ""))
                                    salary_max = int(numbers[1].replace(",", ""))
                                except ValueError:
                                    pass
                            elif len(numbers) == 1:
                                try:
                                    salary_min = int(numbers[0].replace(",", ""))
                                except ValueError:
                                    pass
                        
                        # Determine seniority
                        seniority = "mid"
                        title_lower = title.lower()
                        if "senior" in title_lower or "lead" in title_lower:
                            seniority = "senior"
                        elif "junior" in title_lower or "graduate" in title_lower:
                            seniority = "junior"
                        
                        # Check if remote
                        remote = "remote" in title_lower or "remote" in location.lower()
                        
                        normalised_job = NormalisedJob(
                            id=f"workinstartups-{hash(title + (company or '')) % 10000000:07d}",
                            title=title.strip(),
                            company=company.strip() if company else None,
                            location=location.strip() if location else "UK",
                            remote=remote,
                            required_skills=[],
                            nice_to_have=[],
                            seniority=seniority,
                            salary_min=salary_min,
                            salary_max=salary_max,
                            currency="GBP",
                            source="workinstartups",
                            url=job_url,
                            posted_date=datetime.now().date(),
                            description=""
                        )
                        
                        jobs.append(normalised_job)
                        
                        if len(jobs) >= max_results:
                            break
                        
                    except Exception as e:
                        logger.warning(f"[WorkInStartups] Error extracting job card: {e}")
                        continue
                
                await browser.close()
            
            logger.info(f"[WorkInStartups] Successfully scraped {len(jobs)} jobs")
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"[WorkInStartups] Scraping error: {e}", exc_info=True)
        
        duration_ms = int((time.time() - start_time) * 1000)
        metrics = ScraperMetrics(
            scraper_name="workinstartups",
            duration_ms=duration_ms,
            jobs_returned=len(jobs),
            error=error_msg
        )
        
        return jobs, metrics
