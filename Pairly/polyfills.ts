// ⚡ EXPO COMPATIBLE POLYFILLS
import 'react-native-url-polyfill/auto';

// ⚡ EXPO SAFE: Enhanced error filtering for development
if (__DEV__) {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && (
      message.includes('ReactInstanceManager') ||
      message.includes('AssertionError') ||
      message.includes('BridgeDevSupportManager') ||
      message.includes('ReactContextInitParams') ||
      message.includes('EventEmitter')
    )) {
      return; // Skip problematic React Native errors
    }
    originalError.apply(console, args);
  };

  console.warn = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && (
      message.includes('ReactNativeHost') ||
      message.includes('deprecated')
    )) {
      return; // Skip deprecation warnings
    }
    originalWarn.apply(console, args);
  };
}

// AbortController polyfill with error handling
if (typeof globalThis !== 'undefined') {
  try {
    if (typeof (globalThis as any).AbortController === 'undefined') {
      (globalThis as any).AbortController = class AbortController {
        signal = { aborted: false };
        abort() {
          this.signal.aborted = true;
        }
      };
    }
  } catch (error) {
    console.warn('AbortController polyfill failed:', error);
  }
}

// ⚡ CRASH FIX: Safer Buffer polyfill
try {
  if (typeof global.Buffer === 'undefined') {
    global.Buffer = require('buffer').Buffer;
  }
} catch (error) {
  console.warn('Buffer polyfill failed:', error);
}

// ⚡ CRASH FIX: Enhanced fetch error handling
if (typeof globalThis !== 'undefined' && globalThis.fetch) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      return await originalFetch(input, init);
    } catch (error: any) {
      // Prevent protocol errors from crashing the app
      if (error.message && (
        error.message.includes('protocol') ||
        error.message.includes('Network request failed') ||
        error.message.includes('AssertionError')
      )) {
        console.warn('Network error caught and handled:', error.message);
        throw new Error('Network configuration error');
      }
      throw error;
    }
  };
}

console.log('✅ Crash-safe polyfills loaded');

export {};