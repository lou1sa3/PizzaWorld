import ApexCharts from 'apexcharts';

/**
 * Sets a global theme for all ApexCharts across the application so that
 * charts automatically inherit the PizzaWorld orange gradient palette and
 * typography. Call this function once – ideally right after app bootstrap.
 */
export function applyChartTheme(): void {
  ApexCharts.exec('global', 'updateOptions', {
    colors: ['#f97316', '#fb923c', '#fdba74', '#fed7aa'],
    chart: {
      fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
      foreColor: '#334155',
      toolbar: { show: false }
    },
    stroke: { width: 3, curve: 'smooth' },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.8,
        opacityTo: 0.1,
        stops: [0, 90, 100],
        colorStops: []
      }
    },
    grid: {
      borderColor: '#e2e8f0',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'light'
    },
    legend: {
      position: 'top'
    }
  });
} 