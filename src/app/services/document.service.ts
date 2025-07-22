import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { 
  UploadResponse, 
  ProcessingResult, 
  DocumentSegment,
  LandingAIResponse, 
  FolderResponse
} from '../models/document.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private baseUrl: string;
  private processingResultSubject = new BehaviorSubject<ProcessingResult | null>(null);

  constructor(private http: HttpClient) { 
    this.baseUrl = this.getBaseUrl();
    console.log('=== DocumentService Initialization ===');
    console.log('DocumentService initialized with baseUrl:', this.baseUrl);
    console.log('Current hostname:', window.location.hostname);
    console.log('Current protocol:', window.location.protocol);
    console.log('Current port:', window.location.port);
    console.log('Current href:', window.location.href);
    console.log('=== End DocumentService Initialization ===');
    
    // Backend connection will be tested during first API call
  }



   getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      
      // For Replit environment, use proxy configuration
      if (hostname.includes('replit.dev') || hostname.includes('replit.co')) {
        // Use relative path to leverage Angular proxy configuration
        // This avoids CORS issues and mixed content (HTTPS/HTTP) problems
        const backendUrl = '/api';
        console.log('Replit environment detected, using proxy URL:', backendUrl);
        return backendUrl;
      }
      
      // For localhost development
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8000/api';
        // return 
      }

      //for beanstalk 
      if (hostname.includes('elasticbeanstalk') ){
        return 'https://documentanalyzer.eu-north-1.elasticbeanstalk.com/api';
        // return 
      }
    }
    
    // Default fallback
    return 'https://documentanalyzer.eu-north-1.elasticbeanstalk.com/api';
  }

   projectNameInput(value: string | null | undefined): Observable<any>{
     const url = `${this.baseUrl}/input`;
     console.log("Value: ", value);
      return this.http.post(
        url,
        {
          value
        },
        {
          withCredentials:true
        });
      // ).subscribe(resp=>{
      //   console.log("IP resp: "+resp);
      // });
      
      // return resp;
  }

loginRequest(){
  const loginUrl=`${this.baseUrl}/auth/login`;
  return this.http.get(
    loginUrl,
    {
      withCredentials:true
    }
  )
}

getFiles(): Observable<any> {
  const foldersUrl = `${this.baseUrl}/getFiles`;
  return this.http.post<any>(
    foldersUrl,
    {},
    {
      withCredentials: true
    }
  );
}

deleteFolder(folderName: string): Observable<any> {
    return this.http.request('delete', `${this.baseUrl}/deleteFolder`, {
      body: { folderName },
      withCredentials: true,
      responseType: 'json',
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      catchError(error => {
        console.error('Error deleting folder:', error);
        let errorMessage = 'An error occurred while deleting the folder';
        
        if (error.error && error.error.error) {
          errorMessage = error.error.error;
        } else if (error.status === 401) {
          errorMessage = 'You are not authorized to delete this folder';
        } else if (error.status === 404) {
          errorMessage = 'Folder not found or already deleted';
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  upload(formData: FormData): Observable<any> {
    const uploadUrl = `${this.baseUrl}/upload`;
    console.log('Uploading file to:', uploadUrl);
    
    // Log form data for debugging
    for (let pair of (formData as any).entries()) {
      console.log(pair[0] + ': ', pair[1]);
    }
    
    return this.http.post(uploadUrl, formData, {
      withCredentials: true,
      reportProgress: true,
      observe: 'events'
    });
  }

  async uploadFile(file: File): Promise<UploadResponse> {
    console.log('=== DocumentService.uploadFile() called ===');
    console.log('Base URL:', this.baseUrl);
    console.log('File:', file.name, file.size, 'bytes');
    
    const formData = new FormData();
    formData.append('file', file);

    const uploadUrl = `${this.baseUrl}/upload`;
    console.log('Full upload URL:', uploadUrl);

    try {
      console.log('Sending HTTP POST request...');
      const response = await this.http.post<UploadResponse>(
        uploadUrl,
        formData,
        {
          headers: {
            'Accept': 'application/json'
          },
          withCredentials:true
        }
        
      ).toPromise();

      console.log('HTTP response received:', response);
      
      if (!response) {
        console.error('Empty response from server');
        throw new Error('Upload failed - empty response');
      }

      console.log('Upload successful:', response);
      return response;
    } catch (error: any) {
      console.error('=== Upload Error Details ===');
      console.error('Error object:', error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error status:', error?.status);
      console.error('Error code:', error?.code);
      console.error('Error statusText:', error?.statusText);
      console.error('Error url:', error?.url);
      console.error('=== End Error Details ===');
      throw error;
    }
  }

  async requestDocumentProcessing(fileUrl: string): Promise<ProcessingResult> {
    try {
      // Send HTTP request to backend API - actual processing happens in backend LandingAI service
      const response = await this.http.post<ProcessingResult>(
        `${this.baseUrl}/process`,
        { fileUrl }
      ).toPromise();
      console.log("Processing response:", response);
      if (!response) {
        throw new Error('Processing request failed');
      }

      return response;
    } catch (error) {
      console.error('Processing error:', error);
      throw error;
    }
  }

  setProcessingResult(result: ProcessingResult): void {
    this.processingResultSubject.next(result);
  }

  getProcessingResult(): ProcessingResult | null {
    return this.processingResultSubject.value;
  }

  clearProcessingResult(): void {
    this.processingResultSubject.next(null);
  }

  /**
   * Deletes a file from the server
   * @param fileKey - The key/path of the file to delete
   */
  deleteFile(fileKey: string): Observable<any> {
    const deleteUrl = `${this.baseUrl}/delete`;
    return this.http.post(
      deleteUrl,
      { fileKey },
      { withCredentials: true }
    );
  }
}
