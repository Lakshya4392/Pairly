/**
 * Safe Operations Utility
 * Prevents "Cannot read property 'dismiss' of undefined" errors
 * Ensures all async operations complete safely
 */

class SafeOperations {
  /**
   * Safely execute async operation with error handling
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      errorMessage?: string;
    } = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const result = await operation();
      
      if (options.onSuccess) {
        try {
          options.onSuccess(result);
        } catch (callbackError) {
          console.error('Error in success callback:', callbackError);
        }
      }
      
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error('Operation failed:', error);
      
      if (options.onError) {
        try {
          options.onError(error);
        } catch (callbackError) {
          console.error('Error in error callback:', callbackError);
        }
      }
      
      return {
        success: false,
        error: options.errorMessage || error.message || 'Operation failed',
      };
    }
  }

  /**
   * Safely execute with timeout
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 10000,
    timeoutMessage: string = 'Operation timed out'
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
        ),
      ]);
      
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error('Operation failed or timed out:', error);
      return {
        success: false,
        error: error.message || 'Operation failed',
      };
    }
  }

  /**
   * Safely execute with retry
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        lastError = error;
        console.log(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }
    
    return {
      success: false,
      error: lastError?.message || 'All retry attempts failed',
    };
  }

  /**
   * Safely dismiss any object with dismiss method
   */
  safeDismiss(obj: any): void {
    try {
      if (obj && typeof obj.dismiss === 'function') {
        obj.dismiss();
      }
    } catch (error) {
      // Silent fail - dismiss errors shouldn't break the app
      console.debug('Dismiss failed (non-critical):', error);
    }
  }

  /**
   * Safely hide any object with hide method
   */
  safeHide(obj: any): void {
    try {
      if (obj && typeof obj.hide === 'function') {
        obj.hide();
      }
    } catch (error) {
      // Silent fail
      console.debug('Hide failed (non-critical):', error);
    }
  }

  /**
   * Safely close any object with close method
   */
  safeClose(obj: any): void {
    try {
      if (obj && typeof obj.close === 'function') {
        obj.close();
      }
    } catch (error) {
      // Silent fail
      console.debug('Close failed (non-critical):', error);
    }
  }
}

export default new SafeOperations();
