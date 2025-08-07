import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const http = inject(HttpClient);
  const router = inject(Router);
  const isBeanstalk = window.location.hostname.includes('elasticbeanstalk');
  const baseUrl = isBeanstalk
    ? 'https://documentanalyzer.eu-north-1.elasticbeanstalk.com'
    : 'http://localhost:8000';
  return http.get(`${baseUrl}/auth/check`, { withCredentials: true }).pipe(
    map(() => true), // Authenticated
    catchError(() => {
      router.navigate(['/']); // Redirect if not
      return of(false);
    })
  );
  
};
