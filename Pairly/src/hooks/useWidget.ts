/**
 * Widget Hook - React hook for widget functionality
 */

import { useState, useEffect, useCallback } from 'react';
import widgetService from '../services/WidgetService';

export interface UseWidgetReturn {
  isSupported: boolean;
  isLoading: boolean;
  updateWidget: (photoUri: string, partnerName?: string) => Promise<boolean>;
  clearWidget: () => Promise<boolean>;
  lastUpdate: Date | null;
}

export const useWidget = (): UseWidgetReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Initialize widget support check
  useEffect(() => {
    const checkSupport = async () => {
      try {
        setIsLoading(true);
        const supported = await widgetService.isWidgetSupported();
        setIsSupported(supported);

        if (supported) {
          // Get last widget data
          const widgetData = await widgetService.getWidgetData();
          if (widgetData) {
            setLastUpdate(new Date(widgetData.timestamp));
          }
        }
      } catch (error) {
        console.error('Error checking widget support:', error);
        setIsSupported(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSupport();
  }, []);

  // Update widget with new photo
  const updateWidget = useCallback(async (photoUri: string, partnerName?: string): Promise<boolean> => {
    if (!isSupported) {
      console.log('Widget not supported');
      return false;
    }

    try {
      const success = await widgetService.updateWidget(photoUri, partnerName || 'Partner');
      if (success) {
        setLastUpdate(new Date());
      }
      return success;
    } catch (error) {
      console.error('Error updating widget:', error);
      return false;
    }
  }, [isSupported]);

  // Clear widget
  const clearWidget = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    try {
      const success = await widgetService.clearWidget();
      if (success) {
        setLastUpdate(null);
      }
      return success;
    } catch (error) {
      console.error('Error clearing widget:', error);
      return false;
    }
  }, [isSupported]);


  return {
    isSupported,
    isLoading,
    updateWidget,
    clearWidget,
    lastUpdate,
  };
};