import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexGrid,
  ApexPlotOptions,
  ApexFill,
  ApexStroke,
  ApexLegend,
  ApexNonAxisChartSeries,
  ChartComponent
} from 'ng-apexcharts';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CurrentUser } from '../../core/models/current-user.model';

interface Product {
  sku: string;
  product_name: string;
  size: string;
  price: number;
  category: string;
  launch_date: string;
}

interface Store {
  storeid: string;
  city: string;
  state: string;
}

interface State {
  state_code: string;
  state: string;
}

interface ProductPerformance {
  sku: string;
  product_name: string;
  size: string;
  price: number;
  category: string;
  launch_date: string;
  total_revenue: number;
  amount_ordered: number;
  units_sold: number;
}

interface ProductKPIs {
  totalRevenue: number;
  totalOrders: number;
  totalUnits: number;
  totalProducts: number;
  avgPrice: number;
}

interface TimePeriodOption {
  year: number;
  month?: number;
  year_label: string;
  month_label?: string;
  month_name_label?: string;
}

interface ChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis?: ApexYAxis;
  title?: any;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  plotOptions?: ApexPlotOptions;
  stroke?: ApexStroke;
  grid?: ApexGrid;
  colors: string[];
  fill?: ApexFill;
  legend?: ApexLegend;
  toolbar?: any;
}

