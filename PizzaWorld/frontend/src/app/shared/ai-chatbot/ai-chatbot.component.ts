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

    // Don't add user message locally - let the backend handle both user and AI messages
    // This prevents duplicates and ensures proper ordering

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

    // Stream tokens
    this.aiService.sendMessageStream(message).subscribe({
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
          `• Google AI Available: ${status.gemma_available ? 'Yes' : 'No'}\n` +
          `• Model: ${status.gemma_config?.model || 'Not configured'}\n` +
          `• API Key: ${status.gemma_config?.apiKeyConfigured ? 'Configured' : 'Missing'}\n` +
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
