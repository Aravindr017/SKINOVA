#!/usr/bin/env bash
# ==========================================
# SKINOVA - Unified Development Startup Script
# Boots both FastAPI Backend & Vite Frontend concurrently
# ==========================================

set -e

# Terminal colors
BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo -e "${BOLD}${CYAN}"
echo "=========================================================="
echo "    ✨ SKINOVA AI - Dermatological Intelligence Platform ✨ "
echo "=========================================================="
echo -e "${NC}"

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR] Python 3 is required but was not found in PATH.${NC}"
    exit 1
fi

# 2. Check Node & npm
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js and npm are required for the frontend but were not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment checked:${NC} $(python3 --version), Node $(node --version)"

# 3. Setup Python Virtual Environment
VENV_DIR="$BACKEND_DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}Creating Python virtual environment in backend/.venv...${NC}"
    python3 -m venv "$VENV_DIR"
fi

# Determine python/pip binary
VENV_PYTHON="$VENV_DIR/bin/python"
VENV_UVICORN="$VENV_DIR/bin/uvicorn"

if [ ! -f "$VENV_PYTHON" ]; then
    # Windows git-bash fallback
    VENV_PYTHON="$VENV_DIR/Scripts/python.exe"
    VENV_UVICORN="$VENV_DIR/Scripts/uvicorn.exe"
fi

# Check if requirements installed
if ! "$VENV_PYTHON" -c "import fastapi, onnxruntime, sentence_transformers" &> /dev/null; then
    echo -e "${YELLOW}Installing backend dependencies from requirements.txt...${NC}"
    "$VENV_PYTHON" -m pip install --upgrade pip
    "$VENV_PYTHON" -m pip install -r "$BACKEND_DIR/requirements.txt"
fi
echo -e "${GREEN}✓ Backend environment ready.${NC}"

# 4. Setup Frontend npm packages
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend node dependencies...${NC}"
    (cd "$FRONTEND_DIR" && npm install)
fi
echo -e "${GREEN}✓ Frontend environment ready.${NC}"

# 5. Trap cleanup on exit (Ctrl+C)
cleanup() {
    echo -e "\n${YELLOW}Shutting down SKINOVA services...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    echo -e "${GREEN}All services stopped cleanly. Goodbye!${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 6. Launch Backend (FastAPI on Port 8000)
echo -e "\n${BOLD}${CYAN}Starting Backend API on http://127.0.0.1:8000 ...${NC}"
(cd "$BACKEND_DIR" && "$VENV_UVICORN" app.main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!

# Wait 2 seconds for backend to start binding port
sleep 2

# 7. Launch Frontend (Vite on Port 5173)
echo -e "${BOLD}${CYAN}Starting Frontend UI on http://localhost:5173 ...${NC}"
(cd "$FRONTEND_DIR" && npm run dev) &
FRONTEND_PID=$!

echo -e "\n${BOLD}${GREEN}==========================================================${NC}"
echo -e "${BOLD}${GREEN}  🚀 SKINOVA is running!${NC}"
echo -e "  • Frontend Web Application : ${BOLD}${CYAN}http://localhost:5173${NC}"
echo -e "  • Backend API & Docs       : ${BOLD}${CYAN}http://localhost:8000/docs${NC}"
echo -e "  • Press ${BOLD}Ctrl+C${NC} anytime to stop all servers."
echo -e "${BOLD}${GREEN}==========================================================${NC}\n"

# Wait for both processes
wait
