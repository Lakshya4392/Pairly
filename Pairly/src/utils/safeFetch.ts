import NetworkRecovery from './NetworkRecovery';

/**
 * Enhanced safe fetch wrapper with network recovery and retry logic
 */
export const safeFetch = async (url: string, options: SafeFetchOptions = {}): Promise<Response> => {
  const networkRecovery = NetworkRecovery.getInstance();
  
  const fetchOperation = async (): Promise<Response> => {
    try {
      // Check network availability first
      if (!networkRecovery.isNetworkAvailable()) {
        throw new Error('No network connection available');
      }

      // Validate URL format
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided');
      }

      // Ensure URL has proper protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('URL must include protocol (http:// or https://)');
      }

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeout = options.timeout || 10000;
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);

      // Merge signal with existing options
      const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
      };

      // Remove custom timeout property
      delete (fetchOptions as any).timeout;

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      
      return response;
    } catch (error: any) {
      // Handle specific protocol errors
      if (error.message && error.message.toLowerCase().includes('protocol')) {
        console.error('Protocol error:', error.message);
        throw new Error('Network protocol error - check your network configuration');
      }

      // Handle AbortController errors
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your network connection');
      }

      // Handle network errors
      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        throw new Error('Network request failed - please check your connection');
      }

      // Re-throw other errors
      throw error;
    }
  };

  // Use network recovery for retry logic
  const operationId = `fetch_${url}`;
  return networkRecovery.executeWithRetry(fetchOperation, operationId, {
    maxRetries: options.retries || 2,
    baseDelay: 1000,
    maxDelay: 5000,
  });
};

// Type for fetch options with timeout and retry
export interface SafeFetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}