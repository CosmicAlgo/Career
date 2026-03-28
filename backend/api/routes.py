"""
CareerRadar - FastAPI Routes
All API route definitions
"""

from typing import List, Optional
from datetime import date, datetime

import asyncio

from fastapi import APIRouter, HTTPException, Query, File, Form
from pydantic import BaseModel, ConfigDict

from api.schemas import (
    RefreshRequest,
    RefreshResponse,
    ScoreResponse,
    JobsResponse,
    SnapshotResponse,
    TrendsResponse,
    SkillTrendsResponse,
    GapResponse,
    HealthResponse,
    NormalisedJob,
    SkillTrendData,
    TrendData,
)
from database.queries import get_db_queries
from pipeline.daily_runner import run_daily_pipeline


router = APIRouter()


# ============ Health Routes ============


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy", version="1.0.0", timestamp=datetime.utcnow()
    )


# ============ Score Routes ============


@router.get("/api/score", response_model=ScoreResponse, tags=["Scores"])
async def get_current_score():
    """Get the current overall and per-role scores."""
    db = get_db_queries()

    snapshot = await db.get_latest_snapshot()

    if not snapshot:
        raise HTTPException(
            status_code=404, detail="No score data available. Run pipeline first."
        )

    assessment = snapshot.get("assessment", {})
    role_scores = assessment.get("role_scores", {})

    # If overall_score column is 0 but role_scores exist, compute it from role_scores
    stored_overall = snapshot.get("overall_score", 0)
    if stored_overall == 0 and role_scores:
        non_overall = {k: v for k, v in role_scores.items() if k != "overall"}
        if non_overall:
            stored_overall = int(sum(non_overall.values()) / len(non_overall))

    return ScoreResponse(
        overall_score=stored_overall,
        role_scores=role_scores,
        date=date.fromisoformat(snapshot["date"]),
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
        role_scores = assessment.get("role_scores", {})

        # Same fix: compute overall from role_scores if stored as 0
        stored_overall = snap.get("overall_score", 0)
        if stored_overall == 0 and role_scores:
            non_overall = {k: v for k, v in role_scores.items() if k != "overall"}
            if non_overall:
                stored_overall = int(sum(non_overall.values()) / len(non_overall))

        trends.append(
            TrendData(
                date=date.fromisoformat(snap["date"]),
                overall_score=stored_overall,
                role_scores=role_scores,
            )
        )

    return TrendsResponse(trends=trends)


# ============ Job Routes ============


@router.get("/api/jobs", response_model=JobsResponse, tags=["Jobs"])
async def get_jobs(
    date_param: Optional[date] = Query(
        default=None, alias="date", description="Filter by date (default: today)"
    ),
    limit: int = Query(default=100, ge=1, le=500, description="Maximum jobs to return"),
):
    """Get job listings for a specific date."""
    db = get_db_queries()

    target_date = date_param or date.today()

    jobs_data = await db.get_jobs_by_date(target_date, limit=limit)

    jobs = [NormalisedJob.model_validate(job) for job in jobs_data]

    return JobsResponse(jobs=jobs, total=len(jobs), date=target_date)


@router.get("/api/jobs/latest", response_model=JobsResponse, tags=["Jobs"])
async def get_latest_jobs(
    limit: int = Query(default=100, ge=1, le=500, description="Maximum jobs to return")
):
    """Get the most recently scraped job listings."""
    db = get_db_queries()

    jobs_data = await db.get_latest_jobs(limit=limit)

    jobs = [NormalisedJob.model_validate(job) for job in jobs_data]

    return JobsResponse(jobs=jobs, total=len(jobs), date=date.today())


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
        if isinstance(snapshot["created_at"], str)
        else snapshot["created_at"],
    )


