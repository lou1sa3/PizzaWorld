import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIService, ChatMessage } from '../../core/ai.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ai-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chatbot.component.html',
  styleUrls: ['./ai-chatbot.component.scss']
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
  
  // Quick action buttons
  quickActions = [
    { text: 'What\'s our revenue performance?', icon: '💰' },
    { text: 'Which stores are performing best?', icon: '🏪' },
    { text: 'How are our customers doing?', icon: '👥' },
    { text: 'Show me product insights', icon: '🍕' },
    { text: 'I need help with my account', icon: '🔧' }
  ];

  // Test actions
  testActions = [
    { text: 'Check AI Status', action: 'checkStatus', icon: '🔧' }
  ];

  constructor(private aiService: AIService) {}

  ngOnInit(): void {
    // Subscribe to chat history updates
    const historySubscription = this.aiService.chatHistory$.subscribe(
      messages => {
        this.chatHistory = messages;
        // No auto-scrolling - let users control scrolling manually
      }
    );
    
    // Subscribe to loading state
    const loadingSubscription = this.aiService.chatLoading$.subscribe(
      loading => {
        this.isLoading = loading;
      }
    );

    this.subscriptions.push(historySubscription, loadingSubscription);

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

    // Don't add user message locally - let the backend handle both user and AI messages
    // This prevents duplicates and ensures proper ordering

    // Send message to AI service
    this.aiService.sendMessage(message).subscribe({
      next: (response) => {
        // The AI service will update the chat history automatically via subscription
        // No auto-scrolling - let users control scrolling manually
      },
      error: (error) => {
        this.error = error.message || 'Failed to send message. Please try again.';
        // No auto-scrolling - let users control scrolling manually
      }
    });
  }

  sendQuickAction(action: string): void {
    this.currentMessage = action;
    this.sendMessage();
  }

  handleTestAction(action: string): void {
    switch (action) {
      case 'testAI':
        this.testGoogleAI();
        break;
      case 'checkStatus':
        this.checkAIStatus();
        break;
    }
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
   * Test Google AI connectivity
   */
  testGoogleAI(): void {
    this.isLoading = true;
    this.error = null;

    // Check if user is logged in first
    const token = localStorage.getItem('authToken');
    if (!token) {
      this.isLoading = false;
      this.error = 'Please log in first to test AI functionality.';
      return;
    }

    this.aiService.testGoogleAI().subscribe({
      next: (result) => {
        this.isLoading = false;
        
        // Add test result to chat
        const testMessage: ChatMessage = {
          message: result.response || 'No response received',
          messageType: 'assistant',
          timestamp: new Date().toISOString(),
          category: 'test'
        };
        
        this.chatHistory = [...this.chatHistory, testMessage];
        
        // Show additional info about AI status
        const statusMessage = result.isAIWorking 
          ? "✅ Google Gemma AI is working correctly!"
          : "⚠️ Using fallback responses (Google AI not connected)";
          
        const statusChatMessage: ChatMessage = {
          message: statusMessage,
          messageType: 'system',
          timestamp: new Date().toISOString(),
          category: 'test'
        };
        
        this.chatHistory = [...this.chatHistory, statusChatMessage];
        // No auto-scrolling - let users control scrolling manually
      },
      error: (error) => {
        this.isLoading = false;
        console.error('AI Test Error:', error);
        
        // Provide more specific error messages
        if (error.status === 403) {
          this.error = 'Access denied. Please make sure you are logged in with a valid account.';
        } else if (error.status === 401) {
          this.error = 'Authentication failed. Please log out and log back in.';
        } else {
          this.error = `Failed to test AI connection: ${error.message || 'Unknown error'}`;
        }
      }
    });
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
} 