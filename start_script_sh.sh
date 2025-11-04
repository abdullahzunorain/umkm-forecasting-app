#!/bin/bash

echo "========================================"
echo "UMKM Forecasting App - Starting..."
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    cd backend
    python3 -m venv venv
    cd ..
fi

echo -e "${GREEN}Activating virtual environment...${NC}"
source backend/venv/bin/activate

# Check if requirements are installed
echo ""
echo -e "${YELLOW}Checking dependencies...${NC}"
if ! pip list | grep -q fastapi; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    cd backend
    pip install -r requirements.txt
    cd ..
fi

echo ""
echo "========================================"
echo "Starting Backend Server on port 8000..."
echo "========================================"

# Start backend in background
cd backend
python main.py &
BACKEND_PID=$!
cd ..

sleep 3

echo ""
echo "========================================"
echo "Starting Frontend Server on port 3000..."
echo "========================================"

# Start frontend in background
cd frontend
python3 -m http.server 3000 &
FRONTEND_PID=$!
cd ..

sleep 2

echo ""
echo "========================================"
echo "Opening Browser..."
echo "========================================"

# Open browser based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3000
    elif command -v gnome-open &> /dev/null; then
        gnome-open http://localhost:3000
    fi
fi

echo ""
echo "========================================"
echo -e "${GREEN}App is running!${NC}"
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers..."
echo "========================================"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "Done!"
    exit 0
}

# Set trap to catch Ctrl+C
trap cleanup INT TERM

# Wait indefinitely
wait