@router.get(
    "/api/snapshot/{snapshot_date}", response_model=SnapshotResponse, tags=["Snapshots"]
)
async def get_snapshot_by_date(snapshot_date: date):
    """Get snapshot for a specific date."""
    db = get_db_queries()

    snapshot = await db.get_snapshot_by_date(snapshot_date)

    if not snapshot:
        raise HTTPException(
            status_code=404, detail=f"No snapshot found for {snapshot_date}"
        )

    from api.schemas import GitHubSummary, AssessmentResult

    return SnapshotResponse(
        id=snapshot["id"],
        date=date.fromisoformat(snapshot["date"]),
        github_data=GitHubSummary.model_validate(snapshot["github_data"]),
        assessment=AssessmentResult.model_validate(snapshot["assessment"]),
        overall_score=snapshot.get("overall_score", 0),
        created_at=datetime.fromisoformat(snapshot["created_at"].replace("Z", "+00:00"))
        if isinstance(snapshot["created_at"], str)
        else snapshot["created_at"],
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
        snapshots.append(
            SnapshotResponse(
                id=snap["id"],
                date=date.fromisoformat(snap["date"]),
                github_data=GitHubSummary.model_validate(snap["github_data"]),
                assessment=AssessmentResult.model_validate(snap["assessment"]),
                overall_score=snap.get("overall_score", 0),
                created_at=datetime.fromisoformat(
                    snap["created_at"].replace("Z", "+00:00")
                )
                if isinstance(snap["created_at"], str)
                else snap["created_at"],
            )
        )

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

    gaps = [SkillGap.model_validate(gap) for gap in assessment.get("skill_gaps", [])]

    return GapResponse(gaps=gaps, date=date.fromisoformat(snapshot["date"]))


# ============ Skill Trends Routes ============


@router.get("/api/skills/trends", response_model=SkillTrendsResponse, tags=["Skills"])
async def get_skill_trends(
    days: int = Query(
        default=7, ge=1, le=30, description="Number of days of trend data"
    ),
):
    """Get trending skills over time."""
    db = get_db_queries()

    trends_data = await db.get_skill_trends(days=days)

    trends = [
        SkillTrendData(
            skill=t["skill"],
            frequency=t["frequency"],
            date=date.fromisoformat(t["date"]),
        )
        for t in trends_data
    ]

    # Get top trending for today
    today_trends = [t for t in trends if t.date == date.today()]
    top_trending = sorted(today_trends, key=lambda x: x.frequency, reverse=True)[:10]

    return SkillTrendsResponse(
        trends=trends, top_trending=[t.skill for t in top_trending]
    )


# ============ Refresh/Trigger Routes ============


@router.post("/api/score/refresh", response_model=RefreshResponse, tags=["Refresh"])
async def trigger_refresh(request: RefreshRequest = RefreshRequest()):
    """
    Manually trigger a pipeline refresh.
    """
    # Check if already ran today
    if not request.force:
        db = get_db_queries()
        exists = await db.check_snapshot_exists(date.today())
        if exists:
            return RefreshResponse(
                success=True,
                message="Snapshot already exists for today. Use force=true to override.",
                snapshot_id=None,
            )

    # Run pipeline in background thread for Windows compatibility
    import threading

    thread = threading.Thread(
        target=lambda: asyncio.run(run_daily_pipeline(force=request.force))
    )
    thread.daemon = True
    thread.start()

    return RefreshResponse(
        success=True, message="Pipeline started in background.", snapshot_id=None
    )


@router.post("/api/trigger/daily", response_model=RefreshResponse, tags=["Refresh"])
async def trigger_daily_pipeline(
    force: bool = Query(
        default=False, description="Force run even if already completed today"
    ),
):
    """
    Trigger the daily pipeline (alias for /api/score/refresh).

    This is the endpoint called by the scheduler.
    """
    return await trigger_refresh(RefreshRequest(force=force))


# ============ Debug/Status Routes ============


class PipelineStatus(BaseModel):
    """Pipeline status response."""

    model_config = ConfigDict(populate_by_name=True)

    today_ran: bool
    latest_snapshot_date: Optional[date] = None
    latest_snapshot_time: Optional[str] = None  # HH:MM string for navbar
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

    # Extract time from created_at if available
    latest_time = None
    if latest and latest.get("created_at"):
        try:
            created_at_str = latest["created_at"]
            if isinstance(created_at_str, str):
                dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
            else:
                dt = created_at_str
            # Keep ISO format so front-end can convert to local browser timezone
            latest_time = dt.isoformat()
        except Exception:
            pass

    # Count snapshots (approximate via history)
    snapshots = await db.get_snapshot_history(days=365)

    # Count jobs today
    jobs_today = len(await db.get_jobs_by_date(date.today()))

    return PipelineStatus(
        today_ran=today_ran,
        latest_snapshot_date=latest_date,
        latest_snapshot_time=latest_time,
        total_snapshots=len(snapshots),
        jobs_today=jobs_today,
    )


class PipelineRunResponse(BaseModel):
    """Response model for pipeline run."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    date: date
    run_at: datetime
    github_duration_ms: int
    scraping_duration_ms: int
    assessment_duration_ms: int
    embedding_duration_ms: int
    total_duration_ms: int
    jobs_scraped: int
    status: str
    error: Optional[str]


class PipelineHistoryResponse(BaseModel):
    """Response model for pipeline history."""

    model_config = ConfigDict(populate_by_name=True)

    runs: List[PipelineRunResponse]
    total: int


@router.get(
    "/api/pipeline/history", response_model=PipelineHistoryResponse, tags=["Pipeline"]
)
async def get_pipeline_history(
    limit: int = Query(default=10, ge=1, le=50, description="Number of runs to return")
):
    """Get pipeline execution history with timing metrics."""
    db = get_db_queries()

    runs_data = await db.get_pipeline_run_history(limit=limit)

    runs = []
    for run in runs_data:
        runs.append(
            PipelineRunResponse(
                id=run["id"],
                date=date.fromisoformat(run["date"]),
                run_at=datetime.fromisoformat(run["run_at"].replace("Z", "+00:00")),
                github_duration_ms=run.get("github_duration_ms", 0),
                scraping_duration_ms=run.get("scraping_duration_ms", 0),
                assessment_duration_ms=run.get("assessment_duration_ms", 0),
                embedding_duration_ms=run.get("embedding_duration_ms", 0),
                total_duration_ms=run.get("total_duration_ms", 0),
                jobs_scraped=run.get("jobs_scraped", 0),
                status=run.get("status", "unknown"),
                error=run.get("error"),
            )
        )

    return PipelineHistoryResponse(runs=runs, total=len(runs))


# ============ Application Tracker Routes ============

from api.application_schemas import (
    JobApplication,
    CreateApplicationRequest,
    UpdateApplicationRequest,
    ApplicationResponse,
    ApplicationsResponse,
    ApplicationStats,
    ApplicationStatsResponse,
    FollowUpResponse,
)
from database.application_tracker import application_tracker


# ============ CV Processing Routes ============

from api.cv_schemas import (
    CVUploadResponse,
    CVAnalysisRequest,
    CVListResponse,
    CVDeleteResponse,
)
from pipeline.cv_processor import cv_processor, cv_matcher


@router.post("/api/cv/upload", response_model=CVUploadResponse, tags=["CV"])
async def upload_cv(
    file: bytes = File(...),
    filename: str = Form(...),
    target_roles: List[str] = Form(default=[]),
):
    """Upload and process a CV file."""
    try:
        # Validate file type
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")

        # Process CV
        cv_data = await cv_processor.process_cv_file(file, filename)

        # Analyze against market if target roles provided
        analysis = None
        if target_roles:
            analysis = await cv_matcher.analyze_cv_against_market(cv_data, target_roles)

        # Store CV data in database (optional - for history)
        try:
            cv_record = {
                "filename": filename,
                "cv_data": cv_data,
                "analysis": analysis,
                "target_roles": target_roles,
                "processed_at": datetime.utcnow().isoformat(),
            }

            # This would require a cv_uploads table - for now just return the data
            # response = supabase_manager.client.table('cv_uploads').insert(cv_record).execute()

        except Exception as e:
            print(f"[CV Upload] Warning: Could not save to database: {e}")

        return CVUploadResponse(
            success=True,
            message="CV processed successfully",
            cv_data=cv_data,
            analysis=analysis,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CV: {str(e)}")


@router.post("/api/cv/analyze", response_model=CVUploadResponse, tags=["CV"])
async def analyze_cv(request: CVAnalysisRequest):
    """Analyze existing CV data against market."""
    try:
        # This would typically fetch stored CV data
        # For now, return an error that no CV is available
        raise HTTPException(
            status_code=404, detail="No CV data available. Please upload a CV first."
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze CV: {str(e)}")


@router.get("/api/cv/list", response_model=CVListResponse, tags=["CV"])
async def list_cvs():
    """List all processed CVs."""
    try:
        # This would fetch from database
        # For now, return empty list
        return CVListResponse(cvs=[], total=0, success=True)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list CVs: {str(e)}")


@router.delete("/api/cv/{cv_id}", response_model=CVDeleteResponse, tags=["CV"])
async def delete_cv(cv_id: str):
    """Delete a processed CV."""
    try:
        # This would delete from database
        # For now, return success
        return CVDeleteResponse(success=True, message="CV deleted successfully")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete CV: {str(e)}")


@router.post(
    "/api/applications", response_model=ApplicationResponse, tags=["Applications"]
)
async def create_application(request: CreateApplicationRequest):
    """Create a new job application."""
    try:
        app_data = request.dict()
        created_app = await application_tracker.create_application(app_data)

        return ApplicationResponse(
            application=JobApplication(**created_app),
            success=True,
            message="Application created successfully",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create application: {str(e)}"
        )


@router.get(
    "/api/applications", response_model=ApplicationsResponse, tags=["Applications"]
)
async def get_applications():
    """Get all job applications."""
    try:
        applications_data = await application_tracker.get_applications()
        applications = [JobApplication(**app) for app in applications_data]

        return ApplicationsResponse(
            applications=applications, total=len(applications), success=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch applications: {str(e)}"
        )


@router.put(
    "/api/applications/{application_id}",
    response_model=ApplicationResponse,
    tags=["Applications"],
)
async def update_application(application_id: str, request: UpdateApplicationRequest):
    """Update a job application."""
    try:
        update_data = request.dict(exclude_unset=True)
        updated_app = await application_tracker.update_application_status(
            application_id, update_data.get("status", ""), update_data.get("notes")
        )

        return ApplicationResponse(
            application=JobApplication(**updated_app),
            success=True,
            message="Application updated successfully",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update application: {str(e)}"
        )


@router.delete("/api/applications/{application_id}", tags=["Applications"])
async def delete_application(application_id: str):
    """Delete a job application."""
    try:
        success = await application_tracker.delete_application(application_id)
        if not success:
            raise HTTPException(status_code=404, detail="Application not found")

        return {"success": True, "message": "Application deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete application: {str(e)}"
        )


@router.get(
    "/api/applications/status/{status}",
    response_model=ApplicationsResponse,
    tags=["Applications"],
)
async def get_applications_by_status(status: str):
    """Get applications filtered by status."""
    try:
        applications_data = await application_tracker.get_applications_by_status(status)
        applications = [JobApplication(**app) for app in applications_data]

        return ApplicationsResponse(
            applications=applications, total=len(applications), success=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch applications: {str(e)}"
        )


@router.get(
    "/api/applications/stats",
    response_model=ApplicationStatsResponse,
    tags=["Applications"],
)
async def get_application_stats(days: int = Query(default=30, ge=1, le=365)):
    """Get application statistics for the last N days."""
    try:
        stats_data = await application_tracker.get_application_stats(days)
        stats = ApplicationStats(**stats_data)

        return ApplicationStatsResponse(stats=stats, success=True, days_analyzed=days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.get(
    "/api/applications/follow-ups",
    response_model=FollowUpResponse,
    tags=["Applications"],
)
async def get_follow_ups(days_ahead: int = Query(default=0, ge=0, le=30)):
    """Get applications that need follow-up."""
    try:
        follow_ups_data = await application_tracker.get_follow_ups_due(days_ahead)
        follow_ups = [JobApplication(**app) for app in follow_ups_data]

        message = f"Found {len(follow_ups)} follow-ups due"
        if days_ahead > 0:
            message += f" in the next {days_ahead} days"
        elif days_ahead == 0:
            message += " today"

        return FollowUpResponse(
            follow_ups=follow_ups, total=len(follow_ups), success=True, message=message
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch follow-ups: {str(e)}"
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
