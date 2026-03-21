"""
CareerRadar - Logging Configuration
Standardized logging across the backend
"""

import logging
import sys
from typing import Optional


def configure_logging(
    level: int = logging.INFO,
    format_string: Optional[str] = None,
    enable_console: bool = True
) -> logging.Logger:
    """
    Configure standardized logging for CareerRadar.
    
    Args:
        level: Logging level (default: INFO)
        format_string: Custom format string (optional)
        enable_console: Whether to enable console output
        
    Returns:
        Root logger instance
    """
    if format_string is None:
        format_string = (
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
        )
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # Remove existing handlers to avoid duplicates
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Console handler
    if enable_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        console_handler.setFormatter(logging.Formatter(format_string))
        root_logger.addHandler(console_handler)
    
    # Configure specific module loggers
    loggers = [
        "pipeline.daily_runner",
        "assessment.gemini_client",
        "assessment.skill_embedder",
        "assessment.similarity_scorer",
        "scrapers.tier1_jsearch",
        "scrapers.remotive_scraper",
        "scrapers.wellfound_scraper",
        "scrapers.otta_scraper",
        "scrapers.workinstartups_scraper",
        "database.queries",
        "api.routes",
        "ingestion.github_client",
        "monitoring.metrics_collector"
    ]
    
    for logger_name in loggers:
        logger = logging.getLogger(logger_name)
        logger.setLevel(level)
    
    return root_logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger with the specified name.
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        Logger instance
    """
    return logging.getLogger(name)
