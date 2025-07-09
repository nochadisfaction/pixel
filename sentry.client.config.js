import * as Sentry from '@sentry/astro'
import { browserTracingIntegration, replayIntegration, feedbackIntegration } from '@sentry/browser'
import { initSentry } from './src/lib/sentry/config'

const sentryConfig = initSentry({
  // Client-specific integrations
  integrations: [
    browserTracingIntegration(),
    replayIntegration({
      sessionSampleRate: 0.1,
      errorSampleRate: 1.0,
    }),
    feedbackIntegration({
      colorScheme: 'auto',
      showBranding: false,
    }),
  ],

  // Client-specific configuration
  initialScope: {
    tags: {
      component: 'astro-client',
    },
  },
})

Sentry.init(sentryConfig)
