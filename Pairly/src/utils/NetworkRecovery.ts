/**
 * Network Recovery System
 * Handles network errors and provides recovery mechanisms
 */

import NetInfo from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

class NetworkRecovery {
  private static instance: NetworkRecovery;
  private networkState: NetworkState = {
    isConnected: false,
    isInternetReachable: null,
    type: 'unknown'
  };
  private listeners: ((state: NetworkState) => void)[] = [];
  private retryQueues: Map<string, (() => Promise<any>)[]> = new Map();

  static getInstance(): NetworkRecovery {
    if (!NetworkRecovery.instance) {
      NetworkRecovery.instance = new NetworkRecovery();
    }
    return NetworkRecovery.instance;
  }

  /**
   * Initialize network monitoring
   */
  initialize(): void {
    NetInfo.addEventListener(state => {
      const newState: NetworkState = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type
      };

      const wasOffline = !this.networkState.isConnected;
      const isNowOnline = newState.isConnected;

      this.networkState = newState;
      this.notifyListeners();

      // If we just came back online, process retry queues
      if (wasOffline && isNowOnline) {
        this.processRetryQueues();
      }
    });
  }

  /**
   * Get current network state
   */
  getNetworkState(): NetworkState {
    return { ...this.networkState };
  }

  /**
   * Subscribe to network state changes
   */
  subscribe(listener: (state: NetworkState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig: RetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      ...config
    };

    let lastError: Error;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        // Check network state before attempting
        if (!this.networkState.isConnected && attempt > 0) {
          throw new Error('No network connection available');
        }

        const result = await operation();
        return result;
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }

        // If this is the last attempt, throw the error
        if (attempt === retryConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt),
          retryConfig.maxDelay
        );

        console.log(`Retry attempt ${attempt + 1}/${retryConfig.maxRetries} for ${operationId} in ${delay}ms`);
        await this.delay(delay);
      }
    }

    // If we're offline, queue the operation for later
    if (!this.networkState.isConnected) {
      this.queueForRetry(operationId, operation);
      throw new Error('Operation queued for retry when network is available');
    }

    throw lastError!;
  }

  /**
   * Queue operation for retry when network is available
   */
  private queueForRetry(operationId: string, operation: () => Promise<any>): void {
    if (!this.retryQueues.has(operationId)) {
      this.retryQueues.set(operationId, []);
    }
    this.retryQueues.get(operationId)!.push(operation);
  }

  /**
   * Process all queued operations when network is restored
   */
  private async processRetryQueues(): Promise<void> {
    console.log('Network restored, processing retry queues...');
    
    for (const [operationId, operations] of this.retryQueues.entries()) {
      console.log(`Processing ${operations.length} queued operations for ${operationId}`);
      
      // Process operations one by one
      for (const operation of operations) {
        try {
          await operation();
        } catch (error) {
          console.error(`Failed to process queued operation for ${operationId}:`, error);
        }
      }
      
      // Clear the queue after processing
      this.retryQueues.delete(operationId);
    }
  }

  /**
   * Check if error should not be retried
   */
  private shouldNotRetry(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    
    // Don't retry on authentication errors
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return true;
    }
    
    // Don't retry on client errors (4xx)
    if (error.status >= 400 && error.status < 500) {
      return true;
    }
    
    // Don't retry on configuration errors
    if (message.includes('config') || message.includes('invalid url')) {
      return true;
    }
    
    return false;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Notify all listeners of network state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.networkState);
      } catch (error) {
        console.error('Error in network state listener:', error);
      }
    });
  }

  /**
   * Check if network is available
   */
  isNetworkAvailable(): boolean {
    return this.networkState.isConnected && this.networkState.isInternetReachable !== false;
  }

  /**
   * Get network type
   */
  getNetworkType(): string {
    return this.networkState.type;
  }
}

export default NetworkRecovery;