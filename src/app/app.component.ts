import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'TA AI Document Analyzer';

  ngOnInit() {
    console.log('TA AI Document Analyzer loaded successfully!');
  }

  onLogout():void{
    window.location.href = 'http://localhost:8000/logout';;

  }
}
