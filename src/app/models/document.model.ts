export interface FileUploadResult {
  success: boolean;
  filename: string;
  url?: string;
  error?: string;
  size?: number;
  uploadTime?: string;
}

export interface UploadResponse {
  success: boolean;
  message?: string;
  progress?: number;
  results?: FileUploadResult[];
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

