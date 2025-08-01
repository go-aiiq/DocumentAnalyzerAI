import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { DocumentService } from '../services/document.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


import { SelectedPagesService } from '../services/selected-pages.service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';




export interface Section{
  title: string;
  startPage:number;
  endPage:number;
}

@Component({
  selector: 'app-add-sections',
  imports: [FormsModule,MatSelectModule,MatFormFieldModule,MatInputModule,CommonModule],
  templateUrl: './add-sections.component.html',
  styleUrl: './add-sections.component.scss'
  
})



export class AddSectionsComponent implements OnInit,OnChanges {
  @Input() selectedPages!: number[];
  @Input() selectedFile!:string;
  createdSections:any[]=[];
  // private _selectedPages: Set<number> = new Set();
  // @Input()
// set selectedPages(pages: Set<number>) {
//   this._selectedPages = pages;
//   this.updateSectionRange();
// }
// get selectedPages(): Set<number> {
//   return this._selectedPages;
// }

  @Output() sectionCreated = new EventEmitter<{
    title: string;
    pages: number[];
  }>();
  availableSections:string[] = [];
  sections:Section[]=[];
  newSection:Section={title:'',startPage:1, endPage:1};
  startPage:number=0;
  endPage:number=0;

  constructor(private documentService:DocumentService, private selectedPagesService: SelectedPagesService,private snackBar: MatSnackBar){

  }

  ngOnInit(){
    this.getSections();
    this.selectedPagesService.getSelectedPagesSubject().subscribe(pages =>{
      console.log(pages);
      this.addPages(pages);
    })
    this.getCreatedSections();
    
    
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('onchanges called')
    if(changes['selectedPages'] ){
      console.log(this.selectedPages)
    }
  }

  get sortedPages(): number[] {
    console.log('selPages:', this.selectedPages);
  return Array.from(this.selectedPages).sort((a, b) => a - b);
}

  getSections(){
    this.documentService.getAvailableSections().subscribe((sections:string[])=>{
      this.availableSections=sections;
    });
  }

  updateSectionRange() {
    //   console.log('ngOnChanges!', changes);
    // if (changes['selectedPages']) {
      const sorted = [...this.selectedPages].sort((a, b) => a - b);
      if (sorted.length) {
         this.newSection.startPage = sorted[0] + 1;
        this.newSection.endPage =
          sorted[sorted.length - 1] + 1;
      } else {
        this.newSection.startPage = 0;
        this.newSection.endPage = 0;
      }
    // }
    console.log('selectedPages ',this.selectedPages);
  }

  // addSection(){
    // if (this.isValidRange(this.newSection)) {
    //   this.documentService.addSection(this.newSection).subscribe((created: Section) => {
    //     this.sections.push(created);
    //     this.newSection = { title: '', startPage: 1, endPage: 1 };
    //   });
    // } else {
    //   alert('Invalid or overlapping page range.');
    // }

  // };
  // addPages(title: string, selectedPages: number[]) {
  //   const sorted = selectedPages.sort((a, b) => a - b);
  //   this.sections.push({
  //     title,
  //     startPage: sorted[0] + 1,
  //     endPage: sorted[sorted.length - 1] + 1
  //   });
  // }
  addPages(selectedPages: number[]) {

      const sorted = selectedPages.sort((a, b) => a - b);    
      this.newSection.startPage = sorted[0] + 1;
      this.newSection.endPage = sorted[sorted.length - 1] + 1;
    
  }

  addSection()
  {
    if (
      this.newSection.title &&
      this.newSection.startPage != null &&
      this.newSection.endPage != null
    ) {
      this.sectionCreated.emit({
        title: this.newSection.title,
        pages: [
          this.newSection.startPage,
          this.newSection.endPage
        ]
      });
      console.log("SelectedFile: ",this.selectedFile);
      // console.log('Section Created: ',this.newSection);
      this.documentService.addSection(this.newSection,this.selectedFile).subscribe(res=>{
        this.resetForm()
        console.log("Section created: ",this.newSection);
        console.log(res);
        this.snackBar.open('Section added successfully!', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      });
      
      this.documentService.triggerRefresh()
    }
  }

  resetForm(){
    this.newSection = {
      startPage: 0,
      endPage: 0,
      title: ''
    }
  }

  getCreatedSections(){
    this.documentService.getCreatedSections(this.selectedFile).subscribe((res:any)=>{
      console.log(res);
      this.createdSections = res;
      
    })
    
    
  };

  deleteSection(index:number){

  };
  isValidRange(section: Section): boolean {
    if (section.startPage > section.endPage) return false;
    return !this.sections.some(s =>
      section.startPage <= s.endPage && section.endPage >= s.startPage
    );
  }
}
