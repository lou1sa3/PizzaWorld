// src/app/shared/kpi-tile/kpi-tile.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule }     from '@angular/common';

@Component({
  standalone: true,
  selector  : 'kpi-tile',
  template  : `
  <div class="kpi-tile">
    <div class="kpi-value">{{ value }}</div>
    <div class="kpi-label">{{ label }}</div>
  </div>`,
  imports   : [CommonModule],
  styleUrls : ['./KpiTileComponent.scss']
})
export class KpiTileComponent {
  @Input() label = '';
  @Input() value: string | number = '';
}
