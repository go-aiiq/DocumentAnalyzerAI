import { TestBed } from '@angular/core/testing';

import { SelectedPagesService } from './selected-pages.service';

describe('SelectedPagesService', () => {
  let service: SelectedPagesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SelectedPagesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
