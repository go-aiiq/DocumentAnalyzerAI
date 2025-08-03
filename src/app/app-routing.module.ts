import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResultsComponent } from './components/results/results.component';
import { UserProjectComponent } from './components/user-project/user-project.component';
import { LoginComponentComponent } from './components/login-component/login-component.component';

const routes: Routes = [
  {path:'userproject',component: UserProjectComponent},
  {path:'',component: LoginComponentComponent},
  { path: 'results', component: ResultsComponent },
  { path: 'results', loadComponent: () => import('../app/components/results/results.component').then(m => m.ResultsComponent) },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
