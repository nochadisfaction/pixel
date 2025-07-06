/**
 * Sentry Configuration for Pixelated Empathy
 *
 * This file contains shared configuration for Sentry error monitoring
 * across both client and server environments.
 */

// Sentry project configuration
export const SENTRY_CONFIG = {
  // Core settings
  dsn:
    import.meta.env['PUBLIC_SENTRY_DSN'] ||
    'https://ef4ca2c0d2530a95efb0ef55c168b661@o4509483611979776.ingest.us.sentry.io/4509483637932032',

  // Environment and release info
  environment: import.meta.env.MODE || 'production',
  release: import.meta.env['PUBLIC_APP_VERSION'] || '0.0.1',

  // Performance monitoring
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1, // 100% in dev, 10% in prod
  profilesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,

  // Session replay settings
  replaysSessionSampleRate: 0.1, // 10% of all sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Privacy settings
  sendDefaultPii: true,

  // Debug mode
  debug: import.meta.env.DEV,

  // Application context
  tags: {
    app: 'pixelated-empathy',
    platform: 'astro',
    deployment: 'azure',
  },
} as const

// Simple error filtering function
export function beforeSend(event: unknown): unknown | null {
  // Basic filtering - can be expanded as needed
  if (import.meta.env.DEV) {
    console.log('Sentry event:', event)
  }

  return event
}

// Sentry initialization helper
export function initSentry(additionalConfig: Record<string, unknown> = {}) {
  return {
    ...SENTRY_CONFIG,
    beforeSend,
    ...additionalConfig,
  }
}
