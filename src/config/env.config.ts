import { z } from 'zod'

/**
 * Environment variable schema with validation
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Server configuration
  PORT: z.string().transform(Number).default('3000'),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'verbose', 'debug'])
    .default('info'),
  ENABLE_RATE_LIMITING: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),

  // Analytics worker configuration
  ANALYTICS_WS_PORT: z.string().transform(Number).default('8083'),

  // Notification worker configuration
  NOTIFICATION_WS_PORT: z.string().transform(Number).default('8082'),

  // Database
  POSTGRES_URL: z.string().optional(),
  POSTGRES_PRISMA_URL: z.string().optional(),
  POSTGRES_URL_NON_POOLING: z.string().optional(),

  // Redis configuration
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REDIS_TOKEN: z.string().optional(),

  // Authentication
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),

  // APIs
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  TOGETHER_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  REPLICATE_API_TOKEN: z.string().optional(),

  // Azure OpenAI
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().url().optional(),
  AZURE_OPENAI_API_VERSION: z.string().optional(),
  AZURE_OPENAI_DEPLOYMENT_NAME: z.string().optional(),

  // Azure Services
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),
  AZURE_STORAGE_ACCOUNT_NAME: z.string().optional(),
  AZURE_STORAGE_ACCOUNT_KEY: z.string().optional(),
  AZURE_STORAGE_CONTAINER_NAME: z.string().optional(),

  // Azure Authentication
  AZURE_AD_CLIENT_ID: z.string().optional(),
  AZURE_AD_CLIENT_SECRET: z.string().optional(),
  AZURE_AD_TENANT_ID: z.string().optional(),

  // Monitoring and analytics
  SENTRY_DSN: z.string().url().optional(),
  AXIOM_DATASET: z.string().optional(),
  AXIOM_TOKEN: z.string().optional(),
  VITE_LITLYX_PROJECT_ID: z.string().optional(),
  VITE_LITLYX_API_KEY: z.string().optional(),

  // Email
  EMAIL_FROM: z.string().email().optional(),
  RESEND_API_KEY: z.string().optional(),

  // Security
  SECURITY_ENABLE_BRUTE_FORCE_PROTECTION: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),
  SECURITY_MAX_LOGIN_ATTEMPTS: z.string().transform(Number).default('5'),
  SECURITY_ACCOUNT_LOCKOUT_DURATION: z
    .string()
    .transform(Number)
    .default('1800'),
  SECURITY_API_ABUSE_THRESHOLD: z.string().transform(Number).default('100'),
  SECURITY_ENABLE_ALERTS: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),

  // Rate limiting
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),

  // Logging
  LOG_CONSOLE: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),
  LOG_AUDIT: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),

  // Client-side variables (exposed to the browser)
  VITE_API_URL: z.string().url().optional(),
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().optional(),

  // Notification configuration
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().url().optional(),

  // Twilio configuration
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Slack (for notifications)
  SLACK_WEBHOOK_URL: z.string().url().optional(),

  // MentalLLaMA configuration
  MENTALLAMA_API_KEY: z.string().optional(),
  MENTALLAMA_ENDPOINT_URL_7B: z.string().url().optional(),
  MENTALLAMA_ENDPOINT_URL_13B: z.string().url().optional(),
  MENTALLAMA_DEFAULT_MODEL_TIER: z.enum(['7B', '13B']).optional(),
  MENTALLAMA_ENABLE_PYTHON_BRIDGE: z
    .string()
    .transform((val: string) => val === 'true')
    .optional(),
  MENTALLAMA_PYTHON_BRIDGE_SCRIPT_PATH: z.string().optional(),
})

/**
 * Cache the validated environment variables
 */
let cachedEnv: z.infer<typeof envSchema>

// Helper to mask secrets in logs

function maskEnv(env: Record<string, unknown>): Record<string, unknown> {
  const secretKeys = [
    'SUPABASE_KEY',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_JWT_SECRET',
    'OPENAI_API_KEY',
    'TOGETHER_API_KEY',
    'GOOGLE_API_KEY',
    'REPLICATE_API_TOKEN',
    'AXIOM_TOKEN',
    'VITE_LITLYX_API_KEY',
    'RESEND_API_KEY',
    'TWILIO_AUTH_TOKEN',
    'UPSTASH_REDIS_REST_TOKEN',
    'REDIS_TOKEN',
    'SENTRY_DSN',
    'SLACK_WEBHOOK_URL',
  ]
  return Object.fromEntries(
    Object.entries(env).map(([k, v]) => [
      k,
      secretKeys.includes(k) && v ? '[hidden]' : v,
    ]),
  )
}
/**
 * Get the validated environment variables
 */
