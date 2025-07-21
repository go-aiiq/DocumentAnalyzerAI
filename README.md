# TA AI Document Analyzer

A full-stack document analysis application that uses AI to process and segment PDF documents. The application features a modern web interface with drag-and-drop file upload, S3 integration, and LandingAI-powered document processing.

## Features

- **PDF Upload**: Drag-and-drop interface with file validation and progress tracking
- **S3 Integration**: Secure file storage with simulated AWS S3 service
- **AI Processing**: Document segmentation using LandingAI API with confidence scoring
- **Results Visualization**: Interactive display of document segments with metadata
- **Download Results**: Export analysis results as JSON
- **Responsive Design**: Mobile-friendly interface with gradient styling

## Technology Stack

### Frontend
- **Angular**: Modern web framework for building the user interface
- **Angular Material**: UI component library following Material Design
- **TypeScript**: Strongly typed programming language
- **RxJS**: Library for reactive programming
- **Responsive Design**: Mobile-first approach

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web server framework
- **Multer**: File upload middleware
- **CORS**: Cross-origin resource sharing
- **UUID**: Unique identifier generation

### External Services
- **AWS S3**: File storage (currently mocked for development)
- **LandingAI**: Document processing and segmentation (currently mocked for development)

## Directory Structure

```
.
├── README.md                           # This file
├── replit.md                          # Project documentation and preferences
├── server/                            # Backend application
│   ├── package.json                   # Backend dependencies
│   ├── server.js                      # Main Express server
│   ├── middleware/
│   │   └── upload.js                  # File upload configuration
│   ├── routes/
│   │   └── document.js                # Document processing routes
│   ├── services/
│   │   ├── landingai.js              # LandingAI service integration
│   │   └── s3.js                     # S3 service integration
│   └── uploads/                       # Temporary file storage
├── src/                               # Frontend source files
│   ├── app.html                       # Main application (clean version)
│   ├── index.html                     # Original Angular-based version
│   ├── main.ts                        # Angular main file (legacy)
│   ├── styles.scss                    # Global styles (legacy)
│   ├── favicon.ico                    # Application favicon
│   └── app/                           # Angular components (legacy)
│       ├── components/
│       │   ├── upload/                # Upload component
│       │   └── results/               # Results display component
│       ├── services/
│       │   └── document.service.ts    # Document service
│       ├── models/
│       │   └── document.model.ts      # TypeScript interfaces
│       ├── app.component.*            # Root component
│       ├── app.module.ts              # Angular module
│       └── app-routing.module.ts      # Routing configuration
├── angular.json                       # Angular CLI configuration
├── tsconfig.json                      # TypeScript configuration
└── tsconfig.app.json                  # App-specific TypeScript config
```

## Setup and Installation

### Prerequisites

- **Node.js** (v18 or later) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **Yarn** (recommended)
- **Angular CLI** (latest version recommended)
- **Git** (optional, for cloning)

### Quick Start Guide

Follow these steps to get the complete application running:

#### 1. Project Setup

```bash
# Clone or download the project
git clone <repository-url>
cd ta-ai-document-analyzer

# Or if you downloaded as ZIP
unzip ta-ai-document-analyzer.zip
cd ta-ai-document-analyzer
```

#### 2. Backend Setup

```bash
# Navigate to server directory
cd server

# Install backend dependencies
npm install

# Create uploads directory for temporary files
mkdir -p uploads

# Verify installation
npm list
```

### Angular Frontend Setup

#### 1. Install Angular CLI
```bash
# Install Angular CLI globally
npm install -g @angular/cli

# Verify installation
ng version
```

#### 2. Install Project Dependencies
```bash
# Navigate to project root (if not already there)
cd /path/to/ta-ai-document-analyzer

# Install all dependencies
npm install
```

#### 3. Development Server
```bash
# Start the Angular development server
ng serve

# For a specific port (default is 4200)
# ng serve --port 4300

# With live reload on a specific host
# ng serve --host 0.0.0.0 --port 4200 --disable-host-check
```

#### 4. Production Build
```bash
# Create a production build
ng build --configuration production

# The build artifacts will be stored in the `dist/` directory
```

#### 5. Running Tests
```bash
# Run unit tests
ng test

# Run end-to-end tests
ng e2e
```

#### 6. Code Scaffolding
```bash
# Generate a new component
ng generate component component-name

# Generate a new service
ng generate service service-name

# Generate a new module
ng generate module module-name
```

