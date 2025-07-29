@echo off
echo ========================================
echo   Tagalog Translator - Starting All Services
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm run install:all
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if whisper service virtual environment exists
if not exist "whisper-service\venv" (
    echo ERROR: Whisper service virtual environment not found
    echo Please run whisper-service\setup.py first
    pause
    exit /b 1
)

echo Starting all services...
echo.

REM Start Whisper Service (Port 8000)
echo [1/3] Starting Whisper Service on http://localhost:8000
start "Whisper Service" cmd /k "cd whisper-service && venv\Scripts\python main.py"

REM Wait a moment for whisper service to start
timeout /t 2 /nobreak >nul

REM Start Backend Service (Port 3001)
echo [2/3] Starting Backend Service on http://localhost:3001
start "Backend Service" cmd /k "cd backend && npm run dev"

REM Wait a moment for backend to start
timeout /t 2 /nobreak >nul

REM Start Frontend Service (Port 5173)
echo [3/3] Starting Frontend Service on http://localhost:5173
start "Frontend Service" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   All services are starting up!
echo ========================================
echo.
echo Services:
echo   - Whisper Service: http://localhost:8000
echo   - Backend API:     http://localhost:3001
echo   - Frontend App:    http://localhost:5173
echo.
echo Each service is running in its own window.
echo Close the individual windows to stop each service.
echo.
echo Press any key to exit this launcher...
pause >nul