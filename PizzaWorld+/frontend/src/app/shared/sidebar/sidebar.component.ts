                                                  // src/app/shared/sidebar/sidebar.component.ts
import { Component, ElementRef, ViewChild, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { KpiService, OrdersKPIs } from '../../core/kpi.service';
import { SearchService, SearchResult } from '../../core/search.service';
import { Subject, takeUntil, debounceTime } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  imports: [CommonModule, RouterModule, FormsModule]
})
export class SidebarComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private kpiService = inject(KpiService);
  private searchService = inject(SearchService);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  user$: typeof this.auth.currentUser$;

  @ViewChild('sidebar', { static: true }) sidebar!: ElementRef<HTMLElement>;

  // Quick Stats data
  quickStats: OrdersKPIs = {
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalStores: 0
  };
  quickStatsLoading = true;
  quickStatsError = false;

  // Search functionality
  searchQuery = '';
  searchResults: SearchResult[] = [];
  showSearchResults = false;
  selectedIndex = -1;
  private searchTimeout: any;

  constructor() {
    this.user$ = this.auth.currentUser$;
  }

  ngOnInit(): void {
    this.loadQuickStats();
    this.setupSearchSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadQuickStats(): void {
    this.quickStatsLoading = true;
    this.quickStatsError = false;

    // Load KPIs without any filters to get all-time stats
    this.kpiService.getOrdersKPIs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (kpis: OrdersKPIs) => {
          this.quickStats = kpis;
          this.quickStatsLoading = false;
        },
        error: (error: any) => {
          console.error('Error loading quick stats:', error);
          this.quickStatsError = true;
          this.quickStatsLoading = false;
        }
      });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  formatCompactNumber(value: number): string {
    // Return exact number instead of compact format for accuracy
    return new Intl.NumberFormat('en-US').format(value);
  }

  formatCompactCurrency(value: number): string {
    // For currency, still use compact format but with more precision
    if (value >= 1000000) {
      return '$' + (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return '$' + (value / 1000).toFixed(1) + 'K';
    }
    return '$' + new Intl.NumberFormat('en-US').format(value);
  }

  toggleSidebar(): void {
    this.sidebar.nativeElement.classList.toggle('collapsed');
  }

  logout(): void {
    this.auth.logout();
    sessionStorage.setItem('logoutMsg', 'You have been successfully logged out.');
    this.router.navigate(['/login']);
  }

  // Search functionality methods
  private setupSearchSubscription(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.performSearch(query);
    });
  }

  private performSearch(query: string): void {
    if (query.trim()) {
      this.searchResults = this.searchService.search(query, 6);
    } else {
      this.searchResults = [];
    }
    this.selectedIndex = -1;
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;
    this.searchSubject.next(this.searchQuery);
  }

  onSearchFocus(): void {
    this.showSearchResults = true;
  }

  onSearchBlur(): void {
    // Delay hiding to allow for click events
    setTimeout(() => {
      this.showSearchResults = false;
    }, 200);
  }

  onSearchKeyDown(event: KeyboardEvent): void {
    if (!this.showSearchResults) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.searchResults.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.selectedIndex >= 0 && this.selectedIndex < this.searchResults.length) {
          this.selectResult(this.searchResults[this.selectedIndex]);
        }
        break;
      case 'Escape':
        this.clearSearch();
        break;
    }
  }

  selectResult(result: SearchResult): void {
    this.searchService.navigateToResult(result);
    this.clearSearch();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSearchResults = false;
    this.selectedIndex = -1;
  }

  // Global keyboard shortcut
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    // Ctrl+K or Cmd+K to focus search
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      const searchInput = document.getElementById('sidebarSearch') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        this.showSearchResults = true;
      }
    }
  }
}
