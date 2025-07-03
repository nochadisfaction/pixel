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
    containerName: (() => {
      const value = config.azure.storageContainerName()
      if (!value) {
        const isProduction = process.env['NODE_ENV'] === 'production'
        const isCIEnvironment = process.env['CI'] === 'true' || process.env['GITHUB_ACTIONS'] === 'true'
        
        if (isProduction && !isCIEnvironment) {
          throw new Error('AZURE_STORAGE_CONTAINER_NAME environment variable is required in production')
        }
        return 'pixelated-dev-backups' // Safe default for development and CI builds
      }
      return value
    })(),

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
      const isLocalEnvironment = process.env['NODE_ENV'] === 'development' || 
                                 process.env['NODE_ENV'] === 'test' ||
                                 !process.env['NODE_ENV']
      
      if (!process.env['PUBLIC_SITE_URL']) {
        if (!isLocalEnvironment) {
          throw new Error(
            'PUBLIC_SITE_URL environment variable is required for Azure OAuth configuration in non-local environments. ' +
            'This prevents security risks from using localhost callback URLs in production.'
          )
        }
        // Only allow localhost fallback in local development environments
        console.warn('⚠️  Using localhost callback URL for Azure OAuth - this should only be used in development')
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
    resourceGroupName: (() => {
      const value = process.env['AZURE_RESOURCE_GROUP']
      if (!value) {
        if (process.env['NODE_ENV'] === 'production') {
          throw new Error('AZURE_RESOURCE_GROUP environment variable is required in production')
        }
        return 'pixelated-dev-rg' // Safe default for development only
      }
      return value
    })(),
    
    location: (() => {
      const value = process.env['AZURE_LOCATION']
      if (!value) {
        if (process.env['NODE_ENV'] === 'production') {
          throw new Error('AZURE_LOCATION environment variable is required in production')
        }
        return 'East US' // Safe default for development only
      }
      return value
    })(),
    
    subscriptionId: (() => {
      const value = process.env['AZURE_SUBSCRIPTION_ID']
      if (!value && process.env['NODE_ENV'] === 'production') {
        throw new Error('AZURE_SUBSCRIPTION_ID environment variable is required in production')
      }
      return value
    })(),

    // Static Web Apps
    staticWebApp: {
      name: (() => {
        const value = process.env['AZURE_STATIC_WEB_APP_NAME']
        if (!value) {
          if (process.env['NODE_ENV'] === 'production') {
            throw new Error('AZURE_STATIC_WEB_APP_NAME environment variable is required in production')
          }
          return 'pixelated-dev-swa' // Safe default for development only
        }
        return value
      })(),
      sku: process.env['AZURE_STATIC_WEB_APP_SKU'] || 'Free',
    },

    // App Service
    appService: {
      name: (() => {
        const value = process.env['AZURE_APP_SERVICE_NAME']
        if (!value) {
          if (process.env['NODE_ENV'] === 'production') {
            throw new Error('AZURE_APP_SERVICE_NAME environment variable is required in production')
          }
          return 'pixelated-dev-app' // Safe default for development only
        }
        return value
      })(),
      planName: (() => {
        const value = process.env['AZURE_APP_SERVICE_PLAN']
        if (!value) {
          if (process.env['NODE_ENV'] === 'production') {
            throw new Error('AZURE_APP_SERVICE_PLAN environment variable is required in production')
          }
          return 'pixelated-dev-plan' // Safe default for development only
        }
        return value
      })(),
      sku: process.env['AZURE_APP_SERVICE_SKU'] || 'B1',
    },

    // Functions
    functions: {
      name: (() => {
        const value = process.env['AZURE_FUNCTIONS_NAME']
        if (!value) {
          if (process.env['NODE_ENV'] === 'production') {
            throw new Error('AZURE_FUNCTIONS_NAME environment variable is required in production')
          }
          return 'pixelated-dev-functions' // Safe default for development only
        }
        return value
      })(),
      storageAccount: (() => {
        const value = process.env['AZURE_FUNCTIONS_STORAGE']
        if (!value) {
          if (process.env['NODE_ENV'] === 'production') {
            throw new Error('AZURE_FUNCTIONS_STORAGE environment variable is required in production')
          }
          return 'pixelateddevfunc' // Safe default for development only
        }
        return value
      })(),
    },
  },

  /**
   * Validate all required Azure configuration for production environments
   * Call this method during application startup to fail fast if configuration is missing
   */
  validateProductionConfig(): void {
    if (process.env['NODE_ENV'] !== 'production') {
      return // Skip validation in non-production environments
    }

    const requiredEnvVars = [
      'PUBLIC_SITE_URL', // Required for OAuth redirect URI
      'AZURE_STORAGE_CONTAINER_NAME', // Required for storage operations
      'AZURE_RESOURCE_GROUP',
      'AZURE_LOCATION', 
      'AZURE_SUBSCRIPTION_ID',
      'AZURE_STATIC_WEB_APP_NAME',
      'AZURE_APP_SERVICE_NAME',
      'AZURE_APP_SERVICE_PLAN',
      'AZURE_FUNCTIONS_NAME',
      'AZURE_FUNCTIONS_STORAGE'
    ]

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required Azure environment variables for production: ${missingVars.join(', ')}\n` +
        'Set these environment variables or use a non-production NODE_ENV to use development defaults.'
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
