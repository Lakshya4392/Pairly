// Polyfills for better compatibility

// AbortController polyfill
if (typeof globalThis !== 'undefined') {
  if (typeof (globalThis as any).AbortController === 'undefined') {
    (globalThis as any).AbortController = class AbortController {
      signal = { aborted: false };
      abort() {
        this.signal.aborted = true;
      }
    };
  }
}

// Enhanced fetch error handling
if (typeof globalThis !== 'undefined' && globalThis.fetch) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      return await originalFetch(input, init);
    } catch (error: any) {
      // Prevent protocol errors from crashing the app
      if (error.message && error.message.includes('protocol')) {
        console.warn('Protocol error caught and handled:', error.message);
        throw new Error('Network configuration error');
      }
      throw error;
    }
  };
}

export {};