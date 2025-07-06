import * as Sentry from '@sentry/astro'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ||
    'https://ef4ca2c0d2530a95efb0ef55c168b661@o4509483611979776.ingest.us.sentry.io/4509483637932032',

  // Performance monitoring and profiling
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  profilesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  integrations: [
    // Add profiling integration for server performance monitoring
    nodeProfilingIntegration(),
  ],

  // Set user context with personal information
  sendDefaultPii: true,

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Set environment
  environment: process.env.NODE_ENV || 'production',

  // Release tracking
  release: process.env.npm_package_version || '0.0.1',

  // Server-side error filtering
  beforeSend(event) {
    // Filter out Azure health check requests
    if (event.request?.url?.includes('/api/health')) {
      return null
    }

    // Filter out Azure warm-up requests
    if (event.request?.headers?.['user-agent']?.includes('AlwaysOn')) {
      return null
    }

    // Filter out expected Azure Static Web Apps errors
    if (event.exception?.values?.[0]?.value?.includes('ENOTFOUND')) {
      return null
    }

    return event
  },

  // Additional tags for server context
  initialScope: {
    tags: {
      component: 'astro-server',
      platform: 'azure',
    },
    context: {
      app: {
        name: 'Pixelated Empathy',
        version: process.env.npm_package_version || '0.0.1',
      },
      runtime: {
        name: 'node',
        version: process.version,
      },
    },
  },
})
