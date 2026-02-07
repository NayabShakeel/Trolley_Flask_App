"""
TIME ENGINE - Single Source of Truth
=====================================

Rules:
1. ONLY source of time is Python server
2. ALL timestamps come from TimeEngine
3. NO database time functions
4. NO JavaScript time generation
5. Storage: UTC
6. Display: Asia/Karachi (UTC+5)
"""

from datetime import datetime, timezone
import pytz

class TimeEngine:
    """
    Core Time Authority
    
    Single source of truth for all timestamps in the system.
    Never use datetime.now() directly - always use TimeEngine.
    """
    
    # Pakistan Standard Time
    PAKISTAN_TZ = pytz.timezone('Asia/Karachi')
    
    @classmethod
    def parse_datetime(cls, value):
        """
        Normalize any datetime value to timezone-aware UTC.
        """
        if value is None:
            return None
            
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
            
        if isinstance(value, str):
            # Handle ISO format and common variants
            dt_str = value.replace("Z", "+00:00")
            try:
                dt = datetime.fromisoformat(dt_str)
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except ValueError:
                # Fallback for other formats if needed
                return None
        return None

    @classmethod
    def utc_now(cls):
        """
        Get current UTC time
        
        Returns:
            datetime: Current time in UTC (timezone-aware)
        """
        return datetime.now(timezone.utc)
    
    @classmethod
    def pakistan_now(cls):
        """
        Get current Pakistan time
        
        Returns:
            datetime: Current time in Asia/Karachi timezone
        """
        utc_time = cls.utc_now()
        return utc_time.astimezone(cls.PAKISTAN_TZ)
    
    @classmethod
    def to_pakistan(cls, utc_time):
        """
        Convert UTC time to Pakistan time
        
        Args:
            utc_time: datetime in UTC
            
        Returns:
            datetime: Time in Asia/Karachi timezone
        """
        utc_dt = cls.parse_datetime(utc_time)
        if utc_dt is None:
            return None
            
        return utc_dt.astimezone(cls.PAKISTAN_TZ)
    
    @classmethod
    def to_utc(cls, pakistan_time):
        """
        Convert Pakistan time to UTC
        
        Args:
            pakistan_time: datetime in Asia/Karachi timezone
            
        Returns:
            datetime: Time in UTC
        """
        if pakistan_time is None:
            return None
            
        if isinstance(pakistan_time, str):
            # If it's a string, we assume it's Pakistan time and localize it
            dt = datetime.fromisoformat(pakistan_time)
            if dt.tzinfo is None:
                pakistan_time = cls.PAKISTAN_TZ.localize(dt)
            else:
                pakistan_time = dt
        
        return pakistan_time.astimezone(timezone.utc)
    
    @classmethod
    def format_pakistan(cls, utc_time):
        """
        Format UTC time as Pakistan time string
        
        Args:
            utc_time: datetime in UTC
            
        Returns:
            str: Formatted time string in Pakistan timezone
        """
        pk_time = cls.to_pakistan(utc_time)
        if pk_time is None:
            return None
            
        return pk_time.strftime('%Y-%m-%d %H:%M:%S')
    
    @classmethod
    def get_db_timestamp(cls):
        """
        Get timestamp for database storage
        
        Returns:
            datetime: Current UTC time for DB storage
            
        Note:
            Database ALWAYS stores UTC.
            Display layer converts to Pakistan time.
        """
        return cls.utc_now()


class TimeService:
    """
    High-level Time Service API
    
    This is what controllers should use.
    Provides consistent time across entire application.
    """
    
    @staticmethod
    def get_time():
        """
        Get current Pakistan time (for display)
        
        Returns:
            datetime: Current time in Pakistan timezone
        """
        return TimeEngine.pakistan_now()
    
    @staticmethod
    def get_utc():
        """
        Get current UTC time (for storage)
        
        Returns:
            datetime: Current time in UTC
        """
        return TimeEngine.utc_now()
    
    @staticmethod
    def get_db_timestamp():
        """
        Get timestamp for database
        
        Returns:
            datetime: Current UTC time
        """
        return TimeEngine.get_db_timestamp()
    
    @staticmethod
    def format_for_display(utc_time):
        """
        Format UTC time for user display
        
        Args:
            utc_time: UTC datetime
            
        Returns:
            str: Formatted Pakistan time
        """
        return TimeEngine.format_pakistan(utc_time)
    
    @staticmethod
    def calculate_duration(start_utc, end_utc=None):
        """
        Calculate duration between two UTC times
        
        Args:
            start_utc: Start time in UTC
            end_utc: End time in UTC (defaults to now)
            
        Returns:
            int: Duration in seconds
        """
        start_dt = TimeEngine.parse_datetime(start_utc)
        if start_dt is None:
            return None
            
        if end_utc is None:
            end_dt = TimeEngine.utc_now()
        else:
            end_dt = TimeEngine.parse_datetime(end_utc)
            
        if end_dt is None:
            return None
            
        return int((end_dt - start_dt).total_seconds())


# Global singleton instance
time_service = TimeService()
