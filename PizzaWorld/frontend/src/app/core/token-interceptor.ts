import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.token;
    let apiReq = req;

    // DEBUG: Log environment and request details
    console.log('🔍 TokenInterceptor Debug:', {
      originalUrl: req.url,
      environmentApiUrl: environment.apiUrl,
      environmentProduction: environment.production,
      isApiCall: req.url.startsWith('/api/'),
      hasApiUrl: !!environment.apiUrl
    });

    // If the request is to our API and we have a base URL configured, prepend it
    if (req.url.startsWith('/api/') && environment.apiUrl) {
      const url = environment.apiUrl + req.url;
      console.log(`🔄 TokenInterceptor: Redirecting ${req.url} to ${url}`);
      apiReq = req.clone({ url });
    } else if (req.url.startsWith('/api/')) {
      console.warn('⚠️ TokenInterceptor: API call detected but no apiUrl configured!', {
        url: req.url,
        apiUrl: environment.apiUrl
      });
    }

    // Log every API request for debugging
    if (apiReq.url.includes('/api/')) {
      console.log(`🔐 TokenInterceptor: ${apiReq.method} ${apiReq.url} - Token: ${token ? 'Present' : 'Missing'}`);
    }

    // Add token if available
    if (token) {
      apiReq = apiReq.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }

    return next.handle(apiReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle authentication errors
        if (error.status === 401 || error.status === 403) {
          console.error(`🔐 Authentication error (${error.status}): ${apiReq.url}`);
          console.error('Token may be expired or invalid. Logging out user.');

          // Clear invalid token and logout user
          this.auth.logout();

          // Redirect user to login page preserving attempted url for convenience
          const currentUrl = window.location.pathname + window.location.search;
          this.router.navigate(['/login'], { queryParams: { returnUrl: currentUrl } });

          // Propagate error
          return throwError(() => new Error('Authentication failed - redirected to login'));
        }

        // Handle other errors
        if (error.status >= 500) {
          console.error(`🚨 Server error (${error.status}): ${apiReq.url}`, error.message);
        } else if (error.status >= 400) {
          console.error(`⚠️ Client error (${error.status}): ${apiReq.url}`, error.message);
        }

        return throwError(() => error);
      })
    );
  }
}
