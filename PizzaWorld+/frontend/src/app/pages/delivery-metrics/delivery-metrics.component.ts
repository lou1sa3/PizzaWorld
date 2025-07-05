import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexTitleSubtitle,
  ApexDataLabels,
  ApexStroke,
  ApexPlotOptions,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexTooltip,
  ApexGrid
} from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis | ApexYAxis[];
  title?: ApexTitleSubtitle;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  plotOptions?: ApexPlotOptions;
  legend?: ApexLegend;
  labels?: string[];
  colors?: any[];
  tooltip?: ApexTooltip;
  grid?: ApexGrid;
};

interface StoreCapacitySummary {
  storeid: string;
  city: string;
  state_abbr: string;
  latitude: number;
  longitude: number;
  avg_utilization: number;
  peak_utilization: number;
  over_capacity_hours: number;
  high_utilization_hours: number;
  total_customers: number;
  avg_customer_distance: number;
  customers_0_2_miles: number;
  customers_2_5_miles: number;
  customers_5_10_miles: number;
  customers_10_plus_miles: number;
  avg_daily_miles: number;
  avg_daily_hours: number;
  avg_miles_per_delivery: number;
  total_delivery_cost: number;
}

interface DeliveryMetric {
  storeid: string;
  state_abbr: string;
  delivery_date: string;
  year: number;
  month: number;
  delivery_count: number;
  total_miles_driven: number;
  total_hours_driven: number;
  avg_delivery_distance: number;
  max_delivery_distance: number;
  miles_per_delivery: number;
  estimated_delivery_cost: number;
}

interface PeakHour {
  storeid: string;
  hour_of_day: number;
  avg_orders: number;
  avg_revenue: number;
  avg_utilization: number;
  traffic_category: string;
}

interface CustomerDistance {
  storeid: string;
  state_abbr: string;
  customerid: string;
  distance_miles: number;
  distance_category: string;
}

interface TimePeriodOption {
  year: number;
  month?: number;
  year_label: string;
  month_label?: string;
  month_name_label?: string;
}

@Component({
  selector: 'app-delivery-metrics',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule, SidebarComponent],
  templateUrl: './delivery-metrics.component.html',
  styleUrls: ['./delivery-metrics.component.scss']
})
export class DeliveryMetricsComponent implements OnInit {
  // Data arrays
  storeCapacitySummary: StoreCapacitySummary[] = [];
  deliveryMetrics: DeliveryMetric[] = [];
  peakHours: PeakHour[] = [];
  customerDistances: CustomerDistance[] = [];

  // Filter state
  selectedStates: string[] = [];
  selectedStores: string[] = [];
  availableStates: any[] = [];
  availableStores: any[] = [];
  showStateDropdown = false;
  showStoreDropdown = false;

  // User information
  currentUser: any = null;

  // Loading and error states
  loading = false;
  error = false;
  chartsLoading = false;

  // Caching
  private dataCache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Sorting state
  summarySort = { column: 'avg_utilization', ascending: false };
  deliverySort = { column: 'delivery_date', ascending: false };
  peakHoursSort = { column: 'hour_of_day', ascending: true };

  // Pagination state for delivery metrics
  deliveryCurrentPage = 1;
  deliveryItemsPerPage = 50;
  deliveryTotalItems = 0;

  // Chart data
  utilizationChart: ChartOptions = {
    series: [],
    chart: { type: 'bar', height: 350 },
    xaxis: { categories: [] },
    yaxis: { title: { text: '' } },
    title: { text: '' },
    dataLabels: { enabled: false },
    plotOptions: { bar: {} },
    legend: { show: true },
    colors: []
  };

  deliveryTrendsChart: ChartOptions = {
    series: [],
    chart: { type: 'line', height: 350 },
    xaxis: { categories: [] },
    yaxis: { title: { text: '' } },
    title: { text: '' },
    dataLabels: { enabled: false },
    stroke: { width: 2 },
    colors: []
  };

