import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { KpiService } from './kpi.service';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, catchError, startWith } from 'rxjs/operators';

export interface SearchItem {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: string;
  keywords: string[];
  category: 'page' | 'action' | 'help';
  roleRequired?: string[];
}

export interface SearchResult extends SearchItem {
  score: number;
  matchedTerms: string[];
}

export interface StoreSearchItem extends SearchItem {
  storeId: string;
  city: string;
  state: string;
  zipcode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private storesSubject = new BehaviorSubject<StoreSearchItem[]>([]);
  private stores$ = this.storesSubject.asObservable();

  private searchItems: SearchItem[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Main analytics dashboard with KPIs and charts',
      route: '/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      keywords: ['dashboard', 'home', 'main', 'overview', 'kpi', 'analytics', 'charts'],
      category: 'page'
    },
    {
      id: 'stores',
      title: 'Stores',
      description: 'Store management and analytics',
      route: '/stores',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      keywords: ['stores', 'locations', 'shops', 'branches', 'store management'],
      category: 'page'
    },
    {
      id: 'products',
      title: 'Products',
      description: 'Product catalog and performance analytics',
      route: '/products',
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      keywords: ['products', 'catalog', 'items', 'menu', 'pizza', 'food', 'inventory'],
      category: 'page'
    },
    {
      id: 'orders',
      title: 'Orders',
      description: 'Order management and tracking',
      route: '/orders',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      keywords: ['orders', 'transactions', 'purchases', 'order management'],
      category: 'page'
    },
    {
      id: 'customer-analytics',
      title: 'Customer Analytics',
      description: 'Customer lifetime value and retention analysis',
      route: '/customer-analytics',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      keywords: ['customers', 'analytics', 'clv', 'retention', 'lifetime value', 'customer analysis'],
      category: 'page'
    },
    {
      id: 'delivery-metrics',
      title: 'Delivery Metrics',
      description: 'Delivery performance and capacity analytics',
      route: '/delivery-metrics',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      keywords: ['delivery', 'metrics', 'performance', 'capacity', 'logistics', 'shipping'],
      category: 'page'
    },