interface PieChartOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  legend: ApexLegend;
  toolbar?: any;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, SidebarComponent, RouterModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Filter state
  selectedYear?: number;
  selectedMonth?: number;
  selectedCategory: string = '';
  searchTerm: string = '';
  skuFilter: string = '';
  selectedStores: string[] = [];
  selectedStates: string[] = [];

  // Dropdown state
  showStateDropdown: boolean = false;
  showStoreDropdown: boolean = false;

  // Available filter options
  availableYears: TimePeriodOption[] = [];
  availableMonths: TimePeriodOption[] = [];
  availableCategories: string[] = ['Vegetarian', 'Specialty', 'Classic'];
  availableStores: Store[] = [];
  availableStates: State[] = [];

  // Data
  catalogueProducts: Product[] = [];
  performanceProducts: ProductPerformance[] = [];
  kpis: ProductKPIs | null = null;

  // Charts
  topProductsChart: Partial<ChartOptions> | null = null;
  categoryDonutChart: Partial<PieChartOptions> | null = null;
  revenueTrendChart: Partial<ChartOptions> | null = null;
  performanceScatterChart: Partial<ChartOptions> | null = null;
  priceDistributionChart: Partial<ChartOptions> | null = null;
  monthlyPerformanceChart: Partial<ChartOptions> | null = null;

  // UI state
  loading = false;
  error = false;
  chartsLoading = false;
  exportCatalogueLoading = false;
  exportPerformanceLoading = false;

  // Table sorting
  tableSortColumn: string = 'total_revenue';
  tableSortAscending = false;
  catalogueSortColumn: string = 'sku';
  catalogueSortAscending = true;

  // Orange color palette for consistency
  orangePalette = [
    '#FF6B35', '#FF8C42', '#FFB366', '#FFCC99', '#FFE0CC',
    '#E55A2B', '#CC4F24', '#B3441C', '#993915', '#802E0E'
  ];

  currentUser: CurrentUser | null = null;

  constructor(private http: HttpClient, private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    this.auth.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.loadInitialData();
      this.loadAvailableStores();
      this.loadAvailableStates();
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        this.showStateDropdown = false;
        this.showStoreDropdown = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  loadInitialData(): void {
    this.loading = true;
    this.error = false;

    // Load available years for filters
    this.http.get<TimePeriodOption[]>('/api/v2/chart/time-periods/years', { headers: this.getAuthHeaders() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (years) => {
          this.availableYears = years || [];
          this.loadAllData();
        },
        error: (error) => {
          console.error('Error loading years:', error);
          // Continue loading data even if years fail
          this.availableYears = [];
          this.loadAllData();
        }
      });
  }

  loadAllData(): void {
    this.loadCatalogueData();
    this.loadKPIs();
    // Load performance data first, then charts
    this.loadPerformanceDataAndCharts();
  }

  loadPerformanceDataAndCharts(): void {
    let params = new HttpParams();

    if (this.selectedYear) params = params.set('year', this.selectedYear.toString());
    if (this.selectedMonth) params = params.set('month', this.selectedMonth.toString());
    if (this.selectedCategory) params = params.set('category', this.selectedCategory);
    if (this.searchTerm) params = params.set('search', this.searchTerm);

    if (this.currentUser?.role === 'STATE_MANAGER') {
      params = params.set('state', this.currentUser.stateAbbr);
    } else if (this.currentUser?.role === 'STORE_MANAGER') {
      params = params.set('storeId', this.currentUser.storeId);
    }

    if (this.selectedStores.length > 0) {
      params = params.set('storeIds', this.selectedStores.join(','));
    }

    if (this.selectedStates.length > 0) {
      params = params.set('states', this.selectedStates.join(','));
    }

    this.chartsLoading = true;
    this.http.get<ProductPerformance[]>('/api/v2/products/performance', {
      headers: this.getAuthHeaders(),
      params
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.performanceProducts = data || [];
        this.loading = false;
        // Load charts after performance data is available with current filters
        this.loadCharts();
      },
      error: (error) => {
        console.error('Error loading performance:', error);
        this.performanceProducts = [];
        this.error = false; // Don't show error, show empty data instead
        this.loading = false;
        this.chartsLoading = false;
                 // Still create charts with empty data
         this.createFallbackTopProductsChart();
         this.createFallbackCategoryChart();
      }
    });
  }

  // Filter methods
  applyFilters(): void {
    this.loading = true;
    this.error = false;
    // Load all data with applied filters
    this.loadPerformanceDataAndCharts();
    this.loadKPIs();
    this.loadCatalogueData();
  }

  clearAllFilters(): void {
    this.selectedYear = undefined;
    this.selectedMonth = undefined;
    this.selectedCategory = '';
    this.searchTerm = '';
    this.skuFilter = '';
    // Reset available months when clearing year filter
    this.availableMonths = [];
    this.selectedStores = [];
    this.selectedStates = []; // Clear selected states
    // Reload all data without filters
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedYear || this.selectedMonth || this.selectedCategory || this.searchTerm || this.skuFilter || this.selectedStores.length > 0 || this.selectedStates.length > 0);
  }

  onYearChange(): void {
    this.selectedMonth = undefined;
    if (this.selectedYear) {
      this.loadAvailableMonths();
    }
  }

  onSearchChange(): void {
    this.loadCatalogueData();
  }

  onSkuFilterChange(): void {
    this.loadCatalogueData();
  }

  loadAvailableStores(): void {
    if (this.currentUser?.role === 'HQ_ADMIN' || this.currentUser?.role === 'STATE_MANAGER') {
      this.http.get<Store[]>('/api/v2/stores', { headers: this.getAuthHeaders() })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (stores) => {
            this.availableStores = stores || [];
          },
          error: (error) => {
            console.error('Error loading stores:', error);
            this.availableStores = [];
          }
        });
    }
  }

  loadAvailableMonths(): void {
    if (!this.selectedYear) return;

    const params = new HttpParams().set('year', this.selectedYear.toString());
    this.http.get<TimePeriodOption[]>('/api/v2/chart/time-periods/months', {
      headers: this.getAuthHeaders(),
      params
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (months) => {
        this.availableMonths = months;
      },
      error: (error) => {
        console.error('Error loading months:', error);
      }
    });
  }

  loadAvailableStates(): void {
    if (this.currentUser?.role === 'HQ_ADMIN' || this.currentUser?.role === 'STATE_MANAGER') {
      // Hardcoded list of available states
      this.availableStates = [
        { state_code: 'AZ', state: 'Arizona' },
        { state_code: 'CA', state: 'California' },
        { state_code: 'NV', state: 'Nevada' },
        { state_code: 'UT', state: 'Utah' }
      ];
    }
  }

  // Dropdown methods
  toggleStateDropdown(): void {
    this.showStateDropdown = !this.showStateDropdown;
    if (this.showStateDropdown) {
      this.showStoreDropdown = false;
    }
  }

  toggleStoreDropdown(): void {
    this.showStoreDropdown = !this.showStoreDropdown;
    if (this.showStoreDropdown) {
      this.showStateDropdown = false;
    }
  }

  toggleStateSelection(stateCode: string): void {
    const index = this.selectedStates.indexOf(stateCode);
    if (index === -1) {
      this.selectedStates.push(stateCode);
    } else {
      this.selectedStates.splice(index, 1);
    }
  }

  toggleStoreSelection(storeId: string): void {
    const index = this.selectedStores.indexOf(storeId);
    if (index === -1) {
      this.selectedStores.push(storeId);
    } else {
      this.selectedStores.splice(index, 1);
    }
  }

  getSelectedStatesText(): string {
    if (this.selectedStates.length === 0) {
      return 'All States';
    } else if (this.selectedStates.length === 1) {
      const state = this.availableStates.find(s => s.state_code === this.selectedStates[0]);
      return state ? state.state : this.selectedStates[0];
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

  loadCatalogueData(): void {
    let params = new HttpParams();

    if (this.searchTerm || this.skuFilter) {
      // Combine search terms
      const searchQuery = [this.searchTerm, this.skuFilter].filter(Boolean).join(' ');
      params = params.set('search', searchQuery);
    }

    if (this.currentUser?.role === 'STATE_MANAGER') {
      params = params.set('state', this.currentUser.stateAbbr);
    } else if (this.currentUser?.role === 'STORE_MANAGER') {
      params = params.set('storeId', this.currentUser.storeId);
    }

    if (this.selectedStores.length > 0) {
      params = params.set('storeIds', this.selectedStores.join(','));
    }

    if (this.selectedStates.length > 0) {
      params = params.set('states', this.selectedStates.join(','));
    }

    this.http.get<Product[]>('/api/v2/products', {
      headers: this.getAuthHeaders(),
      params
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.catalogueProducts = data || [];
        // Create price distribution chart after catalogue data loads
        this.createPriceDistributionChart();
      },
      error: (error) => {
        console.error('Error loading catalogue:', error);
        this.catalogueProducts = [];
        // Don't set error to true here, just log it
      }
    });
  }

  loadKPIs(): void {
    let params = new HttpParams();

    if (this.selectedYear) params = params.set('year', this.selectedYear.toString());
    if (this.selectedMonth) params = params.set('month', this.selectedMonth.toString());
    if (this.selectedCategory) params = params.set('category', this.selectedCategory);

    if (this.currentUser?.role === 'STATE_MANAGER') {
      params = params.set('state', this.currentUser.stateAbbr);
    } else if (this.currentUser?.role === 'STORE_MANAGER') {
      params = params.set('storeId', this.currentUser.storeId);
    }

    if (this.selectedStores.length > 0) {
      params = params.set('storeIds', this.selectedStores.join(','));
    }

    if (this.selectedStates.length > 0) {
      params = params.set('states', this.selectedStates.join(','));
    }

    this.http.get<ProductKPIs>('/api/v2/products/kpis', {
      headers: this.getAuthHeaders(),
      params
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.kpis = data;
      },
      error: (error) => {
        console.error('Error loading KPIs:', error);
        // Provide fallback KPI data
        this.kpis = {
          totalRevenue: 0,
          totalOrders: 0,
          totalUnits: 0,
          totalProducts: this.catalogueProducts.length,
          avgPrice: 0
        };
      }
    });
  }

  loadCharts(): void {
    this.chartsLoading = true;
    let params = new HttpParams();

    if (this.selectedYear) params = params.set('year', this.selectedYear.toString());
    if (this.selectedMonth) params = params.set('month', this.selectedMonth.toString());
    if (this.selectedCategory) params = params.set('category', this.selectedCategory);

    // Use performance data to create top products chart
    if (this.performanceProducts.length > 0) {
      // Sort by revenue and take top 10
      const topProducts = [...this.performanceProducts]
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 10);

      const products = topProducts.map(item => `${item.product_name} (${item.size})`);
      const revenues = topProducts.map(item => Number(item.total_revenue) || 0);

      this.topProductsChart = {
        series: [{
          name: 'Revenue',
          data: revenues
        }],
        chart: {
          type: 'bar',
          height: 400,
          toolbar: {
            show: true,
            export: {
              csv: {
                filename: 'top-products-revenue'
              },
              svg: {
                filename: 'top-products-revenue'
              },
              png: {
                filename: 'top-products-revenue'
              }
            }
          },
          zoom: {
            enabled: true,
            type: 'x',
            autoScaleYaxis: true
          },
          animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 800
          }
        },
        xaxis: {
          categories: products,
          labels: {
            style: { fontSize: '11px', colors: '#666' },
            formatter: (value: any) => this.formatCurrency(Number(value))
          }
        },
        yaxis: {
          labels: {
            style: { fontSize: '11px', colors: '#666' }
          }
        },
        colors: [this.orangePalette[0]],
        dataLabels: { enabled: false },
        plotOptions: {
          bar: {
            borderRadius: 8,
            horizontal: true,
            distributed: false
          }
        },
        tooltip: {
          y: {
            formatter: (value) => this.formatCurrency(value)
          }
        },
        grid: {
          borderColor: '#f1f1f1'
        }
      };
      this.chartsLoading = false;
    } else {
      this.createFallbackTopProductsChart();
      this.chartsLoading = false;
    }

    // Create category distribution chart from performance data
    if (this.performanceProducts.length > 0) {
      this.createCategoryDonutChart();
    } else {
      this.createFallbackCategoryChart();
    }

    // Create other charts from existing data
    this.createPerformanceScatterChart();
    this.createMonthlyPerformanceChart();
  }

  createFallbackTopProductsChart(): void {
    this.topProductsChart = {
      series: [{
        name: 'Revenue',
        data: [0]
      }],
      chart: {
        type: 'bar',
        height: 400,
        toolbar: {
          show: true,
          export: {
            csv: {
              filename: 'top-products-revenue'
            },
            svg: {
              filename: 'top-products-revenue'
            },
            png: {
              filename: 'top-products-revenue'
            }
          }
        },
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: true
        }
      },
      xaxis: {
        categories: ['No Data Available'],
        labels: {
          style: { fontSize: '11px', colors: '#666' }
        }
      },
      yaxis: {
        labels: {
          style: { fontSize: '11px', colors: '#666' }
        }
      },
      colors: [this.orangePalette[0]],
      dataLabels: { enabled: false },
      plotOptions: {
        bar: {
          borderRadius: 8,
          horizontal: true
        }
      },
      grid: {
        borderColor: '#f1f1f1'
      }
    };
  }

  createFallbackCategoryChart(): void {
    this.categoryDonutChart = {
      series: [100],
      chart: {
        type: 'donut',
        height: 350,
        toolbar: {
          show: true,
          export: {
            csv: {
              filename: 'category-distribution'
            },
            svg: {
              filename: 'category-distribution'
            },
            png: {
              filename: 'category-distribution'
            }
          }
        }
      },
      labels: ['No Data Available'],
      colors: [this.orangePalette[0]],
      dataLabels: {
        enabled: true,
        formatter: () => 'No Data'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%'
          }
        }
      },
      legend: {
        position: 'bottom',
        fontSize: '14px'
      }
    };
  }

  createCategoryDonutChart(): void {
    // Group performance data by category
    const categoryData = new Map<string, number>();

    this.performanceProducts.forEach(product => {
      const category = product.category;
      const revenue = product.total_revenue || 0;
      categoryData.set(category, (categoryData.get(category) || 0) + revenue);
    });

    const categories = Array.from(categoryData.keys());
    const revenues = Array.from(categoryData.values());
    const total = revenues.reduce((sum, rev) => sum + rev, 0);
    const percentages = revenues.map(rev => (rev / total) * 100);

    this.categoryDonutChart = {
      series: percentages,
      chart: {
        type: 'donut',
        height: 350,
        toolbar: {
          show: true,
          export: {
            csv: {
              filename: 'category-distribution'
            },
            svg: {
              filename: 'category-distribution'
            },
            png: {
              filename: 'category-distribution'
            }
          }
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800
        }
      },
      labels: categories,
      colors: this.orangePalette,
      dataLabels: {
        enabled: true,
        formatter: (val: number) => val.toFixed(1) + '%'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Revenue',
                formatter: () => this.formatCurrency(total)
              }
            }
          }
        }
      },
      legend: {
        position: 'bottom',
        fontSize: '14px'
      }
    };
  }

  createPerformanceScatterChart(): void {
    if (this.performanceProducts.length === 0) return;

    const data = this.performanceProducts.map(product => ({
      x: product.units_sold,
      y: product.total_revenue,
      name: product.product_name
    }));

    this.performanceScatterChart = {
      series: [{
        name: 'Products',
        data: data
      }],
      chart: {
        type: 'scatter',
        height: 350,
        toolbar: {
          show: true,
          export: {
            csv: {
              filename: 'product-performance-scatter'
            },
            svg: {
              filename: 'product-performance-scatter'
            },
            png: {
              filename: 'product-performance-scatter'
            }
          }
        },
        zoom: {
          enabled: true,
          type: 'xy',
          autoScaleYaxis: true
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800
        }
      },
      xaxis: {
        title: { text: 'Units Sold' },
        labels: {
          style: { colors: '#666' }
        }
      },
      yaxis: {
        title: { text: 'Total Revenue' },
        labels: {
          formatter: (value) => this.formatCurrency(value),
          style: { colors: '#666' }
        }
      },
      colors: [this.orangePalette[1]],
      dataLabels: { enabled: false },
      tooltip: {
        custom: ({ series, seriesIndex, dataPointIndex, w }) => {
          const product = this.performanceProducts[dataPointIndex];
          return `<div class="bg-white p-3 rounded shadow-lg border">
            <div class="font-semibold text-gray-800">${product.product_name}</div>
            <div class="text-sm text-gray-600">Units: ${this.formatNumber(product.units_sold)}</div>
            <div class="text-sm text-gray-600">Revenue: ${this.formatCurrency(product.total_revenue)}</div>
          </div>`;
        }
      },
      grid: {
        borderColor: '#f1f1f1'
      }
    };
  }

  createPriceDistributionChart(): void {
    if (this.catalogueProducts.length === 0) return;

    // Group products by price ranges
    const priceRanges = [
      { label: '$0-$10', min: 0, max: 10, count: 0 },
      { label: '$10-$20', min: 10, max: 20, count: 0 },
      { label: '$20-$30', min: 20, max: 30, count: 0 },
      { label: '$30-$40', min: 30, max: 40, count: 0 },
      { label: '$40+', min: 40, max: Infinity, count: 0 }
    ];

    this.catalogueProducts.forEach(product => {
      const range = priceRanges.find(r => product.price >= r.min && product.price < r.max);
      if (range) range.count++;
    });

    this.priceDistributionChart = {
      series: [{
        name: 'Products',
        data: priceRanges.map(r => r.count)
      }],
      chart: {
        type: 'bar',
        height: 300,
        toolbar: {
          show: true,
          export: {
            csv: {
              filename: 'price-distribution'
            },
            svg: {
              filename: 'price-distribution'
            },
            png: {
              filename: 'price-distribution'
            }
          }
        },
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: true
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800
        }
      },
      xaxis: {
        categories: priceRanges.map(r => r.label),
        labels: {
          style: { colors: '#666' }
        }
      },
      yaxis: {
        title: { text: 'Number of Products' },
        labels: {
          style: { colors: '#666' }
        }
      },
      colors: [this.orangePalette[2]],
      dataLabels: { enabled: true },
      plotOptions: {
        bar: {
          borderRadius: 8
        }
      },
      grid: {
        borderColor: '#f1f1f1'
      }
    };
  }

  createMonthlyPerformanceChart(): void {
    if (this.performanceProducts.length === 0) return;

    // Group by category for monthly view
    const categories = [...new Set(this.performanceProducts.map(p => p.category))];
    const series = categories.map((category, index) => ({
      name: category,
      data: [this.performanceProducts
        .filter(p => p.category === category)
        .reduce((sum, p) => sum + p.total_revenue, 0)]
    }));

    this.monthlyPerformanceChart = {
      series: series,
      chart: {
        type: 'area',
        height: 300,
        toolbar: {
          show: true,
          export: {
            csv: {
              filename: 'monthly-performance'
            },
            svg: {
              filename: 'monthly-performance'
            },
            png: {
              filename: 'monthly-performance'
            }
          }
        },
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: true
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800
        }
      },
      xaxis: {
        categories: ['Current Period'],
        labels: {
          style: { colors: '#666' }
        }
      },
      yaxis: {
        title: { text: 'Revenue' },
        labels: {
          formatter: (value) => this.formatCurrency(value),
          style: { colors: '#666' }
        }
      },
      colors: this.orangePalette.slice(0, categories.length),
      dataLabels: { enabled: false },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      fill: {
        type: 'gradient',
        gradient: {
          opacityFrom: 0.7,
          opacityTo: 0.1
        }
      },
      legend: {
        position: 'top'
      },
      grid: {
        borderColor: '#f1f1f1'
      }
    };
  }

  // Table sorting
  sortTable(column: string): void {
    if (this.tableSortColumn === column) {
      this.tableSortAscending = !this.tableSortAscending;
    } else {
      this.tableSortColumn = column;
      this.tableSortAscending = false; // Default to descending for numeric columns
    }
  }

  toggleSortDirection(): void {
    this.tableSortAscending = !this.tableSortAscending;
  }

  sortCatalogue(column: string): void {
    if (this.catalogueSortColumn === column) {
      this.catalogueSortAscending = !this.catalogueSortAscending;
    } else {
      this.catalogueSortColumn = column;
      this.catalogueSortAscending = column === 'sku' || column === 'product_name' || column === 'category'; // Ascending for text, descending for numbers
    }
  }

  toggleCatalogueSortDirection(): void {
    this.catalogueSortAscending = !this.catalogueSortAscending;
  }

  get sortedPerformanceProducts(): ProductPerformance[] {
    return [...this.performanceProducts].sort((a, b) => {
      const multiplier = this.tableSortAscending ? 1 : -1;

      switch (this.tableSortColumn) {
        case 'total_revenue':
          return multiplier * (a.total_revenue - b.total_revenue);
        case 'amount_ordered':
          return multiplier * (a.amount_ordered - b.amount_ordered);
        case 'units_sold':
          return multiplier * (a.units_sold - b.units_sold);
        case 'price':
          return multiplier * (a.price - b.price);
        case 'product_name':
          return multiplier * a.product_name.localeCompare(b.product_name);
        case 'category':
          return multiplier * a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });
  }

  get sortedCatalogueProducts(): Product[] {
    return [...this.catalogueProducts].sort((a, b) => {
      const multiplier = this.catalogueSortAscending ? 1 : -1;

      switch (this.catalogueSortColumn) {
        case 'sku':
          return multiplier * a.sku.localeCompare(b.sku);
        case 'product_name':
          return multiplier * a.product_name.localeCompare(b.product_name);
        case 'price':
          return multiplier * (a.price - b.price);
        case 'category':
          return multiplier * a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });
  }

  // Export functions
  exportCatalogue(): void {
    this.exportCatalogueLoading = true;
    let params = new HttpParams();

    if (this.searchTerm || this.skuFilter) {
      const searchQuery = [this.searchTerm, this.skuFilter].filter(Boolean).join(' ');
      params = params.set('search', searchQuery);
    }

    if (this.currentUser?.role === 'STATE_MANAGER') {
      params = params.set('state', this.currentUser.stateAbbr);
    } else if (this.currentUser?.role === 'STORE_MANAGER') {
      params = params.set('storeId', this.currentUser.storeId);
    }

    if (this.selectedStores.length > 0) {
      params = params.set('storeIds', this.selectedStores.join(','));
    }

    if (this.selectedStates.length > 0) {
      params = params.set('states', this.selectedStates.join(','));
    }

    this.http.get('/api/v2/products/export', {
      headers: this.getAuthHeaders(),
      params,
      responseType: 'blob'
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pizza-world-products-catalogue-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.exportCatalogueLoading = false;
      },
      error: (error) => {
        console.error('Error exporting catalogue:', error);
        this.exportCatalogueLoading = false;
      }
    });
  }

  exportPerformance(): void {
    this.exportPerformanceLoading = true;
    let params = new HttpParams();

    if (this.selectedYear) params = params.set('year', this.selectedYear.toString());
    if (this.selectedMonth) params = params.set('month', this.selectedMonth.toString());
    if (this.selectedCategory) params = params.set('category', this.selectedCategory);
    if (this.searchTerm) params = params.set('search', this.searchTerm);

    if (this.currentUser?.role === 'STATE_MANAGER') {
      params = params.set('state', this.currentUser.stateAbbr);
    } else if (this.currentUser?.role === 'STORE_MANAGER') {
      params = params.set('storeId', this.currentUser.storeId);
    }

    if (this.selectedStores.length > 0) {
      params = params.set('storeIds', this.selectedStores.join(','));
    }

    if (this.selectedStates.length > 0) {
      params = params.set('states', this.selectedStates.join(','));
    }

    this.http.get('/api/v2/products/performance/export', {
      headers: this.getAuthHeaders(),
      params,
      responseType: 'blob'
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pizza-world-products-performance-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.exportPerformanceLoading = false;
      },
      error: (error) => {
        console.error('Error exporting performance:', error);
        this.exportPerformanceLoading = false;
      }
    });
  }

  // Utility functions
  getFilterLabel(): string {
    const parts = [];
    if (this.selectedYear) {
      if (this.selectedMonth) {
        const month = this.availableMonths.find(m => m.month === this.selectedMonth);
        parts.push(`${month?.month_name_label || this.selectedMonth} ${this.selectedYear}`);
      } else {
        parts.push(`${this.selectedYear}`);
      }
    }
    if (this.selectedCategory) parts.push(this.selectedCategory);
    if (this.selectedStores.length > 0) {
      if (this.selectedStores.length === 1) {
        const store = this.availableStores.find(s => s.storeid === this.selectedStores[0]);
        parts.push(store ? `${store.city}, ${store.state}`: '1 store');
      } else {
        parts.push(`${this.selectedStores.length} stores`);
      }
    }
    if (this.selectedStates.length > 0) {
      if (this.selectedStates.length === 1) {
        const state = this.availableStates.find(s => s.state_code === this.selectedStates[0]);
        parts.push(state ? `${state.state}`: '1 state');
      } else {
        parts.push(`${this.selectedStates.length} states`);
      }
    }

    return parts.length > 0 ? parts.join(' • ') : 'All Time';
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

  getSortDisplayName(): string {
    const columnNames: { [key: string]: string } = {
      'total_revenue': 'Revenue',
      'amount_ordered': 'Orders',
      'units_sold': 'Units Sold',
      'price': 'Price',
      'product_name': 'Product Name',
      'category': 'Category'
    };
    return columnNames[this.tableSortColumn] || this.tableSortColumn;
  }

  goToProductDetails(sku: string): void {
    // Use Angular router to navigate to the details page
    // (Assume router is injected in the constructor)
    this.router.navigate(['/products/details', sku]);
  }

}
