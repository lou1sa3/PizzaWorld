import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// Interfaces
export interface ChatMessage {
  id?: string;
  sessionId?: string;
  userId?: string;
  userRole?: string;
  message: string;
  response?: string;
  messageType: 'user' | 'assistant' | 'system';
  timestamp?: string;
  isResolved?: boolean;
  category?: string;
  priority?: string;
}

export interface AIInsight {
  id?: string;
  type: string;
  title: string;
  description: string;
  recommendation?: string;
  confidence?: number;
  category?: string;
  targetEntity?: string;
  targetEntityId?: string;
  createdAt?: string;
  createdBy?: string;
  isActionable?: boolean;
  priority?: string;
}

export interface ChatResponse {
  sessionId: string;
  message: ChatMessage;
  success: boolean;
  error?: string;
}

export interface InsightsResponse {
  insights: AIInsight[];
  success: boolean;
  userRole: string;
  error?: string;
}

export interface AnalysisResponse {
  type: string;
  answer: string;
  query: string;
  success: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private readonly baseUrl = '/api/ai';

  // Chat state management
  private currentSessionId: string | null = null;
  private chatHistorySubject = new BehaviorSubject<ChatMessage[]>([]);
  public chatHistory$ = this.chatHistorySubject.asObservable();

  // Insights state management
  private insightsSubject = new BehaviorSubject<AIInsight[]>([]);
  public insights$ = this.insightsSubject.asObservable();

