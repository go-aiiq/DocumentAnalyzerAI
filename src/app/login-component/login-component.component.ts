import { Component } from '@angular/core';
import { DocumentService } from '../services/document.service';

@Component({
  selector: 'app-login-component',
  imports: [],
  templateUrl: './login-component.component.html',
  styleUrl: './login-component.component.scss'
})
export class LoginComponentComponent {
  constructor(private documentService:DocumentService){

  }
  ngOnInit():void{
      const currentPath = window.location.pathname;

  if (currentPath !== '/auth/login') {
    const isBeanstalk = window.location.hostname.includes('elasticbeanstalk');
    const baseUrl = isBeanstalk
      ? 'http://documentanalyzer.eu-north-1.elasticbeanstalk.com'
      : 'http://localhost:8000';

    window.location.href = `${baseUrl}/auth/login`;
  }
    
  }
}
