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
    }
  },

  /**
   * Azure Storage Configuration
   */
  storage: {
    connectionString: config.azure.storageConnectionString(),
    accountName: config.azure.storageAccountName(),
    accountKey: config.azure.storageAccountKey(),
    containerName: config.azure.storageContainerName() || 'pixelated-backups',

    /**
     * Check if Azure Storage is properly configured
     */
    isConfigured(): boolean {
      return !!(
        this.connectionString || 
        (this.accountName && this.accountKey)
      )
    },

    /**
     * Get storage account URL
     */
    getStorageUrl(): string {
      if (!this.accountName) {
        throw new Error('Azure Storage account name is not configured')
      }
      return `https://${this.accountName}.blob.core.windows.net`
    }
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
      return {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        tenantId: this.tenantId,
        authority: this.getAuthorityUrl(),
        redirectUri: process.env.PUBLIC_SITE_URL ? 
          `${process.env.PUBLIC_SITE_URL}/auth/callback/azure` : 
          'http://localhost:4321/auth/callback/azure',
        scopes: ['openid', 'profile', 'email', 'User.Read']
      }
    }
  },

  /**
   * Azure Application Insights Configuration
   */
  monitoring: {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    instrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,

    /**
     * Check if Application Insights is configured
     */
    isConfigured(): boolean {
      return !!(this.connectionString || this.instrumentationKey)
    }
  },

  /**
   * Azure deployment configuration
   */
  deployment: {
    resourceGroupName: process.env.AZURE_RESOURCE_GROUP || 'pixelated-rg',
    location: process.env.AZURE_LOCATION || 'East US',
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID,
    
    // Static Web Apps
    staticWebApp: {
      name: process.env.AZURE_STATIC_WEB_APP_NAME || 'pixelated-swa',
      sku: process.env.AZURE_STATIC_WEB_APP_SKU || 'Free'
    },

    // App Service
    appService: {
      name: process.env.AZURE_APP_SERVICE_NAME || 'pixelated-app',
      planName: process.env.AZURE_APP_SERVICE_PLAN || 'pixelated-plan',
      sku: process.env.AZURE_APP_SERVICE_SKU || 'B1'
    },

    // Functions
    functions: {
      name: process.env.AZURE_FUNCTIONS_NAME || 'pixelated-functions',
      storageAccount: process.env.AZURE_FUNCTIONS_STORAGE || 'pixelatedfunc'
    }
  }
}

export default azureConfig
