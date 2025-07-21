import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import {MatFormFieldModule } from  '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { DocumentService } from '../../services/document.service';
import { UploadResponse } from '../../models/document.model';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { CreateProjectDialogComponent } from 'src/app/create-project-dialog/create-project-dialog.component';

@Component({
  selector: 'app-upload',
  standalone: false,
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent implements OnInit {
  selectedFile: File | null = null;
  uploadProgress: number = 0;
  isUploading: boolean = false;
  isProcessing: boolean = false;
  uploadedFileUrl: string = '';
  isDragOver: boolean = false;
  // projectNamefg = new FormGroup({
  //     inputValue: new FormControl<string>('')
  //   });
  value!: string;
  constructor(
    private documentService: DocumentService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog:MatDialog
  ) {
    console.log('UploadComponent initialized');
    // Force DocumentService initialization to see debugging logs
    console.log('DocumentService instance:', this.documentService);
    console.log('Testing DocumentService initialization...');
  }

  ngOnInit(): void {
    console.log('Upload page is visible');
    console.log('Results page is hidden');
    console.log('Logo found and application is ready');
  }


  openCreateDialog(){
    this.dialog.open(CreateProjectDialogComponent).afterClosed().subscribe(data=>{
      if(data){
        this.documentService.projectNameInput(data).subscribe(resp=>{
          console.log("Response:" , resp);
        });
        this.router.navigate(['/upload']);
      }
    });
  }

  // onCreateProject(){
  //   const value = this.projectNamefg.value.inputValue;
  //   this.documentService.projectNameInput(value).subscribe(resp=>{
  //     console.log("IP resp: ", resp);
  //   });
  //   console.log("F.E value: "+value);
  // }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedFile = target.files[0];
      this.validateFile();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.selectedFile = event.dataTransfer.files[0];
      this.validateFile();
    }
  }

  validateFile(): void {
    if (!this.selectedFile) return;

    // Check file type
    if (this.selectedFile.type !== 'application/pdf') {
      this.snackBar.open('Please select a PDF file', 'Close', { duration: 3000 });
      this.selectedFile = null;
      return;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (this.selectedFile.size > maxSize) {
      this.snackBar.open('File size must be less than 10MB', 'Close', { duration: 3000 });
      this.selectedFile = null;
      return;
    }
  }

  async uploadFile(): Promise<void> {
    if (!this.selectedFile) {
      this.snackBar.open('Please select a file first', 'Close', { duration: 3000 });
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        this.uploadProgress += 10;
        if (this.uploadProgress >= 90) {
          clearInterval(progressInterval);
        }
      }, 200);

      // Use DocumentService for consistent URL handling
      console.log('Starting upload with DocumentService...');
      const result = await this.documentService.uploadFile(this.selectedFile);
      console.log('Upload result:', result);
      
      clearInterval(progressInterval);
      this.uploadProgress = 100;
      
      if (result.success) {
        this.uploadedFileUrl = result.fileUrl;
        this.snackBar.open('File uploaded successfully to S3!', 'Close', { duration: 3000 });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      this.snackBar.open('Upload failed. Please try again.', 'Close', { duration: 3000 });
    } finally {
      this.isUploading = false;
    }
  }

  async processDocument(): Promise<void> {
    if (!this.uploadedFileUrl) {
      this.snackBar.open('Please upload a file first', 'Close', { duration: 3000 });
      return;
    }

    this.isProcessing = true;

    try {
      console.log('Frontend: Starting document processing for:', this.uploadedFileUrl);
      const result = await this.documentService.requestDocumentProcessing(this.uploadedFileUrl);
      
      console.log('Frontend: Processing completed! Result:', result);
      console.log('Frontend: Document ID:', result.documentId);
      console.log('Frontend: Segments count:', result.segments?.length || 0);
      
      // Store the result and navigate to results page
      this.documentService.setProcessingResult(result);
      console.log('Frontend: Navigating to results page...');
      this.router.navigate(['/results']);
    } catch (error) {
      console.error('Processing failed:', error);
      this.snackBar.open('Document processing failed. Please try again.', 'Close', { duration: 3000 });
    } finally {
      this.isProcessing = false;
    }
  }

  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }


}
