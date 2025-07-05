import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  position?: NotificationPosition;
  persistent?: boolean;
  actions?: NotificationAction[];
  timestamp: Date;
  icon?: string;
  data?: any;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface NotificationConfig {
  defaultDuration: number;
  defaultPosition: NotificationPosition;
  maxNotifications: number;
  enableSound: boolean;
  enablePushNotifications: boolean;
  soundUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private notificationAddedSubject = new Subject<Notification>();
  private notificationRemovedSubject = new Subject<string>();

  public notifications$ = this.notificationsSubject.asObservable();
  public notificationAdded$ = this.notificationAddedSubject.asObservable();
  public notificationRemoved$ = this.notificationRemovedSubject.asObservable();

  private config: NotificationConfig = {
    defaultDuration: 5000,
    defaultPosition: 'top-right',
    maxNotifications: 5,
    enableSound: true,
    enablePushNotifications: false,
    soundUrl: '/assets/sounds/notification.mp3'
  };

  private audio?: HTMLAudioElement;
  private notificationPermission: NotificationPermission = 'default';

  constructor() {
    this.initializeAudio();
    this.checkNotificationPermission();
  }

  /**
   * Show a success notification
   */
  success(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      type: 'success',
      title,
      message,
      icon: '✅',
      ...options
    });
  }

  /**
   * Show an error notification
   */
  error(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      type: 'error',
      title,
      message,
      icon: '❌',
      persistent: true,
      ...options
    });
  }

  /**
   * Show a warning notification
   */
  warning(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      type: 'warning',
      title,
      message,
      icon: '⚠️',
      ...options
    });
  }

  /**
   * Show an info notification
   */
  info(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      type: 'info',
      title,
      message,
      icon: 'ℹ️',
      ...options
    });
  }

  /**
   * Show a generic notification
   */
  show(notification: Partial<Notification>): string {
    const id = this.generateId();
    const fullNotification: Notification = {
      id,
      type: notification.type || 'info',
      title: notification.title || 'Notification',
      message: notification.message || '',
      duration: notification.duration ?? this.config.defaultDuration,
      position: notification.position || this.config.defaultPosition,
      persistent: notification.persistent || false,
      actions: notification.actions || [],
      timestamp: new Date(),
      icon: notification.icon,
      data: notification.data
    };

    this.addNotification(fullNotification);
    this.playSound();
    this.showBrowserNotification(fullNotification);

    // Auto-remove if not persistent
    if (!fullNotification.persistent && fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, fullNotification.duration);
    }

    return id;
  }

  /**
   * Remove a notification by ID
   */
  remove(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.filter(n => n.id !== id);
    this.notificationsSubject.next(updatedNotifications);
    this.notificationRemovedSubject.next(id);
  }

  /**
   * Clear all notifications
   */
  clear(): void {
    this.notificationsSubject.next([]);
  }

  /**
   * Clear notifications by type
   */
  clearByType(type: NotificationType): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.filter(n => n.type !== type);
    this.notificationsSubject.next(updatedNotifications);
  }

  /**
   * Get notifications by type
   */
  getByType(type: NotificationType): Observable<Notification[]> {
    return this.notifications$.pipe(
      filter(notifications => notifications.some(n => n.type === type))
    );
  }

  /**
   * Update notification configuration
   */
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.enablePushNotifications !== undefined) {
      if (newConfig.enablePushNotifications) {
        this.requestNotificationPermission();
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * Request browser notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      this.notificationPermission = await Notification.requestPermission();
      return this.notificationPermission;
    }
    return 'denied';
  }

  /**
   * Check if browser notifications are supported and permitted
   */
  canShowBrowserNotifications(): boolean {
    return 'Notification' in window &&
           this.notificationPermission === 'granted' &&
           this.config.enablePushNotifications;
  }

  /**
   * Show quick toast notifications (convenience methods)
   */
  toast = {
    success: (message: string) => this.success('Success', message, { duration: 3000 }),
    error: (message: string) => this.error('Error', message, { duration: 5000 }),
    warning: (message: string) => this.warning('Warning', message, { duration: 4000 }),
    info: (message: string) => this.info('Info', message, { duration: 3000 })
  };

  /**
   * Show confirmation dialog-style notification
   */
  confirm(title: string, message: string, confirmAction: () => void, cancelAction?: () => void): string {
    return this.show({
      type: 'warning',
      title,
      message,
      persistent: true,
      actions: [
        {
          label: 'Confirm',
          action: () => {
            confirmAction();
            // The notification will be removed when the action is executed
          },
          style: 'primary'
        },
        {
          label: 'Cancel',
          action: () => {
            if (cancelAction) cancelAction();
            // The notification will be removed when the action is executed
          },
          style: 'secondary'
        }
      ]
    });
  }

  /**
   * Execute notification action and remove notification
   */
  executeAction(notificationId: string, action: NotificationAction): void {
    action.action();
    this.remove(notificationId);
  }

  // Private methods

  private addNotification(notification: Notification): void {
    const currentNotifications = this.notificationsSubject.value;

    // Remove oldest notifications if we exceed max
    let updatedNotifications = [...currentNotifications];
    if (updatedNotifications.length >= this.config.maxNotifications) {
      updatedNotifications = updatedNotifications.slice(-(this.config.maxNotifications - 1));
    }

    updatedNotifications.push(notification);
    this.notificationsSubject.next(updatedNotifications);
    this.notificationAddedSubject.next(notification);
  }

  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeAudio(): void {
    if (this.config.enableSound && this.config.soundUrl) {
      this.audio = new Audio(this.config.soundUrl);
      this.audio.volume = 0.3;
    }
  }

  private playSound(): void {
    if (this.config.enableSound && this.audio) {
      this.audio.play().catch(error => {
        console.warn('Failed to play notification sound:', error);
      });
    }
  }

  private checkNotificationPermission(): void {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
    }
  }

  private showBrowserNotification(notification: Notification): void {
    if (!this.canShowBrowserNotifications()) {
      return;
    }

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/assets/images/logo_klein.png',
        tag: notification.id,
        badge: '/assets/images/logo_klein.png',
        requireInteraction: notification.persistent
      });

      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
      };

      // Auto-close browser notification
      if (!notification.persistent && notification.duration) {
        setTimeout(() => {
          browserNotification.close();
        }, notification.duration);
      }
    } catch (error) {
      console.warn('Failed to show browser notification:', error);
    }
  }
}
