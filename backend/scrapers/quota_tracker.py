"""
CareerRadar - Quota Tracker
Tracks API usage and triggers tier fallback
"""

import json
from typing import Dict, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime, date
from pathlib import Path
from enum import Enum


class QuotaStatus(Enum):
    """Quota status levels."""
    HEALTHY = "healthy"
    WARNING = "warning"  # Approaching limit
    EXHAUSTED = "exhausted"


@dataclass
class QuotaInfo:
    """Quota information for an API."""
    name: str
    used: int
    limit: int
    reset_date: date
    last_updated: datetime
    
    @property
    def remaining(self) -> int:
        """Calculate remaining quota."""
        return max(0, self.limit - self.used)
    
    @property
    def percentage_used(self) -> float:
        """Calculate percentage used."""
        if self.limit == 0:
            return 100.0
        return (self.used / self.limit) * 100
    
    @property
    def status(self) -> QuotaStatus:
        """Get quota status."""
        pct = self.percentage_used
        if pct >= 100:
            return QuotaStatus.EXHAUSTED
        elif pct >= 80:
            return QuotaStatus.WARNING
        return QuotaStatus.HEALTHY


class QuotaTracker:
    """Tracks API quota usage across all scraper tiers."""
    
    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = storage_path or ".quota_cache.json"
        self._quotas: Dict[str, QuotaInfo] = {}
        self._load()
    
    def _load(self) -> None:
        """Load quota data from storage."""
        path = Path(self.storage_path)
        if path.exists():
            try:
                with open(path, "r") as f:
                    data = json.load(f)
                
                for name, quota_data in data.items():
                    self._quotas[name] = QuotaInfo(
                        name=quota_data["name"],
                        used=quota_data["used"],
                        limit=quota_data["limit"],
                        reset_date=date.fromisoformat(quota_data["reset_date"]),
                        last_updated=datetime.fromisoformat(quota_data["last_updated"])
                    )
            except Exception as e:
                print(f"[QuotaTracker] Failed to load quotas: {e}")
    
    def _save(self) -> None:
        """Save quota data to storage."""
        try:
            data = {
                name: {
                    **asdict(quota),
                    "reset_date": quota.reset_date.isoformat(),
                    "last_updated": quota.last_updated.isoformat()
                }
                for name, quota in self._quotas.items()
            }
            
            with open(self.storage_path, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"[QuotaTracker] Failed to save quotas: {e}")
    
    def register_quota(
        self,
        name: str,
        limit: int,
        reset_date: Optional[date] = None
    ) -> None:
        """Register a new quota to track."""
        if name not in self._quotas:
            self._quotas[name] = QuotaInfo(
                name=name,
                used=0,
                limit=limit,
                reset_date=reset_date or date.today(),
                last_updated=datetime.utcnow()
            )
            self._save()
    
    def record_usage(self, name: str, count: int = 1) -> None:
        """Record API usage."""
        if name in self._quotas:
            quota = self._quotas[name]
            
            # Check if quota should reset
            today = date.today()
            if today > quota.reset_date:
                quota.used = 0
                quota.reset_date = today
            
            quota.used += count
            quota.last_updated = datetime.utcnow()
            self._save()
    
    def get_quota(self, name: str) -> Optional[QuotaInfo]:
        """Get quota info for an API."""
        return self._quotas.get(name)
    
    def get_status(self, name: str) -> QuotaStatus:
        """Get status for a specific quota."""
        quota = self._quotas.get(name)
        if quota:
            return quota.status
        return QuotaStatus.HEALTHY  # Default if not tracked
    
    def should_use_tier(self, tier_name: str, warning_threshold: float = 80.0) -> bool:
        """
        Check if a tier should be used based on quota.
        
        Returns True if quota is healthy, False if exhausted or at warning threshold.
        """
        quota = self._quotas.get(tier_name)
        if not quota:
            return True  # Not tracked, assume available
        
        if quota.status == QuotaStatus.EXHAUSTED:
            return False
        
        if quota.percentage_used >= warning_threshold:
            return False
        
        return True
    
    def get_recommended_tier(self) -> str:
        """
        Get the recommended tier based on quota status.
        
        Returns: "tier1", "tier2", or "tier3"
        """
        # Check Tier 1 (JSearch)
        if self.should_use_tier("jsearch_rapidapi", warning_threshold=90.0):
            return "tier1"
        
        # Check Tier 2 (Apify)
        if self.should_use_tier("apify", warning_threshold=90.0):
            return "tier2"
        
        # Fall back to Tier 3 (Direct scraping)
        return "tier3"
    
    def get_all_quotas(self) -> Dict[str, QuotaInfo]:
        """Get all quota information."""
        return dict(self._quotas)
    
    def reset_quota(self, name: str) -> None:
        """Manually reset a quota."""
        if name in self._quotas:
            self._quotas[name].used = 0
            self._quotas[name].reset_date = date.today()
            self._quotas[name].last_updated = datetime.utcnow()
            self._save()


# Global quota tracker instance
_quota_tracker: Optional[QuotaTracker] = None


def get_quota_tracker() -> QuotaTracker:
    """Get global quota tracker instance."""
    global _quota_tracker
    if _quota_tracker is None:
        _quota_tracker = QuotaTracker()
    return _quota_tracker
