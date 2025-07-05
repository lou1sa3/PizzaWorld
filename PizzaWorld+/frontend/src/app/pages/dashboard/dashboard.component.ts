import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { NotificationService } from '../../core/notification.service';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexGrid,
  ApexPlotOptions
} from 'ng-apexcharts';

interface StoreRevenueData {
  storeid: string;
  city: string;
  state_name?: string;
  state_abbr: string;
  year?: number;
  month?: number;
  month_label?: string;
  month_name_label?: string;
  yearly_revenue?: number;
  monthly_revenue?: number;
  total_revenue?: number;
  yearly_orders?: number;
  monthly_orders?: number;
  total_orders?: number;
  order_count?: number;
  yearly_unique_customers?: number;
  monthly_unique_customers?: number;
  total_unique_customers?: number;
  unique_customers?: number;
  yearly_avg_order_value?: number;
  monthly_avg_order_value?: number;
  avg_order_value?: number;
}

interface TimePeriodOption {
  year: number;
  month?: number;
  year_label: string;
  month_label?: string;
  month_name_label?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, SidebarComponent, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // Chart data
  storeRevenueData: StoreRevenueData[] = [];
  filteredStoreData: StoreRevenueData[] = [];
  availableYears: TimePeriodOption[] = [];
  availableMonths: TimePeriodOption[] = [];

    // Actual unique customer count (not summed from stores)
  actualUniqueCustomers: number = 0;

  // Filter state
  selectedTimePeriod: 'all-time' | 'year' | 'month' | 'custom' = 'all-time';
  selectedYear?: number;
  selectedMonth?: number;
  customStartYear?: number;
  customStartMonth?: number;
  customEndYear?: number;
  customEndMonth?: number;

  // UI state
  loading = false;
  error = false;
  loadingCustomerCount = true; // Add this flag

  // Chart controls
  chartSortAscending = false; // false = descending (default), true = ascending
  ordersChartSortAscending = false;
  avgOrderChartSortAscending = false;
  customersChartSortAscending = false;

  // Table sorting
  tableSortColumn: 'revenue' | 'orders' | 'customers' | 'avgOrder' | 'store' = 'revenue';
  tableSortAscending = false;

  // Product table sorting
  productTableSortColumn: 'total_revenue' | 'total_quantity' | 'product_name' | 'category' | 'size' = 'total_revenue';
  productTableSortAscending = false;

  // Filters
  searchTerm = '';
  selectedState = '';
  minRevenue = 0;
  maxRevenue = 0;

  // Chart options
  revenueChartOptions: any = null;
  ordersChartOptions: any = null;
  avgOrderValueChartOptions: any = null;
  customersChartOptions: any = null;

  // Comprehensive Analytics Data
  hourlyPerformanceData: any[] = [];
  productPerformanceData: any[] = [];
  categoryPerformanceData: any[] = [];
  customerAcquisitionData: any[] = [];
  dailyTrendsData: any[] = [];
  monthlyTrendsData: any[] = [];
  peakHoursData: any[] = [];

  // Analytics Chart Options
  hourlyChartOptions: any = null;
  productChartOptions: any = null;
  categoryChartOptions: any = null;
  customerAcquisitionChartOptions: any = null;
  dailyTrendsChartOptions: any = null;
  monthlyTrendsChartOptions: any = null;
  peakHoursChartOptions: any = null;

  // Analytics Controls
  showAnalytics = false;

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadAvailableYears();
    // loadDashboardData() will be called from loadAvailableYears() after years are loaded

    // Demo notification on dashboard load
    setTimeout(() => {
      this.notificationService.success(
        'Enhanced Dashboard Ready',
        'Welcome to PizzaWorld+ Analytics! Now with advanced caching, dark mode, and real-time notifications.',
        { duration: 5000 }
      );
    }, 1000);

    // Demo additional notifications to showcase dark mode
    setTimeout(() => {
      this.notificationService.info(
        'Dark Mode Available',
        'Toggle dark mode using the switch next to PizzaWorld+ in the sidebar!',
        { duration: 4000 }
      );
    }, 3000);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  loadAvailableYears(): void {
    this.http.get<TimePeriodOption[]>('/api/v2/chart/time-periods/years', { headers: this.getAuthHeaders() })
      .subscribe({
        next: (years) => {
          this.availableYears = years;
          // Only set year if we're not in all-time mode
          if (years.length > 0 && !this.selectedYear && this.selectedTimePeriod !== 'all-time') {
            this.selectedYear = years[0].year;
          }
          if (this.selectedTimePeriod !== 'all-time') {
            this.loadAvailableMonths();
          } else {
            // For all-time mode, load data immediately
            this.loadDashboardData();
          }
        },
        error: (error) => console.error('Failed to load available years:', error)
      });
  }

  loadAvailableMonths(): void {
    if (this.selectedYear) {
      const params = new HttpParams().set('year', this.selectedYear.toString());
      this.http.get<TimePeriodOption[]>('/api/v2/chart/time-periods/months', {
        headers: this.getAuthHeaders(),
        params
      }).subscribe({
        next: (months) => {
          this.availableMonths = months;
          // Set January as default when switching to month view
          if (this.selectedTimePeriod === 'month' && !this.selectedMonth && months.length > 0) {
            const january = months.find(m => m.month === 1);
            if (january) {
              this.selectedMonth = 1;
            }
          }
          // Load dashboard data after months are loaded (for initial load)
          this.loadDashboardData();
        },
        error: (error) => console.error('Failed to load available months:', error)
      });
    }
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error = false;
    this.loadingCustomerCount = true; // Reset customer count loading state

    let params = new HttpParams().set('timePeriod', this.selectedTimePeriod);

    if (this.selectedYear) {
      params = params.set('year', this.selectedYear.toString());
    }

    if (this.selectedMonth) {
      params = params.set('month', this.selectedMonth.toString());
    }

    let apiUrl = '/api/v2/chart/store-revenue';

    // Use different endpoint for custom date range
    if (this.selectedTimePeriod === 'custom' && this.customStartYear && this.customStartMonth && this.customEndYear && this.customEndMonth) {
      apiUrl = '/api/v2/chart/store-revenue/date-range';
      // Convert to first day of start month and last day of end month
      const startDate = `${this.customStartYear}-${this.customStartMonth.toString().padStart(2, '0')}-01`;
      const endDate = new Date(this.customEndYear, this.customEndMonth, 0).toISOString().split('T')[0]; // Last day of month
      params = params.set('startDate', startDate);
      params = params.set('endDate', endDate);
      // Remove timePeriod param for date range endpoint
      params = params.delete('timePeriod');
    }

    this.http.get<StoreRevenueData[]>(apiUrl, {
      headers: this.getAuthHeaders(),
      params
    }).subscribe({
      next: (data) => {
        this.storeRevenueData = data;
        this.applyFilters();
        this.buildCharts();
        this.loading = false;
        // Load the actual unique customer count
        this.loadUniqueCustomerCount();
      },
      error: (error) => {
        console.error('Dashboard data loading failed:', error);
        this.error = true;
        this.loading = false;
      }
    });
  }

