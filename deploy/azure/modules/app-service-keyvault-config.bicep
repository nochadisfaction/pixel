// App Service Configuration module for Key Vault integration
// This module demonstrates the alternative approach of using a separate app settings resource
@description('The name of the existing App Service')
param appServiceName string

@description('The Key Vault name')
param keyVaultName string

// Reference to existing App Service
resource appService 'Microsoft.Web/sites@2023-01-01' existing = {
  name: appServiceName
}

// Reference to existing Key Vault (for proper URI construction)
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// Configure app settings with Key Vault references
resource appSettings 'Microsoft.Web/sites/config@2023-01-01' = {
  parent: appService
  name: 'appsettings'
  properties: {
    // Clerk authentication configuration
    PUBLIC_CLERK_PUBLISHABLE_KEY: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/clerk-publishable-key/)'
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/clerk-publishable-key/)'
    CLERK_SECRET_KEY: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/clerk-secret-key/)'
    
    // Azure OpenAI configuration
    AZURE_OPENAI_API_KEY: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/azure-openai-api-key/)'
    AZURE_OPENAI_ENDPOINT: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/azure-openai-endpoint/)'
    
    // Supabase configuration
    SUPABASE_URL: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/supabase-url/)'
    SUPABASE_ANON_KEY: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/supabase-anon-key/)'
    
    // Sentry configuration
    SENTRY_DSN: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/sentry-dsn/)'
    SENTRY_AUTH_TOKEN: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/sentry-auth-token/)'
    
    // Azure AD configuration
    AZURE_AD_CLIENT_SECRET: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/azure-ad-client-secret/)'
    
    // Application configuration (non-sensitive)
    NODE_ENV: 'production'
    WEBSITES_ENABLE_APP_SERVICE_STORAGE: 'false'
    WEBSITES_PORT: '8080'
  }
}

// Outputs
output appSettingsConfigured bool = true
output publicClerkKey string = '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/clerk-publishable-key/)'
