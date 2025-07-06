import { Injectable } from '@angular/core';
import { KpiService } from './kpi.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PreloadService {
  constructor(private kpi: KpiService) {}

  preloadAll(): Promise<any> {
    // Fetch the earliest order date first
    return new Promise((resolve, reject) => {
      this.kpi.getEarliestOrderDate().subscribe({
        next: (earliestDate) => {
          const today = new Date();
          // Ensure we only send YYYY-MM-DD without time
          const fromDate = earliestDate ? earliestDate.split(/[T\s]/)[0] : '2000-01-01';
          const toDate = today.toISOString().split('T')[0];

          // Persist earliest order date so other pages can instantly use it
          localStorage.setItem('pizzaWorld_earliestOrderDate', fromDate);

          console.log('🚀 Loading data in batches to prevent connection pool exhaustion...');
          console.log(`📅 Date range: ${fromDate} to ${toDate}`);

          // Load data in batches to prevent overwhelming the database
          this.loadDataInBatches(fromDate, toDate).then((result) => {
            console.log('✅ ALL DATA LOADED:', {
              products: result.products?.length || 0,
              stores: result.stores?.length || 0,
              dashboard: !!result.dashboard,
              performance: !!result.performance,
              salesKpis: !!result.salesKpis,
              bestProducts: result.bestProducts?.length || 0,
              storesByRevenue: result.storesByRevenue?.length || 0,
              salesTrend: result.salesTrend?.length || 0,
              revenueByCategory: result.revenueByCategory?.length || 0,
              recentOrders: result.recentOrders?.length || 0,
            });

            // Wait for caching to complete
            this.waitForCachingToComplete().then(() => {
              console.log('🎉 CACHING COMPLETED - Ready to show app!');
              this.verifyCacheStatus();
              
              const allCached = this.kpi.isAllDataCached();
              if (allCached) {
                console.log('🎉 ALL DATA SUCCESSFULLY CACHED');
                resolve(result);
              } else {
                console.log('⚠️ Some data may not be cached - tab switching may have delays');
                resolve(result);
              }
            }).catch((error) => {
              console.error('❌ Error waiting for caching to complete:', error);
              resolve(result);
            });
          }).catch((err) => {
            console.error('❌ PreloadService.loadDataInBatches() failed:', err);
            reject(err);
          });
        },
        error: (err) => {
          console.error('❌ PreloadService.getEarliestOrderDate() failed:', err);
          reject(err);
        }
      });
    });
  }

  /** Load data in batches to prevent connection pool exhaustion */
  private async loadDataInBatches(fromDate: string, toDate: string): Promise<any> {
    const result: any = {};

    // Batch 1: Essential data (products, stores, dashboard)
    console.log('📦 Batch 1: Loading essential data...');
    try {
      const batch1 = await forkJoin({
        products: this.kpi.getAllProducts().pipe(catchError((e) => {
          console.error('❌ Preload: Products failed', e);
          return of([]);
        })),
        stores: this.kpi.getAllStores().pipe(catchError((e) => {
          console.error('❌ Preload: Stores failed', e);
          return of([]);
        })),
        dashboard: this.kpi.getDashboard().pipe(catchError((e) => {
          console.error('❌ Preload: Dashboard failed', e);
          return of(null);
        }))
      }).toPromise();
      
      Object.assign(result, batch1);
      console.log('✅ Batch 1 completed');
      
      // Wait 500ms between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('❌ Batch 1 failed:', error);
    }

    // Batch 2: Performance data (heaviest query)
    console.log('📦 Batch 2: Loading performance data...');
    try {
      result.performance = await this.kpi.loadPerformanceData().pipe(catchError((e) => {
        console.error('❌ Preload: Performance failed', e);
        return of(null);
      })).toPromise();
      
      console.log('✅ Batch 2 completed');
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('❌ Batch 2 failed:', error);
      result.performance = null;
    }

    // Batch 3: Sales analytics
    console.log('📦 Batch 3: Loading sales analytics...');
    try {
      const batch3 = await forkJoin({
        salesKpis: this.kpi.getSalesKPIs(fromDate, toDate).pipe(catchError((e) => {
          console.error('❌ Preload: Sales KPIs failed', e);
          return of(null);
        })),
        bestProducts: this.kpi.getBestSellingProducts(fromDate, toDate).pipe(catchError((e) => {
          console.error('❌ Preload: Best Products failed', e);
          return of([]);
        })),
        storesByRevenue: this.kpi.getStoresByRevenue(fromDate, toDate).pipe(catchError((e) => {
          console.error('❌ Preload: Stores by Revenue failed', e);
          return of([]);
        }))
      }).toPromise();
      
      Object.assign(result, batch3);
      console.log('✅ Batch 3 completed');
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('❌ Batch 3 failed:', error);
    }

    // Batch 4: Charts and trends
    console.log('📦 Batch 4: Loading charts and trends...');
    try {
      const batch4 = await forkJoin({
        salesTrend: this.kpi.getSalesTrendByDay(fromDate, toDate).pipe(catchError((e) => {
          console.error('❌ Preload: Sales Trend failed', e);
          return of([]);
        })),
        revenueByCategory: this.kpi.getRevenueByCategory(fromDate, toDate).pipe(catchError((e) => {
          console.error('❌ Preload: Revenue by Category failed', e);
          return of([]);
        })),
        recentOrders: this.kpi.getRecentOrders().pipe(catchError((e) => {
          console.error('❌ Preload: Recent Orders failed, trying test endpoint', e);
          return this.kpi.getRecentOrdersTest().pipe(catchError((e2) => {
            console.error('❌ Preload: Recent Orders test also failed', e2);
            return of([]);
          }));
        }))
      }).toPromise();
      
      Object.assign(result, batch4);
      console.log('✅ Batch 4 completed');
    } catch (error) {
      console.error('❌ Batch 4 failed:', error);
    }

    return result;
  }

  /** Wait for caching to complete with retries */
  private async waitForCachingToComplete(): Promise<void> {
    const maxRetries = 20; // Increased retries
    const retryDelay = 300; // Increased delay
    
    console.log('⏳ Starting cache verification process...');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔍 Cache verification attempt ${attempt}/${maxRetries}`);
      
      // Check if essential data is cached
      const allCached = this.kpi.isAllDataCached();
      
      if (allCached) {
        console.log(`✅ All essential data cached on attempt ${attempt}`);
        return;
      }
      
      // Show what's missing
      this.kpi.debugCacheStatus();
      
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting ${retryDelay}ms before next cache check...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    console.log('⚠️ Cache verification timed out - proceeding anyway');
  }

  /** Force wait for specific data to be cached */
  private async waitForSpecificData(key: string, maxRetries: number = 10): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const data = localStorage.getItem(key);
      if (data) {
        console.log(`✅ ${key} cached on attempt ${attempt}`);
        return true;
      }
      
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting for ${key}... (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`❌ ${key} not cached after ${maxRetries} attempts`);
    return false;
  }

  /** Verify that all essential data was successfully cached */
  verifyCacheStatus(): void {
    console.log('🔍 Verifying cache status after preload...');
    this.kpi.debugCacheStatus();
    
    const allCached = this.kpi.isAllDataCached();
    if (allCached) {
      console.log('✅ All essential data successfully cached - ready for instant tab switching!');
    } else {
      console.log('⚠️ Some essential data may not be cached - tab switching may have delays');
    }
  }
} 