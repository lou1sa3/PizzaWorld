import { Component, ElementRef, ViewChild, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service'; // Import AuthService
import { KpiService } from './core/kpi.service'; // Import KpiService
import { NotificationComponent } from './shared/notification/notification.component';
import { AIChatbotComponent } from './shared/ai-chatbot/ai-chatbot.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterOutlet, NotificationComponent, CommonModule, AIChatbotComponent] // Import RouterOutlet for routing
})
export class AppComponent {
  @ViewChild('mobileSidebarToggle', { static: false }) mobileSidebarToggle!: ElementRef<HTMLButtonElement>;

  isMobileSidebarOpen = false;

  constructor(private auth: AuthService, private kpi: KpiService) {
    // Clear all caches on app startup to ensure clean state
    this.kpi.clearAllCaches();
    console.log('🧹 App started - all caches cleared for fresh preload');

    // Load user if token exists
    this.auth.loadCurrentUser().subscribe();
  }

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;

    // Communicate with sidebar component
    const sidebar = document.querySelector('app-sidebar aside') as HTMLElement;
    if (sidebar) {
      if (this.isMobileSidebarOpen) {
        sidebar.classList.add('mobile-open');
        // Ensure proper scrolling behavior
        document.body.style.overflow = 'hidden';
      } else {
        sidebar.classList.remove('mobile-open');
        // Restore scrolling
        document.body.style.overflow = '';
      }
    }

    // Update overlay
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      if (this.isMobileSidebarOpen) {
        overlay.classList.add('mobile-overlay-active');
      } else {
        overlay.classList.remove('mobile-overlay-active');
      }
    }
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(): void {
    // Close mobile sidebar on desktop view
    if (window.innerWidth >= 1024 && this.isMobileSidebarOpen) {
      this.isMobileSidebarOpen = false;
      const sidebar = document.querySelector('app-sidebar aside') as HTMLElement;
      if (sidebar) {
        sidebar.classList.remove('mobile-open');
      }
      const overlay = document.getElementById('sidebar-overlay');
      if (overlay) {
        overlay.classList.remove('mobile-overlay-active');
      }
      // Restore body scrolling
      document.body.style.overflow = '';
    }
  }
}
