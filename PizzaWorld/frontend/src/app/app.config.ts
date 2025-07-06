import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter }       from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgApexchartsModule }  from 'ng-apexcharts';   // 👈 NEW
import { TokenInterceptor } from './core/token-interceptor';
import { APP_INITIALIZER } from '@angular/core';
import { PreloadService } from './core/preload.service';

import { routes } from './app.routes';

export function preloadFactory(preload: PreloadService) {
  return () => preload.preloadAll();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

    importProvidersFrom(
      HttpClientModule,    // ← keep any modules you already had
      NgApexchartsModule   
    ),
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true },
    PreloadService,
    { provide: APP_INITIALIZER, useFactory: preloadFactory, deps: [PreloadService], multi: true }
  ]
};
