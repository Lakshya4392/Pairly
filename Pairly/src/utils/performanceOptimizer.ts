/**
 * Performance Optimizer
 * Prevents app freezing and improves responsiveness
 */

import { InteractionManager } from 'react-native';

/**
 * Run heavy operation after interactions complete
 * Prevents UI freezing
 */
export const runAfterInteractions = <T>(callback: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    InteractionManager.runAfterInteractions(async () => {
      try {
        const result = await callback();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Debounce function to prevent too many calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

/**
 * Throttle function to limit execution rate
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Batch multiple operations together
 */
export const batchOperations = async <T>(
  operations: (() => Promise<T>)[],
  batchSize: number = 5
): Promise<T[]> => {
  const results: T[] = [];

  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(op => op()));
    results.push(...batchResults);

    // Small delay between batches to prevent freezing
    if (i + batchSize < operations.length) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  return results;
};

/**
 * Lazy load heavy component
 */
export const lazyLoad = <T>(
  loader: () => Promise<T>,
  delay: number = 0
): Promise<T> => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await loader();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, delay);
  });
};

/**
 * Check if operation should be cancelled (component unmounted)
 */
export class CancellableOperation {
  private cancelled = false;

  cancel() {
    this.cancelled = true;
  }

  isCancelled(): boolean {
    return this.cancelled;
  }

  async run<T>(operation: () => Promise<T>): Promise<T | null> {
    if (this.cancelled) {
      return null;
    }

    try {
      const result = await operation();
      if (this.cancelled) {
        return null;
      }
      return result;
    } catch (error) {
      if (this.cancelled) {
        return null;
      }
      throw error;
    }
  }
}

/**
 * Optimize image loading
 */
export const optimizeImageUri = (uri: string, maxSize: number = 1080): string => {
  // If it's a local file, return as is
  if (uri.startsWith('file://')) {
    return uri;
  }

  // If it's a remote URL, add resize parameters
  if (uri.startsWith('http')) {
    // Add resize query params if supported
    const separator = uri.includes('?') ? '&' : '?';
    return `${uri}${separator}w=${maxSize}&h=${maxSize}&fit=cover`;
  }

  return uri;
};

/**
 * Memory-efficient array chunking
 */
export const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Request animation frame wrapper
 */
export const requestAnimationFrameAsync = (): Promise<number> => {
  return new Promise(resolve => {
    requestAnimationFrame(resolve);
  });
};

/**
 * Idle callback wrapper (run when CPU is idle)
 */
export const requestIdleCallback = (callback: () => void, timeout: number = 1000): void => {
  // Fallback to setTimeout if requestIdleCallback not available
  if (typeof (global as any).requestIdleCallback === 'function') {
    (global as any).requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 1);
  }
};
