import { API_BASE_URL } from '@env';

class NetworkService {
  private isOnline = true;
  private lastCheckTime = 0;
  private checkInterval = 30000; // 30 seconds

  /**
   * Check if backend is available
   */
  async checkBackendStatus(): Promise<boolean> {
    const now = Date.now();
    
    // Don't check too frequently
    if (now - this.lastCheckTime < this.checkInterval) {
      return this.isOnline;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      this.isOnline = response.ok;
      this.lastCheckTime = now;
      
      return this.isOnline;
    } catch (error) {
      console.log('Backend health check failed:', error);
      this.isOnline = false;
      this.lastCheckTime = now;
      return false;
    }
  }

  /**
   * Get current online status
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Set online status manually
   */
  setOnlineStatus(status: boolean): void {
    this.isOnline = status;
  }

  /**
   * Reset check timer
   */
  resetCheckTimer(): void {
    this.lastCheckTime = 0;
  }
}

export default new NetworkService();