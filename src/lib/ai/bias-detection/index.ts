/**
 * Bias Detection Engine - Main Exports
 *
 * Refactored modular implementation for better maintainability.
 */

// Main engine
export { BiasDetectionEngine } from './BiasDetectionEngine'

// Core modules
export { PythonBiasDetectionBridge } from './python-bridge'
export { BiasMetricsCollector } from './metrics-collector'
export { BiasAlertSystem } from './alerts-system'

// Types and interfaces
export type * from './types'
export type * from './bias-detection-interfaces'

// Utilities
export * from './utils'

// Services
export { getAuditLogger } from './audit'
export { getCacheManager } from './cache'
export { performanceMonitor } from './performance-monitor'

// Serverless helpers
export * from './serverless-handlers'

// Default export
export { BiasDetectionEngine as default } from './BiasDetectionEngine'
