// src/app/core/auth/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  BehaviorSubject, Observable, tap, catchError, of
} from 'rxjs';
import { CurrentUser } from './models/current-user.model'; // Import your CurrentUser model
import { KpiService } from './kpi.service'; // Import KpiService to clear caches

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'authToken';
  private readonly rememberMeKey = 'rememberMe';
  private readonly savedCredentialsKey = 'savedCredentials';

  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(null);
  currentUser$               = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private kpi: KpiService) {}

  /* ───────── Token ───────── */
  setToken(token: string): void { localStorage.setItem(this.tokenKey, token); }
  get token(): string | null     { return localStorage.getItem(this.tokenKey); }
  logout(): void {
    // Clear all localStorage data for security
    localStorage.clear();

    // Clear all in-memory caches
    this.kpi.clearAllCaches();

    // Clear current user
    this.currentUserSubject.next(null);
  }

  /* ─────── User-Info ─────── */
  loadCurrentUser(): Observable<CurrentUser | null> {
    const t = this.token;
    if (!t) return of(null);

    return this.http
      .get<CurrentUser>('/api/me', {
        headers: new HttpHeaders({ Authorization: `Bearer ${t}` })
      })
      .pipe(
        tap(u => this.currentUserSubject.next(u)),
        catchError(() => { this.logout(); return of(null); })
      );
  }

  get snapshot(): CurrentUser | null { return this.currentUserSubject.value; }
}
