// Main Bicep template for Pixelated Empathy Azure infrastructure
@description('The name of the application')
param appName string = 'pixelated'

@description('The environment (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'prod'

@description('The location for all resources')
param location string = resourceGroup().location

@description('The pricing tier for the App Service plan')
@allowed(['F1', 'D1', 'B1', 'B2', 'B3', 'S1', 'S2', 'S3', 'P1', 'P2', 'P3'])
param appServicePlanSku string = 'B1'

@description('The pricing tier for the Static Web App')
@allowed(['Free', 'Standard'])
param staticWebAppSku string = 'Free'

@description('Enable Azure OpenAI integration')
param enableAzureOpenAI bool = true

@description('Enable Azure Storage for backups')
param enableStorage bool = true

@description('Enable Application Insights monitoring')
param enableMonitoring bool = true

@description('Custom domain name (optional)')
param customDomain string = ''

@description('GitHub repository URL for Static Web Apps')
param githubRepoUrl string = ''

@description('GitHub branch for deployment')
param githubBranch string = 'main'

// Variables
var resourcePrefix = '${appName}-${environment}'
var tags = {
  Application: appName
  Environment: environment
  ManagedBy: 'Bicep'
}

// Storage Account for backups and static assets
module storage 'modules/storage.bicep' = if (enableStorage) {
  name: 'storage-deployment'
  params: {
    storageAccountName: '${replace(resourcePrefix, '-', '')}storage'
    location: location
    tags: tags
  }
}

// Application Insights for monitoring
module monitoring 'modules/monitoring.bicep' = if (enableMonitoring) {
  name: 'monitoring-deployment'
  params: {
    appInsightsName: '${resourcePrefix}-insights'
    logAnalyticsName: '${resourcePrefix}-logs'
    location: location
    tags: tags
  }
}

// Key Vault for secrets management
module keyVault 'modules/key-vault.bicep' = {
  name: 'keyvault-deployment'
  params: {
    keyVaultName: '${resourcePrefix}-kv'
    location: location
    tags: tags
    enableRbacAuthorization: true
    principalObjectId: '' // Using RBAC instead of access policies
  }
}

// Azure OpenAI Service
module openai 'modules/openai.bicep' = if (enableAzureOpenAI) {
  name: 'openai-deployment'
  params: {
    openaiName: '${resourcePrefix}-openai'
    location: 'eastus2' // Azure OpenAI is only available in specific regions
    tags: tags
  }
}

// Container Registry for App Service
module containerRegistry 'modules/container-registry.bicep' = {
  name: 'acr-deployment'
  params: {
    registryName: '${replace(resourcePrefix, '-', '')}cr'
    location: location
    tags: tags
  }
}

// App Service Plan and App Service
module appService 'modules/app-service.bicep' = {
  name: 'app-service-deployment'
  params: {
    appServicePlanName: '${resourcePrefix}-plan'
    appServiceName: '${resourcePrefix}-app'
    location: location
    sku: appServicePlanSku
    containerRegistryName: containerRegistry.outputs.registryName
    containerRegistryLoginServer: containerRegistry.outputs.loginServer
    appInsightsConnectionString: enableMonitoring ? monitoring.outputs.connectionString : ''
    tags: tags
  }
}

// Static Web App (alternative to App Service)
module staticWebApp 'modules/static-web-app.bicep' = if (!empty(githubRepoUrl)) {
  name: 'swa-deployment'
  params: {
    staticWebAppName: '${resourcePrefix}-swa'
    location: 'Central US' // Static Web Apps have limited region availability
    sku: staticWebAppSku
    repositoryUrl: githubRepoUrl
    branch: githubBranch
    appLocation: '/'
    apiLocation: 'api'
    outputLocation: 'dist'
    keyVaultName: keyVault.outputs.keyVaultName
    tags: tags
  }
}

// Outputs
output resourceGroupName string = resourceGroup().name
output appServiceUrl string = appService.outputs.appServiceUrl
output staticWebAppUrl string = !empty(githubRepoUrl) ? staticWebApp.outputs.defaultHostname : ''
output containerRegistryLoginServer string = containerRegistry.outputs.loginServer
output storageAccountName string = enableStorage ? storage.outputs.storageAccountName : ''
output keyVaultName string = keyVault.outputs.keyVaultName
output applicationInsightsName string = enableMonitoring ? monitoring.outputs.appInsightsName : ''
output azureOpenAIEndpoint string = enableAzureOpenAI ? openai.outputs.endpoint : ''

// Output deployment summary
output deploymentSummary object = {
  appName: appName
  environment: environment
  location: location
  appServiceUrl: appService.outputs.appServiceUrl
  staticWebAppUrl: !empty(githubRepoUrl) ? staticWebApp.outputs.defaultHostname : ''
  containerRegistry: containerRegistry.outputs.loginServer
  storageAccount: enableStorage ? storage.outputs.storageAccountName : ''
  keyVault: keyVault.outputs.keyVaultName
  monitoring: enableMonitoring ? monitoring.outputs.appInsightsName : ''
  azureOpenAI: enableAzureOpenAI ? openai.outputs.endpoint : ''
  customDomain: customDomain
}
