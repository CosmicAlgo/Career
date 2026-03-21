"""
CareerRadar - Timeseries Utilities
TimescaleDB-like time-series functions for score history
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import date, datetime, timedelta
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class TimeSeriesPoint:
    """A single point in a time series."""
    date: date
    value: float
    is_interpolated: bool = False


def time_bucket(
    timestamps: List[datetime],
    values: List[float],
    bucket_size: str = "1 day"
) -> Dict[date, List[float]]:
    """
    Bucket time-series data into regular intervals.
    
    Args:
        timestamps: List of timestamps
        values: List of values corresponding to timestamps
        bucket_size: Size of buckets (e.g., "1 day", "1 week")
        
    Returns:
        Dict mapping bucket date to list of values in that bucket
    """
    buckets: Dict[date, List[float]] = {}
    
    for ts, val in zip(timestamps, values):
        bucket_date = ts.date()
        if bucket_date not in buckets:
            buckets[bucket_date] = []
        buckets[bucket_date].append(val)
    
    return buckets


def gap_fill_linear(
    data: List[TimeSeriesPoint],
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[TimeSeriesPoint]:
    """
    Fill gaps in time-series using linear interpolation.
    
    Args:
        data: List of time-series points (must be sorted by date)
        start_date: Optional start date to fill from
        end_date: Optional end date to fill to
        
    Returns:
        List of points with gaps filled via linear interpolation
    """
    if not data:
        return []
    
    # Sort by date
    sorted_data = sorted(data, key=lambda p: p.date)
    
    # Determine date range
    if start_date is None:
        start_date = sorted_data[0].date
    if end_date is None:
        end_date = sorted_data[-1].date
    
    # Create a dict for O(1) lookup
    data_dict = {p.date: p for p in sorted_data}
    
    # Find all dates in range
    current = start_date
    all_dates = []
    while current <= end_date:
        all_dates.append(current)
        current += timedelta(days=1)
    
    # Find known data points (non-interpolated)
    known_dates = sorted(data_dict.keys())
    
    # Build result with gap filling
    result = []
    for d in all_dates:
        if d in data_dict:
            # Known data point
            result.append(data_dict[d])
        else:
            # Need to interpolate
            # Find nearest known points before and after
            before = [kd for kd in known_dates if kd < d]
            after = [kd for kd in known_dates if kd > d]
            
            if before and after:
                # Interpolate between known points
                prev_date = max(before)
                next_date = min(after)
                
                prev_val = data_dict[prev_date].value
                next_val = data_dict[next_date].value
                
                # Calculate interpolation factor
                total_days = (next_date - prev_date).days
                days_since_prev = (d - prev_date).days
                factor = days_since_prev / total_days if total_days > 0 else 0
                
                interpolated_val = prev_val + (next_val - prev_val) * factor
                
                result.append(TimeSeriesPoint(
                    date=d,
                    value=round(interpolated_val, 2),
                    is_interpolated=True
                ))
            elif before:
                # Extrapolate forward from last known value
                last_date = max(before)
                last_val = data_dict[last_date].value
                result.append(TimeSeriesPoint(
                    date=d,
                    value=last_val,
                    is_interpolated=True
                ))
            elif after:
                # Extrapolate backward from first known value
                first_date = min(after)
                first_val = data_dict[first_date].value
                result.append(TimeSeriesPoint(
                    date=d,
                    value=first_val,
                    is_interpolated=True
                ))
    
    return result


def calculate_rolling_average(
    data: List[TimeSeriesPoint],
    window_days: int = 7
) -> List[TimeSeriesPoint]:
    """
    Calculate rolling average over a window.
    
    Args:
        data: List of time-series points (must be sorted by date)
        window_days: Size of rolling window in days
        
    Returns:
        List of points with rolling average values
    """
    if not data:
        return []
    
    sorted_data = sorted(data, key=lambda p: p.date)
    result = []
    
    for i, point in enumerate(sorted_data):
        # Get window of points
        window_start = max(0, i - window_days + 1)
        window = sorted_data[window_start:i + 1]
        
        # Calculate average
        avg = sum(p.value for p in window) / len(window)
        
        result.append(TimeSeriesPoint(
            date=point.date,
            value=round(avg, 2),
            is_interpolated=point.is_interpolated
        ))
    
    return result


def calculate_trend(
    data: List[TimeSeriesPoint],
    window_days: int = 7
) -> float:
    """
    Calculate trend direction and magnitude.
    
    Returns:
        Trend value: positive = improving, negative = declining
    """
    if len(data) < 2:
        return 0.0
    
    sorted_data = sorted(data, key=lambda p: p.date)
    
    # Use simple slope calculation over recent window
    if len(sorted_data) >= window_days:
        recent = sorted_data[-window_days:]
    else:
        recent = sorted_data
    
    first_val = recent[0].value
    last_val = recent[-1].value
    
    # Normalize by window size
    days = (recent[-1].date - recent[0].date).days
    if days == 0:
        days = 1
    
    trend = (last_val - first_val) / days
    
    return round(trend, 4)


def format_for_chart(
    data: List[TimeSeriesPoint],
    include_interpolated: bool = True
) -> List[Dict[str, Any]]:
    """
    Format time-series data for charting.
    
    Args:
        data: List of time-series points
        include_interpolated: Whether to include interpolated points
        
    Returns:
        List of dicts with date and value for chart libraries
    """
    result = []
    
    for point in data:
        if not include_interpolated and point.is_interpolated:
            continue
        
        result.append({
            "date": point.date.isoformat(),
            "value": point.value,
            "interpolated": point.is_interpolated
        })
    
    return result


def score_history_to_timeseries(
    snapshots: List[Dict[str, Any]],
    role: Optional[str] = None,
    gap_fill: bool = True
) -> List[TimeSeriesPoint]:
    """
    Convert score history snapshots to time series.
    
    Args:
        snapshots: List of snapshot dicts from database
        role: Optional role to extract (None = overall score)
        gap_fill: Whether to fill gaps via interpolation
        
    Returns:
        List of time-series points
    """
    points = []
    
    for snap in snapshots:
        snap_date = date.fromisoformat(snap["date"])
        
        if role:
            # Get role-specific score
            assessment = snap.get("assessment", {})
            role_scores = assessment.get("role_scores", {})
            score = role_scores.get(role, 0)
        else:
            # Get overall score
            score = snap.get("overall_score", 0)
        
        points.append(TimeSeriesPoint(
            date=snap_date,
            value=float(score),
            is_interpolated=False
        ))
    
    if gap_fill and points:
        # Fill gaps
        points = gap_fill_linear(points)
    
    return points


class TrendAnalyzer:
    """Analyze score trends over time."""
    
    def __init__(self, data: List[TimeSeriesPoint]):
        self.data = sorted(data, key=lambda p: p.date)
    
    def get_summary(self) -> Dict[str, Any]:
        """Get trend summary with key metrics."""
        if not self.data:
            return {
                "trend": "neutral",
                "trend_value": 0.0,
                "current_value": 0,
                "avg_value": 0,
                "change_7d": 0,
                "change_30d": 0
            }
        
        # Calculate trend
        trend_value = calculate_trend(self.data, window_days=7)
        
        # Determine trend direction
        if trend_value > 0.5:
            trend = "improving"
        elif trend_value < -0.5:
            trend = "declining"
        else:
            trend = "stable"
        
        # Current value
        current = self.data[-1].value if self.data else 0
        
        # Average value
        avg = sum(p.value for p in self.data) / len(self.data) if self.data else 0
        
        # Changes over periods
        change_7d = self._calculate_change(7)
        change_30d = self._calculate_change(30)
        
        return {
            "trend": trend,
            "trend_value": trend_value,
            "current_value": current,
            "avg_value": round(avg, 2),
            "change_7d": change_7d,
            "change_30d": change_30d,
            "data_points": len(self.data),
            "days_tracked": (self.data[-1].date - self.data[0].date).days if len(self.data) > 1 else 0
        }
    
    def _calculate_change(self, days: int) -> float:
        """Calculate change over specified days."""
        if len(self.data) < 2:
            return 0.0
        
        cutoff_date = self.data[-1].date - timedelta(days=days)
        
        # Find point closest to cutoff
        past_points = [p for p in self.data if p.date <= cutoff_date]
        
        if not past_points:
            past_points = [self.data[0]]
        
        past_val = past_points[-1].value
        current_val = self.data[-1].value
        
        return round(current_val - past_val, 2)
    
    def detect_anomalies(
        self,
        threshold_std: float = 2.0
    ) -> List[TimeSeriesPoint]:
        """
        Detect anomalous points using standard deviation.
        
        Returns points that deviate more than threshold_std from mean.
        """
        if len(self.data) < 3:
            return []
        
        values = [p.value for p in self.data]
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        std = variance ** 0.5
        
        anomalies = []
        for point in self.data:
            deviation = abs(point.value - mean)
            if deviation > threshold_std * std:
                anomalies.append(point)
        
        return anomalies