export function getEnv(): z.infer<typeof envSchema> {
  if (!cachedEnv) {
    // Type-safe environment source handling
    let envSource: Record<string, unknown>

    if (typeof process !== 'undefined') {
      envSource = process.env as Record<string, unknown>
    } else {
      // For browser/Vite environments, we'll work with an empty object
      // since client-side env vars should be prefixed with VITE_
      envSource = {}
    }

    // Log all env variables (masking secrets)
    // Only log in CI or production to avoid local noise
    if (envSource['CI'] || envSource['NODE_ENV'] === 'production') {
      console.log(
        '[env.config] Environment variables at build:',
        maskEnv(envSource),
      )
    }

    try {
      cachedEnv = envSchema.parse(envSource)
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        console.error(
          '[env.config] Environment variable validation failed:',
          error.errors,
        )
        // Optionally, print the received values for failed fields
        for (const err of error.errors) {
          const key = err.path[0]
          if (typeof key === 'string') {
            console.error(
              `[env.config] Value for ${key}:`,
              maskEnv({ [key]: envSource[key] }),
            )
          }
        }
      }
      throw error
    }
  }
  return cachedEnv
}

/**
 * Export the environment directly for convenience
 */
export const env = getEnv()

/**
 * Type definition for environment variables
 */
export type Env = z.infer<typeof envSchema>

/**
 * Environment configuration object
 */
