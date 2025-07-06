import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark' | 'auto';

export interface ThemeConfig {
  theme: Theme;
  primaryColor: string;
  accentColor: string;
  customColors?: { [key: string]: string };
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private currentThemeSubject = new BehaviorSubject<Theme>('light');
  private isDarkModeSubject = new BehaviorSubject<boolean>(false);

  public currentTheme$ = this.currentThemeSubject.asObservable();
  public isDarkMode$ = this.isDarkModeSubject.asObservable();

  private readonly STORAGE_KEY = 'pizzaWorld_theme';
  private readonly DEFAULT_THEME: Theme = 'light';

  private themeConfig: ThemeConfig = {
    theme: 'light',
    primaryColor: '#ff6b35',
    accentColor: '#f7931e'
  };

  constructor(private rendererFactory: RendererFactory2) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
    this.initializeTheme();
    this.setupSystemThemeListener();
  }

  /**
   * Initialize theme from storage or system preference
   */
  private initializeTheme(): void {
    const savedTheme = this.getSavedTheme();
    const systemPrefersDark = this.getSystemPreference();

    let initialTheme: Theme = savedTheme || this.DEFAULT_THEME;

    // If no saved theme and system prefers dark, use auto
    if (!savedTheme && systemPrefersDark) {
      initialTheme = 'auto';
    }

    this.setTheme(initialTheme, false); // Don't save during initialization
  }

  /**
   * Set the current theme
   */
  setTheme(theme: Theme, save: boolean = true): void {
    this.currentThemeSubject.next(theme);
    this.themeConfig.theme = theme;

    const isDark = this.calculateIsDarkMode(theme);
    this.isDarkModeSubject.next(isDark);

    this.applyTheme(isDark);

    if (save) {
      this.saveTheme(theme);
    }

    console.log(`🎨 Theme changed to: ${theme} (dark: ${isDark})`);
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    const currentTheme = this.currentThemeSubject.value;

    if (currentTheme === 'auto') {
      // If auto, switch to opposite of current system preference
      const systemPrefersDark = this.getSystemPreference();
      this.setTheme(systemPrefersDark ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      this.setTheme(currentTheme === 'light' ? 'dark' : 'light');
    }
  }

  /**
   * Set theme to auto (follow system preference)
   */
  setAutoTheme(): void {
    this.setTheme('auto');
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): Theme {
    return this.currentThemeSubject.value;
  }

  /**
   * Check if currently in dark mode
   */
  isDarkMode(): boolean {
    return this.isDarkModeSubject.value;
  }

  /**
   * Update theme colors
   */
  updateColors(colors: Partial<ThemeConfig>): void {
    this.themeConfig = { ...this.themeConfig, ...colors };
    this.applyCustomColors();
  }

  /**
   * Get theme configuration
   */
  getThemeConfig(): ThemeConfig {
    return { ...this.themeConfig };
  }

  // Private methods

  private calculateIsDarkMode(theme: Theme): boolean {
    switch (theme) {
      case 'dark':
        return true;
      case 'light':
        return false;
      case 'auto':
        return this.getSystemPreference();
      default:
        return false;
    }
  }

    private applyTheme(isDark: boolean): void {
    const html = document.documentElement;
    const body = document.body;

    if (isDark) {
      // TailwindCSS dark mode approach - add 'dark' class to html element
      this.renderer.addClass(html, 'dark');
      this.renderer.addClass(body, 'dark-theme');
      this.renderer.removeClass(body, 'light-theme');
      this.renderer.setAttribute(body, 'data-theme', 'dark');
    } else {
      // Remove dark class for light mode
      this.renderer.removeClass(html, 'dark');
      this.renderer.addClass(body, 'light-theme');
      this.renderer.removeClass(body, 'dark-theme');
      this.renderer.setAttribute(body, 'data-theme', 'light');
    }

    this.applyCustomColors();
    this.updateMetaThemeColor(isDark);
  }

  private applyCustomColors(): void {
    const root = document.documentElement;

    // Apply primary and accent colors
    this.renderer.setStyle(root, '--primary-color', this.themeConfig.primaryColor);
    this.renderer.setStyle(root, '--accent-color', this.themeConfig.accentColor);

    // Apply custom colors if any
    if (this.themeConfig.customColors) {
      Object.entries(this.themeConfig.customColors).forEach(([key, value]) => {
        this.renderer.setStyle(root, `--${key}`, value);
      });
    }
  }

  private updateMetaThemeColor(isDark: boolean): void {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const color = isDark ? '#1a1a1a' : this.themeConfig.primaryColor;

    if (metaThemeColor) {
      this.renderer.setAttribute(metaThemeColor, 'content', color);
    } else {
      const meta = this.renderer.createElement('meta');
      this.renderer.setAttribute(meta, 'name', 'theme-color');
      this.renderer.setAttribute(meta, 'content', color);
      this.renderer.appendChild(document.head, meta);
    }
  }

  private getSystemPreference(): boolean {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private setupSystemThemeListener(): void {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      mediaQuery.addEventListener('change', (e) => {
        if (this.currentThemeSubject.value === 'auto') {
          const isDark = e.matches;
          this.isDarkModeSubject.next(isDark);
          this.applyTheme(isDark);
          console.log(`🎨 System theme changed: ${isDark ? 'dark' : 'light'}`);
        }
      });
    }
  }

  private getSavedTheme(): Theme | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved && ['light', 'dark', 'auto'].includes(saved)) {
        return saved as Theme;
      }
    } catch (error) {
      console.warn('Failed to load saved theme:', error);
    }
    return null;
  }

  private saveTheme(theme: Theme): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Failed to save theme:', error);
    }
  }
}
