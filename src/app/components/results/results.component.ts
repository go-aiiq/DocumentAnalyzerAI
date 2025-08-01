import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentService } from '../../services/document.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDivider } from "@angular/material/divider";
import { MatFormFieldModule } from "@angular/material/form-field";
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
  // extractedDataForm: FormGroup;

  constructor(
    private documentService: DocumentService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
     private snackBar: MatSnackBar,
     private formBuilder: FormBuilder
  ) {
    // this.extractedDataForm = this.formBuilder.group({})
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params:any) => {
      this.viewResults(params.filePath)
    })
}

  async handleViewDocument(filename: string): Promise<void> {
    try {
      // this.loading = true;
      // this.error = '';

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
      // this.viewerOpen = true;
    } catch (err: any) {
      console.error('Error loading PDF:', err);
      // this.error = `Failed to load PDF: ${err.message}`;
      // this.viewerOpen = false;
    } finally {
      // this.loading = false;
    }
  }

  formatLabel(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  }

    extractedKeys(): string[] {
    return Object.keys(this.extractedData || {}).filter(k => k !== 'status' && typeof this.extractedData[k] !== 'object');
  }

  handleSubmit(fileUrl: any): void {
    console.log("Storing extractedData ..");
    console.log("FileURL ", fileUrl)
    const payload = {
      fileurl: fileUrl, // or any custom name
      data: this.formData
    };
    
    this.documentService.submitResult(payload).subscribe({
      next: res => {
        console.log('Response received:', res);
        this.snackBar.open('Changes saved successfully!', 'Close', {
          duration: 3000,
          verticalPosition: 'bottom'
        });
      },
      // error: err => this.error = 'Submission failed'
    });
  }

  viewResults(filePath: any) {
    this.documentService.getResults(filePath).subscribe((res: any) => {
      let extractedDataFulldata = JSON.parse(res);
      this.extractedData = extractedDataFulldata.data;
      this.formData = { ...this.extractedData }
      this.handleViewDocument(filePath)
    })
  }

}
