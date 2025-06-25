/**
 * Comprehensive Error Handling System for Bias Detection Engine
 * 
 * This module provides a complete error taxonomy and handling system
 * for production deployment, including proper error types, recovery strategies,
 * and detailed error reporting capabilities.
 */

/**
 * Base error class for all bias detection related errors
 */
export abstract class BiasDetectionError extends Error {
  public readonly code: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly category: 'configuration' | 'validation' | 'service' | 'data' | 'security' | 'performance' | 'system';
  public readonly timestamp: Date;
  public readonly context: Record<string, unknown>;
  public readonly recoverable: boolean;
  public readonly userMessage?: string;

  constructor(
    message: string,
    code: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    category: 'configuration' | 'validation' | 'service' | 'data' | 'security' | 'performance' | 'system',
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      recoverable?: boolean;
      userMessage?: string;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.category = category;
    this.timestamp = new Date();
    this.context = options.context || {};
    this.recoverable = options.recoverable ?? false;
    this.userMessage = options.userMessage;

    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to structured format for logging and monitoring
   */
  toStructured(): {
    name: string;
    message: string;
    code: string;
    severity: string;
    category: string;
    timestamp: string;
    context: Record<string, unknown>;
    recoverable: boolean;
    userMessage?: string;
    stack?: string;
    cause?: string;
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      category: this.category,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      recoverable: this.recoverable,
      userMessage: this.userMessage,
      stack: this.stack,
      cause: this.cause instanceof Error ? this.cause.message : undefined,
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.userMessage || this.getDefaultUserMessage();
  }

  protected abstract getDefaultUserMessage(): string;
}

/**
 * Configuration-related errors
 */
export class BiasConfigurationError extends BiasDetectionError {
  constructor(
    message: string,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      configProperty?: string;
      configValue?: unknown;
      userMessage?: string;
    } = {}
  ) {
    super(
      message,
      'BIAS_CONFIG_ERROR',
      'high',
      'configuration',
      {
        ...options,
        context: {
          ...options.context,
          configProperty: options.configProperty,
          configValue: options.configValue,
        },
      }
    );
  }

  protected getDefaultUserMessage(): string {
    return 'Configuration error occurred. Please check your bias detection settings.';
  }
}

export class BiasConfigurationValidationError extends BiasConfigurationError {
  constructor(
    property: string,
    value: unknown,
    expectedType: string,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      userMessage?: string;
    } = {}
  ) {
    super(
      `Invalid configuration for property '${property}': expected ${expectedType}, got ${typeof value}`,
      {
        ...options,
        configProperty: property,
        configValue: value,
        context: {
          ...options.context,
          expectedType,
          actualType: typeof value,
        },
      }
    );
    this.code = 'BIAS_CONFIG_VALIDATION_ERROR';
  }
}

export class BiasThresholdError extends BiasConfigurationError {
  constructor(
    thresholdName: string,
    value: number,
    min: number,
    max: number,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      userMessage?: string;
    } = {}
  ) {
    super(
      `Invalid threshold '${thresholdName}': value ${value} must be between ${min} and ${max}`,
      {
        ...options,
        configProperty: thresholdName,
        configValue: value,
        context: {
          ...options.context,
          min,
          max,
          actualValue: value,
        },
      }
    );
    this.code = 'BIAS_THRESHOLD_ERROR';
  }

  protected getDefaultUserMessage(): string {
    return 'Bias threshold configuration is invalid. Please use values between 0 and 1.';
  }
}

/**
 * Input validation errors
 */
export class BiasValidationError extends BiasDetectionError {
  constructor(
    message: string,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      field?: string;
      value?: unknown;
      userMessage?: string;
    } = {}
  ) {
    super(
      message,
      'BIAS_VALIDATION_ERROR',
      'medium',
      'validation',
      {
        ...options,
        context: {
          ...options.context,
          field: options.field,
          value: options.value,
        },
        recoverable: true,
      }
    );
  }

  protected getDefaultUserMessage(): string {
    return 'Invalid input provided. Please check your data and try again.';
  }
}

export class BiasSessionValidationError extends BiasValidationError {
  constructor(
    sessionId: string,
    issues: string[],
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      userMessage?: string;
    } = {}
  ) {
    super(
      `Session validation failed for '${sessionId}': ${issues.join(', ')}`,
      {
        ...options,
        field: 'sessionId',
        value: sessionId,
        context: {
          ...options.context,
          sessionId,
          validationIssues: issues,
        },
      }
    );
    this.code = 'BIAS_SESSION_VALIDATION_ERROR';
  }

  protected getDefaultUserMessage(): string {
    return 'Session data is invalid or incomplete. Please provide valid session information.';
  }
}