#### 4. Environment Configuration (Optional)

Create environment file for production settings:

```bash
# Create .env file in server directory
cd server
cat > .env << EOF
# Server Configuration
PORT=8000
NODE_ENV=development

# AWS S3 Configuration (for production)
S3_BUCKET_NAME=ta-ai-documents
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# LandingAI Configuration (for production)
LANDINGAI_API_KEY=your_landingai_api_key_here
EOF
```

### Complete Environment Setup

#### Method 1: Manual Setup (Recommended for Development)

**Terminal 1 - Backend Server:**
```bash
# Navigate to server directory
cd server

# Start backend server
npm start

# You should see:
# "TA AI Document Analyzer API running on port 8000"
# "Health check: http://localhost:8000/health"
```

**Terminal 2 - Frontend Development Server:**
```bash
# Navigate to project root (new terminal window)
cd ta-ai-document-analyzer

# Start Angular development server with live reload
ng serve --open

# The --open flag automatically opens your browser to http://localhost:4200/

# For development with specific configuration
# ng serve --configuration=development

# To enable production mode with optimizations
# ng serve --configuration production
```

#### Development Tips
- Use `ng serve --hmr` for faster development with Hot Module Replacement
- Access the Angular CLI help with `ng help` or `ng <command> --help`
- For production builds, consider using `--prod` flag for optimizations

#### Method 2: Automated Setup Script

Create a startup script for convenience:

```bash
# Create run script in project root
cat > start-app.sh << 'EOF'
#!/bin/bash

echo "Starting TA AI Document Analyzer..."

# Function to cleanup on exit
cleanup() {
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

# Start backend server
echo "Starting backend server..."
cd server
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend server
echo "Starting frontend server..."
node frontend-server.js &
FRONTEND_PID=$!

echo "Both servers are running:"
echo "- Backend: http://localhost:8000"
echo "- Frontend: http://localhost:5000"
echo "- Application: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for processes
wait
EOF

# Make script executable
chmod +x start-app.sh

# Run the application
./start-app.sh
```

#### Method 3: Using Concurrently (Recommended)

Use the provided script with concurrently for better output management:

```bash
# Make the script executable (if not already)
chmod +x start-both.sh

# Start both servers with color-coded output
./start-both.sh

# This will show:
# - BACKEND messages in blue
# - FRONTEND messages in green  
# - Automatic cleanup on exit
```

The `start-both.sh` script provides:
- Color-coded output for each server
- Automatic dependency installation
- Graceful shutdown of both servers
- Clear status messages and URLs

### Verification Steps

After setup, verify everything is working:

1. **Check Backend Health:**
   ```bash
   curl http://localhost:8000/health
   # Expected: {"status":"healthy","timestamp":"...","service":"TA AI Document Analyzer API"}
   ```

2. **Check Frontend Accessibility:**
   ```bash
   curl -I http://localhost:5000
   # Expected: HTTP/1.1 200 OK
   ```

3. **Test File Upload Endpoint:**
   ```bash
   curl -X POST http://localhost:8000/api/upload
   # Expected: Error about missing file (confirms endpoint exists)
   ```

4. **Open Application in Browser:**
   - Navigate to `http://localhost:5000`
   - Should see TA AI logo and upload interface
   - Console should show: "TA AI Document Analyzer - Clean Version Loaded"

### Port Configuration

Default ports:
- **Frontend**: 5000
- **Backend**: 8000

To change ports, modify:

**Backend Port:**
```bash
# In server/.env or server/server.js
PORT=3001
```

**Frontend Port:**
```bash
# In frontend-server.js
const PORT = 3000;
```

**CORS Configuration:**
```bash
# In server/server.js, update CORS origin
origin: 'http://localhost:3000'  // Match frontend port
```

## Running the Application

### Development Mode

Both servers must be running simultaneously:

1. **Backend** (Terminal 1): `cd server && npm start`
2. **Frontend** (Terminal 2): `node frontend-server.js`
3. **Access**: Open `http://localhost:5000` in your browser

### Production Mode

For production deployment, consider:

1. **Use PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start server/server.js --name "ta-ai-backend"
   pm2 start frontend-server.js --name "ta-ai-frontend"
   ```

2. **Use reverse proxy (nginx):**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
       }
       
       location /api {
           proxy_pass http://localhost:8000;
       }
   }
   ```

### Production Deployment

1. **Backend**: Deploy the `server/` directory to your preferred Node.js hosting service
2. **Frontend**: Deploy the `src/` directory to a static hosting service
3. **Update API endpoints**: Modify the frontend API calls to point to your production backend URL