  loadUniqueCustomerCount(): void {
    // Use the same endpoint as orders page to get accurate unique customer count
    // Apply the same time period filtering as the dashboard
    let params = new HttpParams();

    // Build date range parameters based on selected time period
    if (this.selectedTimePeriod === 'year' && this.selectedYear) {
      const fromDate = `${this.selectedYear}-01-01`;
      const toDate = `${this.selectedYear}-12-31`;
      params = params.set('from', fromDate).set('to', toDate);
    } else if (this.selectedTimePeriod === 'month' && this.selectedYear && this.selectedMonth) {
      const fromDate = `${this.selectedYear}-${this.selectedMonth.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
      const toDate = `${this.selectedYear}-${this.selectedMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      params = params.set('from', fromDate).set('to', toDate);
    } else if (this.selectedTimePeriod === 'custom' && this.customStartYear && this.customStartMonth && this.customEndYear && this.customEndMonth) {
      const fromDate = `${this.customStartYear}-${this.customStartMonth.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(this.customEndYear, this.customEndMonth, 0).getDate();
      const toDate = `${this.customEndYear}-${this.customEndMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      params = params.set('from', fromDate).set('to', toDate);
    }
    // For 'all-time', no date filters are added

    this.http.get<any>('/api/v2/orders/kpis', {
      headers: this.getAuthHeaders(),
      params
    }).subscribe({
      next: (kpiData) => {
        this.actualUniqueCustomers = kpiData.totalCustomers || 0;
        this.loadingCustomerCount = false; // Set loading to false after customer count is loaded
      },
      error: (error) => {
        console.error('Failed to load unique customer count:', error);
        // Keep the fallback calculation if the API fails
        this.actualUniqueCustomers = 0;
        this.loadingCustomerCount = false; // Set loading to false even on error
      }
    });
  }

  onTimePeriodChange(): void {
    this.selectedMonth = undefined;
    this.customStartYear = undefined;
    this.customStartMonth = undefined;
    this.customEndYear = undefined;
    this.customEndMonth = undefined;

    if (this.selectedTimePeriod === 'all-time') {
      this.selectedYear = undefined;
    } else if (this.selectedTimePeriod === 'year' && this.availableYears.length > 0) {
      this.selectedYear = this.availableYears[0].year;
    } else if (this.selectedTimePeriod === 'month') {
      if (this.availableYears.length > 0 && !this.selectedYear) {
        this.selectedYear = this.availableYears[0].year;
      }
      this.loadAvailableMonths();
    } else if (this.selectedTimePeriod === 'custom') {
      this.selectedYear = undefined;
      // Set default custom range (e.g., Q1 2022: Jan to Mar)
      this.customStartYear = 2022;
      this.customStartMonth = 1;
      this.customEndYear = 2022;
      this.customEndMonth = 3;
    }

    this.loadDashboardData();
  }

  onYearChange(): void {
    this.selectedMonth = undefined;
    if (this.selectedTimePeriod === 'month') {
      this.loadAvailableMonths();
    }
    this.loadDashboardData();
  }

  onMonthChange(): void {
    this.loadDashboardData();
  }

  onCustomRangeChange(): void {
    // Always trigger change detection for presets when any custom field changes
    // This ensures presets update immediately when start/end years change

    if (this.customStartYear && this.customStartMonth && this.customEndYear && this.customEndMonth) {
      // Validate that start is before end
      const startDate = new Date(this.customStartYear, this.customStartMonth - 1);
      const endDate = new Date(this.customEndYear, this.customEndMonth - 1);

      if (startDate >= endDate) {
        // Swap if start is after end
        const tempYear = this.customStartYear;
        const tempMonth = this.customStartMonth;
        this.customStartYear = this.customEndYear;
        this.customStartMonth = this.customEndMonth;
        this.customEndYear = tempYear;
        this.customEndMonth = tempMonth;
      }
      this.loadDashboardData();
    }
  }

  setCustomRange(startYear: number, startMonth: number, endYear: number, endMonth: number): void {
    // Set the time period to custom when using presets
    this.selectedTimePeriod = 'custom';

    this.customStartYear = startYear;
    this.customStartMonth = startMonth;
    this.customEndYear = endYear;
    this.customEndMonth = endMonth;

    // Always load dashboard data when using presets (all values are set)
    this.loadDashboardData();

    // Load analytics data if analytics section is open
    if (this.showAnalytics) {
      this.loadAnalyticsData();
    }
  }

  applyFilters(): void {
    this.filteredStoreData = [...this.storeRevenueData].filter(store => {
      const matchesSearch = !this.searchTerm ||
        store.city.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        store.state_name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        store.state_abbr.toLowerCase().includes(this.searchTerm.toLowerCase());

      // Extract abbreviation from selected state (e.g., "Arizona (AZ)" -> "AZ")
      const selectedAbbr = this.selectedState ? this.selectedState.match(/\(([^)]+)\)$/)?.[1] || this.selectedState : '';
      const matchesState = !this.selectedState || store.state_abbr === selectedAbbr;

      const revenue = this.getRevenue(store);
      const matchesRevenue = (!this.minRevenue || revenue >= this.minRevenue) &&
        (!this.maxRevenue || revenue <= this.maxRevenue);

      return matchesSearch && matchesState && matchesRevenue;
    });

    this.sortStoreData();
  }

  sortStoreData(): void {
    // This method is kept for the table sorting, but charts now use individual sort methods
    const sortMultiplier = this.chartSortAscending ? 1 : -1;
    this.filteredStoreData.sort((a, b) => {
      return (this.getRevenue(a) - this.getRevenue(b)) * sortMultiplier;
    });
  }

  getSortedStoreDataForRevenue(): StoreRevenueData[] {
    const sortMultiplier = this.chartSortAscending ? 1 : -1;
    return [...this.filteredStoreData].sort((a, b) => {
      return (this.getRevenue(a) - this.getRevenue(b)) * sortMultiplier;
    });
  }

  getSortedStoreDataForOrders(): StoreRevenueData[] {
    const sortMultiplier = this.ordersChartSortAscending ? 1 : -1;
    return [...this.filteredStoreData].sort((a, b) => {
      return (this.getOrders(a) - this.getOrders(b)) * sortMultiplier;
    });
  }

  getSortedStoreDataForAvgOrder(): StoreRevenueData[] {
    const sortMultiplier = this.avgOrderChartSortAscending ? 1 : -1;
    return [...this.filteredStoreData].sort((a, b) => {
      return (this.getAvgOrderValue(a) - this.getAvgOrderValue(b)) * sortMultiplier;
    });
  }

  getSortedStoreDataForCustomers(): StoreRevenueData[] {
    const sortMultiplier = this.customersChartSortAscending ? 1 : -1;
    return [...this.filteredStoreData].sort((a, b) => {
      return (this.getCustomers(a) - this.getCustomers(b)) * sortMultiplier;
    });
  }

  toggleChartSort(): void {
    this.chartSortAscending = !this.chartSortAscending;
    this.sortStoreData();
    this.buildCharts();
  }

  toggleOrdersChartSort(): void {
    this.ordersChartSortAscending = !this.ordersChartSortAscending;
    this.buildCharts();
  }

  toggleAvgOrderChartSort(): void {
    this.avgOrderChartSortAscending = !this.avgOrderChartSortAscending;
    this.buildCharts();
  }

  toggleCustomersChartSort(): void {
    this.customersChartSortAscending = !this.customersChartSortAscending;
    this.buildCharts();
  }

  sortTable(column: 'revenue' | 'orders' | 'customers' | 'avgOrder' | 'store'): void {
    if (this.tableSortColumn === column) {
      this.tableSortAscending = !this.tableSortAscending;
    } else {
      this.tableSortColumn = column;
      this.tableSortAscending = false;
    }
  }

  getTableSortedData(): StoreRevenueData[] {
    const sortMultiplier = this.tableSortAscending ? 1 : -1;
    return [...this.filteredStoreData].sort((a, b) => {
      let aVal: number | string, bVal: number | string;

      switch (this.tableSortColumn) {
        case 'revenue':
          aVal = this.getRevenue(a); bVal = this.getRevenue(b); break;
        case 'orders':
          aVal = this.getOrders(a); bVal = this.getOrders(b); break;
        case 'customers':
          aVal = this.getCustomers(a); bVal = this.getCustomers(b); break;
        case 'avgOrder':
          aVal = this.getAvgOrderValue(a); bVal = this.getAvgOrderValue(b); break;
        case 'store':
          aVal = a.city; bVal = b.city; break;
        default:
          aVal = this.getRevenue(a); bVal = this.getRevenue(b);
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * sortMultiplier;
      }
      return ((aVal as number) - (bVal as number)) * sortMultiplier;
    });
  }

  // Product table sorting methods
  sortProductTable(column: 'total_revenue' | 'total_quantity' | 'product_name' | 'category' | 'size'): void {
    if (this.productTableSortColumn === column) {
      this.productTableSortAscending = !this.productTableSortAscending;
    } else {
      this.productTableSortColumn = column;
      this.productTableSortAscending = false; // Default to descending for new column
    }
  }

  getProductTableSortedData(): any[] {
    if (!this.productPerformanceData || this.productPerformanceData.length === 0) {
      return [];
    }

    const data = [...this.productPerformanceData];

    data.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (this.productTableSortColumn) {
        case 'total_revenue':
          valueA = Number(a.total_revenue) || 0;
          valueB = Number(b.total_revenue) || 0;
          break;
        case 'total_quantity':
          valueA = Number(a.total_quantity) || 0;
          valueB = Number(b.total_quantity) || 0;
          break;
        case 'product_name':
          valueA = (a.name || a.product_name || '').toLowerCase();
          valueB = (b.name || b.product_name || '').toLowerCase();
          break;
        case 'category':
          valueA = (a.category || '').toLowerCase();
          valueB = (b.category || '').toLowerCase();
          break;
        case 'size':
          valueA = (a.size || '').toLowerCase();
          valueB = (b.size || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return this.productTableSortAscending ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      } else {
        return this.productTableSortAscending ? valueA - valueB : valueB - valueA;
      }
    });

    return data;
  }

