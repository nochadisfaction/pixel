/**
 * Logging utility for the application
 */

/**
 * Log levels in order of increasing severity
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Type definition for structured log data
 */
export interface LogData {
  message: string
  level: LogLevel
  timestamp: number
  metadata?: Record<string, unknown>
}

/**
 * Logger interface defining the core logging operations
 */
export interface Logger {
  debug: (message: string, metadata?: Record<string, unknown>) => void
  info: (message: string, metadata?: Record<string, unknown>) => void
  warn: (message: string, metadata?: Record<string, unknown>) => void
  error: (message: string, metadata?: Record<string, unknown>) => void
}

/**
 * Options for creating a logger
 */
export interface LoggerOptions {
  prefix?: string
}

// Helper function to check environment
const isServer = typeof window === 'undefined'
const isDevelopment = isServer
  ? process.env['NODE_ENV'] === 'development'
  : window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'

// Helper function to get log level from environment
const getEnvLogLevel = (): LogLevel => {
  if (isServer) {
    return (process.env['LOG_LEVEL'] as LogLevel) || LogLevel.INFO
  }
  return LogLevel.INFO
}

/**
 * Create a simple logger implementation without class initialization issues
 */
function createConsoleLogger(level: LogLevel = LogLevel.INFO, prefix?: string): Logger {
  const isDev = isDevelopment
  
  function createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
  ): LogData {
    return {
      message: prefix ? `[${prefix}] ${message}` : message,
      level,
      timestamp: Date.now(),
      metadata,
    }
  }

  function formatLogEntry({
    message,
    level,
    timestamp,
    metadata,
  }: LogData): string {
    const time = new Date(timestamp).toISOString()
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : ''
    return `[${time}] [${level.toUpperCase()}] ${message}${metadataStr}`
  }

  function writeLog(entry: LogData): void {
    const formattedMessage = formatLogEntry(entry)

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(formattedMessage)
        break
      case LogLevel.WARN:
      case LogLevel.INFO:
      case LogLevel.DEBUG:
        console.warn(formattedMessage)
        break
    }
  }

  function shouldLog(targetLevel: LogLevel): boolean {
    const levels = Object.values(LogLevel)
    const currentLevelIndex = levels.indexOf(level)
    const targetLevelIndex = levels.indexOf(targetLevel)
    return targetLevelIndex >= currentLevelIndex
  }

  return {
    debug: (message: string, metadata?: Record<string, unknown>) => {
      if (isDev && shouldLog(LogLevel.DEBUG)) {
        writeLog(createLogEntry(LogLevel.DEBUG, message, metadata))
      }
    },
    info: (message: string, metadata?: Record<string, unknown>) => {
      if (isDev && shouldLog(LogLevel.INFO)) {
        writeLog(createLogEntry(LogLevel.INFO, message, metadata))
      }
    },
    warn: (message: string, metadata?: Record<string, unknown>) => {
      if (shouldLog(LogLevel.WARN)) {
        writeLog(createLogEntry(LogLevel.WARN, message, metadata))
      }
    },
    error: (message: string, metadata?: Record<string, unknown>) => {
      if (shouldLog(LogLevel.ERROR)) {
        writeLog(createLogEntry(LogLevel.ERROR, message, metadata))
      }
    }
  }
}

// Build-safe logger instance - avoid early initialization
let loggerInstance: Logger | null = null

/**
 * Get the logger instance, creating it if necessary
 * @param options Optional configuration options for the logger
 */
export function getLogger(options?: LoggerOptions): Logger {
  try {
    // If a prefix is provided, always create a new logger with that prefix
    if (options?.prefix) {
      return createConsoleLogger(getEnvLogLevel(), options.prefix)
    }

    // Create singleton instance if it doesn't exist
    if (!loggerInstance) {
      const envLogLevel = getEnvLogLevel()
      loggerInstance = createConsoleLogger(envLogLevel)
    }

    return loggerInstance
  } catch (error) {
    // Fallback for build-time or initialization errors
    return createConsoleLogger(LogLevel.ERROR, options?.prefix)
  }
}

/**
 * Set a custom logger implementation
 */
export function setLogger(customLogger: Logger): void {
  loggerInstance = customLogger
}

/**
 * Default logger instance with simplified interface
 * Initialized lazily to avoid circular dependency issues
 */
let _appLogger: Logger | null = null
export function getAppLogger(): Logger {
  try {
    if (!_appLogger) {
      _appLogger = getLogger()
    }
    return _appLogger
  } catch (error) {
    // Fallback for build-time errors
    return createConsoleLogger(LogLevel.ERROR)
  }
}

// Export as property getter to avoid initialization issues
export const appLogger = {
  get debug() { 
    try { 
      return getAppLogger().debug 
    } catch { 
      return () => {} // no-op during build
    }
  },
  get info() { 
    try { 
      return getAppLogger().info 
    } catch { 
      return () => {} // no-op during build
    }
  },
  get warn() { 
    try { 
      return getAppLogger().warn 
    } catch { 
      return () => {} // no-op during build
    }
  },
  get error() { 
    try { 
      return getAppLogger().error 
    } catch { 
      return () => {} // no-op during build
    }
  },
}
