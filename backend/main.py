"""
CareerRadar - FastAPI Main Application
Entry point with APScheduler for daily pipeline
"""

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from config.settings import settings
from api.routes import router
from database.supabase_client import supabase_manager
from pipeline.daily_runner import run_daily_pipeline
from utils.logging_config import configure_logging

# Configure logging
configure_logging(level=settings.log_level if hasattr(settings, 'log_level') else "INFO")
import logging
logger = logging.getLogger(__name__)


# Initialize Sentry if DSN is configured
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.1,
        environment=settings.environment,
    )
    print(f"Sentry initialized for {settings.environment} environment")


# Global scheduler instance
scheduler: AsyncIOScheduler = AsyncIOScheduler()


async def scheduled_daily_pipeline():
    """Task run by the scheduler each day."""
    print(f"[{datetime.utcnow().isoformat()}] Running scheduled daily pipeline...")
    try:
        result = await run_daily_pipeline(force=False)
        print(f"[{datetime.utcnow().isoformat()}] Pipeline completed: {result['message']}")
    except Exception as e:
        print(f"[{datetime.utcnow().isoformat()}] Pipeline failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - handles startup and shutdown."""
    # Startup
    print("Starting up CareerRadar backend...")
    
    # Initialize Supabase connection
    try:
        supabase_manager.initialize()
        healthy = await supabase_manager.health_check()
        if healthy:
            print("Supabase connection: OK")
        else:
            print("Warning: Supabase health check failed")
    except Exception as e:
        print(f"Warning: Could not connect to Supabase: {e}")
    
    # Start scheduler
    scheduler.add_job(
        scheduled_daily_pipeline,
        CronTrigger(hour=6, minute=0),  # 06:00 UTC daily
        id="daily_pipeline",
        name="Daily Pipeline Runner",
        replace_existing=True
    )
    scheduler.start()
    print(f"Scheduler started. Next run: {scheduler.get_job('daily_pipeline').next_run_time}")
    
    yield
    
    # Shutdown
    print("Shutting down CareerRadar backend...")
    scheduler.shutdown()


# Create FastAPI application
app = FastAPI(
    title="CareerRadar API",
    description="Personal Career Intelligence Dashboard - Backend API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router, prefix="")


@app.get("/")
async def root():
    """Root endpoint - API info."""
    return {
        "name": "CareerRadar API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
