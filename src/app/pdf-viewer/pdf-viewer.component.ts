
import { Component, EventEmitter, Input, OnInit, Output,OnChanges, SimpleChanges } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import { AddSectionsComponent, Section } from "../add-sections/add-sections.component";
import { CommonModule } from '@angular/common';
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectChange, MatSelectModule} from '@angular/material/select';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { DocumentService } from '../services/document.service';
import { SelectedPagesService } from '../services/selected-pages.service';
import { MatList, MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';
import { range } from 'rxjs';
import { MatCardModule } from '@angular/material/card';


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

 constructor(private documentService:DocumentService, private selectedPagesService: SelectedPagesService){
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
  //   const input = event.target as HTMLInputElement;
  // if (!input.files || input.files.length === 0) return;
  //   const file = input.files[0];
  //   const reader = new FileReader();
  //   reader.onload = async (e: any) => {
  //     const typedarray = new Uint8Array(e.target.result);
  //     this.pdfDoc = await pdfjsLib.getDocument({ data: typedarray }).promise;
  //     this.renderThumbnails();
  //   };
  //   reader.readAsArrayBuffer(file);
    const input = event.value;
    this.selectedFile=input.url;
    this.getCreatedSections();
    // console.log("file: ",this.selectedFile);
    // if (!input.files || input.files.length === 0) return;

    // const file = input.files[0];
    // const reader = new FileReader();

    // reader.onload = async (e: ProgressEvent<FileReader>) => {
    //   const typedarray = new Uint8Array(e.target!.result as ArrayBuffer);
    //   this.pdfDoc = await pdfjsLib.getDocument({ data: typedarray }).promise;
    this.pdfDownloading=true
    this.pdfDoc = await pdfjsLib
      .getDocument({ url: input.url })
      .promise;
      this.renderThumbnails();
      
    // };

    // reader.readAsArrayBuffer(file);
  }

  async renderThumbnails() {
    if (!this.pdfDoc) {
    console.warn('PDF document not loaded yet');
    return;


  }
    this.pageImages = [];
    this.isRendering = true;

  const numPages = this.pdfDoc.numPages;
 
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
      for (let i = start; i <= end; i++) this.selectedPages.push(i);
    } else {
      if (this.selectedPages.includes(index)) {
  
        // this.selectedPages.delete(index);
        const removeIndex = this.selectedPages.indexOf(index);
        if (removeIndex > -1) {
          this.selectedPages.splice(removeIndex, 1);
        }
      } else {
        this.selectedPages.push(index);
      }
      this.selectedPagesService.multicast(this.selectedPages)
      this.lastClickedIndex = index;
    }
    // this.pageSelection.emit([...this.selectedPages]);
    console.log('pages: ',this.selectedPages);
  }

  getFileName(key: string){
    return key?.split('/').pop() || 'Unnamed File';
  }
  

  
    getCreatedSections(){
    this.documentService.getCreatedSections(this.selectedFile).subscribe((res:any)=>{
      console.log(res);
      this.createdSections = typeof res === 'string' ? JSON.parse(res) : res;    
    })
   
  };

  deleteSection(section:Section){

    this.documentService.deleteSection(this.selectedFile,section).subscribe((res:any)=>{
      console.log(section);
      console.log(res);
      
      let delIndex = this.createdSections.findIndex(createdSection=>createdSection.title==section.title && createdSection.endPage==section.endPage && createdSection.startPage==section.startPage);
      if(delIndex>=0){
        this.createdSections.splice(delIndex,1);
      }
      
    })
  }

  onSectionSelect(section: Section) {
    
    this.selectedPages = []
    this.selectedSection=section
    // console.log(this.selectedSection);
    range(section.startPage-1, section.endPage-section.startPage+1).subscribe(selectedPageNumber => 
      this.selectedPages.push(selectedPageNumber)
    )
  const pageElement = document.getElementById(`page-${section.startPage-1}`);
  if (pageElement) {
    pageElement.scrollIntoView({ behavior: 'smooth' });
  }
  }
}
