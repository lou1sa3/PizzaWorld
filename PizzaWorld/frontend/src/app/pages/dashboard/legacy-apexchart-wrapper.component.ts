import { Component, Input } from '@angular/core';
import { ApexAxisChartSeries, ApexChart, ApexXAxis, ApexTitleSubtitle, ApexDataLabels, ApexTooltip, ApexPlotOptions } from 'ng-apexcharts';

@Component({
  selector: 'legacy-apexchart-wrapper',
  standalone: false,
  template: `
    <apx-chart
      [series]="series"
      [chart]="chart"
      [xaxis]="xaxis"
      [title]="title"
      [dataLabels]="dataLabels"
      [tooltip]="tooltip"
      [plotOptions]="plotOptions"
    ></apx-chart>
  `
})
export class LegacyApexchartWrapperComponent {
  @Input() series!: ApexAxisChartSeries;
  @Input() chart!: ApexChart;
  @Input() xaxis!: ApexXAxis;
  @Input() title!: ApexTitleSubtitle;
  @Input() dataLabels!: ApexDataLabels;
  @Input() tooltip!: ApexTooltip;
  @Input() plotOptions!: ApexPlotOptions;
} 