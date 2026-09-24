@echo off
REM ==========================================
REM SKINOVA - Windows Startup Script
REM Boots FastAPI Backend & Vite Frontend
REM ==========================================

REM Ensure working directory is the script root
cd /d "%~dp0"

echo ==========================================================
echo     SKINOVA AI - Dermatological Intelligence Platform
echo ==========================================================

REM 1. Check Python (tries python then py launcher)
set "PYTHON_CMD="
where python >nul 2>nul
if %errorlevel% equ 0 (
    set "PYTHON_CMD=python"
) else (
    where py >nul 2>nul
    if %errorlevel% equ 0 (
        set "PYTHON_CMD=py"
    ) else (
        echo [ERROR] Python 3 is not installed or not in PATH.
        echo Please install Python 3.10+ from python.org and check "Add Python to PATH".
        pause
        exit /b 1
    )
)

REM 2. Check Node & npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js and npm are not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
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
    %PYTHON_CMD% -m venv backend\.venv
)

REM Verify and install backend dependencies if needed
backend\.venv\Scripts\python -c "import fastapi, onnxruntime, sklearn" >nul 2>nul
if %errorlevel% neq 0 (
    echo Installing backend dependencies from requirements.txt...
    backend\.venv\Scripts\python -m pip install --upgrade pip
    backend\.venv\Scripts\pip install -r backend\requirements.txt
) else (
    echo [OK] Backend dependencies verified.
)

REM 4. Frontend dependencies
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend && npm install && cd ..
) else (
    echo [OK] Frontend node_modules verified.
)

echo ==========================================================
echo Starting SKINOVA Backend and Frontend...
echo - Frontend Web Application : http://localhost:5173
echo - Backend API & Docs       : http://localhost:8000/docs
echo ==========================================================

start "SKINOVA Backend" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
start "SKINOVA Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Services launched in separate windows. Close windows to stop.
pause
