// Azure Static Web App for hosting the Pixelated application
@description('The name of the Static Web App')
param staticWebAppName string

@description('The location for the Static Web App')
param location string = 'Central US'

@description('The SKU for the Static Web App')
@allowed(['Free', 'Standard'])
param sku string = 'Free'

@description('The GitHub repository URL')
param repositoryUrl string

@description('The GitHub branch to deploy from')
param branch string = 'main'

@description('The app location in the repository')
param appLocation string = '/'

@description('The API location in the repository')
param apiLocation string = 'api'

@description('The output location after build')
param outputLocation string = 'dist'

@description('Tags to apply to the Static Web App')
param tags object = {}

@description('GitHub personal access token for repository access')
@secure()
param githubToken string = ''

// Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    repositoryUrl: repositoryUrl
    branch: branch
    repositoryToken: githubToken
    buildProperties: {
      appLocation: appLocation
      apiLocation: apiLocation
      outputLocation: outputLocation
      appBuildCommand: 'pnpm build'
      apiBuildCommand: 'pnpm build:api'
    }
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    provider: 'GitHub'
    enterpriseGradeCdnStatus: 'Disabled'
  }
}

// Custom domain (if needed)
resource customDomain 'Microsoft.Web/staticSites/customDomains@2023-01-01' = if (!empty(tags.customDomain)) {
  parent: staticWebApp
  name: tags.customDomain
  properties: {}
}

// Function app settings for API
resource apiSettings 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: staticWebApp
  name: 'functionappsettings'
  properties: {
    NODE_ENV: 'production'
    AZURE_OPENAI_API_KEY: '@Microsoft.KeyVault(SecretUri=https://pixelated-kv.vault.azure.net/secrets/azure-openai-api-key/)'
    AZURE_OPENAI_ENDPOINT: '@Microsoft.KeyVault(SecretUri=https://pixelated-kv.vault.azure.net/secrets/azure-openai-endpoint/)'
    SUPABASE_URL: '@Microsoft.KeyVault(SecretUri=https://pixelated-kv.vault.azure.net/secrets/supabase-url/)'
    SUPABASE_ANON_KEY: '@Microsoft.KeyVault(SecretUri=https://pixelated-kv.vault.azure.net/secrets/supabase-anon-key/)'
  }
}

// Outputs
output staticWebAppId string = staticWebApp.id
output staticWebAppName string = staticWebApp.name
output defaultHostname string = staticWebApp.properties.defaultHostname
output repositoryUrl string = staticWebApp.properties.repositoryUrl
output branch string = staticWebApp.properties.branch
output customDomainUrl string = !empty(tags.customDomain) ? 'https://${tags.customDomain}' : ''
output deploymentToken string = staticWebApp.listSecrets().properties.apiKey
