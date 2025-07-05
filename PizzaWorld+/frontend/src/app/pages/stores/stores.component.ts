import { Component, OnInit, ChangeDetectorRef, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { KpiService, StoreInfo } from '../../core/kpi.service';
import { NgApexchartsModule } from 'ng-apexcharts';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { catchError, finalize, map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { of, Subject, Subscription } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ApexPlotOptions,
  ApexLegend
} from 'ng-apexcharts';

// Enhanced Store Performance Interface
export interface StorePerformanceData {
  storeid: string;
  city: string;
  state_name: string;
  state_abbr: string;
  total_revenue: number;
  total_orders: number;
  unique_customers: number;
  avg_order_value: number;
  last_order_date: string;
  latitude?: number;
  longitude?: number;
}

export interface ChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  colors?: string[];
  plotOptions?: ApexPlotOptions;
  labels?: string[];
  legend?: ApexLegend;
}

@Component({
  selector: 'app-stores',
  standalone: true,
  imports: [
    SidebarComponent,
    CommonModule,
    FormsModule,
    NgApexchartsModule,
    CardModule,
    InputTextModule,
    MultiSelectModule,
    ButtonModule,
    TableModule,
    TooltipModule,
    CheckboxModule
  ],
  templateUrl: './stores.component.html',
  styleUrls: ['./stores.component.scss']
})
export class StoresComponent implements OnInit, OnDestroy {
  // Store data
  allStores: StoreInfo[] = [];
  storePerformanceData: StorePerformanceData[] = [];
  filteredStores: StorePerformanceData[] = [];
  loading = true;
  error = false;

  // Search and filter
  searchTerm = '';
  selectedStateFilter = '';
  performanceFilter = '';
  storeIdFilter = '';
  states: { label: string, value: string }[] = [];

  // Analytics
  showAnalytics = false;

  // Chart data and options
  storeRevenueChartOptions: any = null;
  statePerformanceChartOptions: any = null;
  monthlyTrendsChartOptions: any = null;

  // NEW ANALYTICS CHARTS
  hourlyPerformanceChartOptions: any = null;
  customerAcquisitionChartOptions: any = null;

  // Analytics data
  stateAnalyticsData: any[] = [];
  monthlyRevenueData: any[] = [];

  // NEW ANALYTICS DATA
  hourlyPerformanceData: any[] = [];
  customerAcquisitionData: any[] = [];

  // Table sorting
  tableSortColumn: 'total_revenue' | 'total_orders' | 'avg_order_value' | 'unique_customers' | 'storeid' | 'city' | 'state_name' = 'total_revenue';
  tableSortAscending = false;

  // Export
  exportLoading = false;

  // Performance optimization
  private searchSubject = new Subject<string>();
  private subscriptions = new Subscription();

