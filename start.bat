@echo off
REM ==========================================
REM SKINOVA - Windows Startup Script
REM Boots FastAPI Backend & Vite Frontend
REM ==========================================

echo ==========================================================
echo     SKINOVA AI - Dermatological Intelligence Platform
echo ==========================================================

REM 1. Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    pause
    exit /b 1
)

REM 2. Check Node
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js and npm are not installed or not in PATH.
    pause
    exit /b 1
)

REM 2.5 Check and Initialize Environment Files (.env)
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        echo Initializing backend\.env from backend\.env.example...
        copy "backend\.env.example" "backend\.env" >nul
    )
)
if not exist "frontend\.env" (
    if exist "frontend\.env.example" (
        echo Initializing frontend\.env from frontend\.env.example...
        copy "frontend\.env.example" "frontend\.env" >nul
    )
)

REM 3. Python Virtual Environment
if not exist "backend\.venv" (
    echo Creating virtual environment in backend\.venv...
    python -m venv backend\.venv
)

echo Installing / verifying backend dependencies...
backend\.venv\Scripts\pip install -r backend\requirements.txt

REM 4. Frontend dependencies
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend && npm install && cd ..
)

echo ==========================================================
echo Starting SKINOVA Backend and Frontend...
echo - Frontend: http://localhost:5173
echo - Backend API Docs: http://localhost:8000/docs
echo ==========================================================

start "SKINOVA Backend" cmd /k "cd backend && .venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
start "SKINOVA Frontend" cmd /k "cd frontend && npm run dev"

echo Services launched in separate windows. Close windows to stop.
pause
