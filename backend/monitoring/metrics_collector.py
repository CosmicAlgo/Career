"""
CareerRadar - Metrics Collector
Self-monitoring observability for the pipeline and scrapers
"""

import logging
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)


@dataclass
class PipelineMetrics:
    """Metrics for a complete pipeline run."""
    run_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    github_duration_ms: int = 0
    scraping_duration_ms: int = 0
    embedding_duration_ms: int = 0
    assessment_duration_ms: int = 0
    persistence_duration_ms: int = 0
    total_duration_ms: int = 0
    jobs_scraped: int = 0
    jobs_by_source: Dict[str, int] = None
    errors: List[str] = None
    status: str = "running"  # running, success, failed, partial
    
    def __post_init__(self):
        if self.jobs_by_source is None:
            self.jobs_by_source = {}
        if self.errors is None:
            self.errors = []


@dataclass
class ScraperMetric:
    """Metrics for a single scraper run."""
    name: str
    duration_ms: int
    jobs_returned: int
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class MetricsCollector:
    """Collect and store metrics for monitoring and observability."""
    
    def __init__(self):
        self.current_run: Optional[PipelineMetrics] = None
        self.scraper_metrics: List[ScraperMetric] = []
        self._lock = asyncio.Lock()
    
    async def start_pipeline_run(self) -> str:
        """Start tracking a new pipeline run."""
        run_id = f"run_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        async with self._lock:
            self.current_run = PipelineMetrics(
                run_id=run_id,
                start_time=datetime.utcnow()
            )
            self.scraper_metrics = []
        
        logger.info(f"[Metrics] Started pipeline run: {run_id}")
        return run_id
    
    async def record_github_duration(self, duration_ms: int):
        """Record GitHub ingestion duration."""
        if self.current_run:
            self.current_run.github_duration_ms = duration_ms
            logger.debug(f"[Metrics] GitHub duration: {duration_ms}ms")
    
    async def record_scraping_duration(self, duration_ms: int, jobs_by_source: Dict[str, int]):
        """Record job scraping duration and results."""
        if self.current_run:
            self.current_run.scraping_duration_ms = duration_ms
            self.current_run.jobs_by_source = jobs_by_source
            self.current_run.jobs_scraped = sum(jobs_by_source.values())
            logger.info(f"[Metrics] Scraping: {duration_ms}ms, {self.current_run.jobs_scraped} jobs")
    
    async def record_scraper_metrics(self, name: str, duration_ms: int, jobs_returned: int, error: Optional[str] = None):
        """Record metrics for a single scraper."""
        metric = ScraperMetric(
            name=name,
            duration_ms=duration_ms,
            jobs_returned=jobs_returned,
            error=error,
            started_at=datetime.utcnow(),
            completed_at=datetime.utcnow()
        )
        
        async with self._lock:
            self.scraper_metrics.append(metric)
        
        if error:
            logger.warning(f"[Metrics] Scraper {name}: {duration_ms}ms, {jobs_returned} jobs, ERROR: {error}")
        else:
            logger.info(f"[Metrics] Scraper {name}: {duration_ms}ms, {jobs_returned} jobs")
    
    async def record_embedding_duration(self, duration_ms: int):
        """Record ML embedding computation duration."""
        if self.current_run:
            self.current_run.embedding_duration_ms = duration_ms
            logger.debug(f"[Metrics] Embedding duration: {duration_ms}ms")
    
    async def record_assessment_duration(self, duration_ms: int):
        """Record AI assessment duration."""
        if self.current_run:
            self.current_run.assessment_duration_ms = duration_ms
            logger.debug(f"[Metrics] Assessment duration: {duration_ms}ms")
    
    async def record_persistence_duration(self, duration_ms: int):
        """Record database persistence duration."""
        if self.current_run:
            self.current_run.persistence_duration_ms = duration_ms
            logger.debug(f"[Metrics] Persistence duration: {duration_ms}ms")
    
    async def record_error(self, error: str, context: str = ""):
        """Record an error during pipeline execution."""
        if self.current_run:
            error_msg = f"{context}: {error}" if context else error
            self.current_run.errors.append(error_msg)
            logger.error(f"[Metrics] Error recorded: {error_msg}")
    
    async def finish_pipeline_run(self, status: str = "success"):
        """Finish the current pipeline run and return metrics."""
        if not self.current_run:
            return None
        
        async with self._lock:
            self.current_run.end_time = datetime.utcnow()
            self.current_run.status = status
            
            # Calculate total duration
            duration = self.current_run.end_time - self.current_run.start_time
            self.current_run.total_duration_ms = int(duration.total_seconds() * 1000)
        
        logger.info(f"[Metrics] Pipeline run finished: {status}, total: {self.current_run.total_duration_ms}ms")
        
        return self.current_run
    
    def get_current_metrics(self) -> Optional[PipelineMetrics]:
        """Get metrics for the current run."""
        return self.current_run
    
    def get_scraper_metrics(self) -> List[ScraperMetric]:
        """Get all scraper metrics for current run."""
        return self.scraper_metrics.copy()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert current metrics to dictionary for API response."""
        if not self.current_run:
            return {}
        
        run = self.current_run
        return {
            "run_id": run.run_id,
            "start_time": run.start_time.isoformat() if run.start_time else None,
            "end_time": run.end_time.isoformat() if run.end_time else None,
            "durations": {
                "github_ms": run.github_duration_ms,
                "scraping_ms": run.scraping_duration_ms,
                "embedding_ms": run.embedding_duration_ms,
                "assessment_ms": run.assessment_duration_ms,
                "persistence_ms": run.persistence_duration_ms,
                "total_ms": run.total_duration_ms
            },
            "jobs": {
                "total": run.jobs_scraped,
                "by_source": run.jobs_by_source
            },
            "scrapers": [
                {
                    "name": s.name,
                    "duration_ms": s.duration_ms,
                    "jobs": s.jobs_returned,
                    "error": s.error
                }
                for s in self.scraper_metrics
            ],
            "errors": run.errors,
            "status": run.status
        }


# Global collector instance
_collector: Optional[MetricsCollector] = None


def get_metrics_collector() -> MetricsCollector:
    """Get global metrics collector instance."""
    global _collector
    if _collector is None:
        _collector = MetricsCollector()
    return _collector