  customerDistanceChart: ChartOptions = {
    series: [],
    chart: { type: 'donut', height: 350 },
    labels: [],
    title: { text: '' },
    dataLabels: { enabled: true },
    plotOptions: { pie: { donut: {} } },
    legend: { show: true },
    colors: []
  };

  costAnalysisChart: ChartOptions = {
    series: [],
    chart: { type: 'bar', height: 350 },
    xaxis: { categories: [] },
    yaxis: { title: { text: '' } },
    title: { text: '' },
    dataLabels: { enabled: false },
    plotOptions: { bar: {} },
    colors: []
  };

  // KPI metrics
  totalStores = 0;
  avgUtilization = 0;
  totalDeliveryCost = 0;
  totalMilesDriven = 0;
  avgDeliveryDistance = 0;
  totalDeliveries = 0;
  avgDeliveryTime = 0;

  // Orange color palette for consistency
  orangePalette = [
    '#FF6B35', '#FF8C42', '#FFB366', '#FFCC99', '#FFE0CC',
    '#E55A2B', '#CC4F24', '#B3441C', '#993915', '#802E0E'
  ];

  constructor(private http: HttpClient) {}

  // Make Math available in template
  Math = Math;

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadInitialData();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private loadUserInfo(): void {
    this.http.get<any>('/api/v2/profile', {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (profile) => {
        this.currentUser = profile;
        if (this.currentUser?.role === 'HQ_ADMIN' || this.currentUser?.role === 'STATE_MANAGER') {
          this.loadAvailableFilters();
        }
      },
      error: (error) => {
        console.error('Failed to load user profile:', error);
      }
    });
  }

  private loadAvailableFilters(): void {
    // Load available states
    this.http.get<any[]>('/api/v2/orders/available-states', {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (states) => {
        this.availableStates = states || [];
      },
      error: (error) => {
        console.error('Failed to load states:', error);
      }
    });

    // Load available stores
    this.http.get<any[]>('/api/v2/stores', {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (stores) => {
        this.availableStores = stores || [];
      },
      error: (error) => {
        console.error('Failed to load stores:', error);
      }
    });
  }

  loadInitialData(): void {
    this.loading = true;
    this.error = false;

    // Load data without filters
    this.loadAllData();
  }



