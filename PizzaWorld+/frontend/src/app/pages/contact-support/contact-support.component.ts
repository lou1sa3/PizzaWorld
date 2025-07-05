import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { timeout } from 'rxjs/operators';

@Component({
  selector: 'app-contact-support',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './contact-support.component.html',
  styleUrls: ['./contact-support.component.scss']
})
export class ContactSupportComponent implements OnInit {
  contactForm!: FormGroup;
  sending = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', [Validators.required]],
      message: ['', [Validators.required]]
    });
  }

  sendEmail(): void {
    if (this.contactForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.contactForm.controls).forEach(key => {
        this.contactForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.sending = true;
    this.successMessage = '';
    this.errorMessage = '';

    const emailData = {
      to: 'pizzaworldplus@gmail.com',
      from: this.contactForm.value.email,
      senderName: this.contactForm.value.name,
      subject: this.contactForm.value.subject,
      message: this.contactForm.value.message
    };

    // Send email through backend API with short timeout
    this.http.post('/api/send-support-email', emailData)
      .pipe(timeout(2000)) // 2 second timeout - backend should respond immediately
      .subscribe({
        next: (response: any) => {
          this.sending = false;
          this.successMessage = response.message || 'Your message has been sent successfully! Our support team will get back to you soon.';
          this.contactForm.reset();

          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          this.sending = false;
          if (error.name === 'TimeoutError') {
            this.errorMessage = 'Server response too slow. Your message may have been sent. Please wait before trying again.';
          } else if (error.status === 0) {
            this.errorMessage = 'Connection error. Please check your internet connection.';
          } else {
            this.errorMessage = 'Failed to send message. Please try again or contact support directly at pizzaworldplus@gmail.com';
          }
          console.error('Email send error:', error);

          // Clear error message after 3 seconds
          setTimeout(() => {
            this.errorMessage = '';
          }, 3000);
        }
      });
  }
}
