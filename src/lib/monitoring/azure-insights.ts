import { azureConfig } from '../../config/azure.config'
import { getLogger } from '../logging'

const logger = getLogger({ prefix: 'azure-insights' })

export interface TelemetryEvent {
  name: string
  properties?: Record<string, string>
  measurements?: Record<string, number>
  timestamp?: Date
}

export interface TelemetryException {
  exception: Error
  properties?: Record<string, string>
  measurements?: Record<string, number>
  severityLevel?: 'Verbose' | 'Information' | 'Warning' | 'Error' | 'Critical'
}

export interface TelemetryDependency {
  name: string
  data: string
  duration: number
  success: boolean
  resultCode?: string
  type?: string
  target?: string
  properties?: Record<string, string>
  measurements?: Record<string, number>
}

export interface TelemetryRequest {
  name: string
  url: string
  duration: number
  responseCode: string
  success: boolean
  properties?: Record<string, string>
  measurements?: Record<string, number>
}

export interface TelemetryMetric {
  name: string
  value: number
  count?: number
  min?: number
  max?: number
  stdDev?: number
  properties?: Record<string, string>
}

/**
 * Azure Application Insights Telemetry Service
 * Provides structured logging and monitoring for Azure environments
 */
export class AzureInsightsTelemetry {
  private connectionString: string | undefined
  private instrumentationKey: string | undefined
  private isConfigured: boolean

  constructor() {
    this.connectionString = azureConfig.monitoring.connectionString
    this.instrumentationKey = azureConfig.monitoring.instrumentationKey
    this.isConfigured = azureConfig.monitoring.isConfigured()

    if (!this.isConfigured) {
      logger.warn('Azure Application Insights is not configured')
    }
  }

