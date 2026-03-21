"""
CareerRadar - Base Scraper
Abstract base class with retry logic for job scrapers
"""

import asyncio
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum

import httpx
from playwright.async_api import async_playwright, Page


class ScraperTier(Enum):
    """Scraper tier levels."""
    TIER_1_API = "tier1"      # JSearch RapidAPI
    TIER_2_APIFY = "tier2"    # Apify actors
    TIER_3_DIRECT = "tier3"   # Direct Playwright scraping


@dataclass
class RawJobListing:
    """Raw job listing data from any source."""
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    salary_text: Optional[str] = None
    posted_at: Optional[datetime] = None
    source: Optional[str] = None
    raw_data: Dict[str, Any] = None
    remote: Optional[bool] = None


class RetryExhaustedError(Exception):
    """Raised when all retry attempts are exhausted."""
    pass


class QuotaExceededError(Exception):
    """Raised when API quota is exceeded."""
    pass


class BaseScraper(ABC):
    """Abstract base class for all job scrapers."""
    
    def __init__(
        self,
        tier: ScraperTier,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        timeout: float = 30.0
    ):
        self.tier = tier
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.timeout = timeout
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    
    @abstractmethod
    async def scrape(
        self,
        query: str,
        location: Optional[str] = None,
        max_results: int = 50
    ) -> List[RawJobListing]:
        """
        Scrape job listings.
        
        Args:
            query: Job search query (e.g., "ML Engineer")
            location: Location filter (e.g., "UK", "Remote")
            max_results: Maximum number of results to return
            
        Returns:
            List of RawJobListing objects
        """
        ...
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if this scraper is available (has credentials, quota, etc)."""
        ...
    
    async def _retry_with_backoff(
        self,
        operation,
        *args,
        **kwargs
    ) -> Any:
        """
        Execute an operation with exponential backoff retry.
        
        Args:
            operation: Async function to execute
            *args, **kwargs: Arguments to pass to operation
            
        Returns:
            Result of operation
            
        Raises:
            RetryExhaustedError: If all retries fail
            QuotaExceededError: If quota is exceeded (no retry)
        """
        last_exception = None
        
        for attempt in range(self.max_retries):
            try:
                return await operation(*args, **kwargs)
            except QuotaExceededError:
                raise  # Don't retry quota errors
            except Exception as e:
                last_exception = e
                if attempt < self.max_retries - 1:
                    delay = self.retry_delay * (2 ** attempt)
                    print(f"[Retry] Attempt {attempt + 1}/{self.max_retries} failed: {e}. Retrying in {delay}s...")
                    await asyncio.sleep(delay)
        
        raise RetryExhaustedError(
            f"Operation failed after {self.max_retries} attempts. Last error: {last_exception}"
        )
    
    async def _make_http_request(
        self,
        method: str,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None
    ) -> httpx.Response:
        """Make HTTP request with timeout and headers."""
        default_headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
        }
        if headers:
            default_headers.update(headers)
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.request(
                method=method,
                url=url,
                headers=default_headers,
                params=params,
                json=json_data
            )
            response.raise_for_status()
            return response
    
    async def _get_page_with_playwright(
        self,
        url: str,
        wait_selector: Optional[str] = None,
        wait_timeout: int = 10000
    ) -> str:
        """
        Get page content using Playwright (for JS-rendered pages).
        
        Args:
            url: URL to fetch
            wait_selector: CSS selector to wait for
            wait_timeout: Timeout in milliseconds
            
        Returns:
            Page HTML content
        """
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=self.user_agent,
                viewport={"width": 1920, "height": 1080}
            )
            page = await context.new_page()
            
            try:
                await page.goto(url, wait_until="networkidle")
                
                if wait_selector:
                    await page.wait_for_selector(wait_selector, timeout=wait_timeout)
                
                # Scroll to trigger lazy loading
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(0.5)
                
                content = await page.content()
                return content
            finally:
                await context.close()
                await browser.close()
    
    def _safe_get(self, data: Dict, *keys, default=None) -> Any:
        """Safely get nested dict values."""
        current = data
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return default
        return current
