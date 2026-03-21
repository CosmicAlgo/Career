"""
CareerRadar - Supabase Client
Async Supabase client initialization and helper functions
"""

from typing import Optional
from supabase import create_client, Client
from config.settings import settings


class SupabaseManager:
    """Manages Supabase client connections."""
    
    _instance: Optional["SupabaseManager"] = None
    _client: Optional[Client] = None
    
    def __new__(cls) -> "SupabaseManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def initialize(self) -> Client:
        """Initialize and return Supabase client."""
        if self._client is None:
            self._client = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key
            )
        return self._client
    
    @property
    def client(self) -> Client:
        """Get Supabase client instance."""
        if self._client is None:
            return self.initialize()
        return self._client
    
    async def health_check(self) -> bool:
        """Check Supabase connection health."""
        try:
            # Try a simple query to verify connection
            response = self.client.table("snapshots").select("count", count="exact").limit(0).execute()
            return True
        except Exception:
            return False


# Global Supabase manager instance
supabase_manager = SupabaseManager()


def get_supabase_client() -> Client:
    """Get the global Supabase client instance."""
    return supabase_manager.client
