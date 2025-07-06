import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth.guard';


export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent)
  },

  {
    path: 'contact-support',
    loadComponent: () =>
      import('./pages/contact-support/contact-support.component').then(
        (m) => m.ContactSupportComponent
      )
  },

  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      )
  },

    {
    path: 'products',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/products/products.component').then(
        (m) => m.ProductsComponent
      )
  },

  {
  path: 'stores',
  canActivate: [AuthGuard],
  loadComponent: () =>
    import('./pages/stores/stores.component').then(
      (m) => m.StoresComponent
    )
},
{
  path: 'stores/:id',
  canActivate: [AuthGuard],
  loadComponent: () =>
    import('./pages/stores/store-details/store-details.component').then(
      (m) => m.StoreDetailsComponent
    )
},

{
  path: 'orders',
  canActivate: [AuthGuard],
  loadComponent: () =>
    import('./pages/orders/orders.component').then(
      (m) => m.OrdersComponent
    )
},

{
  path: 'customer-analytics',
  canActivate: [AuthGuard],
  loadComponent: () =>
    import('./pages/customer-analytics/customer-analytics.component').then(
      (m) => m.CustomerAnalyticsComponent
    )
},

{
  path: 'delivery-metrics',
  canActivate: [AuthGuard],
  loadComponent: () =>
    import('./pages/delivery-metrics/delivery-metrics.component').then(
      (m) => m.DeliveryMetricsComponent
    )
},

  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/profile/profile.component').then((m) => m.ProfileComponent)
  },

  {
    path: 'products/details/:sku',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/products/product-details.component').then(
        (m) => m.ProductDetailsComponent
      )
  },

  { path: '**', redirectTo: 'login' }
];
