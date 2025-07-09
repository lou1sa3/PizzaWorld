import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, HostListener, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIService, ChatMessage } from '../../core/ai.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ai-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chatbot.component.html',
  styleUrls: ['./ai-chatbot.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AIChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  // Component state
  isOpen = false;
  isMinimized = false;
  currentMessage = '';
  chatHistory: ChatMessage[] = [];
  isLoading = false;
  error: string | null = null;

  // Subscriptions
  private subscriptions: Subscription[] = [];



  constructor(private aiService: AIService) {}

  ngOnInit(): void {
    // Subscribe to chat history updates
    const historySubscription = this.aiService.chatHistory$.subscribe(
      messages => {
        this.chatHistory = messages;
        // No auto-scrolling - let users control scrolling manually
      }
    );

    this.subscriptions.push(historySubscription);

    // Load existing chat history
    this.loadChatHistory();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  ngAfterViewChecked(): void {
    // No auto-scrolling - let users control scrolling manually
  }

  private loadChatHistory(): void {
    this.chatHistory = this.aiService.getCachedChatHistory();
  }

  /**
   * Extract DOM context from the current page for AI to understand what user is seeing
   */
  private extractDOMContext(): string {
    try {
      const contextInfo: string[] = [];
      
      // Current page title
      const title = document.title;
      if (title) {
        contextInfo.push(`Page Title: ${title}`);
      }

      // Current URL path and page identification
      const currentPath = window.location.pathname;
      contextInfo.push(`Current Page: ${currentPath}`);
      
      // Identify page type for better extraction
      let pageType = 'unknown';
      if (currentPath.includes('/dashboard')) pageType = 'dashboard';
      else if (currentPath.includes('/orders')) pageType = 'orders';
      else if (currentPath.includes('/products')) pageType = 'products';
      else if (currentPath.includes('/stores')) pageType = 'stores';
      else if (currentPath.includes('/customer-analytics')) pageType = 'customer-analytics';
      else if (currentPath.includes('/delivery-metrics')) pageType = 'delivery-metrics';
      else if (currentPath.includes('/profile')) pageType = 'profile';
      else if (currentPath.includes('/contact-support')) pageType = 'contact-support';
      
      contextInfo.push(`Page Type: ${pageType}`);

      // Extract key UI elements with their data
      const extractedElements: string[] = [];

      // ===== COMPREHENSIVE STATS EXTRACTION (PRIORITY) =====
      
      // 1. Quick Stats in Sidebar
      try {
        const quickStatsSection = document.querySelector('h3')?.closest('div');
        if (quickStatsSection) {
          const quickStatsTitle = quickStatsSection.querySelector('h3')?.textContent?.trim();
          if (quickStatsTitle && quickStatsTitle.includes('Quick Stats')) {
            extractedElements.push(`Section: ${quickStatsTitle}`);
            
            const statRows = quickStatsSection.querySelectorAll('div.flex.justify-between');
            statRows.forEach((row) => {
              const label = row.querySelector('span.text-orange-200')?.textContent?.trim();
              const value = row.querySelector('span.text-white')?.textContent?.trim();
              if (label && value && !value.includes('Loading') && !value.includes('Error')) {
                extractedElements.push(`Quick Stat: ${label} = ${value}`);
              }
            });
          }
        }
      } catch (e) {
        console.error('Error extracting quick stats:', e);
      }

      // 2. Dashboard KPI Cards (Main Priority - Target specific structure)
      try {
        const kpiCards = document.querySelectorAll('div.ml-4');
        kpiCards.forEach((kpiCard, index) => {
          if (index < 10) { // Limit to avoid too much data
            const paragraphs = kpiCard.querySelectorAll('p');
            if (paragraphs.length === 2) {
              const label = paragraphs[0]?.textContent?.trim();
              const value = paragraphs[1]?.textContent?.trim();
              
              if (label && value && label.length < 50 && value.length < 30) {
                // Check if this is a KPI (contains numbers, currency, or percentages)
                if (value.includes('$') || value.includes('%') || /\d/.test(value)) {
                  extractedElements.push(`Dashboard KPI: ${label} = ${value}`);
                }
              }
            }
          }
        });
      } catch (e) {
        console.error('Error extracting KPI cards:', e);
      }

      // 3. Alternative KPI Card structure (fallback)
      try {
        const kpiCardsAlt = document.querySelectorAll('div.bg-white.rounded-xl.shadow-lg');
        kpiCardsAlt.forEach((card, index) => {
          if (index < 6) { // Focus on main KPI cards
            const textElements = card.querySelectorAll('p');
            if (textElements.length >= 2) {
              const label = textElements[0]?.textContent?.trim();
              const value = textElements[1]?.textContent?.trim();
              
              if (label && value && label.length < 50 && value.length < 30) {
                if (value.includes('$') || value.includes('%') || /\d{2,}/.test(value)) {
                  extractedElements.push(`KPI Card: ${label} = ${value}`);
                }
              }
            }
          }
        });
      } catch (e) {
        console.error('Error extracting alternative KPI cards:', e);
      }

      // 4. Store Count Extraction (Special handling)
      try {
        // Look for store count in table headers, performance sections, etc.
        const tableText = document.body.textContent || '';
        const storeCountMatch = tableText.match(/(\d+)\s+stores?/i) || 
                              tableText.match(/all\s+(\d+)\s+stores?/i) ||
                              tableText.match(/of\s+(\d+)\s+stores?/i);
        if (storeCountMatch) {
          extractedElements.push(`Store Count: Total Stores = ${storeCountMatch[1]}`);
        }
      } catch (e) {
        console.error('Error extracting store count:', e);
      }

      // 5. Table performance data
      try {
        const performanceText = document.querySelector('h3')?.parentElement?.textContent;
        if (performanceText && performanceText.includes('stores')) {
          const storeMatch = performanceText.match(/(\d+)\s+stores?/i);
          if (storeMatch) {
            extractedElements.push(`Performance Data: Total Stores = ${storeMatch[1]}`);
          }
        }
      } catch (e) {
        console.error('Error extracting performance data:', e);
      }

      // 6. Angular Generated Content Pattern (label + value pairs)
      try {
        const allDivs = document.querySelectorAll('div');
        let angularStatsCount = 0;
        Array.from(allDivs).forEach((div) => {
          if (angularStatsCount >= 15) return; // Reduced limit
          
          // Look for divs with Angular-generated content attributes
          if (div.hasAttribute('_ngcontent-ng-c2430306591') || div.className.includes('ml-4')) {
            const paragraphs = div.querySelectorAll('p');
            if (paragraphs.length === 2) {
              const label = paragraphs[0]?.textContent?.trim();
              const value = paragraphs[1]?.textContent?.trim();
              
              // Check if this looks like a stat (label is descriptive, value has numbers/currency)
              if (label && value && label.length < 50 && value.length < 30) {
                if (value.includes('$') || value.includes('%') || /\d/.test(value)) {
                  extractedElements.push(`Angular Data: ${label} = ${value}`);
                  angularStatsCount++;
                }
              }
            }
          }
        });
      } catch (e) {
        console.error('Error extracting Angular content:', e);
      }

      // 7. Look for ANY label-value pattern with Angular attributes (comprehensive)
      const angularSelectors = [
        '[_ngcontent-ng-c2430306591]',
        '[class*="_ngcontent"]',
        '[_ngcontent-ng-c809035748]',
        '[class*="ngcontent"]'
      ];
      
      angularSelectors.forEach(selector => {
        try {
          const angularElements = document.querySelectorAll(selector);
          let angularPairCount = 0;
          Array.from(angularElements).forEach((element) => {
            if (angularPairCount >= 10) return; // Limit per selector
            
            const parent = element.parentElement;
            if (parent) {
              const children = Array.from(parent.children);
              if (children.length === 2) {
                const first = children[0]?.textContent?.trim();
                const second = children[1]?.textContent?.trim();
                
                if (first && second && first.length < 40 && second.length < 25) {
                  // If second element has numbers/currency, treat as stat
                  if (second.includes('$') || second.includes('%') || /\d{2,}/.test(second)) {
                    extractedElements.push(`Angular Stat: ${first} = ${second}`);
                    angularPairCount++;
                  }
                }
              }
            }
          });
        } catch (e) {
          console.warn(`Error with selector ${selector}:`, e);
        }
      });

      // 8. Brute force search for pattern: text + currency/number
      try {
        const allElements = document.querySelectorAll('*');
        let bruteForceCount = 0;
        Array.from(allElements).forEach((element) => {
          if (bruteForceCount >= 10) return;
          
          const text = element.textContent?.trim();
          if (text && text.length < 30) {
            if (text.match(/^\$[\d,]+\.?\d*$/) || text.match(/^\d{2,}$/)) {
              // Found a number/currency, check if parent has a label
              const parent = element.parentElement;
              if (parent) {
                const siblings = Array.from(parent.children);
                siblings.forEach(sibling => {
                  if (sibling !== element) {
                    const siblingText = sibling.textContent?.trim();
                    if (siblingText && siblingText.length < 50 && siblingText.length > 5) {
                      extractedElements.push(`Found Stat: ${siblingText} = ${text}`);
                      bruteForceCount++;
                    }
                  }
                });
              }
            }
          }
        });
      } catch (e) {
        console.error('Error in brute force extraction:', e);
      }

      // 9. DASHBOARD METRICS EXTRACTION
      try {
        // Look for metric cards/tiles on main dashboard
        const metricCards = document.querySelectorAll('[class*="metric"], [class*="kpi"], [class*="card"]');
        metricCards.forEach((card, index) => {
          if (index < 8) { // Limit to avoid too much data
            const label = card.querySelector('[class*="label"], p, span')?.textContent?.trim();
            const value = card.querySelector('[class*="value"], [class*="amount"], [class*="total"]')?.textContent?.trim();
            if (label && value && label.length < 50 && value.length < 30) {
              extractedElements.push(`Dashboard Metric: ${label} = ${value}`);
            }
          }
        });
      } catch (e) {
        console.error('Error extracting dashboard metrics:', e);
      }

      // 10. FINANCIAL DATA EXTRACTION
      try {
        const currencyElements = document.querySelectorAll('*');
        let currencyCount = 0;
        Array.from(currencyElements).forEach((el) => {
          if (currencyCount >= 10) return; // Limit to avoid performance issues
          const text = el.textContent?.trim();
          if (text && text.match(/\$[\d,]+\.?\d*/)) {
            const parent = el.parentElement;
            const label = parent?.querySelector('p, span, div')?.textContent?.trim();
            if (label && label !== text && label.length < 50) {
              extractedElements.push(`Financial Data: ${label} = ${text}`);
              currencyCount++;
            }
          }
        });
      } catch (e) {
        console.error('Error extracting financial data:', e);
      }

      // 11. HEADINGS AND TITLES
      try {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach((el, index) => {
          if (index < 12) { // Limit to first 12 headings
            const text = el.textContent?.trim();
            if (text && text.length > 0 && text.length < 100 && !text.includes('Quick Stats')) {
              extractedElements.push(`Heading: ${text}`);
            }
          }
        });
      } catch (e) {
        console.error('Error extracting headings:', e);
      }

      // 12. KEY-VALUE PAIRS EXTRACTION
      try {
        // Look for common statistic display patterns
        const statElements = document.querySelectorAll('div');
        let statCount = 0;
        Array.from(statElements).forEach((div) => {
          if (statCount >= 15) return;
          
          // Look for divs with text containing numbers
          const text = div.textContent?.trim();
          if (text && text.length < 100 && (text.includes(':') || text.match(/\d+/))) {
            const children = div.children;
            if (children.length === 2) {
              const label = children[0]?.textContent?.trim();
              const value = children[1]?.textContent?.trim();
              if (label && value && label.length < 40 && value.length < 30) {
                extractedElements.push(`Stat: ${label} = ${value}`);
                statCount++;
              }
            }
          }
        });
      } catch (e) {
        console.error('Error extracting key-value pairs:', e);
      }

      // 13. PIZZA WORLD SPECIFIC DATA
      try {
        const pizzaElements = document.querySelectorAll('[class*="pizza"], [class*="order"], [class*="store"], [class*="customer"]');
        pizzaElements.forEach((el, index) => {
          if (index < 12) { // Limit to first 12 pizza-related elements
            const text = el.textContent?.trim();
            if (text && text.length > 0 && text.length < 80) {
              extractedElements.push(`Pizza World Data: ${text}`);
            }
          }
        });
      } catch (e) {
        console.error('Error extracting Pizza World data:', e);
      }

      // 14. COMPREHENSIVE CHARTS AND VISUALIZATIONS EXTRACTION
      try {
        const chartSelectors = [
          '[class*="chart"]', '[class*="graph"]', '[class*="apexchart"]', 
          'canvas', 'svg', '[class*="visualization"]', '[class*="plot"]',
          '[class*="analytics"]', '.chart-container', '.graph-container',
          '[data-chart]', '[data-graph]', '[id*="chart"]', '[id*="graph"]'
        ];
        
        const charts = document.querySelectorAll(chartSelectors.join(', '));
        charts.forEach((el, index) => {
          if (index < 8) { // Increased limit for charts
            // Try multiple ways to get chart title/description
            const title = el.getAttribute('title') || 
                         el.getAttribute('aria-label') ||
                         el.querySelector('[class*="title"], .chart-title, .graph-title')?.textContent?.trim() ||
                         el.closest('[class*="card"], .card, .panel')?.querySelector('h1, h2, h3, h4, h5, h6')?.textContent?.trim() ||
                         el.previousElementSibling?.textContent?.trim() ||
                         el.parentElement?.querySelector('h1, h2, h3, h4, h5, h6')?.textContent?.trim();
            
            if (title && title.length < 100) {
              extractedElements.push(`Chart: ${title}`);
            } else {
              extractedElements.push(`Chart ${index + 1}: Visualization detected`);
            }
            
            // Try to extract chart data from nearby elements
            const chartContainer = el.closest('div, section, article');
            if (chartContainer) {
              const dataElements = chartContainer.querySelectorAll('[class*="data"], [class*="value"], [class*="metric"], [class*="stat"]');
              dataElements.forEach((dataEl, dataIndex) => {
                if (dataIndex < 5) {
                  const dataText = dataEl.textContent?.trim();
                  if (dataText && dataText.length > 0 && dataText.length < 80 && 
                      (dataText.includes('$') || dataText.includes('%') || /\d/.test(dataText))) {
                    extractedElements.push(`Chart ${index + 1} Data: ${dataText}`);
                  }
                }
              });
            }
            
            // Extract SVG text elements if it's an SVG chart
            if (el.tagName.toLowerCase() === 'svg') {
              const textElements = el.querySelectorAll('text, tspan');
              textElements.forEach((textEl, textIndex) => {
                if (textIndex < 10) {
                  const text = textEl.textContent?.trim();
                  if (text && text.length > 0 && text.length < 50 && 
                      (text.includes('$') || text.includes('%') || /\d/.test(text))) {
                    extractedElements.push(`Chart ${index + 1} Label: ${text}`);
                  }
                }
              });
            }
          }
        });
      } catch (e) {
        console.error('Error extracting charts:', e);
      }

      // 14b. CHART LEGENDS AND AXIS LABELS
      try {
        const chartLegends = document.querySelectorAll('[class*="legend"], [class*="axis"], [class*="label"]');
        let legendCount = 0;
        chartLegends.forEach((legend) => {
          if (legendCount >= 10) return;
          
          const text = legend.textContent?.trim();
          if (text && text.length > 2 && text.length < 80 && 
              (text.includes('$') || text.includes('%') || text.match(/\b\d+\b/) || 
               text.includes('Pizza') || text.includes('Product') || text.includes('Revenue'))) {
            extractedElements.push(`Chart Legend/Label: ${text}`);
            legendCount++;
          }
        });
      } catch (e) {
        console.error('Error extracting chart legends:', e);
      }

      // 15. BUTTONS AND ACTIONS
      try {
        const buttons = document.querySelectorAll('button, [role="button"], a[class*="btn"]');
        buttons.forEach((el, index) => {
          if (index < 8) { // Limit to first 8 buttons
            const text = el.textContent?.trim() || el.getAttribute('aria-label') || el.getAttribute('title');
            if (text && text.length > 0 && text.length < 40) {
              extractedElements.push(`Action: ${text}`);
            }
          }
        });
      } catch (e) {
        console.error('Error extracting buttons:', e);
      }

      // 16. COMPREHENSIVE TABLE EXTRACTION (All pages - Products, Orders, Stores)
      try {
        const allTables = document.querySelectorAll('table, [role="table"], .table, [class*="table"]');
        allTables.forEach((table, tableIndex) => {
          if (tableIndex < 5) { // Increased limit for tables
            
            // Extract all possible header patterns
            const headers = table.querySelectorAll('th, [role="columnheader"], .header, .table-header, thead td');
            if (headers.length > 0) {
              const headerTexts = Array.from(headers).map(th => th.textContent?.trim()).filter(text => text);
              if (headerTexts.length > 0) {
                extractedElements.push(`Table ${tableIndex + 1} Headers: ${headerTexts.join(', ')}`);
              }
            }

            // Extract ALL rows including header rows
            const allRows = table.querySelectorAll('tr, [role="row"], .table-row, .row');
            Array.from(allRows).slice(0, 12).forEach((row, rowIndex) => {
              const cells = row.querySelectorAll('td, th, [role="cell"], [role="columnheader"], .cell, .table-cell');
              if (cells.length > 0) {
                const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim()).filter(text => text && text.length < 150);
                if (cellTexts.length > 0) {
                  const rowText = cellTexts.join(' ');
                  
                  // Enhanced product detection
                  if (rowText.includes('PZ') || rowText.includes('Pizza') || 
                      (rowText.includes('$') && (rowText.includes('Small') || rowText.includes('Medium') || rowText.includes('Large')))) {
                    extractedElements.push(`Product: ${cellTexts.slice(0, 8).join(' | ')}`);
                  } else if (cellTexts.length >= 3) {
                    extractedElements.push(`Table ${tableIndex + 1} Row ${rowIndex + 1}: ${cellTexts.slice(0, 6).join(' | ')}`);
                  }
                }
              }
            });

            // Check for table summary info
            const tableContainer = table.closest('div');
            if (tableContainer) {
              const summary = tableContainer.querySelector('.summary, .total, .count, [class*="summary"]')?.textContent?.trim();
              if (summary) {
                extractedElements.push(`Table ${tableIndex + 1} Summary: ${summary}`);
              }
            }
          }
        });
      } catch (e) {
        console.error('Error extracting tables:', e);
      }

      // 16b. AGGRESSIVE PRODUCT DATA EXTRACTION
      try {
        // Look for any element containing product-like data
        const productElements = document.querySelectorAll('*');
        let productCount = 0;
        productElements.forEach((element) => {
          if (productCount >= 20) return;
          
          const text = element.textContent?.trim();
          if (text && text.length > 5 && text.length < 200) {
            // Enhanced product patterns
            if (text.match(/PZ\d+/) || 
                (text.includes('Pizza') && text.includes('$')) ||
                (text.includes('$') && text.match(/\b(Small|Medium|Large|Extra Large)\b/)) ||
                text.match(/SKU.*PZ/) ||
                text.match(/\$\d+.*Pizza/)) {
              
              // Avoid duplicates by checking if similar text already extracted
              const isDuplicate = extractedElements.some(existing => 
                existing.includes(text.substring(0, Math.min(20, text.length))));
              
              if (!isDuplicate) {
                extractedElements.push(`Product Info: ${text}`);
                productCount++;
              }
            }
          }
        });
      } catch (e) {
        console.error('Error extracting product data:', e);
      }

      // 16c. ANGULAR TABLE EXTRACTION (for _ngcontent tables)
      try {
        const angularTables = document.querySelectorAll('table[_ngcontent-ng-c1782863586], table');
        angularTables.forEach((table, tableIndex) => {
          if (tableIndex < 2) {
            // Extract Angular table headers
            const headerCells = table.querySelectorAll('th[_ngcontent-ng-c1782863586], th');
            if (headerCells.length > 0) {
              const headers = Array.from(headerCells).map(th => th.textContent?.trim()).filter(h => h);
              if (headers.length > 0) {
                extractedElements.push(`Store Table Headers: ${headers.join(', ')}`);
              }
            }

            // Extract Angular table rows with specific data patterns
            const dataRows = table.querySelectorAll('tbody tr[_ngcontent-ng-c1782863586], tbody tr');
            Array.from(dataRows).slice(0, 10).forEach((row, rowIndex) => {
              const cells = row.querySelectorAll('td[_ngcontent-ng-c1782863586], td');
              if (cells.length >= 6) {
                const cellData = Array.from(cells).map(cell => {
                  // Look for nested data in Angular structure
                  const mainText = cell.querySelector('.text-sm.font-medium')?.textContent?.trim() ||
                                 cell.querySelector('.text-sm')?.textContent?.trim() ||
                                 cell.textContent?.trim();
                  return mainText;
                }).filter(text => text && text.length < 100);

                if (cellData.length >= 4) {
                  extractedElements.push(`Store ${rowIndex + 1}: ${cellData.slice(0, 7).join(' | ')}`);
                }
              }
            });
          }
        });
      } catch (e) {
        console.error('Error extracting Angular tables:', e);
      }

      // 16d. STORE PERFORMANCE DATA EXTRACTION
      try {
        const performanceBadges = document.querySelectorAll('.bg-green-100, .bg-blue-100, .bg-yellow-100, .bg-red-100');
        performanceBadges.forEach((badge, index) => {
          if (index < 15) {
            const text = badge.textContent?.trim();
            if (text && (text.includes('Excellent') || text.includes('Good') || text.includes('Average') || text.includes('Needs Attention'))) {
              extractedElements.push(`Performance Rating: ${text}`);
            }
          }
        });
      } catch (e) {
        console.error('Error extracting performance badges:', e);
      }

      // 16e. TABLE CONTENT BRUTE FORCE
      try {
        // Extract visible text from any table-like structure
        const tableContainers = document.querySelectorAll('table, .table, [class*="table"], [class*="grid"], .data-table');
        tableContainers.forEach((container, index) => {
          if (index < 3) {
            const allText = container.textContent?.trim();
            if (allText && allText.length > 50) {
              // Split by common separators and look for structured data
              const lines = allText.split(/\n|\t/).filter(line => line.trim().length > 0);
              lines.slice(0, 15).forEach((line, lineIndex) => {
                const cleanLine = line.trim();
                if (cleanLine.length > 10 && cleanLine.length < 150 && 
                    (cleanLine.includes('PZ') || cleanLine.includes('$') || cleanLine.includes('Pizza') ||
                     cleanLine.includes('Store') || cleanLine.includes('Revenue') || /S\d{6}/.test(cleanLine))) {
                  extractedElements.push(`Table Content ${index + 1}.${lineIndex + 1}: ${cleanLine}`);
                }
              });
            }
          }
        });
      } catch (e) {
        console.error('Error extracting table content:', e);
      }

      // 17. FORMS AND INPUTS (Profile, Contact Support pages)
      try {
        const forms = document.querySelectorAll('form');
        forms.forEach((form, formIndex) => {
          if (formIndex < 2) { // Limit to first 2 forms
            
            // Extract form labels and their associated values/placeholders
            const formElements = form.querySelectorAll('input, textarea, select');
            Array.from(formElements).slice(0, 10).forEach((element) => {
              const label = form.querySelector(`label[for="${element.id}"]`)?.textContent?.trim() ||
                           element.getAttribute('placeholder') ||
                           element.getAttribute('aria-label');
              
              if (label) {
                let value = 'empty';
                
                try {
                  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    value = (element as HTMLInputElement | HTMLTextAreaElement).value || 'empty';
                  } else if (element.tagName === 'SELECT') {
                    const selectEl = element as HTMLSelectElement;
                    if (selectEl.selectedOptions && selectEl.selectedOptions.length > 0) {
                      value = selectEl.selectedOptions[0]?.textContent?.trim() || 'empty';
                    }
                  }
                } catch (e) {
                  console.warn('Error extracting form element value:', e);
                }
                
                if (label.length < 50) {
                  extractedElements.push(`Form ${formIndex + 1} Field: ${label} = ${value}`);
                }
              }
            });
          }
        });
      } catch (e) {
        console.error('Error extracting forms:', e);
      }

      // 18. CARDS AND GRID ITEMS (Products, Stores pages)
      try {
        const cards = document.querySelectorAll('[class*="card"], [class*="grid-item"], [class*="item"]');
        let cardCount = 0;
        cards.forEach((card) => {
          if (cardCount >= 10) return; // Limit to 10 cards
          
          // Look for card title and content
          const title = card.querySelector('h1, h2, h3, h4, h5, h6')?.textContent?.trim();
          const content = card.querySelectorAll('p, span');
          
          if (title && title.length < 60) {
            extractedElements.push(`Card: ${title}`);
            cardCount++;
            
            // Extract key details from card
            Array.from(content).slice(0, 3).forEach(element => {
              const text = element.textContent?.trim();
              if (text && text.length > 5 && text.length < 100 && 
                  (text.includes('$') || text.includes('%') || /\d/.test(text))) {
                extractedElements.push(`Card Detail: ${text}`);
              }
            });
          }
        });
      } catch (e) {
        console.error('Error extracting cards:', e);
      }

      // 19. FILTERS AND CONTROLS (All pages)
      try {
        const filters = document.querySelectorAll('select, input[type="search"], input[type="text"]');
        let filterCount = 0;
        filters.forEach((filter) => {
          if (filterCount >= 8) return; // Limit to 8 filters
          
          const label = document.querySelector(`label[for="${filter.id}"]`)?.textContent?.trim() ||
                       filter.getAttribute('placeholder') ||
                       filter.getAttribute('aria-label') ||
                       filter.closest('div')?.querySelector('label')?.textContent?.trim();
          
          if (label && label.length < 50) {
            let value = 'not set';
            
            try {
              if (filter.tagName === 'INPUT') {
                value = (filter as HTMLInputElement).value || 'not set';
              } else if (filter.tagName === 'SELECT') {
                const selectEl = filter as HTMLSelectElement;
                if (selectEl.selectedOptions && selectEl.selectedOptions.length > 0) {
                  value = selectEl.selectedOptions[0]?.textContent?.trim() || 'not set';
                }
              }
            } catch (e) {
              console.warn('Error extracting filter value:', e);
            }
            
            extractedElements.push(`Filter: ${label} = ${value}`);
            filterCount++;
          }
        });
      } catch (e) {
        console.error('Error extracting filters:', e);
      }

      // 20. STATUS INDICATORS AND BADGES
      try {
        const statusElements = document.querySelectorAll('[class*="status"], [class*="badge"], [class*="tag"], [class*="indicator"]');
        let statusCount = 0;
        statusElements.forEach((element) => {
          if (statusCount >= 8) return;
          
          const text = element.textContent?.trim();
          if (text && text.length > 0 && text.length < 50) {
            extractedElements.push(`Status: ${text}`);
            statusCount++;
          }
        });
      } catch (e) {
        console.error('Error extracting status indicators:', e);
      }

      // 21. BREADCRUMBS AND NAVIGATION CONTEXT
      try {
        const breadcrumbs = document.querySelectorAll('[class*="breadcrumb"], nav[aria-label*="breadcrumb"]');
        breadcrumbs.forEach((breadcrumb) => {
          const items = breadcrumb.querySelectorAll('a, span');
          if (items.length > 0) {
            const breadcrumbText = Array.from(items).map(item => item.textContent?.trim()).filter(text => text).join(' > ');
            if (breadcrumbText.length < 100) {
              extractedElements.push(`Navigation: ${breadcrumbText}`);
            }
          }
        });
      } catch (e) {
        console.error('Error extracting breadcrumbs:', e);
      }

      // 22. PAGE-SPECIFIC METRICS AND SUMMARIES
      try {
        const metricSummaries = document.querySelectorAll('[class*="summary"], [class*="overview"], [class*="total"]');
        let summaryCount = 0;
        metricSummaries.forEach((summary) => {
          if (summaryCount >= 6) return;
          
          const title = summary.querySelector('h1, h2, h3, h4, h5, h6')?.textContent?.trim();
          const value = summary.querySelector('[class*="value"], [class*="amount"], [class*="count"]')?.textContent?.trim();
          
          if (title && value && title.length < 50 && value.length < 30) {
            extractedElements.push(`Summary: ${title} = ${value}`);
            summaryCount++;
          }
        });
      } catch (e) {
        console.error('Error extracting page summaries:', e);
      }

      // 23. SEARCH RESULTS AND LIST ITEMS
      try {
        const listItems = document.querySelectorAll('li, [class*="item"], [class*="result"]');
        let listCount = 0;
        listItems.forEach((item) => {
          if (listCount >= 8) return;
          
          const text = item.textContent?.trim();
          // Only include items that look like data (not navigation)
          if (text && text.length > 10 && text.length < 100 && 
              (text.includes(':') || text.includes('$') || text.includes('%') || /\d{2,}/.test(text))) {
            extractedElements.push(`List Item: ${text}`);
            listCount++;
          }
        });
      } catch (e) {
        console.error('Error extracting list items:', e);
      }

      // 24. ERROR MESSAGES AND NOTIFICATIONS
      try {
        const messages = document.querySelectorAll('[class*="error"], [class*="warning"], [class*="success"], [class*="info"], [class*="alert"], [class*="notification"]');
        let messageCount = 0;
        messages.forEach((message) => {
          if (messageCount >= 5) return;
          
          const text = message.textContent?.trim();
          if (text && text.length > 5 && text.length < 150) {
            extractedElements.push(`Message: ${text}`);
            messageCount++;
          }
        });
      } catch (e) {
        console.error('Error extracting messages:', e);
      }

      // 25. LOADING STATES AND EMPTY STATES
      try {
        const loadingElements = document.querySelectorAll('[class*="loading"], [class*="empty"], [class*="no-data"]');
        loadingElements.forEach((element) => {
          const text = element.textContent?.trim();
          if (text && text.length > 5 && text.length < 100) {
            extractedElements.push(`State: ${text}`);
          }
        });
      } catch (e) {
        console.error('Error extracting loading states:', e);
      }

      // 26. BRUTE FORCE TEXT EXTRACTION FOR PRODUCTS PAGE
      if (pageType === 'products') {
        try {
          // Get all visible text on products page
          const allVisibleElements = document.querySelectorAll('*:not(script):not(style):not(meta):not(link)');
          let bruteForceCount = 0;
          
          allVisibleElements.forEach((element) => {
            if (bruteForceCount >= 30) return;
            
            const text = element.textContent?.trim();
            const elementText = (element as HTMLElement).innerText?.trim();
            
            // Use innerText for better visibility detection
            const finalText = elementText || text;
            
            if (finalText && finalText.length > 8 && finalText.length < 300) {
              // Look for product catalog patterns
              if (finalText.match(/Complete product inventory.*\d+.*products/) ||
                  finalText.includes('Product Catalogue') ||
                  finalText.includes('Export Catalogue') ||
                  finalText.match(/PZ\d{3}/) ||
                  (finalText.includes('Pizza') && finalText.includes('$') && finalText.length < 100) ||
                  finalText.match(/\$\d+.*\d+\/\d+\/\d+/) ||
                  finalText.match(/(Small|Medium|Large|Extra Large).*\$\d+/) ||
                  finalText.includes('Launch Date') ||
                  finalText.includes('Actions') ||
                  finalText.includes('Sort by')) {
                
                // Avoid duplicates
                const isDuplicate = extractedElements.some(existing => 
                  existing.includes(finalText.substring(0, Math.min(15, finalText.length))));
                
                if (!isDuplicate) {
                  extractedElements.push(`Products Page Content: ${finalText}`);
                  bruteForceCount++;
                }
              }
            }
          });
        } catch (e) {
          console.error('Error in products page extraction:', e);
        }
      }

      // 27. PAGE SUMMARY EXTRACTION
      try {
        // Look for page summary info like "Complete product inventory • 36 products"
        const summaryElements = document.querySelectorAll('.summary, .info, .description, [class*="summary"], [class*="info"], [class*="description"]');
        summaryElements.forEach((element, index) => {
          if (index < 5) {
            const text = element.textContent?.trim();
            if (text && text.length > 10 && text.length < 200) {
              extractedElements.push(`Page Summary: ${text}`);
            }
          }
        });
      } catch (e) {
        console.error('Error extracting page summaries:', e);
      }

      // 28. AGGRESSIVE DOM TEXT MINING
      try {
        // Last resort: extract any text that looks like data
        if (extractedElements.length < 10) {
          const allTextNodes = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: (node) => {
                const text = node.textContent?.trim();
                if (text && text.length > 5 && text.length < 150 && 
                    (text.includes('PZ') || text.includes('$') || text.includes('Pizza') ||
                     text.includes('SKU') || text.includes('product') || text.includes('catalogue'))) {
                  return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_REJECT;
              }
            }
          );

          let textNode;
          let textNodeCount = 0;
          while ((textNode = allTextNodes.nextNode()) && textNodeCount < 15) {
            const text = textNode.textContent?.trim();
            if (text) {
              extractedElements.push(`Text Content: ${text}`);
              textNodeCount++;
            }
          }
        }
      } catch (e) {
        console.error('Error in aggressive text mining:', e);
      }

      // Add extracted elements to context
      if (extractedElements.length > 0) {
        contextInfo.push('Visible UI Elements:');
        contextInfo.push(...extractedElements);
        
        // Debug logging to see what we're extracting
        console.log('DOM Context Extracted:', extractedElements);
      } else {
        contextInfo.push('No specific UI elements extracted');
        console.warn('No DOM elements were extracted');
      }

      const finalContext = contextInfo.join('\n');
      console.log('Final DOM Context sent to AI:', finalContext);
      return finalContext;
    } catch (error) {
      console.error('Fatal error in extractDOMContext:', error);
      // Return a minimal context instead of throwing
      return `Current Page: ${window.location.pathname}\nError extracting UI context: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  toggleChatbot(): void {
    this.isOpen = !this.isOpen;
    this.isMinimized = false;
    this.error = null;

    if (this.isOpen) {
      // Focus on input when opened
      setTimeout(() => {
        if (this.messageInput) {
          this.messageInput.nativeElement.focus();
        }
      }, 100);
    }
  }

  minimizeChatbot(): void {
    this.isMinimized = true;
  }

  maximizeChatbot(): void {
    this.isMinimized = false;
    setTimeout(() => {
      if (this.messageInput) {
        this.messageInput.nativeElement.focus();
      }
    }, 100);
  }

  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isLoading) {
      return;
    }

    const message = this.currentMessage.trim();
    this.currentMessage = '';
    this.error = null;
    this.isLoading = true;

    // Capture current DOM context
    const domContext = this.extractDOMContext();

    // Add user message locally for instant feedback
    const userMsg: ChatMessage = {
      id: 'u_' + Date.now(),
      message,
      messageType: 'user',
      timestamp: new Date().toISOString()
    };
    this.chatHistory = [...this.chatHistory, userMsg];

    // Placeholder assistant message we will fill incrementally
    const assistantMsg: ChatMessage = {
      id: 'a_' + Date.now(),
      message: '',
      messageType: 'assistant',
      timestamp: new Date().toISOString()
    };
    this.chatHistory = [...this.chatHistory, assistantMsg];

    // Stream tokens with DOM context
    this.aiService.sendMessageStream(message, domContext).subscribe({
      next: (token) => {
        assistantMsg.message += (assistantMsg.message ? ' ' : '') + token;
      },
      error: (err) => {
        assistantMsg.message = '[Error] ' + (err.message || 'stream failed');
        this.error = err.message || 'Failed to stream response.';
        this.isLoading = false;
      },
      complete: () => {
        // trigger change detection by replacing array
        this.chatHistory = [...this.chatHistory];
        this.isLoading = false;
      }
    });
  }



  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.aiService.clearChatSession();
    this.chatHistory = [];
    this.error = null;
  }

  // All auto-scrolling methods removed - users control scrolling manually

  formatMessage(message: string): string {
    return this.aiService.formatMessage(message);
  }

  getMessageTime(timestamp: string | undefined): string {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  isUserMessage(message: ChatMessage): boolean {
    return message.messageType === 'user';
  }

  isAssistantMessage(message: ChatMessage): boolean {
    return message.messageType === 'assistant' || message.messageType === 'system';
  }

  getMessageCategoryIcon(category: string | undefined): string {
    switch (category?.toLowerCase()) {
      case 'support': return '🔧';
      case 'analytics': return '📊';
      case 'general': return '💬';
      default: return '💬';
    }
  }

  retryLastMessage(): void {
    if (this.chatHistory.length > 0) {
      const lastUserMessage = [...this.chatHistory]
        .reverse()
        .find(msg => msg.messageType === 'user');

      if (lastUserMessage) {
        this.currentMessage = lastUserMessage.message;
        this.sendMessage();
      }
    }
  }

  // Accessibility helpers
  getAriaLabel(): string {
    return this.isOpen ? 'Close AI Assistant' : 'Open AI Assistant';
  }

  getChatbotStatusText(): string {
    if (this.isLoading) return 'AI Assistant is typing...';
    if (this.error) return 'AI Assistant encountered an error';
    return 'AI Assistant is ready to help';
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id || index.toString();
  }



  /**
   * Check AI status
   */
  checkAIStatus(): void {
    this.aiService.getAIStatus().subscribe({
      next: (status) => {
        const statusText = `🔧 AI Status:\n` +
          `• OpenRouter (DeepSeek R1) Available: ${status.openrouter_available ? 'Yes' : 'No'}\n` +
          `• Model: ${status.openrouter_config?.model || 'Not configured'}\n` +
          `• API Key: ${status.openrouter_config?.apiKeyConfigured ? 'Configured' : 'Missing'}\n` +
          `• Google AI Available: ${status.gemma_available ? 'Yes' : 'No'}\n` +
          `• Fallback Enabled: ${status.fallback_enabled ? 'Yes' : 'No'}`;

        const statusMessage: ChatMessage = {
          message: statusText,
          messageType: 'system',
          timestamp: new Date().toISOString(),
          category: 'status'
        };

        this.chatHistory = [...this.chatHistory, statusMessage];
        // No auto-scrolling - let users control scrolling manually
      },
      error: (error) => {
        this.error = error.message;
      }
    });
  }

  @HostListener('window:openChatbot', ['$event'])
  onOpenChatbot(event: Event): void {
    this.isOpen = true;
    this.isMinimized = false;
    setTimeout(() => {
      if (this.messageInput) {
        this.messageInput.nativeElement.focus();
      }
    }, 100);
  }
}
