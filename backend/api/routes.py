"""
CareerRadar - FastAPI Routes
All API route definitions
"""

from typing import List, Optional
from datetime import date, datetime, timedelta

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field, ConfigDict

from api.schemas import (
    RefreshRequest, RefreshResponse, ScoreResponse, JobsResponse,
    SnapshotResponse, TrendsResponse, SkillTrendsResponse, GapResponse,
    HealthResponse, NormalisedJob, SkillTrendData, TrendData
)
from database.queries import get_db_queries
from pipeline.daily_runner import run_daily_pipeline


router = APIRouter()


# ============ Health Routes ============

@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.utcnow()
    )


# ============ Score Routes ============

@router.get("/api/score", response_model=ScoreResponse, tags=["Scores"])
async def get_current_score():
    """Get the current overall and per-role scores."""
    db = get_db_queries()
    
    snapshot = await db.get_latest_snapshot()
    
    if not snapshot:
        raise HTTPException(status_code=404, detail="No score data available. Run pipeline first.")
    
    assessment = snapshot.get("assessment", {})
    
    return ScoreResponse(
        overall_score=snapshot.get("overall_score", 0),
        role_scores=assessment.get("role_scores", {}),
        date=date.fromisoformat(snapshot["date"])
    )


@router.get("/api/score/trends", response_model=TrendsResponse, tags=["Scores"])
async def get_score_trends(
    days: int = Query(default=30, ge=1, le=365, description="Number of days of history")
):
    """Get score trends over time."""
    db = get_db_queries()
    
    snapshots = await db.get_snapshot_history(days=days)
    
    trends = []
    for snap in snapshots:
        assessment = snap.get("assessment", {})
        trends.append(TrendData(
            date=date.fromisoformat(snap["date"]),
            overall_score=snap.get("overall_score", 0),
            role_scores=assessment.get("role_scores", {})
        ))
    
    return TrendsResponse(trends=trends)


# ============ Job Routes ============

@router.get("/api/jobs", response_model=JobsResponse, tags=["Jobs"])
async def get_jobs(
    date_param: Optional[date] = Query(default=None, alias="date", description="Filter by date (default: today)"),
    limit: int = Query(default=100, ge=1, le=500, description="Maximum jobs to return")
):
    """Get job listings for a specific date."""
    db = get_db_queries()
    
    target_date = date_param or date.today()
    
    jobs_data = await db.get_jobs_by_date(target_date, limit=limit)
    
    jobs = [NormalisedJob.model_validate(job) for job in jobs_data]
    
    return JobsResponse(
        jobs=jobs,
        total=len(jobs),
        date=target_date
    )


@router.get("/api/jobs/latest", response_model=JobsResponse, tags=["Jobs"])
async def get_latest_jobs(
    limit: int = Query(default=100, ge=1, le=500, description="Maximum jobs to return")
):
    """Get the most recently scraped job listings."""
    db = get_db_queries()
    
    jobs_data = await db.get_latest_jobs(limit=limit)
    
    jobs = [NormalisedJob.model_validate(job) for job in jobs_data]
    
    return JobsResponse(
        jobs=jobs,
        total=len(jobs),
        date=date.today()
    )


# ============ Snapshot Routes ============

@router.get("/api/snapshot/latest", response_model=SnapshotResponse, tags=["Snapshots"])
async def get_latest_snapshot():
    """Get the most recent daily snapshot."""
    db = get_db_queries()
    
    snapshot = await db.get_latest_snapshot()
    
    if not snapshot:
        raise HTTPException(status_code=404, detail="No snapshots available.")
    
    from api.schemas import GitHubSummary, AssessmentResult
    
    return SnapshotResponse(
        id=snapshot["id"],
        date=date.fromisoformat(snapshot["date"]),
        github_data=GitHubSummary.model_validate(snapshot["github_data"]),
        assessment=AssessmentResult.model_validate(snapshot["assessment"]),
        overall_score=snapshot.get("overall_score", 0),
        created_at=datetime.fromisoformat(snapshot["created_at"].replace("Z", "+00:00"))
            if isinstance(snapshot["created_at"], str) else snapshot["created_at"]
    )


@router.get("/api/snapshot/{snapshot_date}", response_model=SnapshotResponse, tags=["Snapshots"])
async def get_snapshot_by_date(snapshot_date: date):
    """Get snapshot for a specific date."""
    db = get_db_queries()
    
    snapshot = await db.get_snapshot_by_date(snapshot_date)
    
    if not snapshot:
        raise HTTPException(status_code=404, detail=f"No snapshot found for {snapshot_date}")
    
    from api.schemas import GitHubSummary, AssessmentResult
    
    return SnapshotResponse(
        id=snapshot["id"],
        date=date.fromisoformat(snapshot["date"]),
        github_data=GitHubSummary.model_validate(snapshot["github_data"]),
        assessment=AssessmentResult.model_validate(snapshot["assessment"]),
        overall_score=snapshot.get("overall_score", 0),
        created_at=datetime.fromisoformat(snapshot["created_at"].replace("Z", "+00:00"))
            if isinstance(snapshot["created_at"], str) else snapshot["created_at"]
    )