  private kpi = inject(KpiService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  constructor() {}

  ngOnInit(): void {
    this.setupSearchDebouncing();
    this.loadStoreData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private setupSearchDebouncing(): void {
    const searchSubscription = this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.applyFilters();
        this.cdr.detectChanges();
      });

    this.subscriptions.add(searchSubscription);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  refreshData(): void {
    this.loadStoreData();
    if (this.showAnalytics) {
      this.loadAnalyticsData();
    }
  }

  loadStoreData(): void {
    this.loading = true;
    this.error = false;

    // Load store performance data with metrics
    this.http.get<StorePerformanceData[]>('/api/v2/stores/performance', {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(err => {
        console.error('❌ Store performance loading error:', err);
        this.error = true;
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe(stores => {
      if (stores.length > 0) {
        this.storePerformanceData = stores;
        this.filteredStores = [...stores];
        this.extractStates();
        this.applyFilters();
        console.log('✅ Store performance data loaded:', stores.length, 'stores');
      }
    });
  }

  private extractStates(): void {
    const uniqueStates = [...new Set(this.storePerformanceData.map(store => store.state_name))]
      .sort()
      .map(state => ({ label: state, value: state }));
    this.states = uniqueStates;
  }

  // Analytics Methods
  toggleAnalytics(): void {
    this.showAnalytics = !this.showAnalytics;
    if (this.showAnalytics && !this.stateAnalyticsData.length) {
      this.loadAnalyticsData();
    }
  }

  loadAnalyticsData(): void {
    this.loadStateAnalyticsData();
    this.loadMonthlyRevenueData();
    this.buildStoreRevenueChart();

    // Load new analytics data
    this.loadHourlyPerformanceData();
    this.loadCustomerAcquisitionData();
  }

  loadStateAnalyticsData(): void {
    this.http.get<any[]>('/api/v2/analytics/state-performance', {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (data) => {
        this.stateAnalyticsData = data;
        this.buildStatePerformanceChart();
      },
      error: (error) => console.error('Failed to load state analytics:', error)
    });
  }

  loadMonthlyRevenueData(): void {
    this.http.get<any[]>('/api/v2/analytics/monthly-revenue-trends', {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (data) => {
        this.monthlyRevenueData = data;
        this.buildMonthlyTrendsChart();
      },
      error: (error) => console.error('Failed to load monthly revenue:', error)
    });
  }

  // NEW ANALYTICS DATA LOADING METHODS
  loadHourlyPerformanceData(): void {
    this.http.get<any[]>('/api/v2/stores/hourly-performance', {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (data) => {
        this.hourlyPerformanceData = data;
        this.buildHourlyPerformanceChart();
      },
      error: (error) => console.error('Failed to load hourly performance:', error)
    });
  }

  loadCustomerAcquisitionData(): void {
    this.http.get<any[]>('/api/v2/stores/customer-acquisition', {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (data) => {
        this.customerAcquisitionData = data;
        this.buildCustomerAcquisitionChart();
      },
      error: (error) => console.error('Failed to load customer acquisition:', error)
    });
  }



  // Chart Building Methods
  buildStoreRevenueChart(): void {
    if (!this.storePerformanceData || this.storePerformanceData.length === 0) {
      this.storeRevenueChartOptions = null;
      return;
    }

    // Create revenue distribution histogram
    const revenues = this.storePerformanceData.map(s => s.total_revenue);
    const bins = this.createHistogramBins(revenues, 10);

    this.storeRevenueChartOptions = {
      series: [{
        name: 'Number of Stores',
        data: bins.map(bin => ({ x: bin.label, y: bin.count }))
      }],
      chart: {
        type: 'bar',
        height: 320,
        toolbar: { show: true }
      },
      colors: ['#f97316'],
      plotOptions: {
        bar: {
          horizontal: false,
          borderRadius: 4,
          dataLabels: { position: 'top' }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => val.toString()
      },
      xaxis: {
        title: { text: 'Revenue Range' },
        labels: { rotate: -45 }
      },
      yaxis: {
        title: { text: 'Number of Stores' }
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val} stores`
        }
      }
    };
  }

  buildStatePerformanceChart(): void {
    if (!this.stateAnalyticsData || this.stateAnalyticsData.length === 0) {
      this.statePerformanceChartOptions = null;
      return;
    }

    const states = this.stateAnalyticsData.map(d => d.state_abbr || d.state);
    const revenue = this.stateAnalyticsData.map(d => Number(d.total_revenue) || 0);
    const orders = this.stateAnalyticsData.map(d => Number(d.total_orders) || 0);

    this.statePerformanceChartOptions = {
      series: [
        { name: 'Revenue ($)', data: revenue },
        { name: 'Orders', data: orders, yAxisIndex: 1 }
      ],
      chart: {
        type: 'bar',
        height: 320,
        toolbar: { show: true }
      },
      colors: ['#10b981', '#3b82f6'],
      plotOptions: {
        bar: {
          horizontal: false,
          dataLabels: { position: 'top' }
        }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: states,
        title: { text: 'States' }
      },
      yaxis: [
        {
          title: { text: 'Revenue ($)' },
          labels: {
            formatter: (val: number) => `$${(val / 1000000).toFixed(1)}M`
          }
        },
        {
          opposite: true,
          title: { text: 'Orders' },
          labels: {
            formatter: (val: number) => `${(val / 1000).toFixed(0)}K`
          }
        }
      ],
      tooltip: {
        shared: true,
        intersect: false,
        y: [
          {
            formatter: (val: number) => `$${val.toLocaleString()}`
          },
          {
            formatter: (val: number) => `${val.toLocaleString()} orders`
          }
        ]
      }
    };
  }

  buildMonthlyTrendsChart(): void {
    if (!this.monthlyRevenueData || this.monthlyRevenueData.length === 0) {
      this.monthlyTrendsChartOptions = null;
      return;
    }

    // Group by store and create series for all stores
    const storeGroups = new Map<string, Array<{month: string, revenue: number}>>();
    this.monthlyRevenueData.forEach(item => {
      const storeKey = `${item.storeid} (${item.city})`;
      if (!storeGroups.has(storeKey)) {
        storeGroups.set(storeKey, []);
      }
      storeGroups.get(storeKey)!.push({
        month: item.month_name_label || `${item.year}-${item.month}`,
        revenue: Number(item.total_revenue) || 0
      });
    });

    // Get all stores sorted by total revenue
    const allStores = Array.from(storeGroups.entries())
      .map(([store, data]) => ({
        store,
        totalRevenue: data.reduce((sum, item) => sum + item.revenue, 0),
        data: data.sort((a, b) => a.month.localeCompare(b.month))
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const months = allStores[0]?.data.map(d => d.month) || [];

    // Generate colors for all stores (cycling through a palette)
    const colorPalette = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6366f1'];
    const storeColors = allStores.map((_, index) => colorPalette[index % colorPalette.length]);

        // Create series for all stores
    const chartSeries = allStores.map(store => ({
      name: store.store,
      data: store.data.map(d => d.revenue)
    }));

    this.monthlyTrendsChartOptions = {
      series: chartSeries,
      chart: {
        type: 'line',
        height: 320,
        toolbar: { show: true },
        zoom: { enabled: true },
        events: {
          mounted: (chartContext: any, config: any) => {
            // Hide all series except top 5 after chart is mounted
            setTimeout(() => {
              for (let i = 5; i < allStores.length; i++) {
                chartContext.hideSeries(allStores[i].store);
              }
            }, 100);
          }
        }
      },
      colors: storeColors,
      stroke: {
        curve: 'smooth',
        width: 3
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: months,
        title: { text: 'Month' }
      },
      yaxis: {
        title: { text: 'Revenue ($)' },
        labels: {
          formatter: (val: number) => `$${(val / 1000).toFixed(0)}K`
        }
      },
      legend: {
        show: true,
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '12px',
        fontFamily: 'Poppins, sans-serif',
        itemMargin: {
          horizontal: 8,
          vertical: 4
        },
        onItemClick: {
          toggleDataSeries: true
        },
        onItemHover: {
          highlightDataSeries: true
        }
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (val: number) => `$${val.toLocaleString()}`
        }
      }
    };
  }

  // NEW ANALYTICS CHART BUILDING METHODS
  buildHourlyPerformanceChart(): void {
    if (!this.hourlyPerformanceData || this.hourlyPerformanceData.length === 0) {
      this.hourlyPerformanceChartOptions = null;
      return;
    }

    // Create heatmap data
    const stores = [...new Set(this.hourlyPerformanceData.map(d => d.storeid))];
    const hours = Array.from({length: 24}, (_, i) => i);

    const series = stores.map(store => {
      const storeData = hours.map(hour => {
        const hourData = this.hourlyPerformanceData.find(d => d.storeid === store && d.hour_of_day === hour);
        return hourData ? Number(hourData.total_revenue) : 0;
      });
      return {
        name: store,
        data: storeData
      };
    });

    this.hourlyPerformanceChartOptions = {
      series: series,
      chart: {
        type: 'heatmap',
        height: 320,
        toolbar: { show: true }
      },
      colors: ['#f97316'],
      xaxis: {
        categories: hours.map(h => `${h}:00`),
        title: { text: 'Hour of Day' }
      },
      yaxis: {
        title: { text: 'Stores' }
      },
      dataLabels: {
        enabled: false
      },
      plotOptions: {
        heatmap: {
          shadeIntensity: 0.5,
          radius: 0,
          useFillColorAsStroke: true,
          colorScale: {
            ranges: [{
              from: 0,
              to: 1000,
              name: 'Low',
              color: '#fef3c7'
            }, {
              from: 1001,
              to: 5000,
              name: 'Medium',
              color: '#fbbf24'
            }, {
              from: 5001,
              to: 10000,
              name: 'High',
              color: '#f97316'
            }]
          }
        }
      },
      tooltip: {
        y: {
          formatter: (val: number) => `$${val.toLocaleString()}`
        }
      }
    };
  }

  buildCustomerAcquisitionChart(): void {
    if (!this.customerAcquisitionData || this.customerAcquisitionData.length === 0) {
      this.customerAcquisitionChartOptions = null;
      return;
    }

    // Group by month and sum new customers
    const monthlyData = new Map();
    this.customerAcquisitionData.forEach(item => {
      const month = item.month_name || item.month_label;
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { customers: 0, revenue: 0 });
      }
      const existing = monthlyData.get(month);
      existing.customers += Number(item.new_customers) || 0;
      existing.revenue += Number(item.revenue_from_new_customers) || 0;
    });

    const months = Array.from(monthlyData.keys()).sort();
    const customers = months.map(month => monthlyData.get(month).customers);
    const revenue = months.map(month => monthlyData.get(month).revenue);

    this.customerAcquisitionChartOptions = {
      series: [
        { name: 'New Customers', data: customers },
        { name: 'Revenue from New Customers', data: revenue, yAxisIndex: 1 }
      ],
      chart: {
        type: 'line',
        height: 320,
        toolbar: { show: true }
      },
      colors: ['#10b981', '#3b82f6'],
      stroke: {
        curve: 'smooth',
        width: 3
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: months,
        title: { text: 'Month' }
      },
      yaxis: [
        {
          title: { text: 'New Customers' }
        },
        {
          opposite: true,
          title: { text: 'Revenue ($)' },
          labels: {
            formatter: (val: number) => `$${(val / 1000).toFixed(0)}K`
          }
        }
      ],
      tooltip: {
        shared: true,
        intersect: false,
        y: [
          {
            formatter: (val: number) => `${val} customers`
          },
          {
            formatter: (val: number) => `$${val.toLocaleString()}`
          }
        ]
      }
    };
  }



  // Track by function for ngFor performance
  trackByStoreId(index: number, store: any): any {
    return store.storeid;
  }

  // Utility Methods
  private createHistogramBins(data: number[], binCount: number): Array<{label: string, count: number}> {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binSize = (max - min) / binCount;

    const bins: Array<{label: string, count: number}> = [];

    for (let i = 0; i < binCount; i++) {
      const binStart = min + (i * binSize);
      const binEnd = min + ((i + 1) * binSize);
      const count = data.filter(val => val >= binStart && (i === binCount - 1 ? val <= binEnd : val < binEnd)).length;

      bins.push({
        label: `$${(binStart / 1000).toFixed(0)}K-$${(binEnd / 1000).toFixed(0)}K`,
        count
      });
    }

    return bins;
  }

  // Filter Methods
  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onStateFilterChange(): void {
    this.applyFilters();
  }

  onPerformanceFilterChange(): void {
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedStateFilter = '';
    this.performanceFilter = '';
    this.storeIdFilter = '';
    this.applyFilters();
  }

  onStoreIdFilterChange(): void {
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.selectedStateFilter || this.performanceFilter || this.storeIdFilter);
  }

  applyFilters(): void {
    let filtered = [...this.storePerformanceData];

    // Store ID filter
    if (this.storeIdFilter) {
      const storeIdLower = this.storeIdFilter.toLowerCase();
      filtered = filtered.filter(store =>
        store.storeid?.toLowerCase().includes(storeIdLower)
      );
    }

    // Search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(store =>
        store.storeid?.toLowerCase().includes(searchLower) ||
        store.city?.toLowerCase().includes(searchLower) ||
        store.state_name?.toLowerCase().includes(searchLower) ||
        store.state_abbr?.toLowerCase().includes(searchLower)
      );
    }

    // State filter
    if (this.selectedStateFilter) {
      filtered = filtered.filter(store => store.state_name === this.selectedStateFilter);
    }

    // Performance filter
    if (this.performanceFilter) {
      const avgRevenue = this.storePerformanceData.reduce((sum, store) => sum + store.total_revenue, 0) / this.storePerformanceData.length;

      switch (this.performanceFilter) {
        case 'top':
          filtered = filtered.filter(store => store.total_revenue > avgRevenue * 1.2);
          break;
        case 'bottom':
          filtered = filtered.filter(store => store.total_revenue < avgRevenue * 0.8);
          break;
        case 'new':
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          filtered = filtered.filter(store => new Date(store.last_order_date) > thirtyDaysAgo);
          break;
      }
    }

    this.filteredStores = filtered;
  }

  // Table Methods
  onTableSortChange(): void {
    this.applyTableSort();
  }

  toggleTableSortOrder(): void {
    this.tableSortAscending = !this.tableSortAscending;
    this.applyTableSort();
  }

  private applyTableSort(): void {
    // This will be handled by getTableSortedData()
    this.cdr.detectChanges();
  }

  getSortDisplayName(): string {
    switch (this.tableSortColumn) {
      case 'total_revenue': return 'Revenue';
      case 'total_orders': return 'Orders';
      case 'avg_order_value': return 'Avg Order Value';
      case 'unique_customers': return 'Customers';
      case 'storeid': return 'Store ID';
      case 'city': return 'City';
      case 'state_name': return 'State';
      default: return 'Revenue';
    }
  }

  getTableSortedData(): StorePerformanceData[] {
    const sortMultiplier = this.tableSortAscending ? 1 : -1;
    return [...this.filteredStores].sort((a, b) => {
      let aVal: number | string, bVal: number | string;

      switch (this.tableSortColumn) {
        case 'total_revenue':
          aVal = a.total_revenue; bVal = b.total_revenue; break;
        case 'total_orders':
          aVal = a.total_orders; bVal = b.total_orders; break;
        case 'avg_order_value':
          aVal = a.avg_order_value; bVal = b.avg_order_value; break;
        case 'unique_customers':
          aVal = a.unique_customers; bVal = b.unique_customers; break;
        case 'storeid':
          aVal = a.storeid; bVal = b.storeid; break;
        case 'city':
          aVal = a.city; bVal = b.city; break;
        case 'state_name':
          aVal = a.state_name; bVal = b.state_name; break;
        default:
          aVal = a.total_revenue; bVal = b.total_revenue;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * sortMultiplier;
      }
      return ((aVal as number) - (bVal as number)) * sortMultiplier;
    });
  }

  // KPI Methods
  getTotalStores(): number {
    return this.filteredStores.length;
  }

  getAllStoresCount(): number {
    return this.storePerformanceData.length;
  }

  getFilteredStoreCount(): number {
    return this.filteredStores.length;
  }

  getUniqueStatesCount(): number {
    return new Set(this.filteredStores.map(store => store.state_name)).size;
  }

  getTotalRevenue(): number {
    return this.filteredStores.reduce((sum, store) => sum + store.total_revenue, 0);
  }

  getTotalOrders(): number {
    return this.filteredStores.reduce((sum, store) => sum + store.total_orders, 0);
  }

  getAverageOrderValue(): number {
    const totalRevenue = this.getTotalRevenue();
    const totalOrders = this.getTotalOrders();
    return totalOrders > 0 ? totalRevenue / totalOrders : 0;
  }

  // Performance Badge Methods
  getPerformanceLabel(store: StorePerformanceData): string {
    const avgRevenue = this.storePerformanceData.reduce((sum, s) => sum + s.total_revenue, 0) / this.storePerformanceData.length;

    if (store.total_revenue > avgRevenue * 1.5) return 'Excellent';
    if (store.total_revenue > avgRevenue * 1.2) return 'Good';
    if (store.total_revenue > avgRevenue * 0.8) return 'Average';
    return 'Needs Attention';
  }

  getPerformanceBadgeClass(store: StorePerformanceData): string {
    const label = this.getPerformanceLabel(store);
    switch (label) {
      case 'Excellent': return 'bg-green-100 text-green-800';
      case 'Good': return 'bg-blue-100 text-blue-800';
      case 'Average': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  }

  // Utility Methods
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  getTimeSinceLastOrder(dateString: string): string {
    if (!dateString) return 'No orders';
    const lastOrder = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  formatCoordinates(lat: number, lng: number): string {
    if (!lat || !lng) return 'N/A';
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  formatNumberWithDots(value: number): string {
    return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  formatWholeNumberWithDots(value: number): string {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // Navigation Methods
  navigateToStoreDetails(store: StorePerformanceData): void {
    this.router.navigate(['/stores', store.storeid]);
  }

  openInMaps(lat: number | undefined, lng: number | undefined): void {
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    }
  }

  // Export Methods
  exportStores(): void {
    this.exportLoading = true;

    // Create CSV content
    const headers = ['Store ID', 'City', 'State', 'Revenue', 'Orders', 'Customers', 'AOV', 'Last Order'];
    const csvContent = [
      headers.join(','),
      ...this.filteredStores.map(store => [
        store.storeid,
        store.city,
        store.state_name,
        store.total_revenue,
        store.total_orders,
        store.unique_customers,
        store.avg_order_value.toFixed(2),
        this.formatDate(store.last_order_date)
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `store-performance-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    setTimeout(() => {
      this.exportLoading = false;
      this.cdr.detectChanges();
    }, 1000);
  }
}
