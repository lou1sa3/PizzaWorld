import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService, Notification, NotificationPosition } from '../../core/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container" [attr.data-position]="position">
      <div
        *ngFor="let notification of notifications; trackBy: trackByNotification"
        class="notification-item"
        [ngClass]="getNotificationClasses(notification)"
        [@slideInOut]
      >
        <div class="notification-content">
          <div class="notification-header">
            <div class="notification-icon" *ngIf="notification.icon">
              {{ notification.icon }}
            </div>
            <div class="notification-title">{{ notification.title }}</div>
            <button
              class="notification-close"
              (click)="removeNotification(notification.id)"
              *ngIf="!notification.persistent"
            >
              ×
            </button>
          </div>

          <div class="notification-message" *ngIf="notification.message">
            {{ notification.message }}
          </div>

          <div class="notification-actions" *ngIf="notification.actions && notification.actions.length > 0">
            <button
              *ngFor="let action of notification.actions"
              class="notification-action-btn"
              [ngClass]="getActionClasses(action)"
              (click)="executeAction(notification.id, action)"
            >
              {{ action.label }}
            </button>
          </div>

          <div class="notification-progress" *ngIf="!notification.persistent && notification.duration">
            <div
              class="notification-progress-bar"
              [style.animation-duration.ms]="notification.duration"
            ></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./notification.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    // Add slide-in/out animations
  ]
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  position: NotificationPosition = 'top-right';
  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
        this.position = notifications.length > 0 ?
          notifications[0].position || 'top-right' : 'top-right';
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByNotification(index: number, notification: Notification): string {
    return notification.id;
  }

  getNotificationClasses(notification: Notification): string {
    return `notification-${notification.type}`;
  }

  getActionClasses(action: any): string {
    return `btn-${action.style || 'secondary'}`;
  }

  removeNotification(id: string): void {
    this.notificationService.remove(id);
  }

  executeAction(notificationId: string, action: any): void {
    this.notificationService.executeAction(notificationId, action);
  }
}
