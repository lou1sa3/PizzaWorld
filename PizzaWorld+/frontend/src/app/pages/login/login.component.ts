// src/app/pages/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '../../core/auth.service';
import { KpiService } from '../../core/kpi.service';
import { LoadingPopupComponent } from '../../shared/loading-popup/loading-popup.component';
import { PreloadService } from '../../core/preload.service';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LoadingPopupComponent]
})
export class LoginComponent implements OnInit {
  form!: FormGroup;

  /* ---------- UI-State ---------- */
  showPassword = false;
  successMsg: string | null = null;   // grüne Info-Box
  errorMsg:   string | null = null;   // rote Fehler-Box
  showLogoutPopup = false; // for logout toast
  loading = false;
  error = '';

  // Loading popup properties
  showLoadingPopup = false;
  loadingProgress = 0;
  loadingMessage = 'Using parallel processing for faster loading...';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private auth: AuthService,
    private kpi: KpiService,
    private preload: PreloadService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

    // Check if user is already logged in
    if (this.auth.token) {
      this.router.navigate(['/dashboard']);
    }
    // Show logout message as popup if present in sessionStorage
    const logoutMsg = sessionStorage.getItem('logoutMsg');
    if (logoutMsg) {
      this.successMsg = logoutMsg;
      this.showLogoutPopup = true;
      setTimeout(() => { this.showLogoutPopup = false; }, 3000);
      sessionStorage.removeItem('logoutMsg');
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  login(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.error = '';
    this.showLoadingPopup = true;
    this.loadingProgress = 10;
    this.loadingMessage = 'Authenticating...';

    this.http
      .post<{ token: string }>('/api/login', this.form.value)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (res: { token: string }) => {
          this.auth.setToken(res.token);
          this.loadingProgress = 30;
          this.loadingMessage = 'Loading user data...';

          // Wait for user to be loaded before navigating
          this.auth.loadCurrentUser().subscribe({
            next: (user) => {
              if (user) {
                this.successMsg = 'Login erfolgreich';
                this.errorMsg = null;
                this.loadingProgress = 50;
                this.loadingMessage = 'Loading all app data...';

                // Use PreloadService to load all data (including sales)
                this.preload.preloadAll().then(() => {
                  this.loadingProgress = 100;
                  this.loadingMessage = 'Welcome to PizzaWorld! 🍕';
                  setTimeout(() => {
                    this.showLoadingPopup = false;
                    this.router.navigate(['/dashboard']);
                  }, 800);
                }).catch((err) => {
                  console.error('PreloadService.preloadAll() failed:', err);
                  this.loadingProgress = 100;
                  this.loadingMessage = 'Warning: Some data may be incomplete';
                  setTimeout(() => {
                    this.showLoadingPopup = false;
                    this.router.navigate(['/dashboard']);
                  }, 800);
                });
              } else {
                this.errorMsg = 'Failed to load user after login';
                this.showLoadingPopup = false;
              }
            },
            error: () => {
              this.errorMsg = 'Failed to load user after login';
              this.showLoadingPopup = false;
            }
          });
        },
        error: () => {
          this.errorMsg = 'Benutzername oder Passwort falsch';
          this.successMsg = null;
          this.showLoadingPopup = false;
        }
      });
  }
}
