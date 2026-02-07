@echo off
echo ============================================
echo   Trolley Tracking System - Database Setup
echo ============================================
echo.

echo This will create/reset the trolley_tracking database.
echo WARNING: This will DELETE all existing data!
echo.
set /p confirm="Are you sure? (yes/no): "

if /i not "%confirm%"=="yes" (
    echo Setup cancelled.
    pause
    exit /b
)

echo.
echo Setting up database...
echo.

REM Prompt for MySQL root password
set /p mysql_pass="Enter MySQL root password: "

REM Run database setup
mysql -u root -p%mysql_pass% < database_schema_fixed.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo   Database setup completed successfully!
    echo ============================================
    echo.
    echo Database: trolley_tracking
    echo Sample data created:
    echo   - Trolleys: TR-01 to TR-10
    echo   - Processes: PR-01 to PR-03 (paired)
    echo.
) else (
    echo.
    echo ============================================
    echo   Database setup failed!
    echo ============================================
    echo.
    echo Please check:
    echo   1. MySQL is running
    echo   2. Password is correct
    echo   3. You have sufficient privileges
    echo.
)

pause
