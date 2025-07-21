#!/bin/bash

echo "🚀 Starting TA AI Document Analyzer..."
echo "======================================"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Cleanup complete"
    exit
}
trap cleanup SIGINT SIGTERM

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or later."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check if server directory exists
if [ ! -d "server" ]; then
    echo "❌ Server directory not found. Please run this script from the project root."
    exit 1
fi

# Check if backend dependencies are installed
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd server
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install backend dependencies"
        exit 1
    fi
    cd ..
fi

# Create uploads directory if it doesn't exist
mkdir -p server/uploads

# Start backend server
echo "🔧 Starting backend server..."
cd server
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Check if backend is running
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo "❌ Backend server failed to start on port 8000"
    echo "   Please check if port 8000 is available"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend server
echo "🌐 Starting frontend server..."
node frontend-server.js &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

# Check if frontend is running
if ! curl -s -I http://localhost:5000 > /dev/null; then
    echo "❌ Frontend server failed to start on port 5000"
    echo "   Please check if port 5000 is available"
    cleanup
    exit 1
fi

echo ""
echo "✅ Both servers are running successfully!"
echo "======================================"
echo "🔗 Backend API:    http://localhost:8000"
echo "🌐 Frontend App:   http://localhost:5000"
echo "🏥 Health Check:   http://localhost:8000/health"
echo ""
echo "📝 Usage:"
echo "   1. Open http://localhost:5000 in your browser"
echo "   2. Upload a PDF file using drag-and-drop"
echo "   3. Click 'Upload to S3' then 'Process Document'"
echo "   4. View AI analysis results"
echo ""
echo "⚠️  Press Ctrl+C to stop both servers"
echo "======================================"

# Keep script running
wait