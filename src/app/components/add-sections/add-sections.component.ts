import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { DocumentService } from '../../services/document.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectedPagesService } from '../../services/selected-pages.service';
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
  @Input() selectedSection!: Section;
  @Input() selectedFolder!:any;
  createdSections:any[]=[];
  @Output() sectionCreated = new EventEmitter<{
    title: string;
    pages: number[];
  }>();
  availableSections:string[] = [];
  sections:Section[]=[];
  newSection:Section={title:'',startPage:1, endPage:1};
  startPage:number=0;
  endPage:number=0;
  enableEdit:boolean=false;

  constructor(private documentService:DocumentService, private selectedPagesService: SelectedPagesService,private snackBar: MatSnackBar){

  }

  ngOnInit(){
    this.getSections();
    this.selectedPagesService.getSelectedPagesSubject().subscribe(pages =>{
      this.addPages(pages);
    })
    this.getCreatedSections();  
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes['selectedSection'] && this.selectedSection){
      this.newSection=this.selectedSection
      this.enableEdit=true;      
    }
    if(changes['selectedFolder']){
      this.resetForm();
    }
  }

  get sortedPages(): number[] {
    return Array.from(this.selectedPages).sort((a, b) => a - b);
  }

  getSections(){
    this.documentService.getAvailableSections().subscribe((sections:string[])=>{
      this.availableSections=sections;
    });
  }

  updateSectionRange() {
    const sorted = [...this.selectedPages].sort((a, b) => a - b);
    if (sorted.length) {
        this.newSection.startPage = sorted[0] + 1;
      this.newSection.endPage =
        sorted[sorted.length - 1] + 1;
    } else {
      this.newSection.startPage = 0;
      this.newSection.endPage = 0;
    }
  }

  updateSection(){
    this.documentService.updateSection(this.selectedFile,this.newSection).subscribe((res:any)=>{
      this.snackBar.open('Edited Section Details!', 'Close', {
      panelClass:['success-snackbar'],  
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
      this.documentService.triggerRefresh();
    })
    this.resetForm();
    this.enableEdit=false;
    this.selectedPages=[];
  }

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
      this.documentService.addSection(this.newSection,this.selectedFile).subscribe(res=>{
        this.resetForm()
        this.snackBar.open('Section added successfully!', 'Close', {
        panelClass:['success-snackbar'],  
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
      this.createdSections = res;
    })
  };
  
  isValidRange(section: Section): boolean {
    if (section.startPage > section.endPage) return false;
    return !this.sections.some(s =>
      section.startPage <= s.endPage && section.endPage >= s.startPage
    );
  }
}
