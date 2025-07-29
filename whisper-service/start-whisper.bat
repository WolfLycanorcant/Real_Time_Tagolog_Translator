@echo off
echo Starting Faster-Whisper Service...
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo ERROR: Virtual environment not found. Run setup.py first.
    pause
    exit /b 1
)

REM Activate virtual environment and start service
echo Starting service on http://localhost:8000
echo Press Ctrl+C to stop
echo.

venv\Scripts\python main.py