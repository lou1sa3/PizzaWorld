import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexDataLabels, ApexTooltip, ApexPlotOptions, ApexGrid, ApexLegend, ApexFill, ApexStroke, ChartType, ApexNoData } from 'ng-apexcharts';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { DatePipe } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis?: ApexYAxis;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  plotOptions?: ApexPlotOptions;
  grid?: ApexGrid;
  colors: string[];
  fill?: ApexFill;
  legend?: ApexLegend;
  stroke?: ApexStroke;
  noData?: ApexNoData;
};

export type TimePeriod = 'all-time' | 'year' | 'month' | 'custom-range' | 'since-launch';

interface ProductKpi {
  revenue?: number;
  orders?: number;
  units_sold?: number;
  unique_customers?: number;
  avg_price?: number;
  avg_order_value?: number;
}

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, NgApexchartsModule],
  providers: [DatePipe]
})
export class ProductDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  sku: string = '';
  product: any = null;
  loading = true;
  error = false;
  totalRevenue: number = 0;

  // Filters
  timePeriod: TimePeriod = 'all-time';
  year?: number;
  month?: number;
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  endMonth?: number;

  // Chart data
  revenueTrendChart: Partial<ChartOptions> | null = null;
  unitsTrendChart: Partial<ChartOptions> | null = null;
  chartsLoading = false;

  kpis: ProductKpi | null = null;
  comparisonChart: Partial<ChartOptions> | null = null;
  trendData: any[] = [];

  availableYears: any[] = [];
  availableMonths: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sku = this.route.snapshot.paramMap.get('sku') || '';
    if (this.sku) {
      this.loadAllData();
    } else {
      this.error = true;
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  loadAllData(): void {
    this.loading = true;
    this.chartsLoading = true;

    const product$ = this.http.get(`/api/v2/products/details/${this.sku}`, { headers: this.getAuthHeaders() }).pipe(catchError(() => of(null)));
    const revenueTrend$ = this.http.get<any[]>(`/api/v2/products/revenue-trend`, { params: { sku: this.sku, timePeriod: 'all-time' }, headers: this.getAuthHeaders() }).pipe(catchError(() => of([])));

    forkJoin({
      product: product$,
      revenueTrend: revenueTrend$,
    }).subscribe(({ product, revenueTrend }) => {
      if (!product) {
        this.error = true;
        this.loading = false;
        return;
      }
      this.product = product;
      this.totalRevenue = revenueTrend.reduce((sum, item) => sum + (item.revenue || 0), 0);

      // Build charts
      this.revenueTrendChart = this.buildRevenueTrendChart(revenueTrend, 'Revenue', '#FF6B35');

      this.loading = false;
      this.chartsLoading = false;
    });
  }

  buildRevenueTrendChart(data: any[], label: string, color: string, chartType: ChartType = 'area'): Partial<ChartOptions> {
    if (!data || data.length === 0) {
      return this.createFallbackChart(label);
    }
    const categories = data.map(d => d.month);
    const seriesData = data.map(d => d.revenue || 0);
    return {
      series: [{ name: label, data: seriesData }],
      chart: { type: chartType, height: 300, toolbar: { show: true } },
      xaxis: { categories },
      yaxis: { labels: { style: { colors: '#666' } } },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v: number) => this.formatNumber(v) } },
      plotOptions: {},
      grid: { borderColor: '#f1f1f1' },
      colors: [color],
      fill: { type: 'gradient', gradient: { opacityFrom: 0.7, opacityTo: 0.1 } },
      stroke: { curve: 'smooth', width: 2 }
    };
  }

  createFallbackChart(label: string): Partial<ChartOptions> {
    return {
      series: [{ name: label, data: [] }],
      chart: { type: 'bar', height: 300, toolbar: { show: false } },
      xaxis: { categories: ['No data available for this period'] },
      yaxis: { labels: { show: false } },
      noData: { text: 'No data to display' }
    };
  }

  goBack(): void {
    this.router.navigate(['/products']);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }
}