/**
 * Python service communication errors
 */
export class BiasPythonServiceError extends BiasDetectionError {
  constructor(
    message: string,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      serviceUrl?: string;
      httpStatus?: number;
      retryable?: boolean;
      userMessage?: string;
    } = {}
  ) {
    super(
      message,
      'BIAS_PYTHON_SERVICE_ERROR',
      'high',
      'service',
      {
        ...options,
        context: {
          ...options.context,
          serviceUrl: options.serviceUrl,
          httpStatus: options.httpStatus,
        },
        recoverable: options.retryable ?? true,
      }
    );
  }

  protected getDefaultUserMessage(): string {
    return 'Analysis service is temporarily unavailable. Please try again later.';
  }
}

export class BiasPythonServiceTimeoutError extends BiasPythonServiceError {
  constructor(
    timeoutMs: number,
    operation: string,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      serviceUrl?: string;
      userMessage?: string;
    } = {}
  ) {
    super(
      `Python service timeout after ${timeoutMs}ms during ${operation}`,
      {
        ...options,
        context: {
          ...options.context,
          timeoutMs,
          operation,
        },
        retryable: true,
      }
    );
    this.code = 'BIAS_PYTHON_SERVICE_TIMEOUT';
  }

  protected getDefaultUserMessage(): string {
    return 'Analysis is taking longer than expected. Please try again or check with your administrator.';
  }
}

export class BiasPythonServiceUnavailableError extends BiasPythonServiceError {
  constructor(
    serviceUrl: string,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      userMessage?: string;
    } = {}
  ) {
    super(
      `Python service unavailable at ${serviceUrl}`,
      {
        ...options,
        serviceUrl,
        context: {
          ...options.context,
          availabilityCheck: new Date().toISOString(),
        },
        retryable: false,
      }
    );
    this.code = 'BIAS_PYTHON_SERVICE_UNAVAILABLE';
    this.severity = 'critical';
  }

  protected getDefaultUserMessage(): string {
    return 'Bias analysis service is currently unavailable. Please contact your system administrator.';
  }
}

/**
 * Data processing errors
 */
export class BiasDataError extends BiasDetectionError {
  constructor(
    message: string,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      dataType?: string;
      dataSize?: number;
      userMessage?: string;
    } = {}
  ) {
    super(
      message,
      'BIAS_DATA_ERROR',
      'medium',
      'data',
      {
        ...options,
        context: {
          ...options.context,
          dataType: options.dataType,
          dataSize: options.dataSize,
        },
        recoverable: true,
      }
    );
  }

  protected getDefaultUserMessage(): string {
    return 'There was an issue processing your data. Please check the format and try again.';
  }
}

export class BiasDataCorruptionError extends BiasDataError {
  constructor(
    dataType: string,
    corruptionDetails: string,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      userMessage?: string;
    } = {}
  ) {
    super(
      `Data corruption detected in ${dataType}: ${corruptionDetails}`,
      {
        ...options,
        dataType,
        context: {
          ...options.context,
          corruptionDetails,
          detectedAt: new Date().toISOString(),
        },
        recoverable: false,
      }
    );
    this.code = 'BIAS_DATA_CORRUPTION_ERROR';
    this.severity = 'high';
  }

  protected getDefaultUserMessage(): string {
    return 'Data corruption detected. Please contact support for assistance.';
  }
}

/**
 * Security-related errors
 */
export class BiasSecurityError extends BiasDetectionError {
  constructor(
    message: string,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      securityType?: 'authentication' | 'authorization' | 'encryption' | 'data_privacy';
      userMessage?: string;
    } = {}
  ) {
    super(
      message,
      'BIAS_SECURITY_ERROR',
      'critical',
      'security',
      {
        ...options,
        context: {
          ...options.context,
          securityType: options.securityType,
          securityEvent: new Date().toISOString(),
        },
        recoverable: false,
      }
    );
  }

  protected getDefaultUserMessage(): string {
    return 'Security violation detected. Access denied.';
  }
}

export class BiasAuthenticationError extends BiasSecurityError {
  constructor(
    operation: string,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      userMessage?: string;
    } = {}
  ) {
    super(
      `Authentication required for ${operation}`,
      {
        ...options,
        securityType: 'authentication',
        context: {
          ...options.context,
          operation,
        },
      }
    );
    this.code = 'BIAS_AUTHENTICATION_ERROR';
  }

  protected getDefaultUserMessage(): string {
    return 'Authentication required. Please log in and try again.';
  }
}