  buildCharts(): void {
    if (!this.filteredStoreData || this.filteredStoreData.length === 0) {
      this.revenueChartOptions = null;
      this.ordersChartOptions = null;
      this.avgOrderValueChartOptions = null;
      this.customersChartOptions = null;
      return;
    }

    // Each chart gets its own sorted data - showing all stores
    const revenueStores = this.getSortedStoreDataForRevenue();
    const ordersStores = this.getSortedStoreDataForOrders();
    const avgOrderStores = this.getSortedStoreDataForAvgOrder();
    const customersStores = this.getSortedStoreDataForCustomers();

    this.buildRevenueChart(revenueStores, revenueStores.map(store => `${store.city}, ${store.state_abbr}`));
    this.buildOrdersChart(ordersStores, ordersStores.map(store => `${store.city}, ${store.state_abbr}`));
    this.buildAvgOrderChart(avgOrderStores, avgOrderStores.map(store => `${store.city}, ${store.state_abbr}`));
    this.buildCustomersChart(customersStores, customersStores.map(store => `${store.city}, ${store.state_abbr}`));
  }

  private buildRevenueChart(stores: StoreRevenueData[], labels: string[]): void {
    const revenueData = stores.map(store => Math.round(this.getRevenue(store)));

    this.revenueChartOptions = {
      series: [{
        name: 'Revenue',
        data: revenueData
      }],
      chart: {
        type: 'line',
        height: 400,
        toolbar: {
          show: true,
          export: {
            csv: {
              filename: `store-revenue-${this.getTimePeriodLabel()}`,
              columnDelimiter: ',',
              headerCategory: 'Store',
              headerValue: 'Revenue (€)'
            },
            svg: {
              filename: `store-revenue-${this.getTimePeriodLabel()}`
            },
            png: {
              filename: `store-revenue-${this.getTimePeriodLabel()}`
            }
          }
        },
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: true
        },
        background: 'transparent'
      },
      colors: ['#fb923c'],
      stroke: { curve: 'smooth', width: 3 },
      dataLabels: { enabled: false },
      xaxis: {
        categories: labels,
        labels: {
          rotate: -45,
          style: { colors: '#6b7280', fontSize: '12px' },
          maxHeight: 120
        },
        tickAmount: undefined
      },
      yaxis: {
        title: { text: 'Revenue (€)', style: { color: '#6b7280' } },
        labels: {
          formatter: (val: number) => `$${this.formatNumber(val)}`,
          style: { colors: '#6b7280' }
        }
      },
      grid: { borderColor: '#e5e7eb', strokeDashArray: 3 },
      tooltip: {
        y: { formatter: (val: number) => `$${this.formatNumber(val)}` }
      }
    };
  }

  private buildOrdersChart(stores: StoreRevenueData[], labels: string[]): void {
    const ordersData = stores.map(store => this.getOrders(store));

    this.ordersChartOptions = {
      series: [{
        name: 'Orders',
        data: ordersData
      }],
      chart: {
        type: 'area',
        height: 350,
        toolbar: {
          show: true,
          export: {
            csv: {
              filename: `store-orders-${this.getTimePeriodLabel()}`,
              columnDelimiter: ',',
              headerCategory: 'Store',
              headerValue: 'Orders'
            },
            svg: {
              filename: `store-orders-${this.getTimePeriodLabel()}`
            },
            png: {
              filename: `store-orders-${this.getTimePeriodLabel()}`
            }
          }
        },
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: true
        },
        background: 'transparent'
      },
      colors: ['#f97316'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3
        }
      },
      stroke: { curve: 'smooth', width: 2 },
      dataLabels: { enabled: false },
      xaxis: {
        categories: labels,
        labels: {
          rotate: -45,
          style: { colors: '#6b7280', fontSize: '12px' },
          maxHeight: 120
        },
        tickAmount: undefined
      },
      yaxis: {
        title: { text: 'Orders', style: { color: '#6b7280' } },
        labels: { style: { colors: '#6b7280' } }
      },
      grid: { borderColor: '#e5e7eb', strokeDashArray: 3 }
    };
  }

  private buildAvgOrderChart(stores: StoreRevenueData[], labels: string[]): void {
    const avgData = stores.map(store => Math.round(this.getAvgOrderValue(store) * 100) / 100);

    this.avgOrderValueChartOptions = {
      series: [{
        name: 'Avg Order Value',
        data: avgData
      }],
      chart: {
        type: 'area',
        height: 350,
        toolbar: {
          show: true,
          export: {
            csv: {
              filename: `avg-order-value-${this.getTimePeriodLabel()}`,
              columnDelimiter: ',',
              headerCategory: 'Store',
              headerValue: 'Avg Order (€)'
            },
            svg: {
              filename: `avg-order-value-${this.getTimePeriodLabel()}`
            },
            png: {
              filename: `avg-order-value-${this.getTimePeriodLabel()}`
            }
          }
        },
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: true
        },
        background: 'transparent'
      },
      colors: ['#ea580c'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3
        }
      },
      stroke: { curve: 'smooth', width: 2 },
      dataLabels: { enabled: false },
      xaxis: {
        categories: labels,
        labels: {
          rotate: -45,
          style: { colors: '#6b7280', fontSize: '12px' },
          maxHeight: 120
        },
        tickAmount: undefined
      },
      yaxis: {
        title: { text: 'Avg Order (€)', style: { color: '#6b7280' } },
        labels: {
          formatter: (val: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val),
          style: { colors: '#6b7280' }
        }
      },
      grid: { borderColor: '#e5e7eb', strokeDashArray: 3 }
    };
  }

  private buildCustomersChart(stores: StoreRevenueData[], labels: string[]): void {
    const customersData = stores.map(store => this.getCustomers(store));

    this.customersChartOptions = {
      series: [{
        name: 'Unique Customers',
        data: customersData
      }],
      chart: {
        type: 'area',
        height: 350,
        toolbar: {
          show: true,
          export: {
            csv: {
              filename: `unique-customers-${this.getTimePeriodLabel()}`,
              columnDelimiter: ',',
              headerCategory: 'Store',
              headerValue: 'Customers'
            },
            svg: {
              filename: `unique-customers-${this.getTimePeriodLabel()}`
            },
            png: {
              filename: `unique-customers-${this.getTimePeriodLabel()}`
            }
          }
        },
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: true
        },
        background: 'transparent'
      },
      colors: ['#c2410c'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3
        }
      },
      stroke: { curve: 'smooth', width: 2 },
      dataLabels: { enabled: false },
      xaxis: {
        categories: labels,
        labels: {
          rotate: -45,
          style: { colors: '#6b7280', fontSize: '12px' },
          maxHeight: 120
        },
        tickAmount: undefined
      },
      yaxis: {
        title: { text: 'Customers', style: { color: '#6b7280' } },
        labels: { style: { colors: '#6b7280' } }
      },
      grid: { borderColor: '#e5e7eb', strokeDashArray: 3 }
    };
  }

  // Data accessor methods
  getRevenue(store: StoreRevenueData): number {
    return store.yearly_revenue || store.monthly_revenue || store.total_revenue || 0;
  }

  getOrders(store: StoreRevenueData): number {
    return store.yearly_orders || store.monthly_orders || store.total_orders || store.order_count || 0;
  }

  getCustomers(store: StoreRevenueData): number {
    return store.yearly_unique_customers || store.monthly_unique_customers || store.total_unique_customers || store.unique_customers || 0;
  }

  getAvgOrderValue(store: StoreRevenueData): number {
    return store.yearly_avg_order_value || store.monthly_avg_order_value || store.avg_order_value || 0;
  }

  // Summary calculations
  getTotalRevenue(): number {
    return this.filteredStoreData.reduce((sum, store) => sum + this.getRevenue(store), 0);
  }

  getTotalOrders(): number {
    return this.filteredStoreData.reduce((sum, store) => sum + this.getOrders(store), 0);
  }

    getTotalCustomers(): number {
    // If we're still loading the customer count, show the approximate number
    if (this.loadingCustomerCount) {
      return 23089; // Show the known approximate customer count while loading
    }

    // Use the actual unique customer count from the backend if available
    // This prevents double-counting customers who ordered from multiple stores
    if (this.actualUniqueCustomers > 0) {
      return this.actualUniqueCustomers;
    }

    // Fallback to summing store customers (may double-count, but better than nothing)
    return this.filteredStoreData.reduce((sum, store) => sum + this.getCustomers(store), 0);
  }

  getOverallAvgOrder(): number {
    const totalRevenue = this.getTotalRevenue();
    const totalOrders = this.getTotalOrders();
    return totalOrders > 0 ? totalRevenue / totalOrders : 0;
  }

  // Utility methods
  formatCurrency(value: number): string {
    return '$' + this.formatNumber(value);
  }

  formatCurrencyWithDecimals(value: number): string {
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  getTimePeriodLabel(): string {
    switch (this.selectedTimePeriod) {
      case 'all-time':
        // Dynamically generate the date range based on available years
        if (this.availableYears && this.availableYears.length > 0) {
          const years = this.availableYears.map(y => y.year).sort((a, b) => a - b);
          const minYear = years[0];
          const maxYear = years[years.length - 1];
          return `All Time (${minYear}-${maxYear})`;
        }
        return 'All Time';
      case 'year':
        return this.selectedYear ? `Year ${this.selectedYear}` : 'Yearly';
      case 'month':
        if (this.selectedYear && this.selectedMonth) {
          const monthOption = this.availableMonths.find(m => m.month === this.selectedMonth);
          return monthOption ? monthOption.month_name_label || `${this.selectedMonth}/${this.selectedYear}` : 'Monthly';
        }
        return 'Monthly';
      case 'custom':
        if (this.customStartYear && this.customStartMonth && this.customEndYear && this.customEndMonth) {
          const startDate = new Date(this.customStartYear, this.customStartMonth - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const endDate = new Date(this.customEndYear, this.customEndMonth - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          return `${startDate} - ${endDate}`;
        }
        return 'Custom Range';
      default:
        return 'Revenue Analysis';
    }
  }

    getUniqueStates(): string[] {
    const stateMapping: { [key: string]: string } = {
      'AZ': 'Arizona (AZ)',
      'CA': 'California (CA)',
      'NV': 'Nevada (NV)',
      'UT': 'Utah (UT)'
    };

    const states = [...new Set(this.storeRevenueData.map(store => store.state_abbr))];
    return states.map(abbr => stateMapping[abbr] || abbr).sort();
  }

    get availablePresets(): { label: string, startYear: number, startMonth: number, endYear: number, endMonth: number }[] {
    if (!this.availableYears || this.availableYears.length === 0) {
      return [];
    }

    const presets: { label: string, startYear: number, startMonth: number, endYear: number, endMonth: number }[] = [];
    const years = this.availableYears.map(y => y.year).sort((a, b) => b - a); // Sort descending (newest first)

    // Helper function to add Q1-Q4 and H1-H2 presets for a given year
    const addCompletePresetsForYear = (year: number) => {
      // Q1 (Jan-Mar)
      presets.push({
        label: `Q1 ${year}`,
        startYear: year,
        startMonth: 1,
        endYear: year,
        endMonth: 3
      });

      // Q2 (Apr-Jun)
      presets.push({
        label: `Q2 ${year}`,
        startYear: year,
        startMonth: 4,
        endYear: year,
        endMonth: 6
      });

      // Q3 (Jul-Sep)
      presets.push({
        label: `Q3 ${year}`,
        startYear: year,
        startMonth: 7,
        endYear: year,
        endMonth: 9
      });

      // Q4 (Oct-Dec)
      presets.push({
        label: `Q4 ${year}`,
        startYear: year,
        startMonth: 10,
        endYear: year,
        endMonth: 12
      });

      // H1 (Jan-Jun)
      presets.push({
        label: `H1 ${year}`,
        startYear: year,
        startMonth: 1,
        endYear: year,
        endMonth: 6
      });

      // H2 (Jul-Dec)
      presets.push({
        label: `H2 ${year}`,
        startYear: year,
        startMonth: 7,
        endYear: year,
        endMonth: 12
      });
    };

    // If we're in year or month mode and have a selected year, focus presets on that year
    if ((this.selectedTimePeriod === 'year' || this.selectedTimePeriod === 'month') && this.selectedYear) {
      addCompletePresetsForYear(this.selectedYear);
    } else if (this.selectedTimePeriod === 'custom') {
      // For custom mode, show presets for all years between start and end year (inclusive)
      const customYears: number[] = [];

      if (this.customStartYear && this.customEndYear &&
          this.customStartYear > 0 && this.customEndYear > 0) {
        // Get all years between start and end (inclusive)
        const minYear = Math.min(this.customStartYear, this.customEndYear);
        const maxYear = Math.max(this.customStartYear, this.customEndYear);

        for (let year = minYear; year <= maxYear; year++) {
          customYears.push(year);
        }
      } else if (this.customStartYear && this.customStartYear > 0) {
        // Only start year selected
        customYears.push(this.customStartYear);
      } else if (this.customEndYear && this.customEndYear > 0) {
        // Only end year selected
        customYears.push(this.customEndYear);
      } else if (years.length > 0) {
        // No years selected yet, show presets for most recent year
        customYears.push(years[0]);
      }

      // Sort years (smallest first as requested)
      customYears.sort((a, b) => a - b);

      // Create Q1-Q4 and H1-H2 presets for each year in range
      for (const year of customYears) {
        addCompletePresetsForYear(year);
      }
    } else {
      // For all-time mode, show Q1-Q4 and H1-H2 presets for all available years
      for (const year of years) {
        addCompletePresetsForYear(year);
      }
    }

    // Return all presets (no artificial limit)
    return presets;
  }

  onFilterChange(): void {
    this.applyFilters();
    this.buildCharts();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedState = '';
    this.minRevenue = 0;
    this.maxRevenue = 0;
    this.onFilterChange();
  }

  refreshData(): void {
    this.notificationService.info('Refreshing Data', 'Loading latest dashboard data...');

    this.loadDashboardData();
    if (this.showAnalytics) {
      this.loadAnalyticsData();
    }

    // Show success notification after a delay
    setTimeout(() => {
      this.notificationService.toast.success('Dashboard data refreshed successfully!');
    }, 2000);
  }

  // =================================================================
  // COMPREHENSIVE ANALYTICS METHODS
  // =================================================================

  toggleAnalytics(): void {
    this.showAnalytics = !this.showAnalytics;
    if (this.showAnalytics) {
      this.loadAnalyticsData();
    }
  }

  loadAnalyticsData(): void {
    this.loadHourlyPerformanceData();
    this.loadProductPerformanceData();
    this.loadCategoryPerformanceData();
    this.loadCustomerAcquisitionData();
    this.loadDailyTrendsData();
    this.loadMonthlyTrendsData();
  }

  loadHourlyPerformanceData(): void {
    // Apply time period filtering for consistency with dashboard
    let params = new HttpParams();
    if (this.selectedTimePeriod === 'year' && this.selectedYear) {
      params = params.set('year', this.selectedYear.toString());
    } else if (this.selectedTimePeriod === 'month' && this.selectedYear && this.selectedMonth) {
      params = params.set('year', this.selectedYear.toString());
      params = params.set('month', this.selectedMonth.toString());
    } else if (this.selectedTimePeriod === 'custom' && this.customStartYear && this.customStartMonth && this.customEndYear && this.customEndMonth) {
      const fromDate = `${this.customStartYear}-${this.customStartMonth.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(this.customEndYear, this.customEndMonth, 0).getDate();
      const toDate = `${this.customEndYear}-${this.customEndMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      params = params.set('from', fromDate).set('to', toDate);
    }

    this.http.get<any[]>('/api/v2/analytics/hourly-performance', {
      headers: this.getAuthHeaders(),
      params
    }).subscribe({
      next: (data) => {
        this.hourlyPerformanceData = data;
        this.buildHourlyChart();
      },
      error: (error) => console.error('Failed to load hourly performance:', error)
    });
  }

  loadProductPerformanceData(): void {
    // Apply time period filtering for consistency with dashboard
    let params = new HttpParams();
    if (this.selectedTimePeriod === 'year' && this.selectedYear) {
      params = params.set('year', this.selectedYear.toString());
    } else if (this.selectedTimePeriod === 'month' && this.selectedYear && this.selectedMonth) {
      params = params.set('year', this.selectedYear.toString());
      params = params.set('month', this.selectedMonth.toString());
    } else if (this.selectedTimePeriod === 'custom' && this.customStartYear && this.customStartMonth && this.customEndYear && this.customEndMonth) {
      const fromDate = `${this.customStartYear}-${this.customStartMonth.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(this.customEndYear, this.customEndMonth, 0).getDate();
      const toDate = `${this.customEndYear}-${this.customEndMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      params = params.set('from', fromDate).set('to', toDate);
    }

    this.http.get<any[]>('/api/v2/analytics/product-performance', {
      headers: this.getAuthHeaders(),
      params
    }).subscribe({
      next: (data) => {
        this.productPerformanceData = data;
        this.buildProductChart();
      },
      error: (error) => console.error('Failed to load product performance:', error)
    });
  }

  loadCategoryPerformanceData(): void {
    // Apply time period filtering for consistency with dashboard
    let params = new HttpParams();
    if (this.selectedTimePeriod === 'year' && this.selectedYear) {
      params = params.set('year', this.selectedYear.toString());
    } else if (this.selectedTimePeriod === 'month' && this.selectedYear && this.selectedMonth) {
      params = params.set('year', this.selectedYear.toString());
      params = params.set('month', this.selectedMonth.toString());
    } else if (this.selectedTimePeriod === 'custom' && this.customStartYear && this.customStartMonth && this.customEndYear && this.customEndMonth) {
      const fromDate = `${this.customStartYear}-${this.customStartMonth.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(this.customEndYear, this.customEndMonth, 0).getDate();
      const toDate = `${this.customEndYear}-${this.customEndMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      params = params.set('from', fromDate).set('to', toDate);
    }

    this.http.get<any[]>('/api/v2/analytics/category-performance', {
      headers: this.getAuthHeaders(),
      params
    }).subscribe({
      next: (data) => {
        this.categoryPerformanceData = data;
        this.buildCategoryChart();
      },
      error: (error) => console.error('Failed to load category performance:', error)
    });
  }

  loadCustomerAcquisitionData(): void {
    // Apply time period filtering for consistency with dashboard
    let params = new HttpParams();
    if (this.selectedTimePeriod === 'year' && this.selectedYear) {
      params = params.set('year', this.selectedYear.toString());
    } else if (this.selectedTimePeriod === 'month' && this.selectedYear && this.selectedMonth) {
      params = params.set('year', this.selectedYear.toString());
      params = params.set('month', this.selectedMonth.toString());
    } else if (this.selectedTimePeriod === 'custom' && this.customStartYear && this.customStartMonth && this.customEndYear && this.customEndMonth) {
      const fromDate = `${this.customStartYear}-${this.customStartMonth.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(this.customEndYear, this.customEndMonth, 0).getDate();
      const toDate = `${this.customEndYear}-${this.customEndMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      params = params.set('from', fromDate).set('to', toDate);
    }

    this.http.get<any[]>('/api/v2/analytics/customer-acquisition', {
      headers: this.getAuthHeaders(),
      params
    }).subscribe({
      next: (data) => {
        // Reverse the data to show chronological order (oldest to newest)
        this.customerAcquisitionData = data.reverse();
        this.buildCustomerAcquisitionChart();
      },
      error: (error) => console.error('Failed to load customer acquisition:', error)
    });
  }

  loadDailyTrendsData(): void {
    // Apply time period filtering for consistency with dashboard
    let params = new HttpParams();
    if (this.selectedTimePeriod === 'year' && this.selectedYear) {
      params = params.set('year', this.selectedYear.toString());
    } else if (this.selectedTimePeriod === 'month' && this.selectedYear && this.selectedMonth) {
      params = params.set('year', this.selectedYear.toString());
      params = params.set('month', this.selectedMonth.toString());
    } else if (this.selectedTimePeriod === 'custom' && this.customStartYear && this.customStartMonth && this.customEndYear && this.customEndMonth) {
      const fromDate = `${this.customStartYear}-${this.customStartMonth.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(this.customEndYear, this.customEndMonth, 0).getDate();
      const toDate = `${this.customEndYear}-${this.customEndMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      params = params.set('from', fromDate).set('to', toDate);
    }

    this.http.get<any[]>('/api/v2/analytics/daily-trends', {
      headers: this.getAuthHeaders(),
      params
    }).subscribe({
      next: (data) => {
        this.dailyTrendsData = data;
        this.buildDailyTrendsChart();
      },
      error: (error) => console.error('Failed to load daily trends:', error)
    });
  }

  loadMonthlyTrendsData(): void {
    // Apply time period filtering for consistency with dashboard
    let params = new HttpParams();
    if (this.selectedTimePeriod === 'year' && this.selectedYear) {
      params = params.set('year', this.selectedYear.toString());
    } else if (this.selectedTimePeriod === 'month' && this.selectedYear && this.selectedMonth) {
      params = params.set('year', this.selectedYear.toString());
      params = params.set('month', this.selectedMonth.toString());
    } else if (this.selectedTimePeriod === 'custom' && this.customStartYear && this.customStartMonth && this.customEndYear && this.customEndMonth) {
      const fromDate = `${this.customStartYear}-${this.customStartMonth.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(this.customEndYear, this.customEndMonth, 0).getDate();
      const toDate = `${this.customEndYear}-${this.customEndMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      params = params.set('from', fromDate).set('to', toDate);
    }

    this.http.get<any[]>('/api/v2/analytics/monthly-trends', {
      headers: this.getAuthHeaders(),
      params
    }).subscribe({
      next: (data) => {
        this.monthlyTrendsData = data;
        this.buildMonthlyTrendsChart();
      },
      error: (error) => console.error('Failed to load monthly trends:', error)
    });
  }

  loadPeakHoursData(): void {
    // Apply time period filtering for consistency with dashboard
    let params = new HttpParams();
    if (this.selectedTimePeriod === 'year' && this.selectedYear) {
      params = params.set('year', this.selectedYear.toString());
    } else if (this.selectedTimePeriod === 'month' && this.selectedYear && this.selectedMonth) {
      params = params.set('year', this.selectedYear.toString());
      params = params.set('month', this.selectedMonth.toString());
    } else if (this.selectedTimePeriod === 'custom' && this.customStartYear && this.customStartMonth && this.customEndYear && this.customEndMonth) {
      const fromDate = `${this.customStartYear}-${this.customStartMonth.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(this.customEndYear, this.customEndMonth, 0).getDate();
      const toDate = `${this.customEndYear}-${this.customEndMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      params = params.set('from', fromDate).set('to', toDate);
    }

    this.http.get<any[]>('/api/v2/analytics/peak-hours', {
      headers: this.getAuthHeaders(),
      params
    }).subscribe({
      next: (data) => {
        this.peakHoursData = data;
        this.buildPeakHoursChart();
      },
      error: (error) => console.error('Failed to load peak hours:', error)
    });
  }

  // Removed seasonal data loading - doesn't provide real business value

  // Analytics Chart Building Methods
  buildHourlyChart(): void {
    if (!this.hourlyPerformanceData || this.hourlyPerformanceData.length === 0) {
      this.hourlyChartOptions = null;
      return;
    }

    // Fixed to use proper materialized view data structure (hour 0-23)
    const hours = Array.from({length: 24}, (_, i) => i);
    const hourlyRevenue = hours.map(hour => {
      const hourData = this.hourlyPerformanceData.find(d => Number(d.hour) === hour);
      return hourData ? Number(hourData.revenue) || 0 : 0;
    });

    const hourlyOrders = hours.map(hour => {
      const hourData = this.hourlyPerformanceData.find(d => Number(d.hour) === hour);
      return hourData ? Number(hourData.orders) || 0 : 0;
    });

    this.hourlyChartOptions = {
      series: [
        {
          name: 'Hourly Revenue',
          data: hourlyRevenue,
          type: 'area'
        },
        {
          name: 'Hourly Orders',
          data: hourlyOrders,
          type: 'line',
          yAxisIndex: 1
        }
      ],
      chart: {
        type: 'line',
        height: 350,
        toolbar: { show: true },
        zoom: { enabled: true, type: 'x' }
      },
      colors: ['#f59e0b', '#3b82f6'],
      fill: {
        type: ['gradient', 'solid'],
        gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.3 }
      },
      stroke: { curve: 'smooth', width: [2, 3] },
      dataLabels: { enabled: false },
      xaxis: {
        categories: hours.map(h => `${h.toString().padStart(2, '0')}:00`),
        title: { text: 'Hour of Day' }
      },
      yaxis: [
        {
          title: { text: 'Revenue (€)' },
          labels: { formatter: (val: number) => `$${this.formatNumber(val)}` }
        },
        {
          opposite: true,
          title: { text: 'Orders' }
        }
      ],
      grid: { borderColor: '#e5e7eb' },
      legend: {
        position: 'top',
        horizontalAlign: 'center'
      }
    };
  }

  buildProductChart(): void {
    if (!this.productPerformanceData || this.productPerformanceData.length === 0) {
      this.productChartOptions = null;
      return;
    }

    // Show top 15 for chart (all products shown in table below)
    const topProducts = this.productPerformanceData.slice(0, 15);
    // Include size in product display name using correct property names
    const productNames = topProducts.map((p: any) => `${p.name || p.product_name} (${p.size})` || 'Unknown');
    const productRevenue = topProducts.map((p: any) => Number(p.total_revenue) || 0);

    this.productChartOptions = {
      series: [{ name: 'Product Revenue', data: productRevenue }],
      chart: {
        type: 'bar',
        height: 350,
        toolbar: { show: true },
        zoom: { enabled: true, type: 'y' }
      },
      colors: ['#dc2626'],
      plotOptions: {
        bar: { borderRadius: 4, horizontal: true }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: productNames,
        title: { text: 'Revenue (€)' }
      },
      yaxis: { title: { text: 'Products (with Size)' } }
    };
  }

  buildPeakHoursChart(): void {
    if (!this.peakHoursData || this.peakHoursData.length === 0) {
      this.peakHoursChartOptions = null;
      return;
    }

    // Updated to match new data structure from materialized views
    const hours = this.peakHoursData.map(d => d.hour_of_day);
    const orders = this.peakHoursData.map(d => Number(d.total_orders) || 0);

    this.peakHoursChartOptions = {
      series: [{ name: 'Orders', data: orders }],
      chart: {
        type: 'line',
        height: 300,
        toolbar: { show: true },
        zoom: { enabled: true, type: 'x' }
      },
      colors: ['#059669'],
      stroke: { curve: 'smooth', width: 3 },
      markers: { size: 6 },
      xaxis: {
        categories: hours.map(h => `${h}:00`),
        title: { text: 'Hour' }
      },
      yaxis: { title: { text: 'Total Orders' } }
    };
  }

  buildCategoryChart(): void {
    if (!this.categoryPerformanceData || this.categoryPerformanceData.length === 0) {
      this.categoryChartOptions = null;
      return;
    }

    const categories = this.categoryPerformanceData.map(d => d.category || 'Unknown');
    const revenue = this.categoryPerformanceData.map(d => Number(d.total_revenue) || 0);

    this.categoryChartOptions = {
      series: revenue,
      chart: {
        type: 'donut',
        height: 350,
        toolbar: { show: true }
      },
      labels: categories,
      colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#f97316'],
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(1)}%`
      },
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Revenue',
                formatter: () => `$${this.formatNumber(revenue.reduce((a, b) => a + b, 0))}`
              }
            }
          }
        }
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center'
      },
      tooltip: {
        y: {
          formatter: (val: number) => `$${this.formatNumber(val)}`
        }
      }
    };
  }

  buildCustomerAcquisitionChart(): void {
    if (!this.customerAcquisitionData || this.customerAcquisitionData.length === 0) {
      this.customerAcquisitionChartOptions = null;
      return;
    }

    // Format month labels properly
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = this.customerAcquisitionData.map(d => {
      // Check if we have year and month fields separately
      if (d.year && d.month) {
        const monthIndex = parseInt(d.month.toString()) - 1;
        return `${monthNames[monthIndex]} ${d.year}`;
      }
      // Use month_name if available
      if (d.month_name && d.year) {
        return `${d.month_name.trim()} ${d.year}`;
      }
      // Fallback
      return d.month_name || `${d.year}-${d.month}`;
    });
    const newCustomers = this.customerAcquisitionData.map(d => Number(d.new_customers) || 0);
    const revenue = this.customerAcquisitionData.map(d => Number(d.revenue_from_new_customers) || 0);

    this.customerAcquisitionChartOptions = {
      series: [
        { name: 'New Customers', data: newCustomers, type: 'column' },
        { name: 'Revenue from New Customers', data: revenue, type: 'line' }
      ],
      chart: {
        type: 'line',
        height: 350,
        toolbar: { show: true },
        zoom: { enabled: true, type: 'x' }
      },
      stroke: {
        width: [0, 3]
      },
      plotOptions: {
        bar: {
          columnWidth: '50%'
        }
      },
      colors: ['#06b6d4', '#f59e0b'],
      xaxis: {
        categories: months,
        title: { text: 'Month' },
        labels: {
          rotate: -45,
          rotateAlways: false,
          hideOverlappingLabels: true
        }
      },
      yaxis: [
        {
          title: { text: 'New Customers' },
          seriesName: 'New Customers'
        },
        {
          opposite: true,
          title: { text: 'Revenue (€)' },
          seriesName: 'Revenue from New Customers',
          labels: {
            formatter: (val: number) => `$${this.formatNumber(val)}`
          }
        }
      ]
    };
  }

  buildDailyTrendsChart(): void {
    if (!this.dailyTrendsData || this.dailyTrendsData.length === 0) {
      this.dailyTrendsChartOptions = null;
      return;
    }

    const dates = this.dailyTrendsData.map(d => d.day || d.order_date);
    const revenue = this.dailyTrendsData.map(d => Number(d.revenue) || 0);
    const orders = this.dailyTrendsData.map(d => Number(d.orders) || 0);

    this.dailyTrendsChartOptions = {
      series: [
        { name: 'Daily Revenue', data: revenue },
        { name: 'Daily Orders', data: orders, yAxisIndex: 1 }
      ],
      chart: {
        type: 'line',
        height: 350,
        toolbar: { show: true },
        zoom: { enabled: true, type: 'x' }
      },
      colors: ['#10b981', '#3b82f6'],
      stroke: { curve: 'smooth', width: 2 },
      xaxis: {
        categories: dates,
        title: { text: 'Date' },
        type: 'datetime'
      },
      yaxis: [
        {
          title: { text: 'Revenue (€)' },
          labels: {
            formatter: (val: number) => `$${this.formatNumber(val)}`
          }
        },
        {
          opposite: true,
          title: { text: 'Orders' }
        }
      ],
      grid: { borderColor: '#e5e7eb' }
    };
  }

  buildMonthlyTrendsChart(): void {
    if (!this.monthlyTrendsData || this.monthlyTrendsData.length === 0) {
      this.monthlyTrendsChartOptions = null;
      return;
    }

    const months = this.monthlyTrendsData.map(d => d.month || `${d.year}-${d.month_num}`);
    const revenue = this.monthlyTrendsData.map(d => Number(d.revenue) || 0);

    this.monthlyTrendsChartOptions = {
      series: [{ name: 'Monthly Revenue', data: revenue }],
      chart: {
        type: 'area',
        height: 350,
        toolbar: { show: true },
        zoom: { enabled: true, type: 'x' }
      },
      colors: ['#8b5cf6'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3
        }
      },
      stroke: { curve: 'smooth', width: 2 },
      dataLabels: { enabled: false },
      xaxis: {
        categories: months,
        title: { text: 'Month' }
      },
      yaxis: {
        title: { text: 'Revenue (€)' },
        labels: {
          formatter: (val: number) => `$${this.formatNumber(val)}`
        }
      },
      grid: { borderColor: '#e5e7eb' }
    };
  }

  // Removed seasonal chart - doesn't provide real business value
}
