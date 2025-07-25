// src/app/core/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.auth.token) return true;      // Token vorhanden → Route frei
    this.router.navigate(['/login']);      // sonst weiter zur Login-Seite
    return false;
  }
}
