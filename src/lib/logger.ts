/**
 * Production-safe logging utility
 * Prevents console access exploitation and reduces log noise in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  enabled: boolean;
  level: LogLevel;
  enableInProduction: boolean;
  disableConsoleAccess: boolean;
}

class Logger {
  private config: LogConfig;
  private originalConsole: typeof console;

  constructor(config: Partial<LogConfig> = {}) {
    this.originalConsole = { ...console };
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      level: 'info',
      enableInProduction: false,
      disableConsoleAccess: process.env.NODE_ENV === 'production',
      ...config
    };

    this.init();
  }

  private init() {
    // Disable console access in production to prevent exploitation
    if (this.config.disableConsoleAccess && typeof window !== 'undefined') {
      // Initialize immediately in production
      setTimeout(() => this.disableConsoleAccess(), 100);
    }
  }

  private disableConsoleAccess() {
    try {
      // Override console methods to prevent user exploitation
      const noop = () => {};
      const blockedMethods = [
        'log', 'debug', 'info', 'warn', 'error', 
        'table', 'trace', 'dir', 'dirxml', 'group', 
        'groupCollapsed', 'groupEnd', 'clear', 'count', 
        'countReset', 'assert', 'profile', 'profileEnd',
        'time', 'timeLog', 'timeEnd', 'timeStamp'
      ];

      blockedMethods.forEach(method => {
        if (console[method as keyof Console]) {
          (console as any)[method] = noop;
        }
      });

      // Prevent access to console object
      Object.defineProperty(window, 'console', {
        value: new Proxy(console, {
          get: () => noop,
          set: () => false
        }),
        writable: false,
        configurable: false
      });

      // Block common debugging attempts
      (window as any).eval = () => { throw new Error('eval disabled'); };
      (window as any).Function = () => { throw new Error('Function constructor disabled'); };
      
      // Disable right-click context menu
      document.addEventListener('contextmenu', (e) => e.preventDefault());
      
      // Disable F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S
      document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.key === 'u') ||
            (e.ctrlKey && e.key === 's')) {
          e.preventDefault();
          return false;
        }
      });

    } catch (error) {
      this.originalConsole.warn('Failed to disable console access:', error);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    // Completely disable all logging for security
    return false;
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return `${prefix} ${message}`;
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      this.originalConsole.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      this.originalConsole.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      this.originalConsole.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: any[]) {
    if (this.shouldLog('error')) {
      this.originalConsole.error(this.formatMessage('error', message), ...args);
    }
  }

  // Safe logging for sensitive operations (never logs in production)
  secure(message: string, ...args: any[]) {
    // Completely disabled for security - no logging of sensitive data
    return;
  }

  // Performance logging (only in development)
  perf(label: string, operation: () => any) {
    if (process.env.NODE_ENV === 'development') {
      const start = performance.now();
      const result = operation();
      const end = performance.now();
      this.debug(`⚡ ${label}: ${(end - start).toFixed(2)}ms`);
      return result;
    }
    return operation();
  }
}

// Create singleton instance
export const logger = new Logger();

// Export convenience methods
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
export const logSecure = logger.secure.bind(logger);
export const logPerf = logger.perf.bind(logger);

export default logger;
