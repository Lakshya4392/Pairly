/**
 * Comprehensive Loading Error Handler
 * Prevents and handles all types of loading errors
 */

export interface LoadingError {
  type: 'network' | 'auth' | 'config' | 'dependency' | 'runtime' | 'unknown';
  message: string;
  details?: any;
  timestamp: number;
  stack?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error: LoadingError | null;
  progress: number;
  stage: string;
}

class LoadingErrorHandler {
  private static instance: LoadingErrorHandler;
  private errors: LoadingError[] = [];
  private listeners: ((state: LoadingState) => void)[] = [];
  private currentState: LoadingState = {
    isLoading: false,
    error: null,
    progress: 0,
    stage: 'idle'
  };

  static getInstance(): LoadingErrorHandler {
    if (!LoadingErrorHandler.instance) {
      LoadingErrorHandler.instance = new LoadingErrorHandler();
    }
    return LoadingErrorHandler.instance;
  }

  /**
   * Set loading state with progress tracking
   */
  setLoading(isLoading: boolean, stage: string = 'loading', progress: number = 0): void {
    this.currentState = {
      ...this.currentState,
      isLoading,
      stage,
      progress: Math.max(0, Math.min(100, progress))
    };
    this.notifyListeners();
  }

  /**
   * Handle and categorize errors
   */
  handleError(error: any, context: string = 'unknown'): LoadingError {
    const loadingError: LoadingError = {
      type: this.categorizeError(error),
      message: this.extractErrorMessage(error),
      details: error,
      timestamp: Date.now(),
      stack: error?.stack
    };

    this.errors.push(loadingError);
    this.currentState = {
      ...this.currentState,
      error: loadingError,
      isLoading: false
    };

    console.error(`[LoadingErrorHandler] ${context}:`, loadingError);
    this.notifyListeners();
    
    return loadingError;
  }

  /**
   * Clear current error
   */
  clearError(): void {
    this.currentState = {
      ...this.currentState,
      error: null
    };
    this.notifyListeners();
  }

  /**
   * Get current loading state
   */
  getState(): LoadingState {
    return { ...this.currentState };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: LoadingState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Safe async operation wrapper
   */
  async safeAsync<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T | null> {
    try {
      this.setLoading(true, `Executing ${context}`, 0);
      const result = await operation();
      this.setLoading(false, 'completed', 100);
      return result;
    } catch (error) {
      this.handleError(error, context);
      if (fallback !== undefined) {
        return fallback;
      }
      return null;
    }
  }

  /**
   * Categorize error types
   */
  private categorizeError(error: any): LoadingError['type'] {
    const message = this.extractErrorMessage(error).toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network';
    }
    if (message.includes('auth') || message.includes('token') || message.includes('unauthorized')) {
      return 'auth';
    }
    if (message.includes('config') || message.includes('env') || message.includes('key')) {
      return 'config';
    }
    if (message.includes('module') || message.includes('import') || message.includes('require')) {
      return 'dependency';
    }
    if (message.includes('protocol') || message.includes('global') || message.includes('undefined')) {
      return 'runtime';
    }
    
    return 'unknown';
  }

  /**
   * Extract meaningful error message
   */
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.toString) return error.toString();
    return 'Unknown error occurred';
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentState);
      } catch (error) {
        console.error('Error in loading state listener:', error);
      }
    });
  }

  /**
   * Get error history for debugging
   */
  getErrorHistory(): LoadingError[] {
    return [...this.errors];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errors = [];
  }
}

export default LoadingErrorHandler;