import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentParserComponent } from './document-parser.component';

describe('DocumentParserComponent', () => {
  let component: DocumentParserComponent;
  let fixture: ComponentFixture<DocumentParserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentParserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentParserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
