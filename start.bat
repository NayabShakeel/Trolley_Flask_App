@echo off
echo ============================================
echo   Trolley Tracking System - Starting...
echo ============================================
echo.

REM Check if .env exists
if not exist .env (
    echo ERROR: .env file not found!
    echo.
    echo Please create .env file first:
    echo   1. Copy .env.example to .env
    echo   2. Edit .env with your database credentials
    echo.
    pause
    exit /b 1
)

REM Check if virtual environment exists
if exist venv\Scripts\activate.bat (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
)

REM Check if dependencies are installed
python -c "import flask" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Dependencies not installed!
    echo.
    echo Please run: pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

echo Starting Trolley Tracking System...
echo.
echo Access the application at: http://localhost:5500
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the application
python app.py

pause
