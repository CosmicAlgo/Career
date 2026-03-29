"""
Application Tracker - Database operations
Tracks job applications through the hiring pipeline
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from database.supabase_client import supabase_manager


class ApplicationTracker:
    """Manages job application tracking in Supabase."""

    def __init__(self):
        self.client = supabase_manager

    async def create_application(
        self, application_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a new job application."""
        try:
            # Add timestamps
            application_data.update(
                {
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                    "follow_up_date": (
                        datetime.utcnow() + timedelta(days=7)
                    ).isoformat()
                    if application_data.get("status") == "applied"
                    else None,
                }
            )

            response = (
                self.client.client.table("job_applications")
                .insert(application_data)
                .execute()
            )

            if response.data:
                return response.data[0]
            else:
                raise Exception("Failed to create application")

        except Exception as e:
            print(f"[ApplicationTracker] Error creating application: {e}")
            raise

    async def get_applications(
        self, user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all job applications, optionally filtered by user."""
        try:
            query = (
                self.client.client.table("job_applications")
                .select("*")
                .order("created_at", desc=True)
            )

            if user_id:
                query = query.eq("user_id", user_id)

            response = query.execute()
            return response.data or []

        except Exception as e:
            print(f"[ApplicationTracker] Error fetching applications: {e}")
            return []

    async def update_application_status(
        self, application_id: str, status: str, notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update application status and optionally add notes."""
        try:
            update_data = {
                "status": status,
                "updated_at": datetime.utcnow().isoformat(),
            }

            if notes:
                update_data["notes"] = notes

            # Set follow-up date for applied status
            if status == "applied":
                update_data["follow_up_date"] = (
                    datetime.utcnow() + timedelta(days=7)
                ).isoformat()
            elif status in ["offer", "rejected"]:
                update_data["follow_up_date"] = None

            response = (
                self.client.client.table("job_applications")
                .update(update_data)
                .eq("id", application_id)
                .execute()
            )

            if response.data:
                return response.data[0]
            else:
                raise Exception("Failed to update application")

        except Exception as e:
            print(f"[ApplicationTracker] Error updating application: {e}")
            raise

    async def get_applications_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Get applications filtered by status."""
        try:
            response = (
                self.client.client.table("job_applications")
                .select("*")
                .eq("status", status)
                .order("created_at", desc=True)
                .execute()
            )
            return response.data or []

        except Exception as e:
            print(f"[ApplicationTracker] Error fetching applications by status: {e}")
            return []

    async def get_follow_ups_due(self, days_ahead: int = 0) -> List[Dict[str, Any]]:
        """Get applications that need follow-up."""
        try:
            target_date = (
                (datetime.utcnow() + timedelta(days=days_ahead)).date().isoformat()
            )

            response = (
                self.client.client.table("job_applications")
                .select("*")
                .eq("follow_up_date", target_date)
                .order("follow_up_date", desc=True)
                .execute()
            )
            return response.data or []

        except Exception as e:
            print(f"[ApplicationTracker] Error fetching follow-ups: {e}")
            return []

    async def get_application_stats(self, days: int = 30) -> Dict[str, Any]:
        """Get application statistics for the last N days."""
        try:
            cutoff_date = (datetime.utcnow() - timedelta(days=days)).date().isoformat()

            response = (
                self.client.client.table("job_applications")
                .select("*")
                .gte("created_at", cutoff_date)
                .execute()
            )
            applications = response.data or []

            # Calculate stats
            stats = {
                "total_applications": len(applications),
                "by_status": {},
                "by_source": {},
                "response_rate": 0,
                "interview_rate": 0,
                "offer_rate": 0,
                "avg_response_days": 0,
            }

            responses = 0
            interviews = 0
            offers = 0
            response_days = []

            for app in applications:
                # Count by status
                status = app.get("status", "unknown")
                stats["by_status"][status] = stats["by_status"].get(status, 0) + 1

                # Count by source
                source = app.get("source", "unknown")
                stats["by_source"][source] = stats["by_source"].get(source, 0) + 1

                # Calculate rates
                if status in [
                    "phone_screen",
                    "technical",
                    "final",
                    "offer",
                    "rejected",
                ]:
                    responses += 1
                    if app.get("response_date"):
                        response_days.append(
                            self._calculate_days_between(
                                app["created_at"], app["response_date"]
                            )
                        )

                if status in ["phone_screen", "technical", "final", "offer"]:
                    interviews += 1

                if status == "offer":
                    offers += 1

            # Calculate rates
            if stats["total_applications"] > 0:
                stats["response_rate"] = (responses / stats["total_applications"]) * 100
                stats["interview_rate"] = (
                    interviews / stats["total_applications"]
                ) * 100
                stats["offer_rate"] = (offers / stats["total_applications"]) * 100

            if response_days:
                stats["avg_response_days"] = sum(response_days) / len(response_days)

            return stats

        except Exception as e:
            print(f"[ApplicationTracker] Error calculating stats: {e}")
            return {}

    def _calculate_days_between(self, start_date: str, end_date: str) -> int:
        """Calculate days between two ISO date strings."""
        try:
            start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            return (end - start).days
        except Exception:
            return 0

    async def delete_application(self, application_id: str) -> bool:
        """Delete an application from the database."""
        try:
            response = (
                self.client.client.table("job_applications")
                .delete()
                .eq("id", application_id)
                .execute()
            )
            return len(response.data) > 0
        except Exception as e:
            print(f"[ApplicationTracker] Error deleting application: {e}")
            return False


# Singleton instance
application_tracker = ApplicationTracker()
