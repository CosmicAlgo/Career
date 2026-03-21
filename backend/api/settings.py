"""
CareerRadar - Settings API Endpoints
GET/POST /api/settings
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from supabase import Client

from database.supabase_client import get_supabase_client
from config.settings import settings as app_settings


class UserSettings(BaseModel):
    github_username: str
    target_roles: List[str]
    target_locations: List[str]
    target_seniority: List[str]
    updated_at: Optional[datetime] = None


class SettingsManager:
    """Manages user settings from Supabase with env fallback."""
    
    def __init__(self, client: Optional[Client] = None):
        self.client = client or get_supabase_client()
    
    async def get_settings(self) -> UserSettings:
        """Get user settings from Supabase or fallback to env vars."""
        try:
            response = self.client.table("user_settings").select("*").order("updated_at", desc=True).limit(1).execute()
            
            if response.data and len(response.data) > 0:
                data = response.data[0]
                return UserSettings(
                    github_username=data.get("github_username", app_settings.github_username),
                    target_roles=data.get("target_roles", app_settings.target_roles),
                    target_locations=data.get("target_locations", ["UK", "Remote"]),
                    target_seniority=data.get("target_seniority", ["mid", "senior"]),
                    updated_at=data.get("updated_at")
                )
        except Exception as e:
            print(f"[Settings] Error reading from database: {e}")
        
        # Fallback to env vars
        return UserSettings(
            github_username=app_settings.github_username,
            target_roles=app_settings.target_roles,
            target_locations=["UK", "Remote"],
            target_seniority=["mid", "senior"]
        )
    
    async def update_settings(self, settings: UserSettings) -> UserSettings:
        """Update user settings in Supabase."""
        try:
            # Check if any record exists
            existing = self.client.table("user_settings").select("id").limit(1).execute()
            
            data = {
                "github_username": settings.github_username,
                "target_roles": settings.target_roles,
                "target_locations": settings.target_locations,
                "target_seniority": settings.target_seniority,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            if existing.data and len(existing.data) > 0:
                # Update existing record
                record_id = existing.data[0]["id"]
                response = self.client.table("user_settings").update(data).eq("id", record_id).execute()
            else:
                # Insert new record
                response = self.client.table("user_settings").insert(data).execute()
            
            if response.data and len(response.data) > 0:
                result = response.data[0]
                return UserSettings(
                    github_username=result["github_username"],
                    target_roles=result["target_roles"],
                    target_locations=result["target_locations"],
                    target_seniority=result["target_seniority"],
                    updated_at=result["updated_at"]
                )
        except Exception as e:
            print(f"[Settings] Error updating settings (table may not exist): {e}")
            # Return settings as-is (env vars fallback)
            return UserSettings(
                github_username=settings.github_username or app_settings.github_username,
                target_roles=settings.target_roles or app_settings.target_roles,
                target_locations=settings.target_locations or ["UK", "Remote"],
                target_seniority=settings.target_seniority or ["mid", "senior"],
                updated_at=datetime.utcnow()
            )
        
        return settings


# Global instance
_settings_manager: Optional[SettingsManager] = None


def get_settings_manager() -> SettingsManager:
    """Get global settings manager."""
    global _settings_manager
    if _settings_manager is None:
        _settings_manager = SettingsManager()
    return _settings_manager
