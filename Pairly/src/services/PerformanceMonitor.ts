/**
 * Performance Monitor
 * Tracks app performance metrics and connection quality
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

interface PerformanceMetrics {
  socketConnectionTime: number;
  photoUploadTime: number;
  photoReceiveTime: number;
  widgetUpdateTime: number;
  averageLatency: number;
  connectionDrops: number;
  lastUpdated: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  private metrics: PerformanceMetrics = {
    socketConnectionTime: 0,
    photoUploadTime: 0,
    photoReceiveTime: 0,
    widgetUpdateTime: 0,
    averageLatency: 0,
    connectionDrops: 0,
    lastUpdated: Date.now(),
  };
  private timers: Map<string, number> = new Map();

  private constructor() {
    this.loadMetrics();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing an operation
   */
  startTimer(operation: string): void {
    this.timers.set(operation, Date.now());
    console.log(`⏱️ Started timer: ${operation}`);
  }

  /**
   * End timing an operation and record metric
   */
  endTimer(operation: string): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      console.warn(`⚠️ No timer found for: ${operation}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operation);

    // Record metric
    this.recordMetric(operation, duration);

    console.log(`✅ ${operation}: ${duration}ms`);
    return duration;
  }

  /**
   * Record a performance metric
   */
  private recordMetric(operation: string, duration: number): void {
    switch (operation) {
      case 'socket_connection':
        this.metrics.socketConnectionTime = duration;
        break;
      case 'photo_upload':
        this.metrics.photoUploadTime = duration;
        break;
      case 'photo_receive':
        this.metrics.photoReceiveTime = duration;
        break;
      case 'widget_update':
        this.metrics.widgetUpdateTime = duration;
        break;
    }

    // Update average latency
    const latencies = [
      this.metrics.socketConnectionTime,
      this.metrics.photoUploadTime,
      this.metrics.photoReceiveTime,
      this.metrics.widgetUpdateTime,
    ].filter(l => l > 0);

    if (latencies.length > 0) {
      this.metrics.averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    }

    this.metrics.lastUpdated = Date.now();
    this.saveMetrics();
  }

  /**
   * Record connection drop
   */
  recordConnectionDrop(): void {
    this.metrics.connectionDrops++;
    this.metrics.lastUpdated = Date.now();
    this.saveMetrics();
    console.log(`📉 Connection drops: ${this.metrics.connectionDrops}`);
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance summary
   */
  getSummary(): string {
    const m = this.metrics;
    return `
📊 Performance Summary:
- Socket Connection: ${m.socketConnectionTime}ms
- Photo Upload: ${m.photoUploadTime}ms
- Photo Receive: ${m.photoReceiveTime}ms
- Widget Update: ${m.widgetUpdateTime}ms
- Average Latency: ${Math.round(m.averageLatency)}ms
- Connection Drops: ${m.connectionDrops}
- Last Updated: ${new Date(m.lastUpdated).toLocaleString()}
    `.trim();
  }

  /**
   * Check if performance is good
   */
  isPerformanceGood(): boolean {
    return (
      this.metrics.averageLatency < 2000 && // Less than 2 seconds average
      this.metrics.connectionDrops < 5 // Less than 5 drops
    );
  }

  /**
   * Get performance status
   */
  getStatus(): 'excellent' | 'good' | 'fair' | 'poor' {
    const latency = this.metrics.averageLatency;
    
    if (latency === 0) return 'good'; // No data yet
    if (latency < 1000) return 'excellent';
    if (latency < 2000) return 'good';
    if (latency < 3000) return 'fair';
    return 'poor';
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      socketConnectionTime: 0,
      photoUploadTime: 0,
      photoReceiveTime: 0,
      widgetUpdateTime: 0,
      averageLatency: 0,
      connectionDrops: 0,
      lastUpdated: Date.now(),
    };
    this.saveMetrics();
    console.log('🔄 Performance metrics reset');
  }

  /**
   * Save metrics to storage
   */
  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem('performance_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  }

  /**
   * Load metrics from storage
   */
  private async loadMetrics(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('performance_metrics');
      if (data) {
        this.metrics = JSON.parse(data);
        console.log('📊 Performance metrics loaded');
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  }
}

export default PerformanceMonitor.getInstance();
