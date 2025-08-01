import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SelectedPagesService {

  selectedPagesSubject$: Subject<number[]> = new Subject();
  selectedPages: number[] = []

  constructor() { }

  multicast(pageNumbers: number[]){
    this.selectedPagesSubject$.next(pageNumbers)
  }

  getSelectedPagesSubject(){
    return this.selectedPagesSubject$;
  }

}
