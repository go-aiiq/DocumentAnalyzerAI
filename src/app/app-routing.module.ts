import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UploadComponent } from './components/upload/upload.component';
import { ResultsComponent } from './components/results/results.component';
import { UserProjectComponent } from './user-project/user-project.component';
import { LoginComponentComponent } from './login-component/login-component.component';
import { DocumentParserComponent } from './document-parser/document-parser.component';

const routes: Routes = [
  {path:'userproject',component: UserProjectComponent},
  {path:'',component: LoginComponentComponent},
  { path: 'upload', component: UploadComponent },
  { path: 'results', component: ResultsComponent },
  { path: 'results', loadComponent: () => import('../app/components/results/results.component').then(m => m.ResultsComponent) },
  {path:'process',component: DocumentParserComponent},
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
