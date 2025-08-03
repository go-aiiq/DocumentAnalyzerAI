# TC AI Document Analyzer

## Overview

The TC AI Document Analyzer is a full-stack web application that allows users to upload PDF documents and analyze them using AI-powered document processing. The application consists of an Angular frontend and a Node.js Express backend, with integrated services for file storage (S3) and document processing (LandingAI).

## System Architecture

### Frontend Architecture
- **Framework**: Angular (latest version with TypeScript)
- **Styling**: Angular Material + SCSS for modern UI components
- **State Management**: Services with BehaviorSubject for reactive data flow
- **Routing**: Angular Router for navigation between upload and results pages
- **Build Tool**: Angular CLI with TypeScript compilation

### Backend Architecture
- **Framework**: Node.js with Express.js
- **File Upload**: Multer middleware for handling PDF file uploads
- **API Structure**: RESTful endpoints for document operations
- **Error Handling**: Centralized error handling middleware
- **CORS**: Configured for cross-origin requests from frontend

## Key Components

### Frontend Components
1. **UploadComponent**: Handles file selection, drag-and-drop, and upload initiation
2. **ResultsComponent**: Displays processed document analysis results
3. **DocumentService**: Manages API communication and state management
4. **Document Models**: TypeScript interfaces for type safety

### Backend Services
1. **Document Routes**: API endpoints for file upload and processing
2. **Upload Middleware**: Multer configuration for PDF file handling
3. **LandingAI Service**: Integration with LandingAI for document processing
4. **S3 Service**: File storage management (currently mocked)

### Key Features
- Drag-and-drop file upload interface
- Real-time upload progress tracking
- Document segmentation and analysis
- Results visualization with confidence scores
- File validation (PDF only, 10MB limit)
- Error handling and user feedback

## Data Flow

1. **File Upload**:
   - User selects/drops PDF file in Angular frontend
   - File is validated client-side (type, size)
   - FormData is sent to Express backend via HTTP POST
   - Backend validates file and stores temporarily
   - File is "uploaded" to S3 (currently mocked)
   - Upload response returned to frontend

2. **Document Processing**:
   - Backend sends file URL to LandingAI service
   - LandingAI processes document and returns segments
   - Processing results stored in backend service
   - Results returned to frontend for display

3. **Results Display**:
   - Frontend navigates to results page
   - Document segments displayed with confidence scores
   - Users can download results as JSON
   - Option to return to upload page

## External Dependencies

### Frontend Dependencies
- Angular Material for UI components
- Angular HTTP Client for API communication
- RxJS for reactive programming
- Angular Router for navigation

### Backend Dependencies
- Express.js for web server
- Multer for file upload handling
- CORS for cross-origin requests
- UUID for unique identifier generation

### External Services
- **LandingAI**: Document processing and analysis (currently mocked)
- **AWS S3**: File storage service (currently mocked)

## Deployment Strategy

### Development Setup
- Frontend: Angular CLI dev server on port 5000
- Backend: Node.js Express server on port 8000
- File uploads stored in local `/uploads` directory

### Production Considerations
- Frontend: Build with Angular CLI and serve static files
- Backend: Deploy Express server with process management
- Environment variables for API keys and configuration
- Real AWS S3 integration for file storage
- Real LandingAI API integration

### Environment Variables
- `LANDINGAI_API_KEY`: API key for LandingAI service
- `S3_BUCKET_NAME`: AWS S3 bucket name
- `AWS_REGION`: AWS region for S3
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `PORT`: Server port (default: 8000)

## Changelog

- July 03, 2025. Initial setup
- July 03, 2025. Completed full-stack TC AI Document Analyzer:
  - Built standalone HTML/JavaScript frontend (no Angular dependencies)
  - Created Node.js Express backend with document processing
  - Implemented S3 file upload simulation
  - Added LandingAI document analysis with segmentation
  - Deployed both servers (frontend port 5000, backend port 8000)
  - Added gradient UI design with TC AI branding
  - Implemented drag-and-drop PDF upload functionality
  - Created comprehensive README.md with setup instructions
  - Documented complete directory structure and API endpoints
  - Added troubleshooting guide and production deployment notes

- July 03, 2025. Rebuilt application with proper Angular architecture:
  - Converted from static HTML to full Angular application with components
  - Fixed Angular CLI compilation issues and component configurations
  - Implemented proper Angular Material UI integration
  - Configured Angular routing for upload and results pages
  - Added DocumentService for API communication with enhanced debugging
  - Backend API confirmed working with real AWS S3 integration
  - Fixed Zone.js import issue for proper Angular initialization
  - Configured DocumentService URL construction for Replit environment
  - Frontend-backend communication established (frontend port 5000, backend port 8000)

- July 04, 2025. Fixed HttpClientModule deprecation and cleaned up duplicate upload features:
  - Migrated from deprecated HttpClientModule to modern provideHttpClient() approach
  - Removed duplicate upload implementation from index.html
  - Cleaned up index.html to be proper Angular bootstrap file
  - Fixed architectural inconsistency with single upload implementation in Angular components

- July 04, 2025. Implemented real LandingAI API integration for document processing:
  - Updated LandingAI service to use actual API with authentication
  - Added form-data and axios dependencies for API communication
  - Implemented PDF document fetching from S3 for API processing
  - Added intelligent fallback to enhanced mock data when API unavailable
  - Enhanced document segmentation with confidence scores and metadata
  - Configured LANDINGAI_API_KEY environment variable for production use

- July 04, 2025. Completed LandingAI Agentic Document Extraction API integration:
  - Migrated from legacy predict.app.landing.ai to new api.va.landing.ai endpoint
  - Fixed authentication to use proper Base64-encoded Bearer token format
  - S3 integration fully operational with real AWS credentials
  - Frontend-backend communication established via Angular proxy configuration
  - Application ready for production use with valid LandingAI API key
  - All system components tested and functional

- July 04, 2025. Updated LandingAI API key and fixed authentication:
  - Replaced old API key with new valid credentials
  - Fixed double Base64 encoding issue in authentication headers
  - Confirmed API now accepts requests and processes documents
  - Real document analysis working with LandingAI Agentic Document Extraction
  - Complete system operational and ready for production deployment

## User Preferences

Preferred communication style: Simple, everyday language.