import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv
from contextlib import contextmanager
import pytz
from datetime import datetime, timezone

load_dotenv()

class Database:
    def __init__(self):
        self.host = os.getenv('DB_HOST', 'localhost')
        self.user = os.getenv('DB_USER', 'root')
        self.password = os.getenv('DB_PASSWORD', '')
        self.database = os.getenv('DB_NAME', 'trolley_tracking')
        self.port = int(os.getenv('DB_PORT', 3306))
        self.timezone = os.getenv('DB_TIMEZONE', 'Asia/Karachi')
        self.connection = None

    def connect(self):
        """Establish database connection"""
        try:
            self.connection = mysql.connector.connect(
                host=self.host,
                user=self.user,
                password=self.password,
                database=self.database,
                port=self.port,
                time_zone='+05:00',  # Pakistan Standard Time
                autocommit=False  # Explicit transaction control
            )
            if self.connection.is_connected():
                return self.connection
        except Error as e:
            print(f"Error connecting to MySQL: {e}")
            return None

    @contextmanager
    def get_cursor(self, dictionary=True):
        """Context manager for database cursor with automatic connection handling"""
        connection = None
        cursor = None
        try:
            connection = self.connect()
            if not connection:
                raise Exception("Database connection failed")
            cursor = connection.cursor(dictionary=dictionary)
            yield cursor, connection
        except Error as e:
            if connection:
                connection.rollback()
            print(f"Database error: {e}")
            raise e
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()

    def execute_transaction(self, operations):
        """
        Execute multiple operations in a single transaction
        operations: list of (query, params) tuples
        Returns: True if all successful, False otherwise
        """
        with self.get_cursor() as (cursor, connection):
            try:
                for query, params in operations:
                    cursor.execute(query, params or ())
                connection.commit()
                return True
            except Error as e:
                connection.rollback()
                print(f"Transaction failed: {e}")
                print(f"Rolling back all changes...")
                raise e

    def execute_query(self, query, params=None):
        """Execute a single query with automatic commit"""
        with self.get_cursor() as (cursor, connection):
            cursor.execute(query, params or ())
            connection.commit()
            return cursor.lastrowid

    def fetch_all(self, query, params=None):
        """Fetch all results"""
        with self.get_cursor() as (cursor, connection):
            cursor.execute(query, params or ())
            result = cursor.fetchall()
            return result

    def fetch_one(self, query, params=None):
        """Fetch single result"""
        with self.get_cursor() as (cursor, connection):
            cursor.execute(query, params or ())
            result = cursor.fetchone()
            return result

    def get_timezone_now(self):
        """Get current timestamp in UTC (timezone-aware)"""
        return datetime.now(timezone.utc)

    def calculate_duration(self, start_time, end_time):
        """Calculate duration in seconds between two timestamps"""
        if start_time and end_time:
            # Helper to ensure datetime is aware
            def ensure_aware(dt):
                if isinstance(dt, str):
                    dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
                if dt and dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt

            start_dt = ensure_aware(start_time)
            end_dt = ensure_aware(end_time)
            
            if start_dt and end_dt:
                return int((end_dt - start_dt).total_seconds())
        return None

# Global database instance
db = Database()

# Test connection on module load
connection = db.connect()
if connection:
    print("✅ Database connection successful!")
    connection.close()
else:
    print("❌ Database connection failed!")
