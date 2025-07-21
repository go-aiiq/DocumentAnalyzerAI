#!/bin/bash

echo "🚀 Starting TA AI Document Analyzer with concurrently..."
echo "========================================================"

# Check if concurrently is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx is not available. Please install Node.js v18 or later."
    exit 1
fi

# Install backend dependencies if needed
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd server
    npm install
    cd ..
fi

# Create uploads directory
mkdir -p server/uploads

# Start both servers using concurrently
echo "🔧 Starting both servers..."
echo "   Backend: http://localhost:8000"
echo "   Frontend: http://localhost:5000"
echo ""
echo "⚠️  Press Ctrl+C to stop both servers"
echo "========================================================"

npx concurrently \
  --names "BACKEND,FRONTEND" \
  --prefix name \
  --prefix-colors "blue,green" \
  --kill-others-on-fail \
  "cd server && npm start" \
  "node frontend-server.js"