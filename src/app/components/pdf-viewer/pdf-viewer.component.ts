
import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import { AddSectionsComponent, Section } from "../add-sections/add-sections.component";
import { CommonModule } from '@angular/common';
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectChange, MatSelectModule} from '@angular/material/select';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { DocumentService } from '../../services/document.service';
import { SelectedPagesService } from '../../services/selected-pages.service';
import { MatList, MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';
import { range } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-pdf-viewer',
  imports: [CommonModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule, AddSectionsComponent, MatList, MatListModule, MatIconModule,MatButtonModule, MatCardModule],
  templateUrl: './pdf-viewer.component.html',
  styleUrl: './pdf-viewer.component.scss'
})

export class PdfViewerComponent implements OnInit ,OnChanges{

  @Input() selectedFolder!: any[] ;
  pdfDoc: any;
  pageImages: string[] = [];
  selectedPages: number[] = [];
  lastClickedIndex: number | null = null;
  selectedFile: any
  isRendering!: boolean;
  createdSections:any[]=[];
  selectedSection!: Section;
  pdfDownloading: boolean = false;
  newSection:Section={title:'',startPage:1, endPage:1};
  numPages!:number;

 constructor(private documentService:DocumentService, private selectedPagesService: SelectedPagesService,private snackBar:MatSnackBar){
  pdfjsLib.GlobalWorkerOptions.workerSrc  = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
 }
 
 ngOnInit(){
  this.documentService.refreshSections$.subscribe(() => {
    this.selectedPages=[]
    this.getCreatedSections(); 
  });
 }

 ngOnChanges(changes: SimpleChanges):void{
  if(changes['selectedFolder'] ){
    this.selectedFile=null;
    this.pageImages=[];
    this.createdSections=[];
    this.selectedPages=[];
  }
 }

  async onFileSelected(event: MatSelectChange) {
    const input = event.value;
    this.selectedFile=input.url;
    this.getCreatedSections();
    this.pdfDownloading=true;
    this.pdfDoc = await pdfjsLib
      .getDocument({ url: input.url })
      .promise;
      this.renderThumbnails();
  }

  async renderThumbnails() {
    if (!this.pdfDoc) {
    return;
    }
    this.pageImages = [];
    this.isRendering = true;
    this.numPages = this.pdfDoc.numPages;
 
    for (let i = 1; i <= this.pdfDoc.numPages; i++) {
      const page = await this.pdfDoc.getPage(i);
      const scale = Math.min(5, window.devicePixelRatio * 2); 
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      this.pdfDownloading=false;
      this.pageImages.push(canvas.toDataURL('image/png'));
      
    }
    this.isRendering = false;
  }

  toggleSelection(index: number, event: MouseEvent) {
    if (event.shiftKey && this.lastClickedIndex !== null) {
      const [start, end] = [this.lastClickedIndex, index].sort((a, b) => a - b);
      if (start < end) {
      for (let i = start; i <= end; i++) this.selectedPages.push(i);
    } }
    else {
      if (this.selectedPages.includes(index)) {
        const removeIndex = this.selectedPages.indexOf(index);
        if (removeIndex > -1) {
          this.selectedPages.splice(removeIndex, 1);
        }
      } else {
        this.selectedPages.push(index);
      }
      
      this.lastClickedIndex = index;
    }
      if (this.selectedPages.length > 0) {
    const sorted = [...this.selectedPages].sort((a, b) => a - b);
    this.newSection.startPage = sorted[0];
    this.newSection.endPage = sorted[sorted.length - 1];
  } else {
    this.newSection.startPage = 1;
    this.newSection.endPage = 1;
  }

    this.selectedPagesService.multicast(this.selectedPages)
  }

  getFileName(key: string){
    return key?.split('/').pop() || 'Unnamed File';
  };
  
  getCreatedSections(){
    this.documentService.getCreatedSections(this.selectedFile).subscribe((res:any)=>{
      this.createdSections = typeof res === 'string' ? JSON.parse(res) : res;    
    })
  };

  deleteSection(section:Section){
    this.documentService.deleteSection(this.selectedFile,section).subscribe((res:any)=>{
      let delIndex = this.createdSections.findIndex(createdSection=>createdSection.title==section.title && createdSection.endPage==section.endPage && createdSection.startPage==section.startPage);
      if(delIndex>=0){
        this.createdSections.splice(delIndex,1);
      }
    })
  }

  downloadSection(section:Section){
    this.documentService.downloadSection(this.selectedFile,section).subscribe((res:any)=>{
      const response =res;
     
      const link = document.createElement('a');
      link.href = response.url;
      const filename=response.sectionPDF;
      link.download = filename;
            document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.snackBar.open(`Downloaded ${section.title} Section`,"Close",{ duration: 3000 });
    })

  }

  onSectionSelect(section: Section) {
    this.selectedPages = []
    this.selectedSection=section
    range(section.startPage-1, section.endPage-section.startPage+1).subscribe(selectedPageNumber => 
      this.selectedPages.push(selectedPageNumber)
    )
    
    const pageElement = document.getElementById(`page-${section.startPage-1}`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

onStartPageSelected(pageNumber: number) {
  this.selectPage(pageNumber);
  console.log(pageNumber);
}

onEndPageSelected(pageNumber: number) {
  this.selectPage(pageNumber);
}

selectPage(pageNumber: number) {
  const index = pageNumber - 1;
  // if (index < 0 || index >= this.pageImages.length) {
  //   alert(`Page ${pageNumber} is out of range.`);
  //   return;
  // }
  const fakeEvent = { shiftKey: false } as MouseEvent;
  this.toggleSelection(index, fakeEvent);
}
}