export const config = {
  isDevelopment: (): boolean => getEnv().NODE_ENV === 'development',
  isProduction: (): boolean => getEnv().NODE_ENV === 'production',
  isTest: (): boolean => getEnv().NODE_ENV === 'test',

  server: {
    port: (): number => getEnv().PORT,
    logLevel: (): string => getEnv().LOG_LEVEL,
    enableRateLimiting: (): boolean => getEnv().ENABLE_RATE_LIMITING,
  },

  workers: {
    analytics: {
      wsPort: (): number => getEnv().ANALYTICS_WS_PORT,
    },
    notification: {
      wsPort: (): number => getEnv().NOTIFICATION_WS_PORT,
    },
  },

  database: {
    url: (): string | undefined => getEnv().POSTGRES_URL,
    prismaUrl: (): string | undefined => getEnv().POSTGRES_PRISMA_URL,
    nonPoolingUrl: (): string | undefined => getEnv().POSTGRES_URL_NON_POOLING,
  },

  redis: {
    url: (): string | undefined =>
      getEnv().UPSTASH_REDIS_REST_URL || getEnv().REDIS_URL,
    token: (): string | undefined =>
      getEnv().UPSTASH_REDIS_REST_TOKEN || getEnv().REDIS_TOKEN,
  },

  supabase: {
    url: (): string | undefined => getEnv().SUPABASE_URL,
    key: (): string | undefined => getEnv().SUPABASE_KEY,
    anonKey: (): string | undefined => getEnv().SUPABASE_ANON_KEY,
    serviceRoleKey: (): string | undefined =>
      getEnv().SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: (): string | undefined => getEnv().SUPABASE_JWT_SECRET,
  },

  ai: {
    openAiKey: (): string | undefined => getEnv().OPENAI_API_KEY,
    openAiBaseUrl: (): string | undefined => getEnv().OPENAI_BASE_URL,
    anthropicApiKey: (): string | undefined => getEnv().ANTHROPIC_API_KEY,
    togetherApiKey: (): string | undefined => getEnv().TOGETHER_API_KEY,
    googleApiKey: (): string | undefined => getEnv().GOOGLE_API_KEY,
    replicateToken: (): string | undefined => getEnv().REPLICATE_API_TOKEN,

    // Azure OpenAI
    azureOpenAiKey: (): string | undefined => getEnv().AZURE_OPENAI_API_KEY,
    azureOpenAiEndpoint: (): string | undefined =>
      getEnv().AZURE_OPENAI_ENDPOINT,
    azureOpenAiApiVersion: (): string | undefined =>
      getEnv().AZURE_OPENAI_API_VERSION,
    azureOpenAiDeploymentName: (): string | undefined =>
      getEnv().AZURE_OPENAI_DEPLOYMENT_NAME,
  },

  azure: {
    // Storage
    storageConnectionString: (): string | undefined =>
      getEnv().AZURE_STORAGE_CONNECTION_STRING,
    storageAccountName: (): string | undefined =>
      getEnv().AZURE_STORAGE_ACCOUNT_NAME,
    storageAccountKey: (): string | undefined =>
      getEnv().AZURE_STORAGE_ACCOUNT_KEY,
    storageContainerName: (): string | undefined =>
      getEnv().AZURE_STORAGE_CONTAINER_NAME,

    // Authentication
    adClientId: (): string | undefined => getEnv().AZURE_AD_CLIENT_ID,
    adClientSecret: (): string | undefined => getEnv().AZURE_AD_CLIENT_SECRET,
    adTenantId: (): string | undefined => getEnv().AZURE_AD_TENANT_ID,
  },

  monitoring: {
    sentryDsn: (): string | undefined => getEnv().SENTRY_DSN,
    axiomDataset: (): string | undefined => getEnv().AXIOM_DATASET,
    axiomToken: (): string | undefined => getEnv().AXIOM_TOKEN,
    litlyxProjectId: (): string | undefined => getEnv().VITE_LITLYX_PROJECT_ID,
    litlyxApiKey: (): string | undefined => getEnv().VITE_LITLYX_API_KEY,
  },

  email: {
    from: (): string | undefined => getEnv().EMAIL_FROM,
    resendApiKey: (): string | undefined => getEnv().RESEND_API_KEY,
  },

  security: {
    enableBruteForceProtection: (): boolean =>
      getEnv().SECURITY_ENABLE_BRUTE_FORCE_PROTECTION,
    maxLoginAttempts: (): number => getEnv().SECURITY_MAX_LOGIN_ATTEMPTS,
    accountLockoutDuration: (): number =>
      getEnv().SECURITY_ACCOUNT_LOCKOUT_DURATION,
    apiAbuseThreshold: (): number => getEnv().SECURITY_API_ABUSE_THRESHOLD,
    enableAlerts: (): boolean => getEnv().SECURITY_ENABLE_ALERTS,
  },

  rateLimiting: {
    maxRequests: (): number => getEnv().RATE_LIMIT_MAX_REQUESTS,
    windowMs: (): number => getEnv().RATE_LIMIT_WINDOW_MS,
  },

  logging: {
    console: (): boolean => getEnv().LOG_CONSOLE,
    audit: (): boolean => getEnv().LOG_AUDIT,
  },

  client: {
    apiUrl: (): string | undefined => getEnv().VITE_API_URL,
    supabaseUrl: (): string | undefined => getEnv().VITE_SUPABASE_URL,
    supabaseAnonKey: (): string | undefined => getEnv().VITE_SUPABASE_ANON_KEY,
  },

  notifications: {
    vapidPublicKey: (): string | undefined => getEnv().VAPID_PUBLIC_KEY,
    vapidPrivateKey: (): string | undefined => getEnv().VAPID_PRIVATE_KEY,
    vapidSubject: (): string | undefined => getEnv().VAPID_SUBJECT,
    slackWebhookUrl: (): string | undefined => getEnv().SLACK_WEBHOOK_URL, // Added for Slack
  },

  twilio: {
    accountSid: (): string | undefined => getEnv().TWILIO_ACCOUNT_SID,
    authToken: (): string | undefined => getEnv().TWILIO_AUTH_TOKEN,
    phoneNumber: (): string | undefined => getEnv().TWILIO_PHONE_NUMBER,
  },

  mentalLLaMA: {
    apiKey: (): string | undefined => getEnv().MENTALLAMA_API_KEY,
    endpointUrl7B: (): string | undefined =>
      getEnv().MENTALLAMA_ENDPOINT_URL_7B,
    endpointUrl13B: (): string | undefined =>
      getEnv().MENTALLAMA_ENDPOINT_URL_13B,
    defaultModelTier: (): '7B' | '13B' | undefined =>
      getEnv().MENTALLAMA_DEFAULT_MODEL_TIER,
    enablePythonBridge: (): boolean | undefined =>
      getEnv().MENTALLAMA_ENABLE_PYTHON_BRIDGE,
    pythonBridgeScriptPath: (): string | undefined =>
      getEnv().MENTALLAMA_PYTHON_BRIDGE_SCRIPT_PATH,
  },
}

export default config
