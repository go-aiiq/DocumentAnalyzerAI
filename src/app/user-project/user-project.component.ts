// Angular core
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
// import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpErrorResponse, HttpEventType,HttpClient  } from '@angular/common/http';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
// import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
import { DocumentService } from '../services/document.service';
import { FileSizePipe } from '../pipes/file-size.pipe';
import { AddSectionsComponent } from "../add-sections/add-sections.component";
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
    CommonModule
    
    
    
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
  selectedFile: File | null = null;
  selectedFilename: string = '';

  // UI State
  loading: boolean = false;
  dataLoading: boolean = false;
  viewerOpen: boolean = false;
  showFormView: boolean = false;
  uploadProgress: number = 0; // Tracks file upload progress (0-100)

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
          console.log(this.processFiles());
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
      const pdfFiles = allFiles.filter(f => f.key.toLowerCase().endsWith('.pdf'));

      this.processedFolders[folderName] = pdfFiles.map(pdfFile => {
        const baseKeyWithPdf = pdfFile.key;
        const lastSlashIndex = baseKeyWithPdf.lastIndexOf("/");
        const pathBeforeFile = baseKeyWithPdf.substring(0, lastSlashIndex);
        let fileName = baseKeyWithPdf.substring(lastSlashIndex + 1);
        fileName = fileName.replace(/\.pdf$/i, "");
        const extractedDataPath = `${pathBeforeFile}/extractedData/${fileName}`;
        console.log(extractedDataPath)

        return {
          ...pdfFile,
          hasJson: allFiles.some(f => f.key === extractedDataPath + '.json'),
          isProcessing: allFiles.some(f => f.key === extractedDataPath + '.processing'),
          hasError: allFiles.some(f => f.key === extractedDataPath + '.error'),
        };
      });
    }
    console.log(this.processedFolders)
    
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
    this.selectedFile = null;
    this.selectedFilename = '';
    
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
          this.selectedFile = null;
          this.selectedFilename = '';
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
          console.log("Response: ", resp);
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
  async onFileSelected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedFile = target.files[0] || null;
      this.selectedFilename = this.selectedFile.name;
      this.originalFileUrl = this.selectedFilename;
      this.loading = true;
      this.dataLoading = true;
      this.error = '';
      this.success = '';
      try {

        const fileUrl = await this.uploadFile();
        console.log("fileUrl", fileUrl);
        if (fileUrl) {
          // Backend will automatically process the document
          //this.handleProcessDocument(fileUrl);
        } else {
          console.error("File URL is undefined or null.");
        }
        // this.handleProcessDocument(fileUrl);      

      } catch (err: any) {
        console.error('Upload error:', err);
        this.error = err.message || 'File upload failed';
        this.loading = false;
        this.dataLoading = false;
      }
    }

  }


  validateFile(): void {
    if (!this.selectedFile) return;

    // Check file type
    if (this.selectedFile.type !== 'application/pdf') {
      this.snackBar.open('Please select a PDF file', 'Close', { duration: 3000 });
      // this.selectedFile = null;
      return;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (this.selectedFile.size > maxSize) {
      this.snackBar.open('File size must be less than 10MB', 'Close', { duration: 3000 });
      // this.selectedFile = null;
      return;
    }
  }
  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Deletes a file from the selected folder
   * @param fileKey - The key/path of the file to delete
   */
  deleteFile(fileKey: string): void {
    if (!fileKey || !this.selectedFolder) return;

    if (confirm('Are you sure you want to delete this file?')) {
      this.documentService.deleteFile(fileKey).subscribe({
        next: () => {
          this.snackBar.open('File deleted successfully', 'Close', { duration: 3000 });
          this.refreshFiles();
        },
        error: (err) => {
          console.error('Error deleting file:', err);
          this.snackBar.open('Failed to delete file', 'Close', { duration: 3000 });
        }
      });
    }
  }


  uploadFile(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.selectedFile) {
        this.snackBar.open('No file selected', 'Close', { duration: 3000 });
        reject('No file selected');
        return;
      }

      // Validate file type (PDF only)
      if (this.selectedFile.type !== 'application/pdf') {
        this.snackBar.open('Only PDF files are allowed', 'Close', { duration: 3000 });
        reject('Invalid file type');
        return;
      }

      const formData = new FormData();
      formData.append('file', this.selectedFile);
      formData.append('folderName', this.selectedFolder);

      console.log('Uploading file to folder:', this.selectedFolder);

      // Show loading state
      this.loading = true;
      this.uploadProgress = 0;

      this.documentService.upload(formData).subscribe({
        next: (event: any) => {
          // Handle upload progress
          // console.log("event",event);
          if (event.type === HttpEventType.UploadProgress) {
            this.uploadProgress = Math.round(100 * event.loaded / (event.total || 1));
            // console.log("this.uploadProgress: ",event.type === HttpEventType.Response);
          } 
          else if (event.type === HttpEventType.Response) {
            // Upload complete
            this.snackBar.open('File uploaded successfully', 'Close', { duration: 3000 });
            this.refreshFiles();
            this.processButtonEnabled=true;
            console.log("this.processButtonEnabled: ",this.processButtonEnabled);
            // this.selectedFile = null;
            // this.selectedFilename = '';
            // if (this.fileInput) {
            //   this.fileInput.nativeElement.value = '';
            // }
            this.uploadProgress = 0;

            // const fileUrl = event.body.fileUrl || event.body.url;
            // if (!fileUrl) {
            //   reject('No file URL returned by server');
            // } else {
            //   resolve(fileUrl);
            // }
            this.selectedFile = null;
            this.selectedFilename = '';
            if (this.fileInput) {
              this.fileInput.nativeElement.value = '';
            }}
          
          
        },
        error: (err) => {
          console.error('Upload failed:', err);
          this.snackBar.open('Upload failed. Please try again.', 'Close', { duration: 5000 });
          this.uploadProgress = 0;
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
          
        }
      });

    })
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
        // body: filename
      });

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const safeBlobUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);

      console.log('Viewing PDF:', pdfUrl);
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
  // handleSubmit(fileUrl: any): void {
  //   console.log("Storing extractedData ..");
  //   console.log("FileURL ", fileUrl)
  //   const payload = {
  //     fileurl: fileUrl, // or any custom name
  //     data: this.formData
  //   };
    
  //   this.http.post(`${this.getBaseUrl()}/submit`, payload).subscribe({
  //     next: res => {
  //       console.log('Response received:', res);
  //       // this.success = 'Form submitted!'; 
  //       this.snackBar.open('Changes saved successfully!', 'Close', {
  //         duration: 3000,
  //         verticalPosition: 'bottom'
  //       });
  //     },
  //     error: err => this.error = 'Submission failed'
  //   });
  // }

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
    // this.documentService.getResults(filePath).subscribe(res => {
    //   const newTab = window.open('/results', '_blank');
    //   newTab?.addEventListener('load', () => {
    //     newTab?.postMessage(JSON.stringify({ res: res, filePath: filePath }), window.location.origin);
    //   });
    //   this.datares = res;
    //   this.extractedDataFulldata = JSON.parse(this.datares);
    //   this.extractedData = this.extractedDataFulldata.data;
    //   this.showFormView = true;
    //   this.formData = { ...this.extractedData }
    //   this.handleViewDocument(filePath)
    // })
  }
  scrollToTarget() {
    if (this.targetViewer) {
    this.targetViewer.nativeElement.scrollIntoView({ behavior: 'smooth',block: 'start' });
  }}

  processDocument(filePath:string){
      const key = filePath; // Or however you identify the file
  this.processingMap[key] = true;
  this.viewEnabledMap[key]=false;
     
     this.documentService.requestDocumentProcessing(filePath).subscribe((event:any)=>{

          if (event.type === HttpEventType.UploadProgress) {
            this.processProgress= Math.round(100 * event.loaded / (event.total || 1));
            
          } 
          else if (event.type === HttpEventType.Response) {
            this.processProgress=100;
            this.snackBar.open('File Processed Successfully', 'Close', { duration: 3000 });
            this.processButtonEnabled = true;
           this.processingMap[key] = false;
        
            
          }
          error: () => {
      this.snackBar.open('Upload failed', 'Close', { duration: 3000 });
      this.processingMap[key] = false;
    }
      
      this.viewEnabledMap[key]=true;
      
    })
  }
}