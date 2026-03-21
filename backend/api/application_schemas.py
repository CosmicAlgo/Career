"""
Application Tracker API Schemas
Pydantic models for job application tracking
"""

from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class JobApplication(BaseModel):
    """Job application model."""
    id: Optional[str] = None
    user_id: Optional[str] = None
    job_title: str
    company: str
    source_url: Optional[str] = None
    source: str = "manual"  # manual, linkedin, indeed, etc.
    status: str = "interested"  # interested, applied, phone_screen, technical, final, offer, rejected
    date_applied: Optional[date] = None
    notes: Optional[str] = None
    salary_range: Optional[str] = None
    location: Optional[str] = None
    follow_up_date: Optional[date] = None
    response_date: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            date: lambda v: v.isoformat() if v else None,
            datetime: lambda v: v.isoformat() if v else None
        }


class CreateApplicationRequest(BaseModel):
    """Request to create a new job application."""
    job_title: str
    company: str
    source_url: Optional[str] = None
    source: str = "manual"
    status: str = "interested"
    notes: Optional[str] = None
    salary_range: Optional[str] = None
    location: Optional[str] = None


class UpdateApplicationRequest(BaseModel):
    """Request to update a job application."""
    status: Optional[str] = None
    notes: Optional[str] = None
    response_date: Optional[date] = None


class ApplicationResponse(BaseModel):
    """Response containing application data."""
    application: JobApplication
    success: bool
    message: str


class ApplicationsResponse(BaseModel):
    """Response containing multiple applications."""
    applications: List[JobApplication]
    total: int
    success: bool


class ApplicationStats(BaseModel):
    """Application statistics."""
    total_applications: int
    by_status: Dict[str, int]
    by_source: Dict[str, int]
    response_rate: float
    interview_rate: float
    offer_rate: float
    avg_response_days: float


class ApplicationStatsResponse(BaseModel):
    """Response containing application statistics."""
    stats: ApplicationStats
    success: bool
    days_analyzed: int


class FollowUpResponse(BaseModel):
    """Response for follow-up reminders."""
    follow_ups: List[JobApplication]
    total: int
    success: bool
    message: str
