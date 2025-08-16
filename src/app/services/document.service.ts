import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, Subject, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { 
  UploadResponse, 
  ProcessingResult, 
  DocumentSegment,
  LandingAIResponse, 
  FolderResponse,
  FileUploadResult
} from '../models/document.model';
import { Section } from '../components/add-sections/add-sections.component';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private baseUrl: string;
  private processingResultSubject = new BehaviorSubject<ProcessingResult | null>(null);
  private refreshSectionsSubject = new Subject<void>();
  refreshSections$ = this.refreshSectionsSubject.asObservable();
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

getResults(filePath: string) {
  return this.http.post(`${this.getBaseUrl()}/getResults`, {
    filename: filePath
  })
}

submitResult(fileUrl:string,formData:any) {
  return this.http.post(`${this.getBaseUrl()}/submit`,{
    fileurl:fileUrl,
    data:formData
  });
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

  upload(formData: FormData): Observable<HttpEvent<UploadResponse>> {
    const uploadUrl = `${this.baseUrl}/upload`;
    console.log('Uploading files to:', uploadUrl);
    
    // Log form data for debugging
    for (const [key, value] of (formData as any).entries()) {
      if (value instanceof File) {
        console.log(`${key}: ${value.name} (${value.size} bytes)`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }
    
    const options = {
      withCredentials: true,
      reportProgress: true,
      observe: 'events' as const,
      responseType: 'json' as const
    };

    return this.http.post<UploadResponse>(uploadUrl, formData, options).pipe(
      catchError((error: any) => {
        console.error('Upload error:', error);
        if (error.error instanceof ErrorEvent) {
          // Client-side error
          console.error('Client-side error:', error.error.message);
        } else {
          // Server-side error
          console.error(`Server returned code ${error.status}, error: ${error.statusText}`);
        }
        return throwError(() => new Error('An error occurred while uploading the file'));
      })
    );
  }

  async uploadFiles(files: File[], folderName?: string): Promise<UploadResponse> {
    console.log('=== DocumentService.uploadFiles() called ===');
    console.log('Base URL:', this.baseUrl);
    console.log('Files to upload:', files.map(f => `${f.name} (${f.size} bytes)`).join(', '));
    
    const formData = new FormData();
    
    // Add all files to FormData
    files.forEach(file => {
      formData.append('files', file);
    });
    
    // Add folder name if provided
    if (folderName) {
      formData.append('folderName', folderName);
    }

    try {
      console.log('Sending HTTP POST request...');
      const response = await new Promise<UploadResponse>((resolve, reject) => {
        const subscription = this.http.post<UploadResponse>(
          `${this.baseUrl}/upload`,
          formData,
          {
            headers: {
              'Accept': 'application/json'
            },
            withCredentials: true,
            reportProgress: true,
            observe: 'events'
          }
        ).pipe(
          map(event => this.getEventMessage(event))
        ).subscribe({
          next: (result) => {
            if (result.success) {
              resolve(result);
            } else if (result.progress !== undefined) {
              // Handle progress updates
              console.log(`Upload progress: ${result.progress}%`);
            }
          },
          error: (error) => {
            console.error('Upload error:', error);
            reject(error);
          },
          complete: () => {
            // This will be called after the observable completes
            subscription.unsubscribe();
          }
        });
      });

      console.log('Upload completed with results:', response);
      return response;
    } catch (error: unknown) {
      console.error('Error uploading files:', error);
      
      // Create error results for all files
      const errorResults: FileUploadResult[] = files.map(file => ({
        success: false,
        filename: file.name,
        error: 'Upload failed',
        size: file.size
      }));

      // Format error response based on error type
      let errorMessage = 'Upload failed';
      
      if (error instanceof HttpErrorResponse) {
        // HTTP error
        if (error.error instanceof ErrorEvent) {
          // Client-side error
          const clientError = error.error;
          console.error('Client-side error:', clientError.message);
          errorMessage = `Client error: ${clientError.message}`;
          errorResults.forEach(r => r.error = clientError.message);
        } else {
          // Server-side error
          const status = error.status || 0;
          const statusText = error.statusText || 'Unknown server error';
          const serverError = (error.error && typeof error.error === 'object' && 'message' in error.error) 
            ? String(error.error.message) 
            : statusText;
          
          console.error(`Server error: ${status} - ${statusText}`, error.error);
          errorMessage = `Server error: ${status} - ${serverError}`;
          errorResults.forEach(r => r.error = serverError);
        }
      } else if (error instanceof Error) {
        // General error
        console.error('Upload failed:', error.message);
        errorMessage = error.message;
        errorResults.forEach(r => r.error = error.message);
      } else {
        // Unknown error type
        console.error('Unknown error during file upload');
        errorMessage = 'An unknown error occurred during file upload';
        errorResults.forEach(r => r.error = errorMessage);
      }
      
      // Return the formatted error response
      return {
        success: false,
        message: errorMessage,
        results: errorResults
      };
    }
  }

  requestDocumentProcessing(fileUrl: string): Observable<any> {
    try {
      // Send HTTP request to backend API - actual processing happens in backend LandingAI service
      const response = this.http.post<ProcessingResult>(
        `${this.baseUrl}/process`,
        { fileUrl:fileUrl},
        {
          reportProgress: true,
          observe: 'events'
         }
      );
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


  //get Available sections
  getAvailableSections(){
    return this.http.get<string[]>(`${this.baseUrl}/getSections`);
  }

  //addSections
  addSection(section: any,fileurl:string) {    
    const payload = {
      section:section,
      fileurl:fileurl
    }
    return this.http.post(`${this.baseUrl}/addSections`, payload);
  }

  getCreatedSections(fileurl:string){
    return this.http.post(`${this.baseUrl}/getCreatedSections`,{
      fileurl:fileurl
    } );
  }

  downloadAllSections(fileurl:string){
    return this.http.post(`${this.baseUrl}/downloadAllSections`,{
      fileurl:fileurl
    });
  }

  triggerRefresh() {
    this.refreshSectionsSubject.next();
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse) {
    console.error('HTTP Error:', error);
    
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status) {
      // Server-side error
      errorMessage = `Server returned code ${error.status}, error: ${error.statusText}`;
      
      // Add more specific error messages based on status code
      if (error.status === 401) {
        errorMessage = 'You are not authorized to perform this action';
      } else if (error.status === 403) {
        errorMessage = 'You do not have permission to perform this action';
      } else if (error.status === 404) {
        errorMessage = 'The requested resource was not found';
      } else if (error.status >= 500) {
        errorMessage = 'A server error occurred. Please try again later.';
      }
      
      // Try to get more detailed error message from response body
      if (error.error && typeof error.error === 'object' && 'message' in error.error) {
        errorMessage = error.error.message;
      } else if (error.error) {
        errorMessage = String(error.error);
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
  
  /**
   * Handle HTTP events during file upload
   */
  private getEventMessage(event: HttpEvent<UploadResponse>): UploadResponse {
    switch (event.type) {
      case HttpEventType.Sent:
        console.log('Request sent');
        return { success: false, message: 'Upload started' };
        
      case HttpEventType.UploadProgress:
        // Progress is handled by the component
        const percentDone = Math.round(100 * (event.loaded / (event.total || 1)));
        console.log(`File upload progress: ${percentDone}%`);
        return { 
          success: false, 
          message: 'Upload in progress',
          progress: percentDone
        };
        
      case HttpEventType.Response:
        // The backend returned a successful response
        console.log('Upload complete', event.body);
        return event.body || { success: true, message: 'Upload completed successfully' };
        
      default:
        console.log('Unknown event type:', event.type);
        return { success: false, message: 'Upload in progress' };
    }
  }

  deleteSection(filename:string,section:Section){
    console.group("Section: ",section);
    return this.http.post(`${this.baseUrl}/deleteSection`,{
      filename:filename,
      section:section
    });
  }
  updateSection(filename:string,section :Section){
    return this.http.post(`${this.baseUrl}/updateSection`,{
      filename:filename,
      section:section
    })
  }

  downloadSection(fileurl:string,section:Section){
    return this.http.post(`${this.baseUrl}/downloadSection`,{
      fileurl:fileurl,
      section:section
    });
  }

  
}
