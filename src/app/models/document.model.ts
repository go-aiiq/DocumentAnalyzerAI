export interface UploadResponse {
  success: boolean;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadTime: string;
}

export interface DocumentSegment {
  type: 'text' | 'table' | 'image' | 'header' | 'footer';
  content: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  metadata?: { [key: string]: any };
}

export interface ProcessingResult {
  documentId: string;
  status: 'processing' | 'completed' | 'failed';
  segments: DocumentSegment[];
  processingTime: number;
  totalPages: number;
  createdAt: string;
}

export interface LandingAIResponse {
  document_id: string;
  status: string;
  results: {
    segments: Array<{
      type: string;
      content: string;
      confidence: number;
      bounding_box: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      metadata?: { [key: string]: any };
    }>;
  };
  processing_time: number;
  total_pages: number;
}

export interface S3File {
  key: string;
  size: number;
  lastModified?: string;
}

export interface FolderResponse {
  response: {
    [folderName: string]: S3File[];
  };
}

