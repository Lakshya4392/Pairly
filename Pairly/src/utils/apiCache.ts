/**
 * API Cache
 * Prevents duplicate API calls and speeds up app
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 60000; // 1 minute

  /**
   * Get cached data or fetch new
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    // Return cached if valid
    if (cached && Date.now() - cached.timestamp < ttl) {
      console.log(`📦 Using cached: ${key}`);
      return cached.data;
    }

    // Fetch new data
    console.log(`🌐 Fetching: ${key}`);
    const data = await fetcher();
    
    // Cache it
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }

  /**
   * Set cache manually
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate cache
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`🗑️ Cache invalidated: ${key}`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️ All cache cleared');
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

export default new APICache();
