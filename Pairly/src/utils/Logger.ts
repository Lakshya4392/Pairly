/**
 * 🛠️ Logger Utility
 * Centralizes logging to prevent console noise in production.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
    // ⚡ PERFORMANCE: Use 'warn' in Dev if logs are slowing down app
    // Change to 'info' or 'debug' only when debugging specific issues
    private level: LogLevel = __DEV__ ? 'info' : 'warn';

    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        // If specific log level is requested, check if it's high enough
        return levels.indexOf(level) >= levels.indexOf(this.level);
    }

    debug(message: string, ...args: any[]) {
        if (this.shouldLog('debug')) {
            console.log(`🐛 ${message}`, ...args);
        }
    }

    info(message: string, ...args: any[]) {
        if (this.shouldLog('info')) {
            console.log(`ℹ️ ${message}`, ...args);
        }
    }

    warn(message: string, ...args: any[]) {
        if (this.shouldLog('warn')) {
            console.warn(`⚠️ ${message}`, ...args);
        }
    }

    error(message: string, ...args: any[]) {
        if (this.shouldLog('error')) {
            console.error(`❌ ${message}`, ...args);
        }
    }

    // Special method for "Heartbeat" or repetitive logs - only show in verbose mode
    verbose(message: string, ...args: any[]) {
        // Uncomment locally if you really need to see heartbeats
        // if (__DEV__) console.log(`🔊 ${message}`, ...args);
    }
}

export default new Logger();
