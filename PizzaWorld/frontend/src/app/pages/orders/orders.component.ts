import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { KpiService, OrderInfo, PaginatedOrdersResponse, OrdersKPIs } from '../../core/kpi.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { HttpClient } from '@angular/common/http';

interface OrderExtended extends OrderInfo {
  state_code?: string;
  state?: string;
  city?: string;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SidebarComponent
  ],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit, OnDestroy {
  // Data
  orders: OrderExtended[] = [];
  totalCount = 0;
  totalPages = 0;
  currentPage = 0;
  pageSize = 25;
  hasNext = false;
  hasPrevious = false;

  // Filters
  storeFilter = '';
  stateFilter = '';
  orderIdFilter = '';
  searchFilter = '';
  fromDateFilter = '';
  toDateFilter = '';

  // Sorting
  sortBy = 'orderdate';
  sortOrder = 'desc';

  // UI State
  loading = false;
  error = false;
  exportLoading = false;
  kpisLoading = false;

  // Available states for dropdown
  availableStates: {state_code: string, state: string}[] = [];

  // KPI data
  ordersKPIs: OrdersKPIs = {
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalStores: 0
  };

  // Math reference for template
  Math = Math;

  // Search debouncing
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private kpiService: KpiService,
    private http: HttpClient
  ) {
    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 0;
      this.loadData();
    });
  }

  ngOnInit(): void {
    this.loadAvailableStates();
    this.loadData();
  }

  loadAvailableStates(): void {
    this.kpiService.getAvailableStatesForOrders().subscribe({
      next: (states) => {
        this.availableStates = states;
      },
      error: (error) => {
        console.error('Error loading available states:', error);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    // Load orders and KPIs in parallel for better performance
    this.loadOrders();
    this.loadKPIs();
  }

  loadOrders(): void {
    this.loading = true;
    this.error = false;

    this.kpiService.getOrdersV2(
      this.currentPage,
      this.pageSize,
      this.storeFilter || undefined,
      this.stateFilter || undefined,
      this.orderIdFilter || undefined,
      this.searchFilter || undefined,
      this.fromDateFilter || undefined,
      this.toDateFilter || undefined,
      this.sortBy,
      this.sortOrder
    ).subscribe({
      next: (response: PaginatedOrdersResponse) => {
        this.orders = response.orders as OrderExtended[];
        this.totalCount = response.totalCount;
        this.totalPages = response.totalPages;
        this.currentPage = response.currentPage;
        this.pageSize = response.pageSize;
        this.hasNext = response.hasNext;
        this.hasPrevious = response.hasPrevious;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.error = true;
        this.loading = false;
      }
    });
  }

  // Filter methods
  onStoreFilterChange(): void {
    this.currentPage = 0;
    this.loadData();
  }

  onStateFilterChange(): void {
    this.currentPage = 0;
    this.loadData();
  }

  onOrderIdFilterChange(): void {
    this.currentPage = 0;
    this.loadData();
  }

  onSearchFilterChange(): void {
    this.searchSubject.next(this.searchFilter);
  }

  onDateFilterChange(): void {
    this.currentPage = 0;
    this.loadData();
  }

  // Sorting methods
  onSortChange(field: string): void {
    if (this.sortBy === field) {
      // Cycle through: desc -> asc -> none (deselect)
      if (this.sortOrder === 'desc') {
        this.sortOrder = 'asc';
      } else if (this.sortOrder === 'asc') {
        // Deselect: reset to default sorting
        this.sortBy = 'orderdate';
        this.sortOrder = 'desc';
      }
    } else {
      // Change field and default to descending
      this.sortBy = field;
      this.sortOrder = 'desc';
    }
    this.currentPage = 0;
    this.loadData();
  }

  getSortIcon(field: string): string {
    if (this.sortBy !== field) {
      return 'sort'; // Default sort icon (both arrows)
    }
    return this.sortOrder === 'asc' ? 'sort-up' : 'sort-down';
  }

  getSortClass(field: string): string {
    if (this.sortBy === field) {
      return 'text-orange-600 font-semibold';
    }
    return 'text-gray-500 hover:text-orange-500';
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadData();
  }

  clearFilters(): void {
    this.storeFilter = '';
    this.stateFilter = '';
    this.orderIdFilter = '';
    this.searchFilter = '';
    this.fromDateFilter = '';
    this.toDateFilter = '';
    this.sortBy = 'orderdate';
    this.sortOrder = 'desc';
    this.currentPage = 0;
    this.loadData();
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadData();
    }
  }

  nextPage(): void {
    if (this.hasNext) {
      this.currentPage++;
      this.loadData();
    }
  }

  previousPage(): void {
    if (this.hasPrevious) {
      this.currentPage--;
      this.loadData();
    }
  }

  // Export functionality
  exportOrders(): void {
    this.exportLoading = true;

    this.kpiService.exportOrdersV2(
      this.storeFilter || undefined,
      this.stateFilter || undefined,
      this.orderIdFilter || undefined,
      this.searchFilter || undefined,
      this.fromDateFilter || undefined,
      this.toDateFilter || undefined
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pizza-world-orders-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.exportLoading = false;
      },
      error: (error) => {
        console.error('Error exporting orders:', error);
        this.exportLoading = false;
      }
    });
  }

  // Utility methods
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getFilterLabel(): string {
    const filters = [];
    if (this.storeFilter) filters.push(`Store: ${this.storeFilter}`);
    if (this.stateFilter) filters.push(`State: ${this.stateFilter}`);
    if (this.orderIdFilter) filters.push(`Order: ${this.orderIdFilter}`);
    if (this.searchFilter) filters.push(`Search: ${this.searchFilter}`);
    if (this.fromDateFilter || this.toDateFilter) {
      const dateRange = `${this.fromDateFilter || 'Start'} - ${this.toDateFilter || 'End'}`;
      filters.push(`Date: ${dateRange}`);
    }
    return filters.length > 0 ? filters.join(' • ') : 'All Orders';
  }

  getPaginationArray(): number[] {
    const maxVisible = 5;
    const start = Math.max(0, this.currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(this.totalPages, start + maxVisible);
    return Array.from({ length: end - start }, (_, i) => start + i);
  }

  loadKPIs(): void {
    this.kpisLoading = true;

    this.kpiService.getOrdersKPIs(
      this.storeFilter || undefined,
      this.stateFilter || undefined,
      this.orderIdFilter || undefined,
      this.searchFilter || undefined,
      this.fromDateFilter || undefined,
      this.toDateFilter || undefined
    ).subscribe({
      next: (kpis: OrdersKPIs) => {
        this.ordersKPIs = kpis;
        this.kpisLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading orders KPIs:', error);
        this.kpisLoading = false;
      }
    });
  }
}
