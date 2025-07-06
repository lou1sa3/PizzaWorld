import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-popup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-overlay" *ngIf="isVisible">
      <div class="loading-popup">
        <div class="pizza-loader">
          <div class="pizza-slice"></div>
          <div class="pizza-slice"></div>
          <div class="pizza-slice"></div>
          <div class="pizza-slice"></div>
          <div class="pizza-slice"></div>
          <div class="pizza-slice"></div>
          <div class="pizza-slice"></div>
          <div class="pizza-slice"></div>
        </div>
        <div class="loading-text">
          <h3>{{ title }}</h3>
          <p class="loading-message">{{ message }}</p>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="progress"></div>
            </div>
            <div class="progress-text">{{ progress }}%</div>
          </div>
          <div class="loading-details" *ngIf="showDetails">
            <div class="detail-item" [class.completed]="progress >= 10">
              <i class="pi" [class.pi-check-circle]="progress >= 10" [class.pi-circle]="progress < 10"></i>
              <span>Authentication</span>
            </div>
            <div class="detail-item" [class.completed]="progress >= 30">
              <i class="pi" [class.pi-check-circle]="progress >= 30" [class.pi-circle]="progress < 30"></i>
              <span>User Profile</span>
            </div>
            <div class="detail-item" [class.completed]="progress >= 60">
              <i class="pi" [class.pi-check-circle]="progress >= 60" [class.pi-circle]="progress < 60"></i>
              <span>Parallel Data Processing</span>
            </div>
            <div class="detail-item" [class.completed]="progress >= 85">
              <i class="pi" [class.pi-check-circle]="progress >= 85" [class.pi-circle]="progress < 85"></i>
              <span>Optimized Database Queries</span>
            </div>
            <div class="detail-item" [class.completed]="progress >= 95">
              <i class="pi" [class.pi-check-circle]="progress >= 95" [class.pi-circle]="progress < 95"></i>
              <span>Dashboard Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./loading-popup.component.scss']
})
export class LoadingPopupComponent {
  @Input() isVisible = false;
  @Input() title = 'Loading PizzaWorld Data';
  @Input() message = 'Using parallel processing for faster loading...';
  @Input() progress = 0;
  @Input() showDetails = true;
}