  // Loading states
  private insightsLoadingSubject = new BehaviorSubject<boolean>(false);
  public insightsLoading$ = this.insightsLoadingSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeSession();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private initializeSession(): void {
    // Generate a new session ID for this browser session
    this.currentSessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Send a chat message to the AI assistant
   * The AI has access to frontend elements and can reference current UI state
   */
  sendMessage(message: string, context?: string): Observable<ChatMessage> {
    const request = {
      sessionId: this.currentSessionId,
      message: message,
      context: context
    };

    return this.http.post<ChatResponse>(`${this.baseUrl}/chat`, request, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success) {
          this.currentSessionId = response.sessionId;
          this.updateChatHistory();
          return response.message;
        } else {
          throw new Error(response.error || 'Failed to send message');
        }
      }),
      catchError(error => {
        console.error('Error sending chat message:', error);
        return throwError(() => new Error('Failed to send message. Please try again.'));
      })
    );
  }

  /**
   * Send a chat message and receive streaming tokens via text/event-stream.
   * The AI has access to frontend elements and can reference current UI state
   */
  sendMessageStream(message: string, context?: string): Observable<string> {
    const token = localStorage.getItem('authToken');

    const requestBody = {
      sessionId: this.currentSessionId,
      message,
      context: context || ''
    };

    const headers: any = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = `${this.baseUrl}/chat/stream`;

    return new Observable<string>((observer) => {
      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      }).then(response => {
        if (!response.ok || !response.body) {
          observer.error(new Error('Streaming request failed'));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        const read = () => {
          reader.read().then(({ value, done }) => {
            if (done) {
              observer.complete();
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            lines.forEach((line) => {
              line = line.trim();
              if (!line || !line.startsWith('data:')) return;
              const data = line.slice(5).trim();
              if (data === '[DONE]') {
                observer.complete();
              } else {
                observer.next(data);
              }
            });

            read();
          }).catch(err => { observer.error(err); });
        };

        read();
      }).catch(err => { observer.error(err); });
    });
  }

  /**
   * Get chat history for current session
   */
  getChatHistory(): Observable<ChatMessage[]> {
    if (!this.currentSessionId) {
      return new Observable(observer => observer.next([]));
    }

    return this.http.get<any>(`${this.baseUrl}/chat/history/${this.currentSessionId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success) {
          return response.messages || [];
        } else {
          throw new Error(response.error || 'Failed to get chat history');
        }
      }),
      catchError(error => {
        console.error('Error getting chat history:', error);
        return throwError(() => new Error('Failed to load chat history.'));
      })
    );
  }

  /**
   * Update local chat history
   */
  private updateChatHistory(): void {
    this.getChatHistory().subscribe({
      next: (messages) => {
        this.chatHistorySubject.next(messages);
      },
      error: (error) => {
        console.error('Error updating chat history:', error);
      }
    });
  }

  /**
   * Get AI-generated business insights
   */
  getInsights(): Observable<AIInsight[]> {
    this.insightsLoadingSubject.next(true);

    return this.http.get<InsightsResponse>(`${this.baseUrl}/insights`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success) {
          this.insightsSubject.next(response.insights);
          return response.insights;
        } else {
          throw new Error(response.error || 'Failed to get insights');
        }
      }),
      catchError(error => {
        console.error('Error getting insights:', error);
        return throwError(() => new Error('Failed to load insights. Please try again.'));
      }),
      // Always stop loading
      map(result => {
        this.insightsLoadingSubject.next(false);
        return result;
      }),
      catchError(error => {
        this.insightsLoadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Analyze a natural language query
   */
  analyzeQuery(query: string, context?: string, type?: string): Observable<AnalysisResponse> {
    const request = {
      query: query,
      context: context,
      type: type
    };

    return this.http.post<AnalysisResponse>(`${this.baseUrl}/analyze`, request, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success) {
          return response;
        } else {
          throw new Error(response.error || 'Failed to analyze query');
        }
      }),
      catchError(error => {
        console.error('Error analyzing query:', error);
        return throwError(() => new Error('Failed to analyze your query. Please try again.'));
      })
    );
  }

  /**
   * Clear current chat session
   */
  clearChatSession(): void {
    this.currentSessionId = this.generateSessionId();
    this.chatHistorySubject.next([]);
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Check if AI service is available
   */
  healthCheck(): Observable<boolean> {
    return this.http.get<any>(`${this.baseUrl}/health`).pipe(
      map(response => response.status === 'healthy'),
      catchError(error => {
        console.error('AI service health check failed:', error);
        return new Observable<boolean>(observer => {
          observer.next(false);
          observer.complete();
        });
      })
    );
  }

  /**
   * Get cached insights
   */
  getCachedInsights(): AIInsight[] {
    return this.insightsSubject.value;
  }

  /**
   * Get cached chat history
   */
  getCachedChatHistory(): ChatMessage[] {
    return this.chatHistorySubject.value;
  }

  /**
   * Test Google AI connection
   */
  testGoogleAI(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/test`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error testing Google AI:', error);
        return throwError(() => new Error('Failed to test AI connection.'));
      })
    );
  }

  /**
   * Get AI status
   */
  getAIStatus(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/status`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error getting AI status:', error);
        return throwError(() => new Error('Failed to get AI status.'));
      })
    );
  }

  /**
   * Format message for display
   */
  formatMessage(message: string): string {
    if (!message) return '';

    // Clean up any JSON formatting that might have leaked through
    let cleanMessage = message;

    // Remove JSON wrapper if present
    if (cleanMessage.includes('"response":')) {
      try {
        const jsonMatch = cleanMessage.match(/"response":\s*"([^"]+)"/);
        if (jsonMatch) {
          cleanMessage = jsonMatch[1];
        }
      } catch (e) {
        // If JSON parsing fails, continue with original message
      }
    }

    // Unescape JSON escaped characters
    cleanMessage = cleanMessage
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');

    // Convert markdown-like formatting to HTML and style currency values green
    return cleanMessage
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Make big currency values green (e.g., $50.211,52 or $50,211.52)
      .replace(/\$([0-9.,]+)/g, '<span style="color: #10b981; font-weight: 600;">$$$1</span>')
      .replace(/\n/g, '<br>')
      .replace(/•/g, '&bull;')
      .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
  }

  /**
   * Get insight priority color
   */
  getInsightPriorityColor(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }

  /**
   * Get insight category icon
   */
  getInsightCategoryIcon(category: string): string {
    switch (category?.toLowerCase()) {
      case 'revenue': return '💰';
      case 'operations': return '⚙️';
      case 'customer': return '👥';
      case 'product': return '🍕';
      case 'regional': return '🗺️';
      case 'performance': return '📊';
      default: return '💡';
    }
  }
}
