import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export interface CacheConfig {
  defaultTtl: number;
  maxMemoryItems: number;
  persistToStorage: boolean;
  storagePrefix: string;
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private memoryCache = new Map<string, CacheItem<any>>();
  private observableCache = new Map<string, Observable<any>>();
  private cacheStats = new BehaviorSubject({
    memoryItems: 0,
    storageItems: 0,
    hitRate: 0,
    totalRequests: 0,
    cacheHits: 0
  });

  private config: CacheConfig = {
    defaultTtl: 300000, // 5 minutes
    maxMemoryItems: 100,
    persistToStorage: true,
    storagePrefix: 'pizzaWorld_cache_'
  };

  private stats = {
    totalRequests: 0,
    cacheHits: 0
  };

  constructor() {
    this.startCleanupInterval();
    this.loadStatsFromStorage();
  }

  /**
   * Get cached data or execute the provided function
   */
  get<T>(key: string, dataFn: () => Observable<T>, ttl?: number): Observable<T> {
    this.stats.totalRequests++;

    const cacheKey = this.getCacheKey(key);
    const cachedItem = this.getFromMemory<T>(cacheKey);

    if (cachedItem && this.isValid(cachedItem)) {
      this.stats.cacheHits++;
      this.updateStats();
      console.log(`🎯 Cache HIT for key: ${key}`);
      return of(cachedItem.data);
    }

    // Check if we already have an ongoing request for this key
    if (this.observableCache.has(cacheKey)) {
      console.log(`🔄 Returning ongoing request for key: ${key}`);
      return this.observableCache.get(cacheKey)!;
    }

    console.log(`🔍 Cache MISS for key: ${key}, fetching fresh data`);

    const observable = dataFn().pipe(
      tap(data => {
        this.set(key, data, ttl);
        this.observableCache.delete(cacheKey);
      }),
      shareReplay(1)
    );

    this.observableCache.set(cacheKey, observable);
    return observable;
  }

  /**
   * Set data in cache with TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const cacheKey = this.getCacheKey(key);
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTtl,
      key: cacheKey
    };

    // Store in memory cache
    this.setInMemory(cacheKey, cacheItem);

    // Store in localStorage if enabled
    if (this.config.persistToStorage) {
      this.setInStorage(cacheKey, cacheItem);
    }

    this.updateStats();
  }

  /**
   * Get data directly from cache (synchronous)
   */
  getSync<T>(key: string): T | null {
    this.stats.totalRequests++;

    const cacheKey = this.getCacheKey(key);
    const cachedItem = this.getFromMemory<T>(cacheKey) || this.getFromStorage<T>(cacheKey);

    if (cachedItem && this.isValid(cachedItem)) {
      this.stats.cacheHits++;
      this.updateStats();
      return cachedItem.data;
    }

    return null;
  }

  /**
   * Check if key exists in cache and is valid
   */
  has(key: string): boolean {
    const cacheKey = this.getCacheKey(key);
    const cachedItem = this.getFromMemory(cacheKey) || this.getFromStorage(cacheKey);
    return cachedItem ? this.isValid(cachedItem) : false;
  }

  /**
   * Remove specific key from cache
   */
  delete(key: string): void {
    const cacheKey = this.getCacheKey(key);
    this.memoryCache.delete(cacheKey);
    this.observableCache.delete(cacheKey);

    if (this.config.persistToStorage) {
      localStorage.removeItem(cacheKey);
    }

    this.updateStats();
  }

  /**
   * Clear all cache data
   */
  clear(): void {
    this.memoryCache.clear();
    this.observableCache.clear();

    if (this.config.persistToStorage) {
      Object.keys(localStorage)
        .filter(key => key.startsWith(this.config.storagePrefix))
        .forEach(key => localStorage.removeItem(key));
    }

    this.stats = { totalRequests: 0, cacheHits: 0 };
    this.updateStats();
    console.log('🧹 Cache cleared');
  }

  /**
   * Clear expired items from cache
   */
  clearExpired(): void {
    let removedCount = 0;

    // Clear from memory cache
    for (const [key, item] of this.memoryCache.entries()) {
      if (!this.isValid(item)) {
        this.memoryCache.delete(key);
        removedCount++;
      }
    }

    // Clear from localStorage
    if (this.config.persistToStorage) {
      Object.keys(localStorage)
        .filter(key => key.startsWith(this.config.storagePrefix))
        .forEach(key => {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const item = JSON.parse(stored);
              if (!this.isValid(item)) {
                localStorage.removeItem(key);
                removedCount++;
              }
            } else {
              localStorage.removeItem(key);
              removedCount++;
            }
          } catch (error) {
            localStorage.removeItem(key);
            removedCount++;
          }
        });
    }

    if (removedCount > 0) {
      console.log(`🧹 Removed ${removedCount} expired cache items`);
      this.updateStats();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): Observable<any> {
    return this.cacheStats.asObservable();
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Private methods

  private getCacheKey(key: string): string {
    return `${this.config.storagePrefix}${key}`;
  }

  private getFromMemory<T>(key: string): CacheItem<T> | undefined {
    return this.memoryCache.get(key);
  }

  private setInMemory<T>(key: string, item: CacheItem<T>): void {
    // Implement LRU eviction if memory cache is full
    if (this.memoryCache.size >= this.config.maxMemoryItems) {
      const oldestKey = this.memoryCache.keys().next().value as string;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    this.memoryCache.set(key, item);
  }

    private getFromStorage<T>(key: string): CacheItem<T> | null {
    if (!this.config.persistToStorage) return null;

    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn(`Failed to parse cached item ${key}:`, error);
      try {
        localStorage.removeItem(key);
      } catch (removeError) {
        console.warn(`Failed to remove invalid cache item ${key}:`, removeError);
      }
      return null;
    }
  }

  private setInStorage<T>(key: string, item: CacheItem<T>): void {
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn(`Failed to store cache item ${key}:`, error);
    }
  }

  private isValid<T>(item: CacheItem<T>): boolean {
    return Date.now() - item.timestamp < item.ttl;
  }

  private updateStats(): void {
    const hitRate = this.stats.totalRequests > 0
      ? (this.stats.cacheHits / this.stats.totalRequests) * 100
      : 0;

    const stats = {
      memoryItems: this.memoryCache.size,
      storageItems: this.getStorageItemCount(),
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests: this.stats.totalRequests,
      cacheHits: this.stats.cacheHits
    };

    this.cacheStats.next(stats);
    this.saveStatsToStorage();
  }

  private getStorageItemCount(): number {
    if (!this.config.persistToStorage) return 0;

    return Object.keys(localStorage)
      .filter(key => key.startsWith(this.config.storagePrefix))
      .length;
  }

  private startCleanupInterval(): void {
    // Clean up expired items every 5 minutes
    setInterval(() => {
      this.clearExpired();
    }, 300000);
  }

  private saveStatsToStorage(): void {
    try {
      localStorage.setItem(`${this.config.storagePrefix}stats`, JSON.stringify(this.stats));
    } catch (error) {
      console.warn('Failed to save cache stats:', error);
    }
  }

  private loadStatsFromStorage(): void {
    try {
      const stored = localStorage.getItem(`${this.config.storagePrefix}stats`);
      if (stored) {
        const parsedStats = JSON.parse(stored);
        this.stats = {
          totalRequests: parsedStats.totalRequests || 0,
          cacheHits: parsedStats.cacheHits || 0
        };
      }
    } catch (error) {
      console.warn('Failed to load cache stats:', error);
    }
  }
}
