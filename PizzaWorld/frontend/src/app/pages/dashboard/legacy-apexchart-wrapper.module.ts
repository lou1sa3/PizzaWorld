import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { LegacyApexchartWrapperComponent } from './legacy-apexchart-wrapper.component';

@NgModule({
  imports: [CommonModule, NgApexchartsModule],
  declarations: [LegacyApexchartWrapperComponent],
  exports: [LegacyApexchartWrapperComponent]
})
export class LegacyApexchartWrapperModule {} 