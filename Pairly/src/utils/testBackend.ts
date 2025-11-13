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
    const timeoutId = setTimeout(() => control