export class BiasAuthorizationError extends BiasSecurityError {
  constructor(
    operation: string,
    requiredRole: string,
    userRole?: string,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      userMessage?: string;
    } = {}
  ) {
    super(
      `Insufficient permissions for ${operation}. Required: ${requiredRole}, User: ${userRole || 'unknown'}`,
      {
        ...options,
        securityType: 'authorization',
        context: {
          ...options.context,
          operation,
          requiredRole,
          userRole,
        },
      }
    );
    this.code = 'BIAS_AUTHORIZATION_ERROR';
  }

  protected getDefaultUserMessage(): string {
    return 'You do not have permission to perform this action.';
  }
}

/**
 * Performance-related errors
 */
export class BiasPerformanceError extends BiasDetectionError {
  constructor(
    message: string,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      operation?: string;
      duration?: number;
      threshold?: number;
      userMessage?: string;
    } = {}
  ) {
    super(
      message,
      'BIAS_PERFORMANCE_ERROR',
      'medium',
      'performance',
      {
        ...options,
        context: {
          ...options.context,
          operation: options.operation,
          duration: options.duration,
          threshold: options.threshold,
        },
        recoverable: true,
      }
    );
  }

  protected getDefaultUserMessage(): string {
    return 'Operation is taking longer than expected. Please try again or simplify your request.';
  }
}

export class BiasPerformanceTimeoutError extends BiasPerformanceError {
  constructor(
    operation: string,
    duration: number,
    threshold: number,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      userMessage?: string;
    } = {}
  ) {
    super(
      `Performance timeout for ${operation}: ${duration}ms exceeded threshold of ${threshold}ms`,
      {
        ...options,
        operation,
        duration,
        threshold,
      }
    );
    this.code = 'BIAS_PERFORMANCE_TIMEOUT';
  }
}

export class BiasResourceExhaustionError extends BiasPerformanceError {
  constructor(
    resource: string,
    current: number,
    limit: number,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      userMessage?: string;
    } = {}
  ) {
    super(
      `Resource exhaustion: ${resource} usage ${current} exceeded limit ${limit}`,
      {
        ...options,
        context: {
          ...options.context,
          resource,
          current,
          limit,
        },
        recoverable: false,
      }
    );
    this.code = 'BIAS_RESOURCE_EXHAUSTION';
    this.severity = 'high';
  }

  protected getDefaultUserMessage(): string {
    return 'System resources are currently exhausted. Please try again later or contact support.';
  }
}

/**
 * System-level errors
 */
export class BiasSystemError extends BiasDetectionError {
  constructor(
    message: string,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      component?: string;
      userMessage?: string;
    } = {}
  ) {
    super(
      message,
      'BIAS_SYSTEM_ERROR',
      'high',
      'system',
      {
        ...options,
        context: {
          ...options.context,
          component: options.component,
        },
        recoverable: false,
      }
    );
  }

  protected getDefaultUserMessage(): string {
    return 'A system error occurred. Please contact support if the problem persists.';
  }
}

export class BiasInitializationError extends BiasSystemError {
  constructor(
    component: string,
    reason: string,
    options: {
      cause?: Error;
      context?: Record<string, unknown>;
      userMessage?: string;
    } = {}
  ) {
    super(
      `Failed to initialize ${component}: ${reason}`,
      {
        ...options,
        component,
        context: {
          ...options.context,
          initializationReason: reason,
        },
      }
    );
    this.code = 'BIAS_INITIALIZATION_ERROR';
    this.severity = 'critical';
  }

  protected getDefaultUserMessage(): string {
    return 'System initialization failed. Please contact your administrator.';
  }
}

/**
 * Error handler utility functions
 */
