/**
 * WebSocket Manager for Real-time Updates
 * Replaces polling intervals with efficient real-time communication
 */

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface WebSocketConfig {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

type MessageHandler = (data: any) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string | null = null;
  private config: WebSocketConfig;
  private messageHandlers = new Map<string, Set<MessageHandler>>();
  private reconnectAttempts = 0;
  private isIntentionallyClosed = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor(config: WebSocketConfig = {}) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...config
    };
  }
  
  /**
   * Connect to WebSocket server
   */
  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.url = url;
        this.isIntentionallyClosed = false;
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          console.log('🔗 WebSocket connected:', url);
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('📝 WebSocket message parse error:', error);
          }
        };
        
        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket closed:', event.code, event.reason);
          this.stopHeartbeat();
          
          if (!this.isIntentionallyClosed && this.shouldReconnect()) {
            this.scheduleReconnect();
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('🚫 WebSocket error:', error);
          reject(error);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Intentional disconnect');
      this.ws = null;
    }
  }
  
  /**
   * Subscribe to message type
   */
  subscribe(messageType: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    
    this.messageHandlers.get(messageType)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(messageType);
        }
      }
    };
  }
  
  /**
   * Send message to server
   */
  send(type: string, data: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('📡 WebSocket not connected, cannot send message:', type);
      return false;
    }
    
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: Date.now()
    };
    
    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('📤 Failed to send WebSocket message:', error);
      return false;
    }
  }
  
  /**
   * Get connection status
   */
  getStatus(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.ws) return 'closed';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'open';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'closed';
    }
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  
  // Private methods
  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.data);
        } catch (error) {
          console.error('🔧 Message handler error:', error);
        }
      });
    }
  }
  
  private shouldReconnect(): boolean {
    return this.reconnectAttempts < this.config.maxReconnectAttempts!;
  }
  
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 WebSocket reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isIntentionallyClosed && this.url) {
        this.connect(this.url).catch(error => {
          console.error('🚫 WebSocket reconnect failed:', error);
        });
      }
    }, delay);
  }
  
  private startHeartbeat(): void {
    if (this.config.heartbeatInterval) {
      this.heartbeatInterval = setInterval(() => {
        if (this.isConnected()) {
          this.send('ping', { timestamp: Date.now() });
        }
      }, this.config.heartbeatInterval);
    }
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Singleton instances for different purposes
export const deviceWebSocket = new WebSocketManager({
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000
});

export const sessionWebSocket = new WebSocketManager({
  reconnectInterval: 2000,
  maxReconnectAttempts: 15,
  heartbeatInterval: 20000
});

// Utility functions
export const createWebSocketManager = (config?: WebSocketConfig) => new WebSocketManager(config);
