import * as Sentry from "@sentry/astro";
import { initSentry } from "./src/lib/sentry/config";

const sentryConfig = initSentry({
  // Client-specific integrations
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      sessionSampleRate: 0.1,
      errorSampleRate: 1.0,
    }),
    Sentry.feedbackIntegration({
      colorScheme: "auto",
      showBranding: false,
    }),
  ],
  
  // Client-specific configuration
  initialScope: {
    tags: {
      component: "astro-client",
    },
  }
});

Sentry.init(sentryConfig);
