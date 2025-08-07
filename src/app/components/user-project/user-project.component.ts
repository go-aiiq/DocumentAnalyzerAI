// Angular core
import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { HttpEventType,HttpClient  } from '@angular/common/http';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

// App components and services
import { CreateProjectDialogComponent } from '../create-project-dialog/create-project-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { DocumentService } from '../../services/document.service';
import { FileSizePipe } from '../../pipes/file-size.pipe';
import { PdfViewerComponent } from '../pdf-viewer/pdf-viewer.component';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-user-project',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatDividerModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    FileSizePipe,
    PdfViewerComponent,
    CommonModule,
    MatProgressSpinnerModule
],
  templateUrl: './user-project.component.html',
  styleUrl: './user-project.component.scss'
})
export class UserProjectComponent {
  @ViewChild('dataPanel') dataPanel!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('targetDiv', { static: false }) targetViewer!: ElementRef;

  // State
  folders: { [folder: string]: any[] } = {};
  processedFolders: { [folder: string]: any[] } = {};
  folderNames: string[] = [];
  selectedFolder: string = 'Property';
  selectedFiles: File[] = [];
  uploadResults: Array<{file: File; success: boolean; message?: string; progress: number}> = [];

  // UI State
  loading: boolean = false;
  dataLoading: boolean = false;
  viewerOpen: boolean = false;
  showFormView: boolean = false;
  uploadProgress: number = 0; // Tracks file upload progress (0-100)
  isCollapsed:boolean = false;
  progress:number=0;
  showCheckmark = false;
  waitingInterval!:any;
  // Data
  formData: Record<string, any> = {};
  extractedData: any = null;
  extractedDataFulldata: any = null;
  error: string = '';
  success: string = '';
  pdfUrl: string = '';
  originalFileUrl: string = '';
  currentPdf: SafeResourceUrl | null = null;
  formgrp: FormGroup = this.fb.group({});
  data: any = null;
  datares: any = null;
  baseurl!:string;
  refreshKey = 0;
  processButtonEnabled:boolean=false;
  enableViewResults:boolean=false;
  processProgress:number=0;
  processingMap: { [key: string]: boolean } = {};
  viewEnabledMap: { [key: string]: boolean } = {};
  // Constants
  readonly Object = Object;

  constructor(private fb: FormBuilder, private http: HttpClient, private documentService: DocumentService, private dialog: MatDialog, private router: Router, private cdr: ChangeDetectorRef, private snackBar: MatSnackBar, private sanitizer: DomSanitizer) {

  }

