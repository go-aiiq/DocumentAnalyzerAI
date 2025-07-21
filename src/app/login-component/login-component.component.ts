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
    window.location.href='http://localhost:8000/auth/login';
  }
}
