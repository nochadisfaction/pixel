// Reference the user-assigned identity as an existing resource for correct resourceId usage
resource userIdentityResource 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: 'px2-uid-${resourceToken}'
}
module acrPullRoleAssignment 'roleAssignment.bicep' = {
  name: 'acrPullRoleAssignment'
  params: {
    containerRegistryName: containerRegistry.name
    userIdentityName: 'px2-uid-${resourceToken}'
  }
  dependsOn: [userIdentity]
}
// Main Bicep file for pixelated2 deployment
// This file provisions a container app, container registry, key vault, application insights, and log analytics workspace
// All resources use managed identity and secure connections

param environmentName string
param location string


var resourcePrefix = 'px2'
var resourceToken = uniqueString(subscription().id, resourceGroup().id, environmentName)

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${resourcePrefix}-log-${resourceToken}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${resourcePrefix}-ai-${resourceToken}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: '${resourcePrefix}-kv-${resourceToken}'
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    accessPolicies: []
    enabledForDeployment: true
    enabledForTemplateDeployment: true
    enableSoftDelete: true
    enablePurgeProtection: true
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Deny'
    }
  }
}

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: '${resourcePrefix}cr${resourceToken}'
  location: location
  sku: {
    name: 'Standard'
  }
  properties: {
    adminUserEnabled: false
    // publicNetworkAccess: 'Disabled' // Allow public network access for Standard SKU
  }
}

resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${resourcePrefix}-env-${resourceToken}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

module userIdentity 'identity.bicep' = {
  name: 'userIdentity'
  params: {
    environmentName: environmentName
    location: location
  }
}

resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${resourcePrefix}-app-${resourceToken}'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userIdentityResource.id}': {}
    }
  }
  tags: {
    'azd-service-name': 'pixelated2-app'
  }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      registries: [
        {
          server: containerRegistry.properties.loginServer
          identity: userIdentityResource.id
        }
      ]
      secrets: []
      ingress: {
        external: true
        targetPort: 80
        transport: 'auto'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
          exposeHeaders: ['*']
          maxAge: 86400
        }
      }
    }
    template: {
      containers: [
        {
          name: 'pixelated2-app'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          resources: {
            cpu: 1
            memory: '2Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

output containerAppUrl string = containerApp.properties.configuration.ingress.fqdn
output RESOURCE_GROUP_ID string = resourceGroup().id
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.properties.loginServer
output keyVaultName string = keyVault.name
output appInsightsName string = appInsights.name
output logAnalyticsName string = logAnalytics.name
output containerRegistryName string = containerRegistry.name
