/**
 * Debug Helper Utility
 * Provides comprehensive debugging and logging for development
 */

export interface DebugInfo {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  data?: any;
}

class DebugHelper {
  private static instance: DebugHelper;
  private logs: DebugInfo[] = [];
  private maxLogs = 1000;
  private isEnabled = __DEV__;

  static getInstance(): DebugHelper {
    if (!DebugHelper.instance) {
      DebugHelper.instance = new DebugHelper();
    }
    return DebugHelper.instance;
  }

  /**
   * Log info message
   */
  info(category: string, message: string, data?: any): void {
    this.log('info', category, message, data);
  }

  /**
   * Log warning message
   */
  warn(category: string, message: string, data?: any): void {
    this.log('warn', category, message, data);
  }

  /**
   * Log error message
   */
  error(category: string, message: string, data?: any): void {
    this.log('error', category, message, data);
  }

  /**
   * Log debug message
   */
  debug(category: string, message: string, data?: any): void {
    this.log('debug', category, message, data);
  }

  /**
   * Log app startup event
   */
  logStartup(stage: string, details?: any): void {
    this.info('STARTUP', `App startup: ${stage}`, details);
  }

  /**
   * Log network event
   */
  logNetwork(event: string, details?: any): void {
    this.info('NETWORK', event, details);
  }

  /**
   * Log authentication event
   */
  logAuth(event: string, details?: any): void {
    this.info('AUTH', event, details);
  }

  /**
   * Log service event
   */
  logService(service: string, event: string, details?: any): void {
    this.info('SERVICE', `${service}: ${event}`, details);
  }

  /**
   * Log performance metric
   */
  logPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.info('PERFORMANCE', `${metric}: ${value}${unit}`);
  }

  /**
   * Get all logs
   */
  getLogs(): DebugInfo[] {
    return [...this.logs];
  }

  /**
   * Get logs by category
   */
  getLogsByCategory(category: string): DebugInfo[] {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: DebugInfo['level']): DebugInfo[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as string
   */
  exportLogs(): string {
    return this.logs
      .map(log => `[${log.timestamp}] ${log.level.toUpperCase()} [${log.category}] ${log.message}${log.data ? ` | Data: ${JSON.stringify(log.data)}` : ''}`)
      .join('\n');
  }

  /**
   * Get app state summary
   */
  getAppStateSummary(): {
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    lastError?: DebugInfo;
    recentActivity: DebugInfo[];
  } {
    const errors = this.getLogsByLevel('error');
    const warnings = this.getLogsByLevel('warn');
    const recent = this.logs.slice(-10);

    return {
      totalLogs: this.logs.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      lastError: errors[errors.length - 1],
      recentActivity: recent,
    };
  }

  /**
   * Check for common issues
   */
  checkForIssues(): {
    hasNetworkIssues: boolean;
    hasAuthIssues: boolean;
    hasServiceIssues: boolean;
    hasPerformanceIssues: boolean;
    recommendations: string[];
  } {
    const networkErrors = this.logs.filter(log => 
      log.category === 'NETWORK' && log.level === 'error'
    );
    
    const authErrors = this.logs.filter(log => 
      log.category === 'AUTH' && log.level === 'error'
    );
    
    const serviceErrors = this.logs.filter(log => 
      log.category === 'SERVICE' && log.level === 'error'
    );

    const performanceLogs = this.logs.filter(log => 
      log.category === 'PERFORMANCE'
    );

    const recommendations: string[] = [];

    if (networkErrors.length > 3) {
      recommendations.push('Multiple network errors detected. Check internet connection.');
    }

    if (authErrors.length > 2) {
      recommendations.push('Authentication issues detected. Check Clerk configuration.');
    }

    if (serviceErrors.length > 2) {
      recommendations.push('Service errors detected. Check backend connectivity.');
    }

    return {
      hasNetworkIssues: networkErrors.length > 0,
      hasAuthIssues: authErrors.length > 0,
      hasServiceIssues: serviceErrors.length > 0,
      hasPerformanceIssues: performanceLogs.length > 0,
      recommendations,
    };
  }

  /**
   * Private log method
   */
  private log(level: DebugInfo['level'], category: string, message: string, data?: any): void {
    if (!this.isEnabled) return;

    const logEntry: DebugInfo = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    this.logs.push(logEntry);

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output
    const consoleMessage = `[${category}] ${message}`;
    switch (level) {
      case 'error':
        console.error(consoleMessage, data);
        break;
      case 'warn':
        console.warn(consoleMessage, data);
        break;
      case 'debug':
        console.debug(consoleMessage, data);
        break;
      default:
        console.log(consoleMessage, data);
    }
  }
}

export default DebugHelper;