    {
      id: 'profile',
      title: 'My Profile',
      description: 'User profile and account settings',
      route: '/profile',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      keywords: ['profile', 'account', 'settings', 'user', 'personal', 'my profile'],
      category: 'page'
    },
    {
      id: 'contact-support',
      title: 'Contact Support',
      description: 'Get help and contact support team',
      route: '/contact-support',
      icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z',
      keywords: ['support', 'help', 'contact', 'assistance', 'ticket', 'bug report'],
      category: 'help'
    }
  ];

  constructor(
    private router: Router,
    private kpiService: KpiService
  ) {
    this.loadStores();
  }

  search(query: string, limit: number = 5): SearchResult[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search through static pages
    for (const item of this.searchItems) {
      const score = this.calculateScore(item, normalizedQuery);
      if (score > 0) {
        const matchedTerms = this.getMatchedTerms(item, normalizedQuery);
        results.push({
          ...item,
          score,
          matchedTerms
        });
      }
    }

    // Search through stores
    const stores = this.storesSubject.value;
    for (const store of stores) {
      const score = this.calculateStoreScore(store, normalizedQuery);
      if (score > 0) {
        const matchedTerms = this.getStoreMatchedTerms(store, normalizedQuery);
        results.push({
          ...store,
          score,
          matchedTerms
        });
      }
    }

    // Sort by score (descending) and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private calculateScore(item: SearchItem, query: string): number {
    let score = 0;
    const queryTerms = query.split(' ').filter(term => term.length > 0);

    // Check title match (highest priority)
    if (item.title.toLowerCase().includes(query)) {
      score += 100;
    }

    // Check if title starts with query (high priority)
    if (item.title.toLowerCase().startsWith(query)) {
      score += 80;
    }

    // Check exact keyword match
    for (const keyword of item.keywords) {
      if (keyword === query) {
        score += 60;
      } else if (keyword.startsWith(query)) {
        score += 40;
      } else if (keyword.includes(query)) {
        score += 20;
      }
    }

    // Check description match
    if (item.description.toLowerCase().includes(query)) {
      score += 15;
    }

    // Fuzzy matching for individual terms
    for (const term of queryTerms) {
      if (term.length < 2) continue;

      // Check title fuzzy match
      if (this.fuzzyMatch(item.title.toLowerCase(), term)) {
        score += 10;
      }

      // Check keyword fuzzy match
      for (const keyword of item.keywords) {
        if (this.fuzzyMatch(keyword, term)) {
          score += 5;
        }
      }
    }

    return score;
  }

  private getMatchedTerms(item: SearchItem, query: string): string[] {
    const matched: string[] = [];
    const queryTerms = query.split(' ').filter(term => term.length > 0);

    // Check title
    if (item.title.toLowerCase().includes(query)) {
      matched.push(item.title);
    }

    // Check keywords
    for (const keyword of item.keywords) {
      if (keyword.includes(query) || queryTerms.some(term => keyword.includes(term))) {
        matched.push(keyword);
      }
    }

    return [...new Set(matched)]; // Remove duplicates
  }

  private fuzzyMatch(text: string, pattern: string): boolean {
    if (pattern.length === 0) return true;
    if (text.length === 0) return false;

    let patternIndex = 0;
    let textIndex = 0;

    while (patternIndex < pattern.length && textIndex < text.length) {
      if (pattern[patternIndex] === text[textIndex]) {
        patternIndex++;
      }
      textIndex++;
    }

    return patternIndex === pattern.length;
  }

  navigateToResult(result: SearchResult): void {
    this.router.navigate([result.route]);
  }

  getQuickShortcuts(): SearchItem[] {
    return this.searchItems.filter(item =>
      ['dashboard', 'orders', 'customers', 'products'].includes(item.id)
    );
  }

  private loadStores(): void {
    this.kpiService.getAllStores().pipe(
      catchError(error => {
        console.error('Failed to load stores for search:', error);
        return of([]);
      })
    ).subscribe(stores => {
      const storeSearchItems: StoreSearchItem[] = stores.map(store => ({
        id: `store-${store.storeid}`,
        title: `${store.city} Store`,
        description: `Store ${store.storeid} in ${store.city}, ${store.state}`,
        route: `/stores/${store.storeid}`,
        icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
        keywords: [
          store.city.toLowerCase(),
          store.state.toLowerCase(),
          store.storeid,
          'store',
          'location',
          'branch',
          store.zipcode || ''
        ].filter(Boolean),
        category: 'page' as const,
        storeId: store.storeid,
        city: store.city,
        state: store.state,
        zipcode: store.zipcode
      }));

      this.storesSubject.next(storeSearchItems);
    });
  }

  private calculateStoreScore(store: StoreSearchItem, query: string): number {
    let score = 0;
    const queryTerms = query.split(' ').filter(term => term.length > 0);

    // High priority: exact store ID match
    if (store.storeId.toLowerCase() === query) {
      score += 200;
    } else if (store.storeId.toLowerCase().includes(query)) {
      score += 150;
    }

    // High priority: city name match
    if (store.city.toLowerCase() === query) {
      score += 180;
    } else if (store.city.toLowerCase().startsWith(query)) {
      score += 120;
    } else if (store.city.toLowerCase().includes(query)) {
      score += 80;
    }

    // Medium priority: state match
    if (store.state.toLowerCase() === query) {
      score += 100;
    } else if (store.state.toLowerCase().includes(query)) {
      score += 60;
    }

    // Check title match
    if (store.title.toLowerCase().includes(query)) {
      score += 40;
    }

    // Check description match
    if (store.description.toLowerCase().includes(query)) {
      score += 20;
    }

    // Fuzzy matching for individual terms
    for (const term of queryTerms) {
      if (term.length < 2) continue;

      if (this.fuzzyMatch(store.city.toLowerCase(), term)) {
        score += 15;
      }
      if (this.fuzzyMatch(store.state.toLowerCase(), term)) {
        score += 10;
      }
      if (this.fuzzyMatch(store.storeId.toLowerCase(), term)) {
        score += 25;
      }
    }

    return score;
  }

  private getStoreMatchedTerms(store: StoreSearchItem, query: string): string[] {
    const matched: string[] = [];
    const queryTerms = query.split(' ').filter(term => term.length > 0);

    // Check store ID
    if (store.storeId.toLowerCase().includes(query)) {
      matched.push(`Store ${store.storeId}`);
    }

    // Check city
    if (store.city.toLowerCase().includes(query)) {
      matched.push(store.city);
    }

    // Check state
    if (store.state.toLowerCase().includes(query)) {
      matched.push(store.state);
    }

    // Check individual terms
    for (const term of queryTerms) {
      if (store.city.toLowerCase().includes(term)) {
        matched.push(store.city);
      }
      if (store.state.toLowerCase().includes(term)) {
        matched.push(store.state);
      }
    }

    return [...new Set(matched)]; // Remove duplicates
  }
}
