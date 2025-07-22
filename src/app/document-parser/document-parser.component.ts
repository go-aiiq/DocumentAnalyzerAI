import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, Pipe, ViewChild } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatInputModule } from "@angular/material/input";
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-document-parser',
  imports: [MatListModule, MatProgressBarModule, MatProgressSpinnerModule, MatInputModule, FormsModule, CommonModule],
  templateUrl: './document-parser.component.html',
  styleUrl: './document-parser.component.scss'
})


export class DocumentParserComponent {
  files: string[] = [];
  selectedFile: string | null = null;
  formData: Record<string, any> = {};
  extractedData: any = null;
  error = '';
  success = '';
  loading = false;
  dataLoading = false;
  viewerOpen = false;
  currentPdf: SafeResourceUrl | null = null;



  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(private http: HttpClient, private sanitizer: DomSanitizer, private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    this.fetchFiles();
  }

  fetchFiles(): void {
    this.http.get<string[]>('http://localhost:8000/api/files').subscribe({
      next: files => this.files = files,
      error: err => this.error = 'Failed to load files'
    });
  }

  async handleViewDocument(filename: string): Promise<void> {
    try {
      this.loading = true;
      this.error = '';

      const encodedFilename = encodeURIComponent(filename);
      const pdfUrl = `http://localhost:8000/api/view/${encodedFilename}`;

      // Fetch using browser API (Fetch) or Angular HttpClient
      const response = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`);
      }

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


  handleFileSelect(file: string): void {
    this.selectedFile = file;
    this.extractedData = null;
    this.formData = {};
    this.currentPdf = `/uploads/${file}`;
    this.viewerOpen = true;
  }

  handleSubmit(): void {
    this.http.post('http://localhost:8000/api/submit', this.formData).subscribe({
      next: res => {
        this.success = 'Form submitted!', this.snackBar.open('Changes saved successfully!', 'Close', {
          duration: 3000,
          verticalPosition: 'top'
        })
      },
      error: err => this.error = 'Submission failed'
    });
  }

  handleInputChange(key: string, value: string): void {
    this.formData[key] = value;
  }

  extractedKeys(): string[] {
    return Object.keys(this.extractedData || {}).filter(k => k !== 'status' && typeof this.extractedData[k] !== 'object');
  }

  formatLabel(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  }
}



