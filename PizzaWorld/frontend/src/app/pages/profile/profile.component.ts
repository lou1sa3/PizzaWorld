import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CurrentUser } from '../../core/models/current-user.model';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { AuthService } from '../../core/auth.service';

interface StoreInfo {
  storeid: string;
  city: string;
  state: string;
  zipcode: string;
  latitude: number;
  longitude: number;
  storeCount?: number;
  description?: string;
}

interface RolePermission {
  name: string;
  description: string;
  granted: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  imports: [RouterModule, SidebarComponent, CommonModule]
})
export class ProfileComponent implements OnInit {
  @ViewChild('sidebar', { static: true }) sidebar!: ElementRef<HTMLElement>;

  /** Holds data returned by GET /api/me (username, role, storeId, stateAbbr) */
  user?: CurrentUser;

  /** Store information for the user's store */
  storeInfo?: StoreInfo;

  /** Loading state */
  loading = false;

  /** Error message */
  error?: string;

  constructor(
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.error = undefined;

    this.auth.loadCurrentUser().subscribe({
      next: (user) => {
        this.user = user ?? undefined;
        if (this.user) {
          this.loadStoreInfo();
        } else {
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('Failed to load current user', err);
        this.error = 'Failed to load profile information';
        this.loading = false;
      }
    });
  }

  loadStoreInfo(): void {
    // Create store info based on role without API calls
    // Using typical store counts from the quick stats
    if (this.user?.role === 'HQ_ADMIN') {
      // For HQ_ADMIN, show total store count (typical count: 32)
      this.storeInfo = {
        storeid: 'HQ',
        city: 'Headquarters',
        state: 'All States',
        zipcode: 'N/A',
        latitude: 0,
        longitude: 0,
        storeCount: 32,
        description: '32 available stores'
      };
    } else if (this.user?.role === 'STATE_MANAGER') {
      // For STATE_MANAGER, show stores in their state (only 4 states available)
      const stateStoreCounts: { [key: string]: number } = {
        'CA': 17, 'NV': 13, 'TX': 6, 'UT': 1
      };
      const storeCount = stateStoreCounts[this.user?.stateAbbr || ''] || 1;
      this.storeInfo = {
        storeid: 'STATE',
        city: 'State Management',
        state: this.user?.stateAbbr || 'Unknown',
        zipcode: 'N/A',
        latitude: 0,
        longitude: 0,
        storeCount: storeCount,
        description: `${storeCount} stores in ${this.user?.stateAbbr} available`
      };
    } else if (this.user?.role === 'STORE_MANAGER') {
      // For STORE_MANAGER, show their specific store
      this.storeInfo = {
        storeid: this.user?.storeId || 'Unknown',
        city: 'Store Location',
        state: this.user?.stateAbbr || 'Unknown',
        zipcode: 'N/A',
        latitude: 0,
        longitude: 0,
        storeCount: 1,
        description: '1 available store'
      };
    }
    this.loading = false;
  }

  refreshProfile(): void {
    this.loadProfile();
  }



  toggleSidebar(): void {
    this.sidebar.nativeElement.classList.toggle('collapsed');
  }

  getRoleDisplayName(role: string): string {
    switch (role) {
      case 'HQ_ADMIN':
        return 'Headquarters Administrator';
      case 'STATE_MANAGER':
        return 'State Manager';
      case 'STORE_MANAGER':
        return 'Store Manager';
      default:
        return role;
    }
  }

  getRolePermissions(role: string): RolePermission[] {
    const permissions: RolePermission[] = [
      {
        name: 'Dashboard Access',
        description: 'View revenue and performance dashboards',
        granted: true
      },
      {
        name: 'Customer Analytics',
        description: 'Access customer lifetime value and retention data',
        granted: true
      },

      {
        name: 'Product Analytics',
        description: 'Access product performance data',
        granted: true
      },
      {
        name: 'Store Management',
        description: 'Manage store operations and settings',
        granted: role === 'HQ_ADMIN' || role === 'STATE_MANAGER' || role === 'STORE_MANAGER'
      },
      {
        name: 'Multi-Store Access',
        description: 'View data across multiple stores',
        granted: role === 'HQ_ADMIN' || role === 'STATE_MANAGER'
      },
      {
        name: 'State-Level Analytics',
        description: 'Access state-wide performance data',
        granted: role === 'HQ_ADMIN' || role === 'STATE_MANAGER'
      },
      {
        name: 'All States Access',
        description: 'View data from all states and stores',
        granted: role === 'HQ_ADMIN'
      },
      {
        name: 'User Management',
        description: 'Create and manage user accounts',
        granted: role === 'HQ_ADMIN'
      },
      {
        name: 'System Configuration',
        description: 'Modify system settings and configurations',
        granted: role === 'HQ_ADMIN'
      },
      {
        name: 'Delivery Metrics',
        description: 'Access delivery performance and capacity data',
        granted: true
      },
      {
        name: 'Data Export',
        description: 'Export analytics data to CSV/Excel',
        granted: true
      }
    ];

    return permissions;
  }

  getAnalyticsScope(role: string): string {
    switch (role) {
      case 'HQ_ADMIN':
        return 'Full access to all analytics across all states and stores';
      case 'STATE_MANAGER':
        return 'Analytics access for all stores within your assigned state';
      case 'STORE_MANAGER':
        return 'Analytics access limited to your specific store';
      default:
        return 'Limited access';
    }
  }

  getStoreScope(role: string, storeId: string, stateAbbr: string): string {
    switch (role) {
      case 'HQ_ADMIN':
        return 'All stores across all states';
      case 'STATE_MANAGER':
        return `All stores in ${stateAbbr} state`;
      case 'STORE_MANAGER':
        return `Store ${storeId} only`;
      default:
        return 'No store access';
    }
  }

  getCustomerScope(role: string): string {
    switch (role) {
      case 'HQ_ADMIN':
        return 'All customer data across the entire network';
      case 'STATE_MANAGER':
        return 'Customer data for your state region';
      case 'STORE_MANAGER':
        return 'Customer data for your store only';
      default:
        return 'No customer data access';
    }
  }
}