  /**
   * Format file size in a human-readable format
   * @param bytes File size in bytes
   * @param decimals Number of decimal places to show
   * @returns Formatted file size string
   */
  getFileSize(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Delete a file with confirmation
   * @param fileKey The key of the file to delete
   */
  deleteFile(fileKey: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Confirm Delete',
        message: 'Are you sure you want to delete this file? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.documentService.deleteFile(fileKey).subscribe({
          next: () => {
            this.snackBar.open('File deleted successfully', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            // Refresh the file list
             this.refreshFiles();
          },
          error: (error) => {
            console.error('Error deleting file:', error);
            this.snackBar.open(`Error deleting file: ${error.message || 'Unknown error'}`, 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  ngOnInit(): void {
    // Set default view to dashboard
    this.selectedFolder = 'Project';

    // Load folders and files
    this.loadFolders();
    const baseurl=this.getBaseUrl();
    
  }
  getBaseUrl(){
    if((window.location.hostname)==='localhost'){
    return 'http://localhost:8000/api';
  }
  if((window.location.hostname).includes('elasticbeanstalk')){
    return 'https://documentanalyzer.eu-north-1.elasticbeanstalk.com/api';
  }
  return 'https://documentanalyzer.eu-north-1.elasticbeanstalk.com/api';
  


  }
  
  /**
   * Loads folders and their files from the server
   */
  private loadFolders(): void {
    this.loading = true;
    this.documentService.getFiles().subscribe({
      next: (res) => {
        this.loading = false;
        if (res && res.response) {
          this.folders = res.response;
          this.folderNames = Object.keys(this.folders);
        } else {
          console.warn('No folders available');
          this.folders = {};
          this.folderNames = [];
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading folders:', error);
        this.snackBar.open('Failed to load properties', 'Close', { duration: 3000 });
        this.folders = {};
        this.folderNames = [];
      }
    });
  }

  private processFiles(): void {
    this.processedFolders = {};
    for (const folderName of this.folderNames) {
      const allFiles = this.folders[folderName] || [];
      const pdfFiles = allFiles.filter(f => !/sectionsPDFs?\//i.test(f.key) &&( f.key.toLowerCase().endsWith('.pdf')));
      console.log(pdfFiles);
      // const pdfFiles = allFiles.filter(f => !f.key.endsWith('/'))
      this.processedFolders[folderName] = pdfFiles.map(pdfFile => {
        const baseKeyWithPdf = pdfFile.key;
        const lastSlashIndex = baseKeyWithPdf.lastIndexOf("/");
        const pathBeforeFile = baseKeyWithPdf.substring(0, lastSlashIndex);
        let fileName = baseKeyWithPdf.substring(lastSlashIndex + 1);
        fileName = fileName.replace(/\.pdf$/i, "");
        const extractedDataPath = `${pathBeforeFile}/extractedData/${fileName}`;

        return {
          ...pdfFile,
          hasJson: allFiles.some(f => f.key === extractedDataPath + '.json'),
          isProcessing: allFiles.some(f => f.key === extractedDataPath + '.processing'),
          hasError: allFiles.some(f => f.key === extractedDataPath + '.error'),
        };
      });
    }
    
  }

  containsFiles(): boolean {
    const files = this.folders[this.selectedFolder];
    return Array.isArray(files) && files.some(file => !file.key.endsWith('/'));
  }

  getFileName(key: string): string {
    return key.split('/').pop() || key;
  }

  selectFolder(folder: string): void {
    // Only update the selected folder without refreshing files
    this.selectedFolder = folder;
    this.selectedFiles = [];
    this.uploadResults = [];
    
    this.refreshKey++;
    // Only refresh files if not selecting the dashboard
    if (folder !== 'Project') {
      this.refreshFiles();      
    }
  }

  confirmDeleteFolder(folderName: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Property',
        message: `Are you sure you want to delete the property "${folderName}"? This action cannot be undone.`,
        confirmText: 'Delete Property'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteFolder(folderName);
      }
    });
  }

  private deleteFolder(folderName: string): void {
    this.loading = true;
    this.documentService.deleteFolder(folderName).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open(`Property "${folderName}" deleted successfully`, 'Close', { duration: 3000 });

        // If the deleted folder was selected, reset to dashboard
        if (this.selectedFolder === folderName) {
          this.selectedFolder = 'Project';
          this.selectedFiles = [];
          this.uploadResults = [];
        }

        // Reload the folders to reflect the deletion
        this.loadFolders();
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(`Failed to delete property: ${error.message}`, 'Close', { duration: 5000 });
        console.error('Error deleting folder:', error);
        this.snackBar.open(`Failed to delete property "${folderName}"`, 'Close', { duration: 3000 });
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  /**
   * Returns the total number of properties
   */
  getTotalPropertiesCount(): number {
    return this.folderNames.length;
  }

  /**
   * Counts the number of files in a given folder
   * @param folderName - Name of the folder to count files in
   * @returns Number of files in the folder (excluding directories)
   */
  getFileCount(folderName: string): number {
    if (!this.folders[folderName]) {
      return 0;
    }
    // Filter out directories (entries ending with '/') and count the rest
    return this.folders[folderName].filter(file => !file.key.endsWith('/')).length;
  }

  openCreateDialog() {
    this.dialog.open(CreateProjectDialogComponent).afterClosed().subscribe(data => {
      if (data) {
        this.documentService.projectNameInput(data).subscribe(resp => {
          this.refreshFiles();
          this.selectedFolder = data;
        });

      }
    }
    );
  }
  
  refreshFiles(): void {
    this.documentService.getFiles().subscribe(res => {
      if (res?.response) {
        this.folders = res.response;
        this.folderNames = Object.keys(this.folders);
        // Preserve selected folder if still present
        if (!this.folderNames.includes(this.selectedFolder)) {
          this.selectedFolder = this.folderNames[0] || '';
        }
        this.processFiles();
        this.cdr.detectChanges();
      }
    });
  }
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.uploadFiles(files);
    }
  }

  async uploadFiles(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;

    this.loading = true;
    
    // Initialize upload results
    this.uploadResults = files.map(file => ({
      file,
      success: false,
      progress: 0,
      message: 'Waiting to upload...'
    }));
    
    // Track active subscriptions for cleanup
    const subscriptions: { [key: number]: any } = {};
    
    try {
      const folderName = this.selectedFolder === 'Project' ? undefined : this.selectedFolder;
      
      // Update progress for each file
      const updateProgress = (index: number, progress: number, message?: string) => {
        if (index >= 0 && index < this.uploadResults.length) {
          this.uploadResults[index].progress = progress;
          if (message) {
            this.uploadResults[index].message = message;
          }
          this.cdr.detectChanges();
        }
      };
      
      // Upload files in parallel
      const uploadPromises = files.map((file, index) => {
        const formData = new FormData();
        formData.append('files', file);
        if (folderName) {
          formData.append('folderName', folderName);
        }
        
        return new Promise<void>((resolve) => {
          subscriptions[index] = this.documentService.upload(formData).subscribe({
            next: (event) => {
              try {
                if (event.type === HttpEventType.UploadProgress) {
                  // Calculate progress
                  const progress = Math.min(99, Math.round(100 * (event.loaded / (event.total || 1))));
                  updateProgress(index, progress, 'Uploading...');
                } else if (event.type === HttpEventType.Response) {
                  // Handle successful response
                  const response = event.body;
                  if (response?.success) {
                    updateProgress(index, 100, 'Upload complete!');
                    this.uploadResults[index].success = true;
                    this.uploadResults[index].message = 'Upload successful';
                    this.snackBar.open(`Successfully uploaded ${file.name}`, 'Close', {
                      duration: 3000,
                      panelClass: ['success-snackbar']
                    });
                    
                    // Refresh the file list after a short delay to ensure the file is available
                    setTimeout(() => {
                      this.refreshFiles();
                    }, 1000);
                    
                  } else {
                    throw new Error(response?.message || 'Unknown error during upload');
                  }
                }
              } catch (error: any) {
                console.error(`Error processing upload for ${file.name}:`, error);
                updateProgress(index, 100, `Error: ${error?.message || 'Upload failed'}`);
              }
            },
            error: (error) => {
              console.error(`Error uploading ${file.name}:`, error);
              updateProgress(index, 100, `Error: ${error.message || 'Upload failed'}`);
              this.uploadResults[index].success = false;
              resolve();
            },
            complete: () => {
              if (subscriptions[index]) {
                subscriptions[index].unsubscribe();
                delete subscriptions[index];
              }
              resolve();
            }
          });
        });
      });
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
      // Final refresh to ensure all files are up to date
      this.refreshFiles();
      this.loading = false;
      
    } catch (error) {
      console.error('Error during file uploads:', error);
      this.snackBar.open('Error uploading one or more files', 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      // Clean up any remaining subscriptions
      Object.values(subscriptions).forEach(sub => {
        if (sub && !sub.closed) {
          sub.unsubscribe();
        }
      });
      
      this.loading = false;
      // Reset file input
      if (this.fileInput) {
        this.fileInput.nativeElement.value = '';
      }
      
      // Auto-clear success messages after delay
      setTimeout(() => {
        this.uploadResults = this.uploadResults.filter(r => !r.success);
        this.cdr.detectChanges();
      }, 10000);
    }
  }


  async handleViewDocument(filename: string): Promise<void> {
    try {
      this.loading = true;
      this.error = '';

      const encodedFilename = encodeURIComponent(filename);
      const pdfUrl = filename;

      const response = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      });

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const safeBlobUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);

      this.currentPdf = safeBlobUrl;
      this.viewerOpen = true;
    } catch (err: any) {
      console.error('Error loading PDF:', err);
      this.error = `Failed to load PDF: ${err.message}`;
      this.viewerOpen = false;
    } finally {
      this.loading = false;
    }
  }

  extractedKeys(): string[] {
    return Object.keys(this.extractedData || {}).filter(k => k !== 'status' && typeof this.extractedData[k] !== 'object');
  }


  formatLabel(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  }

  createFormFromJson(json: Record<string, any>): FormGroup {
    const formControls = Object.keys(json).reduce((acc, key) => {
      acc[key] = [json[key]];
      return acc;
    }, {} as { [key: string]: any });
    // console.log(this.fb.group(formControls))
    return this.fb.group(formControls);
  }

  scrollToDataPanel() {
    this.dataPanel.nativeElement.scrollIntoView({ behavior: 'smooth' })
  }

  viewResults(filePath: any) {
    const urlTree = this.router.createUrlTree(['/results'], {
      queryParams: { filePath }
    })
    const fullUrl = this.router.serializeUrl(urlTree);
    window.open(fullUrl, '_blank');
  }

  scrollToTarget() {
    if (this.targetViewer) {
    this.targetViewer.nativeElement.scrollIntoView({ behavior: 'smooth',block: 'start' });
  }}

  processDocument(filePath:string){
    const key = filePath; 
    this.processProgress = 0;
    this.processingMap[key] = true;
    this.viewEnabledMap[key]=false;
     
    this.documentService.requestDocumentProcessing(filePath).subscribe((event:any)=>{
          // this.startProgress();

          if (event.type === HttpEventType.UploadProgress) {
            const actualProgress = Math.round(80 * event.loaded / (event.total || 1));
            this.smoothProgressUpdate(actualProgress);
            
          } 
          
          else if (event.type === HttpEventType.Response) {
            if (event.body.success){
              this.completeProgressTo100();
              this.processingMap[key] = false;
              this.snackBar.open('File Processed Successfully', 'Close', { duration: 3000 });
              this.processButtonEnabled = true;
              
            }

          }
          // else{
          //   this.snackBar.open('Upload failed', 'Close', { duration: 3000 });
          //   this.processingMap[key] = false;

          // }
      this.viewEnabledMap[key]=true;
      
    })
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  smoothProgressUpdate(targetProgress: number) {
  const delay = 30;
  const interval = setInterval(() => {
  const remaining = targetProgress - this.processProgress;
  const step = Math.max(1, Math.floor(remaining / 5)); // dynamic step
  this.processProgress = Math.min(this.processProgress + step, targetProgress);

  if (this.processProgress >= targetProgress) {
    clearInterval(interval);
  }
}, delay);
}

completeProgressTo100() {
  const interval = setInterval(() => {
    if (this.processProgress < 100) {
      this.processProgress += 1; // or adjust step for speed
    } else {
      clearInterval(interval);
    }
  }, ); // change delay for pace control
}
}