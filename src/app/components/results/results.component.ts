import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DocumentService } from '../../services/document.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDivider } from "@angular/material/divider";
import { MatFormFieldModule } from "@angular/material/form-field";
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-results',
  standalone: true,
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss'],
  imports: [MatDivider, MatFormFieldModule, CommonModule, FormsModule,
      ReactiveFormsModule, MatProgressSpinnerModule, MatInputModule, MatButtonModule ]
})
export class ResultsComponent implements OnInit {
  currentPdf: SafeResourceUrl | null = null;
  formData: Record<string, any> = {};
  extractedData: any = null;
  filePath: any;

  constructor(
    private documentService: DocumentService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar,
  ) {
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params:any) => {
      this.viewResults(params.filePath)
    })
  }

  async handleViewDocument(filename: string): Promise<void> {
    try {
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
    } catch (err: any) {
      console.error('Error loading PDF:', err);
    }
  }

  formatLabel(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  }

  extractedKeys(): string[] {
    return Object.keys(this.extractedData || {}).filter(k => k !== 'status' && typeof this.extractedData[k] !== 'object');
  }

  handleSubmit(): void {
    this.route.queryParams.subscribe((params:any) => {
      this.filePath=params.filePath
    })
    
    this.documentService.submitResult(this.filePath,this.formData).subscribe({
      next: (res:any) => {
        this.snackBar.open('Changes saved successfully!', 'Close', {
          duration: 3000,
          verticalPosition: 'bottom'
        });
        this.extractedData=JSON.parse(res);
        this.formData = { ...this.extractedData };
      }
    });
  }

  viewResults(filePath: any) {
    this.documentService.getResults(filePath).subscribe((res: any) => {
      let extractedDataFulldata = JSON.parse(res);
      this.extractedData=extractedDataFulldata;
      this.formData = { ...this.extractedData }
      this.handleViewDocument(filePath)
    })
  }

  resetFormData(): void {
    for (const key of Object.keys(this.formData)) {
      this.formData[key] = '';
    }
  }
}