@router.get("/api/snapshot", response_model=List[SnapshotResponse], tags=["Snapshots"])
async def get_snapshot_history(
    days: int = Query(default=30, ge=1, le=365, description="Number of days of history")
):
    """Get snapshot history."""
    db = get_db_queries()
    
    snapshots_data = await db.get_snapshot_history(days=days)
    
    from api.schemas import GitHubSummary, AssessmentResult
    
    snapshots = []
    for snap in snapshots_data:
        snapshots.append(SnapshotResponse(
            id=snap["id"],
            date=date.fromisoformat(snap["date"]),
            github_data=GitHubSummary.model_validate(snap["github_data"]),
            assessment=AssessmentResult.model_validate(snap["assessment"]),
            overall_score=snap.get("overall_score", 0),
            created_at=datetime.fromisoformat(snap["created_at"].replace("Z", "+00:00"))
                if isinstance(snap["created_at"], str) else snap["created_at"]
        ))
    
    return snapshots


# ============ Skill Gap Routes ============

@router.get("/api/gaps", response_model=GapResponse, tags=["Gaps"])
async def get_skill_gaps():
    """Get current skill gaps from latest assessment."""
    db = get_db_queries()
    
    snapshot = await db.get_latest_snapshot()
    
    if not snapshot:
        raise HTTPException(status_code=404, detail="No assessment data available.")
    
    assessment = snapshot.get("assessment", {})
    
    from api.schemas import SkillGap
    
    gaps = [
        SkillGap.model_validate(gap)
        for gap in assessment.get("skill_gaps", [])
    ]
    
    return GapResponse(
        gaps=gaps,
        date=date.fromisoformat(snapshot["date"])
    )


# ============ Skill Trends Routes ============

@router.get("/api/skills/trends", response_model=SkillTrendsResponse, tags=["Skills"])
async def get_skill_trends(
    days: int = Query(default=7, ge=1, le=30, description="Number of days of trend data")
):
    """Get trending skills over time."""
    db = get_db_queries()
    
    trends_data = await db.get_skill_trends(days=days)
    
    trends = [
        SkillTrendData(
            skill=t["skill"],
            frequency=t["frequency"],
            date=date.fromisoformat(t["date"])
        )
        for t in trends_data
    ]
    
    # Get top trending for today
    today_trends = [t for t in trends if t.date == date.today()]
    top_trending = sorted(today_trends, key=lambda x: x.frequency, reverse=True)[:10]
    
    return SkillTrendsResponse(
        trends=trends,
        top_trending=[t.skill for t in top_trending]
    )


# ============ Refresh/Trigger Routes ============

@router.post("/api/score/refresh", response_model=RefreshResponse, tags=["Refresh"])
async def trigger_refresh(
    background_tasks: BackgroundTasks,
    request: RefreshRequest = RefreshRequest()
):
    """
    Manually trigger a pipeline refresh.
    
    This starts the daily pipeline in the background.
    """
    # Check if already ran today
    if not request.force:
        db = get_db_queries()
        exists = await db.check_snapshot_exists(date.today())
        if exists:
            return RefreshResponse(
                success=True,
                message="Snapshot already exists for today. Use force=true to override.",
                snapshot_id=None
            )
    
    # Run pipeline in background
    background_tasks.add_task(run_daily_pipeline, force=request.force)
    
    return RefreshResponse(
        success=True,
        message="Pipeline refresh triggered. Check back in a few minutes.",
        snapshot_id=None
    )


@router.post("/api/trigger/daily", response_model=RefreshResponse, tags=["Refresh"])
async def trigger_daily_pipeline(
    background_tasks: BackgroundTasks,
    force: bool = Query(default=False, description="Force run even if already completed today")
):
    """
    Trigger the daily pipeline (alias for /api/score/refresh).
    
    This is the endpoint called by the scheduler.
    """
    return await trigger_refresh(background_tasks, RefreshRequest(force=force))


# ============ Debug/Status Routes ============

class PipelineStatus(BaseModel):
    """Pipeline status response."""
    model_config = ConfigDict(populate_by_name=True)
    
    today_ran: bool
    latest_snapshot_date: Optional[date] = None
    total_snapshots: int
    jobs_today: int


@router.get("/api/status", response_model=PipelineStatus, tags=["Status"])
async def get_pipeline_status():
    """Get current pipeline status."""
    db = get_db_queries()
    
    # Check if ran today
    today_ran = await db.check_snapshot_exists(date.today())
    
    # Get latest snapshot
    latest = await db.get_latest_snapshot()
    latest_date = date.fromisoformat(latest["date"]) if latest else None
    
    # Count snapshots (approximate via history)
    snapshots = await db.get_snapshot_history(days=365)
    
    # Count jobs today
    jobs_today = len(await db.get_jobs_by_date(date.today()))
    
    return PipelineStatus(
        today_ran=today_ran,
        latest_snapshot_date=latest_date,
        total_snapshots=len(snapshots),
        jobs_today=jobs_today
    )


# ============ Settings Routes ============

from api.settings import UserSettings, get_settings_manager

@router.get("/api/settings", response_model=UserSettings, tags=["Settings"])
async def get_user_settings():
    """Get user settings from Supabase or env fallback."""
    manager = get_settings_manager()
    return await manager.get_settings()

@router.post("/api/settings", response_model=UserSettings, tags=["Settings"])
async def update_user_settings(settings: UserSettings):
    """Update user settings in Supabase."""
    manager = get_settings_manager()
    return await manager.update_settings(settings)