## API Documentation

### Backend Endpoints

#### Health Check
- **GET** `/health`
- Returns server status and timestamp

#### File Upload
- **POST** `/api/upload`
- **Body**: `multipart/form-data` with `file` field
- **Response**: Upload confirmation with file URL

#### Document Processing
- **POST** `/api/process`
- **Body**: `{ "fileUrl": "string" }`
- **Response**: Processing results with document segments

#### Processing Status
- **GET** `/api/status/:documentId`
- **Response**: Current processing status

## Usage Instructions

1. **Open the application** in your web browser at `http://localhost:4200`

2. **Upload a PDF file**:
   - Drag and drop a PDF file onto the upload zone, or
   - Click the upload zone to browse and select a file
   - File must be PDF format and under 10MB

3. **Upload to S3**:
   - Click "Upload to S3" button
   - Wait for upload confirmation

4. **Process Document**:
   - Click "Process Document" button
   - Wait for AI processing to complete

5. **View Results**:
   - Browse document segments with confidence scores
   - Expand segments to view detailed content and metadata
   - Download results as JSON file

## Development Notes

### Current Implementation
- **S3 Service**: ✅ **LIVE** - Connected to real AWS S3 bucket (`taai-uploaded-documents` in `eu-north-1`)
- **LandingAI Service**: Currently mocked with generated sample data (awaiting API key)
- **File Storage**: Files uploaded to AWS S3 bucket with automatic cleanup
- **Authentication**: AWS credentials configured via environment variables

### Production Features Active
- ✅ Real AWS S3 integration with your credentials
- ✅ Automatic file upload to S3 bucket
- ✅ Secure private file storage (ACL: private)
- ✅ File metadata tracking and cleanup
- ✅ Presigned URL generation for secure downloads
- ✅ Error handling and validation
- ✅ CORS configured for cross-origin requests

### Next Steps for Full Production
- Add LandingAI API key for real document processing
- Implement user authentication if required
- Add monitoring and logging
- Configure custom domain and SSL

## AWS Cognito Hosted UI Customization

Customize the AWS Cognito login page with your branding:

### Prerequisites
- AWS account with Cognito configured
- Logo image (PNG or JPG) uploaded to a public S3 bucket

### Configuration Steps

1. **Access Cognito Console**
   - Log in to AWS Management Console
   - Navigate to Amazon Cognito
   - Select your user pool

2. **Update App Client Settings**
   - Go to "App integration" > "App client settings"
   - Configure:
     - Callback URL: `http://localhost:8000/auth/callback`
     - Sign out URL: (your sign-out URL)
     - OAuth 2.0: Select `code` grant type
     - Allowed OAuth Scopes: `openid`, `email`, `profile`

3. **Customize UI**
   - Go to "App integration" > "Branding"
   - Under "Cognito Hosted UI", click "Edit"
   - Set:
     - Logo image URL: `https://your-bucket.s3.region.amazonaws.com/logo.png`
     - Logo width: 200px
     - Background color: `#FFFFFF`
     - Font color: `#000000`
     - (Optional) CSS file URL for advanced styling

4. **Advanced Customization (Optional)**
   - Create a CSS file with custom styles
   - Upload to S3 and make it publicly accessible
   - Reference it in the CSS file URL field

### Example CSS
```css
/* Header styling */
.header {
    background-color: #007bff;
    padding: 20px;
    text-align: center;
}

/* Button styling */
button {
    background-color: #28a745;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
}

/* Input field styling */
input {
    border: 1px solid #ced4da;
    padding: 8px;
    border-radius: 4px;
    margin: 5px 0;
}
```

### Testing Your Changes
1. Save all changes in the Cognito console
2. Clear your browser cache
3. Access your login page at: 
   `https://your-domain.auth.region.amazoncognito.com/login`

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 5000 and 8000 are available
2. **File upload errors**: Check file size (max 10MB) and format (PDF only)
3. **CORS errors**: Verify backend CORS configuration allows frontend domain
4. **Processing failures**: Check backend logs for service errors

### Logs and Debugging

- **Backend logs**: Check console output from the server process
- **Frontend logs**: Open browser developer tools console
- **Network requests**: Monitor Network tab in browser developer tools

## License

This project is licensed under the MIT License.

## Support

For technical support or questions about the TA AI Document Analyzer, please refer to the project documentation or contact the development team.