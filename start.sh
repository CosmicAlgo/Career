#!/bin/bash

# CareerRadar — Local Dev Startup Script
# Run from the careerradar/ root directory: bash start.sh

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║        CareerRadar — Starting        ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Check .env exists ──────────────────────────────────────────────────────────
if [ ! -f "$ROOT_DIR/.env" ]; then
  echo "❌  .env file not found in project root."
  echo "    Copy .env.example and fill in your keys."
  exit 1
fi
echo "✅  .env found"

# ── Backend setup ──────────────────────────────────────────────────────────────
echo ""
echo "▶  Setting up backend..."

cd "$BACKEND_DIR"

# Detect python command (Windows uses 'python', Linux/Mac uses 'python3')
if command -v python &>/dev/null; then
  PYTHON=python
  PIP=pip
elif command -v python3 &>/dev/null; then
  PYTHON=python3
  PIP=pip3
else
  echo "❌  Python not found. Make sure Python is installed and added to PATH."
  exit 1
fi

echo "   Using $($PYTHON --version)"

# Install dependencies
echo "   Installing Python dependencies..."
$PIP install -r requirements.txt --quiet

# Install Playwright browsers if not already installed
echo "   Checking Playwright browsers..."
$PYTHON -m playwright install chromium 2>/dev/null || true

echo "✅  Backend ready"

# ── Frontend setup ─────────────────────────────────────────────────────────────
echo ""
echo "▶  Setting up frontend..."

cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
  echo "   Installing Node dependencies (first run — may take a minute)..."
  npm install --silent
else
  echo "   Node modules already installed"
fi

echo "✅  Frontend ready"

# ── Start both servers ─────────────────────────────────────────────────────────
echo ""
echo "▶  Starting servers..."
echo ""
echo "   Backend  →  http://localhost:8000"
echo "   Frontend →  http://localhost:3000"
echo "   API docs →  http://localhost:8000/docs"
echo ""
echo "   Press Ctrl+C to stop both servers"
echo ""

# Trap Ctrl+C to kill both background processes cleanly
trap 'echo ""; echo "Shutting down..."; kill $(jobs -p) 2>/dev/null; exit 0' SIGINT SIGTERM

# Start backend in background
cd "$BACKEND_DIR"
$PYTHON -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Small delay so backend starts first
sleep 2

# Start frontend in background
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

# Wait for both
wait $BACKEND_PID $FRONTEND_PID
