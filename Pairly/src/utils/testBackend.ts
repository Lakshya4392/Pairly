/**
 * Backend Connection Test Utility
 */

import { API_CONFIG } from '../config/api.config';

export const testBackendConnection = async (): Promise<{
  connected: boolean;
  message: string;
  url: string;
}> => {
  const url = API_CONFIG.baseUrl;
  
  try {
    console.log('🔍 Testing backend connection...');
    console.log('📡 URL:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        connected: true,
        message: `✅ Connected successfully! Server says: ${data.message || 'OK'}`,
        url,
      };
    } else {
      return {
        connected: false,
        message: `❌ Connection failed with status: ${response.status}`,
        url,
      };
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        connected: false,
        message: '❌ Connection timed out after 5 seconds.',
        url,
      };
    }
    return {
      connected: false,
      message: `❌ Network error: ${error.message}`,
      url,
    };
  }
};