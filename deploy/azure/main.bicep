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

@description('Enable Azure OpenAI integration')
param enableAzureOpenAI bool = true

@description('Enable Azure Storage for backups')
param enableStorage bool = true

@description('Enable Application Insights monitoring')
param enableMonitoring bool = true

@description('Custom domain name (optional)')
param customDomain string = ''

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

// Azure OpenAI Service
module openai 'modules/openai.bicep' = if (enableAzureOpenAI) {
  name: 'openai-deployment'
  params: {
    openaiName: '${resourcePrefix}-openai'
    location: 'eastus' // Changed from eastus2 to eastus for better availability
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

// Key Vault for secrets management (deployed first)
module keyVault 'modules/key-vault.bicep' = {
  name: 'keyvault-deployment'
  params: {
    keyVaultName: '${resourcePrefix}-kv'
    location: location
    tags: tags
    enableRbacAuthorization: true
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
    appInsightsConnectionString: enableMonitoring ? monitoring!.outputs.connectionString : ''
    keyVaultUri: keyVault.outputs.keyVaultUri
    tags: tags
  }
}

// Update Key Vault access policies after App Service is created
module keyVaultAccessPolicy 'modules/key-vault-access-policy.bicep' = {
  name: 'keyvault-access-policy-deployment'
  params: {
    keyVaultName: keyVault.outputs.keyVaultName
    appServiceManagedIdentityPrincipalId: appService.outputs.principalId
  }
}

// Alternative approach: Configure App Service with Key Vault using separate resource
// This provides cleaner separation and better management of app settings
module appServiceKeyVaultConfig 'modules/app-service-keyvault-config.bicep' = {
  name: 'app-service-keyvault-config-deployment'
  params: {
    appServiceName: appService.outputs.appServiceName
    keyVaultName: keyVault.outputs.keyVaultName
  }
  dependsOn: [
    keyVaultAccessPolicy
  ]
}

// Assign Key Vault Secrets User role to App Service managed identity
module keyVaultRoleAssignment 'modules/key-vault-role-assignment.bicep' = {
  name: 'keyvault-secrets-user-role-assignment'
  params: {
    keyVaultName: keyVault.outputs.keyVaultName
    keyVaultResourceId: keyVault.outputs.keyVaultId
    principalId: appService.outputs.principalId
  }
}

// Static Web App deployment is disabled for this configuration
// Uncomment and configure if needed for GitHub-based deployments
// module staticWebApp 'modules/static-web-app.bicep' = if (!empty(githubRepoUrl)) {
//   name: 'swa-deployment'
//   params: {
//     staticWebAppName: '${resourcePrefix}-swa'
//     location: 'Central US' // Static Web Apps have limited region availability
//     sku: staticWebAppSku
//     repositoryUrl: githubRepoUrl
//     branch: githubBranch
//     appLocation: '/'
//     apiLocation: 'api'
//     outputLocation: 'dist'
//     keyVaultName: keyVault.outputs.keyVaultName
//     tags: tags
//   }
// }

// Outputs
output resourceGroupName string = resourceGroup().name
output appServiceUrl string = appService.outputs.appServiceUrl
output containerRegistryLoginServer string = containerRegistry.outputs.loginServer
output keyVaultName string = keyVault.outputs.keyVaultName

// Output deployment summary
output deploymentSummary object = {
  appName: appName
  environment: environment
  location: location
  appServiceUrl: appService.outputs.appServiceUrl
  containerRegistry: containerRegistry.outputs.loginServer
  keyVault: keyVault.outputs.keyVaultName
  customDomain: customDomain
  storage: enableStorage ? storage!.outputs.storageAccountName : 'Not enabled'
  monitoring: enableMonitoring ? monitoring!.outputs.appInsightsName : 'Not enabled'
  azureOpenAI: enableAzureOpenAI ? openai!.outputs.openaiServiceName : 'Not enabled'
  enabledFeatures: {
    storage: enableStorage
    monitoring: enableMonitoring
    azureOpenAI: enableAzureOpenAI
  }
}