  /**
   * Track a custom event
   */
  trackEvent(event: TelemetryEvent): void {
    if (!this.isConfigured) {
      logger.debug('Event tracked (Application Insights not configured)', { event })
      return
    }

    try {
      // In a real implementation, this would use the Application Insights SDK
      // For now, we'll log to console and send to a custom endpoint
      this.sendTelemetry('events', {
        name: event.name,
        properties: event.properties || {},
        measurements: event.measurements || {},
        timestamp: event.timestamp || new Date(),
      })

      logger.debug('Event tracked', { eventName: event.name })
    } catch (error) {
      logger.error('Failed to track event', {
        eventName: event.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Track an exception
   */
  trackException(exception: TelemetryException): void {
    if (!this.isConfigured) {
      logger.error('Exception tracked (Application Insights not configured)', {
        message: exception.exception.message,
        stack: exception.exception.stack,
      })
      return
    }

    try {
      this.sendTelemetry('exceptions', {
        exception: {
          message: exception.exception.message,
          stack: exception.exception.stack,
          name: exception.exception.name,
        },
        properties: exception.properties || {},
        measurements: exception.measurements || {},
        severityLevel: exception.severityLevel || 'Error',
        timestamp: new Date(),
      })

      logger.debug('Exception tracked', {
        message: exception.exception.message,
        severityLevel: exception.severityLevel,
      })
    } catch (error) {
      logger.error('Failed to track exception', {
        originalError: exception.exception.message,
        trackingError: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Track a dependency call
   */
  trackDependency(dependency: TelemetryDependency): void {
    if (!this.isConfigured) {
      logger.debug(
        'Dependency tracked (Application Insights not configured)',
        { dependency },
      )
      return
    }

    try {
      this.sendTelemetry('dependencies', {
        name: dependency.name,
        data: dependency.data,
        duration: dependency.duration,
        success: dependency.success,
        resultCode: dependency.resultCode,
        type: dependency.type || 'HTTP',
        target: dependency.target,
        properties: dependency.properties || {},
        measurements: dependency.measurements || {},
        timestamp: new Date(),
      })

      logger.debug('Dependency tracked', {
        name: dependency.name,
        duration: dependency.duration,
        success: dependency.success,
      })
    } catch (error) {
      logger.error('Failed to track dependency', {
        dependencyName: dependency.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Track an HTTP request
   */
  trackRequest(request: TelemetryRequest): void {
    if (!this.isConfigured) {
      logger.debug(
        'Request tracked (Application Insights not configured)',
        { request },
      )
      return
    }

    try {
      this.sendTelemetry('requests', {
        name: request.name,
        url: request.url,
        duration: request.duration,
        responseCode: request.responseCode,
        success: request.success,
        properties: request.properties || {},
        measurements: request.measurements || {},
        timestamp: new Date(),
      })

      logger.debug('Request tracked', {
        name: request.name,
        responseCode: request.responseCode,
        duration: request.duration,
      })
    } catch (error) {
      logger.error('Failed to track request', {
        requestName: request.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Track a custom metric
   */
  trackMetric(metric: TelemetryMetric): void {
    if (!this.isConfigured) {
      logger.debug(
        'Metric tracked (Application Insights not configured)',
        { metric },
      )
      return
    }

    try {
      this.sendTelemetry('metrics', {
        name: metric.name,
        value: metric.value,
        count: metric.count || 1,
        min: metric.min,
        max: metric.max,
        stdDev: metric.stdDev,
        properties: metric.properties || {},
        timestamp: new Date(),
      })

      logger.debug('Metric tracked', {
        name: metric.name,
        value: metric.value,
      })
    } catch (error) {
      logger.error('Failed to track metric', {
        metricName: metric.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Track page view
   */
  trackPageView(
    name: string,
    url?: string,
    properties?: Record<string, string>,
  ): void {
    if (!this.isConfigured) {
      logger.debug('Page view tracked (Application Insights not configured)', {
        name,
        url,
      })
      return
    }

    try {
      this.sendTelemetry('pageViews', {
        name,
        url: url || '',
        properties: properties || {},
        timestamp: new Date(),
      })

      logger.debug('Page view tracked', { name, url })
    } catch (error) {
      logger.error('Failed to track page view', {
        pageName: name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Flush all pending telemetry
   */
  flush(): void {
    if (!this.isConfigured) {
      return
    }

    try {
      // In a real implementation, this would flush the Application Insights buffer
      logger.debug('Telemetry flushed')
    } catch (error) {
      logger.error('Failed to flush telemetry', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Send telemetry data to Application Insights
   */
  private async sendTelemetry(type: string, _data: unknown): Promise<void> {
    if (!this.connectionString && !this.instrumentationKey) {
      return
    }

    try {
      // In a real implementation, this would use the Application Insights REST API
      // or the official SDK. For now, we'll simulate the call.

      

      // Log the telemetry data for debugging
      logger.debug('Telemetry data prepared', {
        type,
        instrumentationKey: this.instrumentationKey
          ? 'configured'
          : 'not configured',
        connectionString: this.connectionString
          ? 'configured'
          : 'not configured',
      })

      // In production, you would send this to:
      // https://dc.applicationinsights.azure.com/v2/track
      // with proper authentication and error handling
    } catch (error) {
      logger.error('Failed to send telemetry', {
        type,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Create a timer for tracking operation duration
   */
  startTimer(): {
    stop: (name: string, properties?: Record<string, string>) => void
  } {
    const startTime = Date.now()

    return {
      stop: (name: string, properties?: Record<string, string>) => {
        const duration = Date.now() - startTime
        this.trackMetric({
          name: `${name}.duration`,
          value: duration,
          properties: properties ?? {},
        })
      },
    }
  }

  /**
   * Get configuration status
   */
  getStatus(): {
    configured: boolean
    connectionString: boolean
    instrumentationKey: boolean
  } {
    return {
      configured: this.isConfigured,
      connectionString: !!this.connectionString,
      instrumentationKey: !!this.instrumentationKey,
    }
  }
}

// Export singleton instance
export const azureInsights = new AzureInsightsTelemetry()
export default azureInsights
