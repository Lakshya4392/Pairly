/**
 * 🎯 SIMPLE MVP WidgetService
 * Widget polls backend directly - NO dependency on RN state
 */

import { NativeModules, Platform } from 'react-native';

const { PairlyWidget } = NativeModules;

class SimpleWidgetService {
  private static instance: SimpleWidgetService | null = null;
  private isEnabled = Platform.OS === 'android';

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): SimpleWidgetService {
    if (!SimpleWidgetService.instance) {
      SimpleWidgetService.instance = new SimpleWidgetService();
    }
    return SimpleWidgetService.instance;
  }

  /**
   * Check if widgets are supported and available
   */
  async isWidgetSupported(): Promise<boolean> {
    if (!this.isEnabled || !PairlyWidget) {
      return false;
    }

    try {
      return await PairlyWidget.hasWidgets();
    } catch (error) {
      console.error('Error checking widget support:', error);
      return false;
    }
  }

  /**
   * Check if widget is on home screen
   */
  async hasWidgets(): Promise<boolean> {
    if (!this.isEnabled || !PairlyWidget) {
      return false;
    }

    try {
      return await PairlyWidget.hasWidgets();
    } catch (error) {
      console.error('Error checking widgets:', error);
      return false;
    }
  }

  /**
   * ⚡ SIMPLE: Widget updates itself by polling backend
   * This method just checks if widget exists
   */
  async initialize(): Promise<void> {
    if (!this.isEnabled) {
      console.log('Widget service not available on this platform');
      return;
    }

    try {
      const isSupported = await this.isWidgetSupported();
      console.log('📱 Widget support:', isSupported);

      if (isSupported) {
        console.log('✅ Widget is on home screen - will auto-refresh from backend');
      } else {
        console.log('⚠️ No widget on home screen');
      }
    } catch (error) {
      console.error('Error initializing widget service:', error);
    }
  }

  async getWidgetData(): Promise<any> {
    console.log('📱 getWidgetData called (stub)');
    return null;
  }

  async updateWidget(photoUri: string, partnerName: string): Promise<boolean> {
    console.log('📱 updateWidget called (stub)');
    await this.triggerRefresh();
    return true;
  }

  async clearWidget(): Promise<boolean> {
    console.log('📱 clearWidget called (stub)');
    return true;
  }

  /**
   * 🔄 Trigger widget refresh (widget will poll backend)
   * This is just a hint to widget - actual refresh happens in native code
   */
  async triggerRefresh(): Promise<void> {
    if (!this.isEnabled || !PairlyWidget) {
      return;
    }

    try {
      const hasWidgets = await this.hasWidgets();
      if (hasWidgets) {
        console.log('📱 Widget refresh triggered (widget will poll backend)');
        // Widget native code will handle the actual API call and update
      }
    } catch (error) {
      console.error('Error triggering widget refresh:', error);
    }
  }
}

// Export singleton instance
const simpleWidgetService = SimpleWidgetService.getInstance();
export default simpleWidgetService;
