"""
CV Processing API Schemas
Pydantic models for CV upload and analysis
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CVUploadResponse(BaseModel):
    """Response after CV upload and processing."""
    success: bool
    message: str
    cv_data: Optional[Dict[str, Any]] = None
    analysis: Optional[Dict[str, Any]] = None


class CVAnalysis(BaseModel):
    """CV analysis results."""
    cv_score: Dict[str, Any]
    skill_analysis: Dict[str, Any]
    github_comparison: Dict[str, Any]
    role_scores: Dict[str, float]
    market_match: Dict[str, Any]
    suggestions: List[str]
    analyzed_at: str


class CVAnalysisRequest(BaseModel):
    """Request for CV analysis."""
    target_roles: List[str] = []


class CVListResponse(BaseModel):
    """Response listing processed CVs."""
    cvs: List[Dict[str, Any]]
    total: int
    success: bool


class CVDeleteResponse(BaseModel):
    """Response after CV deletion."""
    success: bool
    message: str