export class BiasErrorHandler {
  /**
   * Safely extract error message from unknown error type
   */
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return 'Unknown error occurred';
  }

  /**
   * Create appropriate BiasDetectionError from unknown error
   */
  static createFromUnknown(
    error: unknown,
    context: {
      operation: string;
      category?: 'configuration' | 'validation' | 'service' | 'data' | 'security' | 'performance' | 'system';
      severity?: 'low' | 'medium' | 'high' | 'critical';
      additionalContext?: Record<string, unknown>;
    }
  ): BiasDetectionError {
    const message = this.getErrorMessage(error);
    const originalError = error instanceof Error ? error : undefined;

    const category = context.category || 'system';
    const severity = context.severity || 'medium';

    return new BiasSystemError(
      `Error in ${context.operation}: ${message}`,
      {
        cause: originalError,
        component: context.operation,
        context: context.additionalContext,
        userMessage: 'An unexpected error occurred during processing.',
      }
    );
  }

  /**
   * Determine if error is retryable
   */
  static isRetryable(error: unknown): boolean {
    if (error instanceof BiasDetectionError) {
      return error.recoverable;
    }
    if (error instanceof Error) {
      // Network errors are typically retryable
      return error.message.includes('fetch') || 
             error.message.includes('timeout') ||
             error.message.includes('network') ||
             error.message.includes('ECONNRESET') ||
             error.message.includes('ENOTFOUND');
    }
    return false;
  }

  /**
   * Get retry delay based on error type and attempt number
   */
  static getRetryDelay(error: unknown, attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    
    if (error instanceof BiasPythonServiceTimeoutError) {
      // Exponential backoff for timeout errors
      return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    }
    
    if (error instanceof BiasPythonServiceError) {
      // Linear backoff for service errors
      return Math.min(baseDelay * (attempt + 1), maxDelay);
    }
    
    // Default exponential backoff
    return Math.min(baseDelay * Math.pow(1.5, attempt), maxDelay);
  }

  /**
   * Should error be logged as critical alert
   */
  static shouldAlert(error: unknown): boolean {
    if (error instanceof BiasDetectionError) {
      return error.severity === 'critical' || 
             (error.severity === 'high' && !error.recoverable);
    }
    return false;
  }

  /**
   * Extract monitoring metrics from error
   */
  static getMetrics(error: unknown): Record<string, unknown> {
    if (error instanceof BiasDetectionError) {
      return {
        errorCode: error.code,
        errorCategory: error.category,
        errorSeverity: error.severity,
        errorRecoverable: error.recoverable,
        errorTimestamp: error.timestamp.toISOString(),
        ...error.context,
      };
    }
    
    return {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: this.getErrorMessage(error),
      errorTimestamp: new Date().toISOString(),
    };
  }
}

/**
 * Error aggregation for monitoring and alerting
 */
export class BiasErrorAggregator {
  private errorCounts: Map<string, number> = new Map();
  private errorSamples: Map<string, BiasDetectionError[]> = new Map();
  private readonly maxSamplesPerType = 10;

  /**
   * Record error occurrence
   */
  recordError(error: unknown): void {
    if (error instanceof BiasDetectionError) {
      const key = `${error.code}_${error.severity}`;
      this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
      
      if (!this.errorSamples.has(key)) {
        this.errorSamples.set(key, []);
      }
      
      const samples = this.errorSamples.get(key)!;
      if (samples.length < this.maxSamplesPerType) {
        samples.push(error);
      }
    }
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    criticalErrors: number;
    recoverableErrors: number;
    samples: Record<string, BiasDetectionError[]>;
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const errorsByType = Object.fromEntries(this.errorCounts);
    
    let criticalErrors = 0;
    let recoverableErrors = 0;
    
    for (const [key, samples] of this.errorSamples) {
      for (const sample of samples) {
        if (sample.severity === 'critical') criticalErrors++;
        if (sample.recoverable) recoverableErrors++;
      }
    }

    return {
      totalErrors,
      errorsByType,
      criticalErrors,
      recoverableErrors,
      samples: Object.fromEntries(this.errorSamples),
    };
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.errorCounts.clear();
    this.errorSamples.clear();
  }
}

/**
 * Type guard utilities
 */
export function isBiasDetectionError(error: unknown): error is BiasDetectionError {
  return error instanceof BiasDetectionError;
}

export function isBiasConfigurationError(error: unknown): error is BiasConfigurationError {
  return error instanceof BiasConfigurationError;
}

export function isBiasValidationError(error: unknown): error is BiasValidationError {
  return error instanceof BiasValidationError;
}

export function isBiasPythonServiceError(error: unknown): error is BiasPythonServiceError {
  return error instanceof BiasPythonServiceError;
}

export function isBiasSecurityError(error: unknown): error is BiasSecurityError {
  return error instanceof BiasSecurityError;
}

export function isBiasPerformanceError(error: unknown): error is BiasPerformanceError {
  return error instanceof BiasPerformanceError;
}

export function isBiasSystemError(error: unknown): error is BiasSystemError {
  return error instanceof BiasSystemError;
} 