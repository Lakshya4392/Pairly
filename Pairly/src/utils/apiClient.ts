/**
 * API Client
 * Handles all API requests with automatic retry and error handling
 * Automatically includes authentication token from AuthService
 */

import { API_CONFIG } from '../config/api.config';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  skipAuth?: boolean; // Skip automatic auth header
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultRetries: number;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.defaultTimeout = API_CONFIG.timeout;
    this.defaultRetries = API_CONFIG.retryAttempts;
    
    console.log('🌐 ApiClient initialized with baseUrl:', this.baseUrl);
  }

  /**
   * Get authentication token dynamically
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      // Dynamically import to avoid circular dependencies
      const AuthService = (await import('../services/AuthService')).default;
      return await AuthService.getToken();
    } catch (error) {
      console.error('❌ Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Make API request with retry logic and automatic authentication
   */
  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      skipAuth = false,
    } = options;

    // Always use fresh baseUrl from config (in case it changed)
    const currentBaseUrl = API_CONFIG.baseUrl;
    const url = `${currentBaseUrl}${endpoint}`;
    
    console.log(`📡 API Request: ${method} ${url}`);
    
    // Get auth token if not skipping auth
    let authHeaders: Record<string, string> = {};
    if (!skipAuth) {
      const token = await this.getAuthToken();
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
        console.log('🔐 Auth token added to request');
      } else {
        console.warn('⚠️ No auth token available for request');
      }
    }
    
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...headers, // User headers can override auth headers if needed
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }
          
          // Provide more specific error messages
          if (response.status === 401) {
            throw new Error(errorData.error || 'Authentication required. Please sign in again.');
          } else if (response.status === 403) {
            throw new Error(errorData.error || 'Access denied.');
          } else if (response.status === 404) {
            throw new Error(errorData.error || 'Resource not found.');
          } else {
            throw new Error(errorData.error || `HTTP ${response.status}: ${errorText}`);
          }
        }

        const data = await response.json();
        return data as T;

      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.message?.includes('HTTP 4') || error.message?.includes('Authentication required')) {
          // Client errors (400-499) shouldn't be retried
          throw error;
        }

        // Log retry attempt
        if (attempt < retries) {
          console.log(`⚠️ Request failed, retrying (${attempt + 1}/${retries})...`);
          await this.delay(API_CONFIG.retryDelay * (attempt + 1));
        }
      }
    }

    // All retries failed
    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Update base URL (useful for testing)
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Get current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new ApiClient();
