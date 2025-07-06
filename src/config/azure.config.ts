import config from './env.config'

/**
 * Azure-specific configuration
 * Centralizes all Azure service configurations
 */
export const azureConfig = {
  /**
   * Azure OpenAI Configuration
   */
  openai: {
    apiKey: config.ai.azureOpenAiKey(),
    endpoint: config.ai.azureOpenAiEndpoint(),
    apiVersion: config.ai.azureOpenAiApiVersion() || '2024-02-01',
    deploymentName: config.ai.azureOpenAiDeploymentName() || 'gpt-4',

    /**
     * Check if Azure OpenAI is properly configured
     */
    isConfigured(): boolean {
      return !!(this.apiKey && this.endpoint)
    },

    /**
     * Get the full Azure OpenAI URL for API calls
     */
    getApiUrl(endpoint: string = 'chat/completions'): string {
      if (!this.endpoint) {
        throw new Error('Azure OpenAI endpoint is not configured')
      }

      const baseUrl = this.endpoint.endsWith('/')
        ? this.endpoint.slice(0, -1)
        : this.endpoint

      return `${baseUrl}/openai/deployments/${this.deploymentName}/${endpoint}?api-version=${this.apiVersion}`
    },

    /**
     * Get headers for Azure OpenAI API requests
     */
    getHeaders(): Record<string, string> {
      if (!this.apiKey) {
        throw new Error('Azure OpenAI API key is not configured')
      }

      return {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      }
    },
  },

  /**
   * Azure Storage Configuration
   */
  storage: {
    connectionString: config.azure.storageConnectionString(),
    accountName: config.azure.storageAccountName(),
    accountKey: config.azure.storageAccountKey(),
    get containerName() {
      const value = config.azure.storageContainerName()
      if (!value) {
        const isProduction = process.env['NODE_ENV'] === 'production'
        const isAzurePipeline =
          process.env['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI'] ||
          process.env['BUILD_BUILDID']
        const isGitHubActions = process.env['GITHUB_ACTIONS'] === 'true'
        const isCIEnvironment =
          process.env['CI'] === 'true' || isGitHubActions || isAzurePipeline

        // In Azure Pipelines, secrets are available as environment variables
        if (isProduction && !isCIEnvironment) {
          console.warn(
            '⚠️ AZURE_STORAGE_CONTAINER_NAME not set in production, using default',
          )
        }
        return isProduction ? 'pixelated-backups' : 'pixelated-dev-backups'
      }
      return value
    },

    /**
     * Check if Azure Storage is properly configured
     */
    isConfigured(): boolean {
      return !!(this.connectionString || (this.accountName && this.accountKey))
    },

    /**
     * Get storage account URL
     */
    getStorageUrl(): string {
      if (!this.accountName) {
        throw new Error('Azure Storage account name is not configured')
      }
      return `https://${this.accountName}.blob.core.windows.net`
    },
  },

  /**
   * Azure Active Directory Configuration
   */
  auth: {
    clientId: config.azure.adClientId(),
    clientSecret: config.azure.adClientSecret(),
    tenantId: config.azure.adTenantId(),

    /**
     * Check if Azure AD is properly configured
     */
    isConfigured(): boolean {
      return !!(this.clientId && this.clientSecret && this.tenantId)
    },

    /**
     * Get Azure AD authority URL
     */
    getAuthorityUrl(): string {
      if (!this.tenantId) {
        throw new Error('Azure AD tenant ID is not configured')
      }
      return `https://login.microsoftonline.com/${this.tenantId}`
    },

    /**
     * Get OAuth2 configuration for Azure AD
     */
    getOAuthConfig() {
      // Validate redirect URI configuration for non-local environments
      const isLocalEnvironment =
        process.env['NODE_ENV'] === 'development' ||
        process.env['NODE_ENV'] === 'test' ||
        !process.env['NODE_ENV']
      const isAzurePipeline =
        process.env['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI'] ||
        process.env['BUILD_BUILDID']
      const isGitHubActions = process.env['GITHUB_ACTIONS'] === 'true'
      const isCIEnvironment =
        process.env['CI'] === 'true' || isGitHubActions || isAzurePipeline

      if (!process.env['PUBLIC_SITE_URL']) {
        if (!isLocalEnvironment && !isCIEnvironment) {
          throw new Error(
            'PUBLIC_SITE_URL environment variable is required for Azure OAuth configuration in non-local environments. ' +
              'This prevents security risks from using localhost callback URLs in production.',
          )
        }
        // Only allow localhost fallback in local development environments or CI builds
        if (!isCIEnvironment) {
          console.warn(
            '⚠️  Using localhost callback URL for Azure OAuth - this should only be used in development',
          )
        }
      }

      const redirectUri = process.env['PUBLIC_SITE_URL']
        ? `${process.env['PUBLIC_SITE_URL']}/auth/callback/azure`
        : 'http://localhost:4321/auth/callback/azure'

      return {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        tenantId: this.tenantId,
        authority: this.getAuthorityUrl(),
        redirectUri,
        scopes: ['openid', 'profile', 'email', 'User.Read'],
      }
    },
  },

  /**
   * Azure Application Insights Configuration
   */
  monitoring: {
    connectionString: process.env['APPLICATIONINSIGHTS_CONNECTION_STRING'],
    instrumentationKey: process.env['APPINSIGHTS_INSTRUMENTATIONKEY'],

    /**
     * Check if Application Insights is configured
     */
    isConfigured(): boolean {
      return !!(this.connectionString || this.instrumentationKey)
    },
  },

  /**
   * Azure deployment configuration
   */
  deployment: {
    get resourceGroupName() {
      const value = process.env['AZURE_RESOURCE_GROUP']
      if (!value) {
        return process.env['NODE_ENV'] === 'production'
          ? 'pixelated-rg'
          : 'pixelated-dev-rg'
      }
      return value
    },

    get location() {
      const value = process.env['AZURE_LOCATION']
      if (!value) {
        return process.env['NODE_ENV'] === 'production' ? 'eastus' : 'East US'
      }
      return value
    },

    get subscriptionId() {
      const value = process.env['AZURE_SUBSCRIPTION_ID']
      const isProduction = process.env['NODE_ENV'] === 'production'
      const isAzurePipeline =
        process.env['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI'] ||
        process.env['BUILD_BUILDID']
      const isGitHubActions = process.env['GITHUB_ACTIONS'] === 'true'
      const isCIEnvironment =
        process.env['CI'] === 'true' || isGitHubActions || isAzurePipeline

      // Skip validation during CI builds
      if (isCIEnvironment) {
        return value || '' // Return empty string during CI builds
      }

      // Only require subscription ID in production runtime, not during builds
      if (!value && isProduction) {
        throw new Error(
          'AZURE_SUBSCRIPTION_ID environment variable is required in production',
        )
      }
      return value
    },

    // Static Web Apps
    staticWebApp: {
      get name() {
        const value = process.env['AZURE_STATIC_WEB_APP_NAME']
        if (!value) {
          // Static Web Apps are optional - don't throw error in production
          return process.env['NODE_ENV'] === 'production'
            ? ''
            : 'pixelated-dev-swa'
        }
        return value
      },
      sku: process.env['AZURE_STATIC_WEB_APP_SKU'] || 'Free',
    },

    // App Service
    appService: {
      get name() {
        const value = process.env['AZURE_APP_SERVICE_NAME']
        if (!value) {
          return process.env['NODE_ENV'] === 'production'
            ? 'pixelated-app'
            : 'pixelated-dev-app'
        }
        return value
      },
      get planName() {
        const value = process.env['AZURE_APP_SERVICE_PLAN']
        if (!value) {
          return process.env['NODE_ENV'] === 'production'
            ? 'pixelated-plan'
            : 'pixelated-dev-plan'
        }
        return value
      },
      sku: process.env['AZURE_APP_SERVICE_SKU'] || 'B1',
    },

    // Functions
    functions: {
      get name() {
        const value = process.env['AZURE_FUNCTIONS_NAME']
        if (!value) {
          // Functions are optional - don't throw error in production
          return process.env['NODE_ENV'] === 'production'
            ? ''
            : 'pixelated-dev-functions'
        }
        return value
      },
      get storageAccount() {
        const value = process.env['AZURE_FUNCTIONS_STORAGE']
        if (!value) {
          // Functions storage is optional - don't throw error in production
          return process.env['NODE_ENV'] === 'production'
            ? 'pixelatedstorage2031'
            : 'pixelateddevfunc'
        }
        return value
      },
    },
  },

  /**
   * Validate all required Azure configuration for production environments
   * Call this method during application startup to fail fast if configuration is missing
   */
  validateProductionConfig(): void {
    const isProduction = process.env['NODE_ENV'] === 'production'
    const isAzurePipeline =
      process.env['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI'] ||
      process.env['BUILD_BUILDID']
    const isGitHubActions = process.env['GITHUB_ACTIONS'] === 'true'
    const isCIEnvironment =
      process.env['CI'] === 'true' || isGitHubActions || isAzurePipeline

    // Always skip validation during CI builds, regardless of NODE_ENV
    if (isCIEnvironment) {
      console.log(
        '🔧 Skipping Azure configuration validation in CI environment',
      )
      return
    }

    if (!isProduction) {
      return // Skip validation in non-production environments
    }

    // Only validate critical environment variables that are absolutely required
    const criticalEnvVars = [
      'PUBLIC_SITE_URL', // Required for OAuth redirect URI
      'AZURE_SUBSCRIPTION_ID', // Required for Azure operations
    ]

    // Optional variables that have fallbacks
    const optionalEnvVars = [
      'AZURE_STORAGE_CONTAINER_NAME', // Has fallback in storage config
      'AZURE_RESOURCE_GROUP', // Has fallback in deployment config
      'AZURE_LOCATION', // Has fallback in deployment config
      'AZURE_STATIC_WEB_APP_NAME', // Optional - only needed if using Static Web Apps
      'AZURE_APP_SERVICE_NAME', // Has fallback in deployment config
      'AZURE_APP_SERVICE_PLAN', // Has fallback in deployment config
      'AZURE_FUNCTIONS_NAME', // Optional - only needed if using Functions
      'AZURE_FUNCTIONS_STORAGE', // Optional - only needed if using Functions
    ]

    const missingCriticalVars = criticalEnvVars.filter(
      (varName) => !process.env[varName],
    )
    const missingOptionalVars = optionalEnvVars.filter(
      (varName) => !process.env[varName],
    )

    if (missingCriticalVars.length > 0) {
      throw new Error(
        `Missing critical Azure environment variables for production: ${missingCriticalVars.join(', ')}\n` +
          'These variables are required for Azure operations to function properly.',
      )
    }

    if (missingOptionalVars.length > 0) {
      console.warn(
        `⚠️  Missing optional Azure environment variables: ${missingOptionalVars.join(', ')}\n` +
          'Using fallback values. Some Azure features may be limited.',
      )
    }
  },

  /**
   * Get environment-specific resource prefix for development safety
   */
  getResourcePrefix(): string {
    const env = process.env['NODE_ENV'] || 'development'
    return env === 'production' ? 'pixelated' : `pixelated-${env}`
  },
}

export default azureConfig