  loadAllData(): void {
    this.loading = true;
    this.error = false;
    this.chartsLoading = true;

    // Load all data in parallel with timeout and error handling
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 30000)
    );

    Promise.race([
      Promise.all([
        this.loadStoreCapacitySummary(),
        this.loadDeliveryMetrics(),
        this.loadPeakHours(),
        this.loadCustomerDistances()
      ]),
      timeout
    ]).then(() => {
      this.calculateKPIs();
      this.buildAllCharts();
      this.loading = false;
      this.chartsLoading = false;
    }).catch(error => {
      console.error('Failed to load data:', error);
      this.error = true;
      this.loading = false;
      this.chartsLoading = false;
    });
  }

  private loadStoreCapacitySummary(): Promise<void> {
    const cacheKey = `storeCapacitySummary_${this.selectedStates.join(',')}_${this.selectedStores.join(',')}`;
    const cachedData = this.getCachedData(cacheKey);

    if (cachedData) {
      this.storeCapacitySummary = cachedData;
      return Promise.resolve();
    }

    const params = new HttpParams()
      .set('states', this.selectedStates.join(','))
      .set('storeIds', this.selectedStores.join(','));

    return new Promise((resolve, reject) => {
      this.http.get<StoreCapacitySummary[]>('/api/v2/analytics/store-capacity-v3/summary', {
        headers: this.getAuthHeaders(),
        params: params
      }).subscribe({
        next: (data) => {
          this.storeCapacitySummary = data || [];
          this.setCachedData(cacheKey, this.storeCapacitySummary);
          resolve();
        },
        error: (error) => reject(error)
      });
    });
  }

  private loadDeliveryMetrics(): Promise<void> {
    const params = new HttpParams()
      .set('states', this.selectedStates.join(','))
      .set('storeIds', this.selectedStores.join(','));

    return new Promise((resolve, reject) => {
      this.http.get<DeliveryMetric[]>('/api/v2/analytics/store-capacity-v3/delivery-metrics', {
        headers: this.getAuthHeaders(),
        params: params
      }).subscribe({
        next: (data) => {
          this.deliveryMetrics = data || [];
          resolve();
        },
        error: (error) => reject(error)
      });
    });
  }

  private loadPeakHours(): Promise<void> {
    const params = new HttpParams()
      .set('states', this.selectedStates.join(','))
      .set('storeIds', this.selectedStores.join(','));

    return new Promise((resolve, reject) => {
      this.http.get<PeakHour[]>('/api/v2/analytics/store-capacity-v3/peak-hours', {
        headers: this.getAuthHeaders(),
        params: params
      }).subscribe({
        next: (data) => {
          this.peakHours = data || [];
          resolve();
        },
        error: (error) => reject(error)
      });
    });
  }

  private loadCustomerDistances(): Promise<void> {
    const params = new HttpParams()
      .set('states', this.selectedStates.join(','))
      .set('storeIds', this.selectedStores.join(','));

    return new Promise((resolve, reject) => {
      this.http.get<any>('/api/v2/analytics/store-capacity-v3/customer-distance', {
        headers: this.getAuthHeaders(),
        params: params
      }).subscribe({
        next: (data) => {
          this.customerDistances = data?.distances || [];
          resolve();
        },
        error: (error) => reject(error)
      });
    });
  }

  private calculateKPIs(): void {
    if (this.storeCapacitySummary.length > 0) {
      this.totalStores = this.storeCapacitySummary.length;
      this.avgUtilization = this.storeCapacitySummary.reduce((sum, store) => sum + store.avg_utilization, 0) / this.totalStores;
      this.totalDeliveryCost = this.storeCapacitySummary.reduce((sum, store) => sum + store.total_delivery_cost, 0);
      this.totalMilesDriven = this.storeCapacitySummary.reduce((sum, store) => sum + store.avg_daily_miles, 0);
      this.avgDeliveryDistance = this.storeCapacitySummary.reduce((sum, store) => sum + store.avg_customer_distance, 0) / this.totalStores;
    }

    if (this.deliveryMetrics.length > 0) {
      this.totalDeliveries = this.deliveryMetrics.reduce((sum, metric) => sum + metric.delivery_count, 0);
      // Remove hours driven calculation - using average distance instead
      this.avgDeliveryTime = this.deliveryMetrics.reduce((sum, metric) => sum + metric.avg_delivery_distance, 0) / this.deliveryMetrics.length;
    }
  }

  private buildAllCharts(): void {
    this.buildUtilizationChart();
    this.buildDeliveryTrendsChart();
    this.buildCustomerDistanceChart();
    this.buildCostAnalysisChart();
  }

  private buildUtilizationChart(): void {
    const sortedStores = [...this.storeCapacitySummary].sort((a, b) => b.avg_utilization - a.avg_utilization);
    const top10Stores = sortedStores.slice(0, 10);

    this.utilizationChart = {
      series: [{
        name: 'Average Utilization',
        data: top10Stores.map(s => Math.round(s.avg_utilization))
      }, {
        name: 'Peak Utilization',
        data: top10Stores.map(s => Math.round(s.peak_utilization))
      }],
      chart: {
        type: 'bar',
        height: 350,
        toolbar: { show: true }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          dataLabels: { position: 'top' }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function(val: any) {
          return val + '%';
        }
      },
      colors: [this.orangePalette[0], this.orangePalette[2]],
      xaxis: {
        categories: top10Stores.map(s => `${s.city} (${s.storeid})`),
        title: { text: 'Utilization %' }
      },
      yaxis: {
        title: { text: 'Store Location' }
      },
      title: {
        text: 'Top 10 Stores by Utilization',
        align: 'center'
      },
      legend: { position: 'top' }
    };
  }

  private buildDeliveryTrendsChart(): void {
    if (!this.deliveryMetrics.length) return;

    const dailyData: { [date: string]: any } = {};
    this.deliveryMetrics.forEach(dm => {
      if (!dailyData[dm.delivery_date]) {
        dailyData[dm.delivery_date] = {
          delivery_count: 0,
          total_miles_driven: 0,
          estimated_delivery_cost: 0
        };
      }
      dailyData[dm.delivery_date].delivery_count += dm.delivery_count;
      dailyData[dm.delivery_date].total_miles_driven += dm.total_miles_driven;
      dailyData[dm.delivery_date].estimated_delivery_cost += dm.estimated_delivery_cost;
    });

    const sortedDates = Object.keys(dailyData).sort();
    const last30Days = sortedDates.slice(-30);

    this.deliveryTrendsChart = {
      series: [{
        name: 'Deliveries',
        type: 'column',
        data: last30Days.map(date => dailyData[date].delivery_count)
      }, {
        name: 'Miles Driven',
        type: 'line',
        data: last30Days.map(date => Math.round(dailyData[date].total_miles_driven))
      }, {
        name: 'Delivery Cost',
        type: 'line',
        data: last30Days.map(date => Math.round(dailyData[date].estimated_delivery_cost))
      }],
      chart: {
        height: 350,
        type: 'line',
        toolbar: { show: true }
      },
      stroke: { width: [0, 4, 4] },
      title: { text: 'Daily Delivery Metrics (Last 30 Days)' },
      dataLabels: { enabled: false },
      xaxis: {
        categories: last30Days.map(date => {
          const d = new Date(date);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        }),
        title: { text: 'Date' }
      },
      yaxis: [{
        title: { text: 'Deliveries / Miles' }
      }, {
        opposite: true,
        title: { text: 'Cost ($)' }
      }],
      colors: [this.orangePalette[0], this.orangePalette[2], this.orangePalette[4]]
    };
  }

  private buildCustomerDistanceChart(): void {
    if (!this.customerDistances.length) return;

    const distanceCategories = {
      '0-2 miles': 0,
      '2-5 miles': 0,
      '5-10 miles': 0,
      '10+ miles': 0
    };

    // Deduplicate customers by customerid to get unique count
    const uniqueCustomers = new Map<string, CustomerDistance>();
    this.customerDistances.forEach(cd => {
      // Keep the first occurrence or the one with shortest distance if customer appears multiple times
      if (!uniqueCustomers.has(cd.customerid) ||
          cd.distance_miles < uniqueCustomers.get(cd.customerid)!.distance_miles) {
        uniqueCustomers.set(cd.customerid, cd);
      }
    });

    // Count unique customers by distance category
    uniqueCustomers.forEach(cd => {
      if (distanceCategories.hasOwnProperty(cd.distance_category)) {
        distanceCategories[cd.distance_category as keyof typeof distanceCategories]++;
      }
    });

    const categories = Object.keys(distanceCategories);
    const values = Object.values(distanceCategories);

    this.customerDistanceChart = {
      series: values,
      chart: {
        type: 'donut',
        height: 350,
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: false,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: false,
            reset: true
          },
          export: {
            csv: {
              filename: 'customer-distance-distribution'
            },
            svg: {
              filename: 'customer-distance-distribution'
            },
            png: {
              filename: 'customer-distance-distribution'
            }
          }
        }
      },
      labels: categories,
      title: { text: 'Customer Distance Distribution', align: 'center' },
      colors: [this.orangePalette[0], this.orangePalette[2], this.orangePalette[4], this.orangePalette[6]],
      dataLabels: {
        enabled: true,
        formatter: function(val: any, opts: any) {
          const value = opts.w.globals.series[opts.seriesIndex];
          return value.toLocaleString() + ' customers';
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Customers',
                formatter: function(w: any) {
                  const total = w.globals.series.reduce((a: number, b: number) => a + b, 0);
                  return total.toLocaleString();
                }
              }
            }
          }
        }
      },
      legend: { position: 'bottom' }
    };
  }

  private buildCostAnalysisChart(): void {
    const sortedStores = [...this.storeCapacitySummary]
      .sort((a, b) => b.total_delivery_cost - a.total_delivery_cost)
      .slice(0, 10);

    this.costAnalysisChart = {
      series: [{
        name: 'Delivery Cost',
        data: sortedStores.map(s => Math.round(s.total_delivery_cost))
      }],
      chart: {
        type: 'bar',
        height: 350,
        toolbar: { show: true }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          dataLabels: { position: 'top' }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function(val: any) {
          return '$' + val.toLocaleString();
        }
      },
      colors: [this.orangePalette[1]],
      xaxis: {
        categories: sortedStores.map(s => `${s.city}`),
        title: { text: 'Store Location' }
      },
      yaxis: {
        title: { text: 'Delivery Cost ($)' }
      },
      title: {
        text: 'Top 10 Stores by Delivery Cost',
        align: 'center'
      }
    };
  }

  // Filter methods
  toggleStateDropdown(): void {
    this.showStateDropdown = !this.showStateDropdown;
    this.showStoreDropdown = false;
  }

  toggleStoreDropdown(): void {
    this.showStoreDropdown = !this.showStoreDropdown;
    this.showStateDropdown = false;
  }

  toggleStateSelection(state: string): void {
    const index = this.selectedStates.indexOf(state);
    if (index > -1) {
      this.selectedStates.splice(index, 1);
    } else {
      this.selectedStates.push(state);
    }
  }

  toggleStoreSelection(storeId: string): void {
    const index = this.selectedStores.indexOf(storeId);
    if (index > -1) {
      this.selectedStores.splice(index, 1);
    } else {
      this.selectedStores.push(storeId);
    }
  }

  getSelectedStatesText(): string {
    if (this.selectedStates.length === 0) {
      return 'All States';
    } else if (this.selectedStates.length === 1) {
      return this.selectedStates[0];
    } else {
      return `${this.selectedStates.length} States Selected`;
    }
  }

  getSelectedStoresText(): string {
    if (this.selectedStores.length === 0) {
      return 'All Stores';
    } else if (this.selectedStores.length === 1) {
      const store = this.availableStores.find(s => s.storeid === this.selectedStores[0]);
      return store ? `${store.city}, ${store.state}` : this.selectedStores[0];
    } else {
      return `${this.selectedStores.length} Stores Selected`;
    }
  }

  applyFilters(): void {
    this.showStateDropdown = false;
    this.showStoreDropdown = false;
    this.clearCache();
    this.loadAllData();
  }

  clearAllFilters(): void {
    this.selectedStates = [];
    this.selectedStores = [];
    this.showStateDropdown = false;
    this.showStoreDropdown = false;
    this.clearCache();
    this.loadAllData();
  }

  hasActiveFilters(): boolean {
    return this.selectedStates.length > 0 || this.selectedStores.length > 0;
  }

  getFilterLabel(): string {
    if (this.currentUser?.role === 'STORE_MANAGER') {
      return `Store ${this.currentUser.storeId}`;
    } else if (this.currentUser?.role === 'STATE_MANAGER' && !this.hasActiveFilters()) {
      return `${this.currentUser.stateAbbr} State`;
    } else if (this.hasActiveFilters()) {
      const parts = [];
      if (this.selectedStates.length > 0) {
        parts.push(`${this.selectedStates.length} State(s)`);
      }
      if (this.selectedStores.length > 0) {
        parts.push(`${this.selectedStores.length} Store(s)`);
      }
      return parts.join(', ');
    } else {
      return 'All Locations';
    }
  }

  // Sorting methods
  sortSummaryTable(column: string): void {
    if (this.summarySort.column === column) {
      this.summarySort.ascending = !this.summarySort.ascending;
    } else {
      this.summarySort.column = column;
      this.summarySort.ascending = false;
    }
  }

  sortDeliveryTable(column: string): void {
    if (this.deliverySort.column === column) {
      this.deliverySort.ascending = !this.deliverySort.ascending;
    } else {
      this.deliverySort.column = column;
      this.deliverySort.ascending = false;
    }
    // Reset pagination when sorting changes
    this.deliveryCurrentPage = 1;
  }

  sortPeakHoursTable(column: string): void {
    if (this.peakHoursSort.column === column) {
      this.peakHoursSort.ascending = !this.peakHoursSort.ascending;
    } else {
      this.peakHoursSort.column = column;
      this.peakHoursSort.ascending = true;
    }
  }

  get sortedSummaryData(): StoreCapacitySummary[] {
    return [...this.storeCapacitySummary].sort((a, b) => {
      const aVal = (a as any)[this.summarySort.column];
      const bVal = (b as any)[this.summarySort.column];

      if (typeof aVal === 'string') {
        return this.summarySort.ascending ?
          aVal.localeCompare(bVal) :
          bVal.localeCompare(aVal);
      }

      return this.summarySort.ascending ?
        aVal - bVal :
        bVal - aVal;
    });
  }

    get sortedDeliveryData(): DeliveryMetric[] {
    let filtered = [...this.deliveryMetrics];

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = (a as any)[this.deliverySort.column];
      const bVal = (b as any)[this.deliverySort.column];

      if (typeof aVal === 'string') {
        return this.deliverySort.ascending ?
          aVal.localeCompare(bVal) :
          bVal.localeCompare(aVal);
      }

      return this.deliverySort.ascending ?
        aVal - bVal :
        bVal - aVal;
    });

    // Update total items for pagination
    this.deliveryTotalItems = filtered.length;

    return filtered;
  }

  get paginatedDeliveryData(): DeliveryMetric[] {
    const sorted = this.sortedDeliveryData;
    const startIndex = (this.deliveryCurrentPage - 1) * this.deliveryItemsPerPage;
    const endIndex = startIndex + this.deliveryItemsPerPage;
    return sorted.slice(startIndex, endIndex);
  }

  get deliveryTotalPages(): number {
    return Math.ceil(this.deliveryTotalItems / this.deliveryItemsPerPage);
  }

  get deliveryPageNumbers(): number[] {
    const totalPages = this.deliveryTotalPages;
    const current = this.deliveryCurrentPage;
    const pages: number[] = [];

    // Show up to 5 page numbers around current page
    const start = Math.max(1, current - 2);
    const end = Math.min(totalPages, current + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  goToDeliveryPage(page: number): void {
    if (page >= 1 && page <= this.deliveryTotalPages) {
      this.deliveryCurrentPage = page;
    }
  }

  nextDeliveryPage(): void {
    if (this.deliveryCurrentPage < this.deliveryTotalPages) {
      this.deliveryCurrentPage++;
    }
  }

  prevDeliveryPage(): void {
    if (this.deliveryCurrentPage > 1) {
      this.deliveryCurrentPage--;
    }
  }

  get sortedPeakHoursData(): PeakHour[] {
    return [...this.peakHours].sort((a, b) => {
      const aVal = (a as any)[this.peakHoursSort.column];
      const bVal = (b as any)[this.peakHoursSort.column];

      if (typeof aVal === 'string') {
        return this.peakHoursSort.ascending ?
          aVal.localeCompare(bVal) :
          bVal.localeCompare(aVal);
      }

      return this.peakHoursSort.ascending ?
        aVal - bVal :
        bVal - aVal;
    });
  }

  // Utility methods
  exportData(): void {
    const dataToExport = {
      summary: this.storeCapacitySummary,
      deliveryMetrics: this.deliveryMetrics,
      peakHours: this.peakHours,
      customerDistances: this.customerDistances
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delivery-metrics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  getUtilizationClass(utilization: number): string {
    if (utilization >= 90) return 'text-red-600 font-bold';
    if (utilization >= 70) return 'text-orange-600 font-medium';
    if (utilization >= 50) return 'text-yellow-600';
    return 'text-green-600';
  }

  getUtilizationBadgeClass(utilization: number): string {
    if (utilization >= 90) return 'bg-red-100 text-red-800';
    if (utilization >= 70) return 'bg-orange-100 text-orange-800';
    if (utilization >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
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

  // Cache management methods
  private getCachedData(key: string): any {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() < expiry) {
      return this.dataCache.get(key);
    }
    // Remove expired cache
    this.dataCache.delete(key);
    this.cacheExpiry.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.dataCache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  private clearCache(): void {
    this.dataCache.clear();
    this.cacheExpiry.clear();
  }
}
